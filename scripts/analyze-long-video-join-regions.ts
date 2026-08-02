/**
 * Check concat join regions on pipeline output for A/V start alignment.
 */
import { spawn } from "node:child_process";
import ffmpegStatic from "ffmpeg-static";

const FFMPEG = ffmpegStatic!;
const OUTPUT =
  "spike-phase0-1/e2e/output-b939208e-a90e-4611-8674-0026e16d4dc4.mp4";
const JOINS = [234.542, 472.75, 710.042, 947.407, 1185.28];

function run(args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(FFMPEG, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    child.on("error", reject);
    child.on("close", () => resolve(stderr));
  });
}

async function firstPtsAfterSeek(file: string, seekSec: number, map: string) {
  const filter = map === "v" ? "showinfo" : "ashowinfo";
  const stderr = await run([
    "-hide_banner",
    "-ss",
    seekSec.toFixed(3),
    "-i",
    file,
    "-t",
    "0.25",
    "-map",
    map === "v" ? "0:v:0" : "0:a:0",
    "-vf",
    map === "v" ? filter : "null",
    "-af",
    map === "a" ? filter : "anull",
    "-f",
    "null",
    "-",
  ]);

  const match = stderr.match(/pts_time:([0-9.]+)/);
  return match ? Number(match[1]) : null;
}

async function main() {
  console.log("Join-region first-packet PTS after seek (should track together):\n");
  for (const join of JOINS) {
    const videoPts = await firstPtsAfterSeek(OUTPUT, join, "v");
    const audioPts = await firstPtsAfterSeek(OUTPUT, join, "a");
    const deltaMs =
      videoPts !== null && audioPts !== null ? (videoPts - audioPts) * 1000 : null;
    console.log(
      `Join ~${join.toFixed(1)}s: video ${videoPts?.toFixed(3) ?? "n/a"}s, audio ${audioPts?.toFixed(3) ?? "n/a"}s, delta ${deltaMs?.toFixed(1) ?? "n/a"}ms`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
