import { spawn } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";

const ffmpegBinary = ffmpegStatic;

export class ServerVideoProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerVideoProcessingError";
  }
}

export class ServerVideoProcessingCancelledError extends Error {
  constructor() {
    super("Video export cancelled.");
    this.name = "ServerVideoProcessingCancelledError";
  }
}

function getInputExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "mov" || extension === "webm" || extension === "mp4") {
    return extension;
  }

  return "mp4";
}

function runFfmpeg(args: string[], signal?: AbortSignal) {
  if (!ffmpegBinary) {
    throw new ServerVideoProcessingError(
      "FFmpeg binary is unavailable in this environment.",
    );
  }

  return new Promise<void>((resolve, reject) => {
    const process = spawn(ffmpegBinary, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";

    const handleAbort = () => {
      process.kill("SIGKILL");
      reject(new ServerVideoProcessingCancelledError());
    };

    if (signal) {
      if (signal.aborted) {
        handleAbort();
        return;
      }

      signal.addEventListener("abort", handleAbort, { once: true });
    }

    process.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    process.on("error", (error) => {
      reject(error);
    });

    process.on("close", (code) => {
      if (signal) {
        signal.removeEventListener("abort", handleAbort);
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new ServerVideoProcessingError(
          stderr.trim() ||
            "Video processing failed. Please try a shorter clip.",
        ),
      );
    });
  });
}

export async function processVideoWithOverlayInTmp({
  inputFileName,
  inputVideoBytes,
  overlayPngBytes,
  signal,
}: {
  inputFileName: string;
  inputVideoBytes: Buffer;
  overlayPngBytes: Buffer;
  signal?: AbortSignal;
}) {
  if (signal?.aborted) {
    throw new ServerVideoProcessingCancelledError();
  }

  const estimatedOutputBytes = Math.ceil(inputVideoBytes.byteLength * 1.1);
  const scratchBudgetBytes = 500 * 1024 * 1024;

  if (inputVideoBytes.byteLength + overlayPngBytes.byteLength + estimatedOutputBytes > scratchBudgetBytes) {
    throw new ServerVideoProcessingError(
      "This video is too large to process safely within server scratch space. Try a smaller file.",
    );
  }

  const jobDirectory = path.join(
    os.tmpdir(),
    `putwatermark-${crypto.randomUUID()}`,
  );
  await mkdir(jobDirectory, { recursive: true });

  const inputExtension = getInputExtension(inputFileName);
  const inputPath = path.join(jobDirectory, `input.${inputExtension}`);
  const overlayPath = path.join(jobDirectory, "overlay.png");
  const outputPath = path.join(jobDirectory, "output.mp4");

  try {
    await writeFile(inputPath, inputVideoBytes);
    await writeFile(overlayPath, overlayPngBytes);

    await runFfmpeg(
      [
        "-y",
        "-i",
        inputPath,
        "-i",
        overlayPath,
        "-filter_complex",
        "[0:v][1:v]overlay=0:0",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "22",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        outputPath,
      ],
      signal,
    );

    const outputStats = await stat(outputPath);

    if (!outputStats.size) {
      throw new ServerVideoProcessingError(
        "Processed video was empty. Please try again.",
      );
    }

    return await readFile(outputPath);
  } finally {
    await rm(jobDirectory, { recursive: true, force: true });
  }
}
