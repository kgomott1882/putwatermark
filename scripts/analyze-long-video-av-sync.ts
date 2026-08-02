/**
 * Measure A/V timing on long-video pipeline output.
 * Usage: npx tsx scripts/analyze-long-video-av-sync.ts [path-to-mp4]
 */
import { spawn } from "node:child_process";
import ffmpegStatic from "ffmpeg-static";

const FFMPEG = ffmpegStatic;
if (!FFMPEG) {
  throw new Error("ffmpeg-static not found");
}

const DEFAULT_OUTPUT =
  "spike-phase0-1/e2e/output-b939208e-a90e-4611-8674-0026e16d4dc4.mp4";
const DEFAULT_SOURCE = "spike-phase0-1/e2e/long-source-1320s.mp4";

/** Split points from the 6-chunk E2E run (240s cap). */
const E2E_JOIN_SECONDS = [234.542, 472.75, 710.042, 947.407, 1185.28];

type StreamSummary = {
  containerDuration: number;
  videoDuration: number | null;
  audioDuration: number | null;
  videoEndPts: number | null;
  audioEndPts: number | null;
};

function runFfmpeg(args: string[]) {
  return new Promise<{ code: number; stderr: string }>((resolve, reject) => {
    const child = spawn(FFMPEG!, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stderr });
    });
  });
}

function parseContainerDuration(stderr: string) {
  const match = stderr.match(/Duration:\s(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }

  const [, hours, minutes, seconds] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

function parseStreamDurations(stderr: string) {
  const videoMatch = stderr.match(
    /Stream #0:0.*Video:.*,\s(\d+(?:\.\d+)?)\s(?:fps|tbr)/,
  );

  let videoDuration: number | null = null;
  let audioDuration: number | null = null;

  const durationLines = [...stderr.matchAll(/Duration:\s(\d+):(\d+):(\d+(?:\.\d+)?)/g)];
  if (durationLines[0]) {
    const [, h, m, s] = durationLines[0];
    videoDuration = Number(h) * 3600 + Number(m) * 60 + Number(s);
  }

  // Container duration is the first Duration line; stream-level parsing via decode below.
  void videoMatch;

  return { videoDuration, audioDuration };
}

async function probeEndPts(filePath: string): Promise<StreamSummary> {
  const probe = await runFfmpeg(["-hide_banner", "-i", filePath]);
  const containerDuration = parseContainerDuration(probe.stderr);

  const videoDecode = await runFfmpeg([
    "-hide_banner",
    "-i",
    filePath,
    "-map",
    "0:v:0",
    "-vf",
    "showinfo",
    "-f",
    "null",
    "-",
  ]);

  const audioDecode = await runFfmpeg([
    "-hide_banner",
    "-i",
    filePath,
    "-map",
    "0:a:0",
    "-af",
    "ashowinfo",
    "-f",
    "null",
    "-",
  ]);

  const videoPtsMatches = [
    ...videoDecode.stderr.matchAll(/pts_time:([0-9.]+)/g),
  ];
  const audioPtsMatches = [
    ...audioDecode.stderr.matchAll(/pts_time:([0-9.]+)/g),
  ];

  const videoEndPts = videoPtsMatches.length
    ? Number(videoPtsMatches.at(-1)![1])
    : null;
  const audioEndPts = audioPtsMatches.length
    ? Number(audioPtsMatches.at(-1)![1])
    : null;

  const parsed = parseStreamDurations(probe.stderr);

  return {
    audioDuration: audioEndPts,
    audioEndPts,
    containerDuration: containerDuration ?? 0,
    videoDuration: videoEndPts,
    videoEndPts,
  };
}

async function measureWindowAvDelta(
  filePath: string,
  centerSeconds: number,
  windowSeconds = 1,
) {
  const start = Math.max(0, centerSeconds - windowSeconds / 2);
  const decode = await runFfmpeg([
    "-hide_banner",
    "-ss",
    start.toFixed(3),
    "-i",
    filePath,
    "-t",
    String(windowSeconds),
    "-map",
    "0:v:0",
    "-map",
    "0:a:0",
    "-vf",
    "showinfo",
    "-af",
    "ashowinfo",
    "-f",
    "null",
    "-",
  ]);

  const lines = decode.stderr.split("\n");
  const deltas: number[] = [];
  let lastVideoPts: number | null = null;
  let lastAudioPts: number | null = null;

  for (const line of lines) {
    const videoMatch = line.match(/Parsed_showinfo.*pts_time:([0-9.]+)/);
    const audioMatch = line.match(/Parsed_ashowinfo.*pts_time:([0-9.]+)/);

    if (videoMatch) {
      lastVideoPts = Number(videoMatch[1]);
      if (lastAudioPts !== null) {
        deltas.push(lastVideoPts - lastAudioPts);
      }
    }

    if (audioMatch) {
      lastAudioPts = Number(audioMatch[1]);
      if (lastVideoPts !== null) {
        deltas.push(lastVideoPts - lastAudioPts);
      }
    }
  }

  if (!deltas.length) {
    return {
      centerSeconds,
      maxAbsDeltaMs: null,
      meanDeltaMs: null,
      sampleCount: 0,
    };
  }

  const meanDelta = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
  const maxAbsDelta = deltas.reduce(
    (max, value) => Math.max(max, Math.abs(value)),
    0,
  );

  return {
    centerSeconds,
    maxAbsDeltaMs: maxAbsDelta * 1000,
    meanDeltaMs: meanDelta * 1000,
    sampleCount: deltas.length,
  };
}

function formatMs(value: number | null) {
  return value === null ? "n/a" : `${value.toFixed(1)}ms`;
}

async function analyzeFile(label: string, filePath: string, joinPoints: number[]) {
  console.log(`\n=== ${label} ===`);
  console.log(filePath);

  const summary = await probeEndPts(filePath);
  const avEndDeltaMs =
    summary.videoEndPts !== null && summary.audioEndPts !== null
      ? (summary.videoEndPts - summary.audioEndPts) * 1000
      : null;

  console.log(`Container duration: ${summary.containerDuration.toFixed(2)}s`);
  console.log(`Video end PTS: ${summary.videoEndPts?.toFixed(3) ?? "n/a"}s`);
  console.log(`Audio end PTS: ${summary.audioEndPts?.toFixed(3) ?? "n/a"}s`);
  console.log(`End A/V delta (video - audio): ${formatMs(avEndDeltaMs)}`);

  const sampleTimes = [
    0,
    ...joinPoints,
    summary.containerDuration * 0.5,
    Math.max(0, summary.containerDuration - 1),
  ];

  console.log("\nWindowed A/V delta samples (video PTS - audio PTS):");
  for (const center of sampleTimes) {
    const window = await measureWindowAvDelta(filePath, center, 1);
    console.log(
      `  t=${center.toFixed(1)}s: mean ${formatMs(window.meanDeltaMs)}, max |delta| ${formatMs(window.maxAbsDeltaMs)} (${window.sampleCount} samples)`,
    );
  }

  return { summary, avEndDeltaMs };
}

async function main() {
  const outputPath = process.argv[2] ?? DEFAULT_OUTPUT;
  const sourcePath = process.argv[3] ?? DEFAULT_SOURCE;

  const source = await analyzeFile("Source (pre-pipeline)", sourcePath, []);
  const output = await analyzeFile(
    "Pipeline output (6 chunks, +1.41s duration drift)",
    outputPath,
    E2E_JOIN_SECONDS,
  );

  const durationDrift =
    output.summary.containerDuration - source.summary.containerDuration;
  console.log("\n=== Summary ===");
  console.log(
    `Container duration drift (output - source): ${durationDrift >= 0 ? "+" : ""}${durationDrift.toFixed(2)}s`,
  );
  console.log(
    `End A/V delta change: source ${formatMs(source.avEndDeltaMs)} → output ${formatMs(output.avEndDeltaMs)}`,
  );
  console.log(
    "\nInterpretation: lip-sync issues usually become noticeable around 80-120ms sustained offset; one frame at 24fps is ~42ms.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
