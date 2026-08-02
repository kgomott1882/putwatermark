import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";

const FFMPEG = ffmpegStatic;

/** Below typical perceptible lip-sync threshold for dialogue. */
export const LONG_VIDEO_E2E_MAX_JOIN_AV_OFFSET_MS = 80;
export const LONG_VIDEO_E2E_MAX_END_AV_OFFSET_MS = 200;

export type JoinAvOffsetSample = {
  audioPts: number | null;
  avOffsetMs: number | null;
  joinSeconds: number;
  videoPts: number | null;
};

export type LongVideoOutputVerification = {
  containerDurationSeconds: number;
  durationDriftSeconds: number;
  endAvOffsetMs: number | null;
  joinSamples: JoinAvOffsetSample[];
  maxJoinAvOffsetMs: number | null;
  tail: {
    blackSegmentSeconds: number;
    freezeSegmentSeconds: number;
    lastFrameMeanBrightness: number | null;
    passed: boolean;
    reason?: string;
  };
};

function runFfmpeg(args: string[]) {
  if (!FFMPEG) {
    throw new Error("ffmpeg-static binary not found");
  }

  return new Promise<string>((resolve, reject) => {
    const child = spawn(FFMPEG, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", () => resolve(stderr));
  });
}

export async function probeContainerDurationSeconds(filePath: string) {
  const stderr = await runFfmpeg(["-hide_banner", "-i", filePath]);
  const match = stderr.match(/Duration:\s(\d+):(\d+):(\d+(?:\.\d+)?)/);

  if (!match) {
    throw new Error(`Could not parse container duration for ${filePath}`);
  }

  const [, hours, minutes, seconds] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

async function firstPtsAfterSeek(
  filePath: string,
  seekSeconds: number,
  stream: "video" | "audio",
) {
  const stderr = await runFfmpeg([
    "-hide_banner",
    "-ss",
    seekSeconds.toFixed(3),
    "-i",
    filePath,
    "-t",
    "0.25",
    "-map",
    stream === "video" ? "0:v:0" : "0:a:0",
    "-vf",
    stream === "video" ? "showinfo" : "null",
    "-af",
    stream === "audio" ? "ashowinfo" : "anull",
    "-f",
    "null",
    "-",
  ]);

  const match = stderr.match(/pts_time:([0-9.]+)/);
  return match ? Number(match[1]) : null;
}

export async function measureJoinAvOffsets(
  filePath: string,
  joinSeconds: number[],
): Promise<JoinAvOffsetSample[]> {
  const samples: JoinAvOffsetSample[] = [];

  for (const joinSecond of joinSeconds) {
    const videoPts = await firstPtsAfterSeek(filePath, joinSecond, "video");
    const audioPts = await firstPtsAfterSeek(filePath, joinSecond, "audio");
    const avOffsetMs =
      videoPts !== null && audioPts !== null
        ? (videoPts - audioPts) * 1000
        : null;

    samples.push({
      audioPts,
      avOffsetMs,
      joinSeconds: joinSecond,
      videoPts,
    });
  }

  return samples;
}

export async function probeEndAvOffsetMs(filePath: string) {
  const videoStderr = await runFfmpeg([
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
  const audioStderr = await runFfmpeg([
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

  const videoEnd = Number(
    [...videoStderr.matchAll(/pts_time:([0-9.]+)/g)].at(-1)?.[1] ?? "NaN",
  );
  const audioEnd = Number(
    [...audioStderr.matchAll(/pts_time:([0-9.]+)/g)].at(-1)?.[1] ?? "NaN",
  );

  if (!Number.isFinite(videoEnd) || !Number.isFinite(audioEnd)) {
    return null;
  }

  return (videoEnd - audioEnd) * 1000;
}

async function inspectOutputTail(
  filePath: string,
  workDirectory: string,
) {
  await mkdir(workDirectory, { recursive: true });

  try {
    const tailStderr = await runFfmpeg([
      "-hide_banner",
      "-sseof",
      "-3",
      "-i",
      filePath,
      "-vf",
      "freezedetect=n=-60dB:d=0.4,blackdetect=d=0.4:pix_th=0.10",
      "-af",
      "silencedetect=n=-50dB:d=0.4",
      "-f",
      "null",
      "-",
    ]);

    const freezeMatches = [
      ...tailStderr.matchAll(/freezedetect.*?duration:\s*([0-9.]+)/g),
    ];
    const blackMatches = [
      ...tailStderr.matchAll(/blackdetect.*?black_duration:\s*([0-9.]+)/g),
    ];

    const freezeSegmentSeconds = freezeMatches.reduce(
      (max, match) => Math.max(max, Number(match[1])),
      0,
    );
    const blackSegmentSeconds = blackMatches.reduce(
      (max, match) => Math.max(max, Number(match[1])),
      0,
    );

    const framePath = path.join(workDirectory, "tail-last.jpg");
    await runFfmpeg([
      "-hide_banner",
      "-sseof",
      "-0.12",
      "-i",
      filePath,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      framePath,
    ]);

    const statsStderr = await runFfmpeg([
      "-hide_banner",
      "-i",
      framePath,
      "-vf",
      "signalstats=1,metadata=print",
      "-frames:v",
      "1",
      "-f",
      "null",
      "-",
    ]);

    const brightnessMatch = statsStderr.match(/lavfi\.signalstats\.YAVG=([0-9.]+)/);
    const lastFrameMeanBrightness = brightnessMatch
      ? Number(brightnessMatch[1])
      : null;

    let passed = true;
    let reason: string | undefined;

    if (freezeSegmentSeconds >= 0.9) {
      passed = false;
      reason = `Detected ${freezeSegmentSeconds.toFixed(2)}s of frozen video in the last 3 seconds.`;
    } else if (blackSegmentSeconds >= 0.9) {
      passed = false;
      reason = `Detected ${blackSegmentSeconds.toFixed(2)}s of black video in the last 3 seconds.`;
    } else if (
      lastFrameMeanBrightness !== null &&
      lastFrameMeanBrightness < 8
    ) {
      passed = false;
      reason = `Last visible frame average brightness is very low (${lastFrameMeanBrightness.toFixed(1)}).`;
    }

    return {
      blackSegmentSeconds,
      freezeSegmentSeconds,
      lastFrameMeanBrightness,
      passed,
      reason,
    };
  } finally {
    await rm(workDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function verifyLongVideoOutput({
  filePath,
  joinSeconds,
  sourceDurationSeconds,
  tailWorkDirectory,
}: {
  filePath: string;
  joinSeconds: number[];
  sourceDurationSeconds: number;
  tailWorkDirectory: string;
}): Promise<LongVideoOutputVerification> {
  const containerDurationSeconds = await probeContainerDurationSeconds(filePath);
  const joinSamples = await measureJoinAvOffsets(filePath, joinSeconds);
  const endAvOffsetMs = await probeEndAvOffsetMs(filePath);
  const tail = await inspectOutputTail(filePath, tailWorkDirectory);

  const joinOffsets = joinSamples
    .map((sample) => sample.avOffsetMs)
    .filter((value): value is number => value !== null);
  const maxJoinAvOffsetMs = joinOffsets.length
    ? Math.max(...joinOffsets.map((value) => Math.abs(value)))
    : null;

  return {
    containerDurationSeconds,
    durationDriftSeconds: containerDurationSeconds - sourceDurationSeconds,
    endAvOffsetMs,
    joinSamples,
    maxJoinAvOffsetMs,
    tail,
  };
}

export function assertLongVideoOutputVerification(
  verification: LongVideoOutputVerification,
) {
  if (verification.maxJoinAvOffsetMs === null) {
    throw new Error("Could not measure A/V offset at any concat join point.");
  }

  if (verification.maxJoinAvOffsetMs > LONG_VIDEO_E2E_MAX_JOIN_AV_OFFSET_MS) {
    const worst = verification.joinSamples.reduce((current, sample) => {
      const absOffset = Math.abs(sample.avOffsetMs ?? 0);
      const currentAbs = Math.abs(current.avOffsetMs ?? 0);
      return absOffset > currentAbs ? sample : current;
    });

    throw new Error(
      `Max concat join A/V offset ${verification.maxJoinAvOffsetMs.toFixed(1)}ms exceeds ${LONG_VIDEO_E2E_MAX_JOIN_AV_OFFSET_MS}ms tolerance (worst join ~${worst.joinSeconds.toFixed(1)}s).`,
    );
  }

  if (
    verification.endAvOffsetMs !== null &&
    Math.abs(verification.endAvOffsetMs) > LONG_VIDEO_E2E_MAX_END_AV_OFFSET_MS
  ) {
    throw new Error(
      `End A/V offset ${verification.endAvOffsetMs.toFixed(1)}ms exceeds ${LONG_VIDEO_E2E_MAX_END_AV_OFFSET_MS}ms tolerance.`,
    );
  }

  if (!verification.tail.passed) {
    throw new Error(
      verification.tail.reason ??
        "Output tail inspection failed (possible freeze/black ending).",
    );
  }
}

export function formatLongVideoOutputVerification(
  verification: LongVideoOutputVerification,
) {
  const lines = [
    `Duration drift (informational): ${verification.durationDriftSeconds >= 0 ? "+" : ""}${verification.durationDriftSeconds.toFixed(2)}s`,
    `Max join A/V offset: ${verification.maxJoinAvOffsetMs?.toFixed(1) ?? "n/a"}ms (limit ${LONG_VIDEO_E2E_MAX_JOIN_AV_OFFSET_MS}ms)`,
    `End A/V offset: ${verification.endAvOffsetMs?.toFixed(1) ?? "n/a"}ms (limit ${LONG_VIDEO_E2E_MAX_END_AV_OFFSET_MS}ms)`,
    `Tail check: freeze ${verification.tail.freezeSegmentSeconds.toFixed(2)}s, black ${verification.tail.blackSegmentSeconds.toFixed(2)}s, last-frame brightness ${verification.tail.lastFrameMeanBrightness?.toFixed(1) ?? "n/a"}`,
  ];

  for (const sample of verification.joinSamples) {
    lines.push(
      `  Join ~${sample.joinSeconds.toFixed(1)}s: A/V offset ${sample.avOffsetMs?.toFixed(1) ?? "n/a"}ms`,
    );
  }

  return lines.join("\n");
}
