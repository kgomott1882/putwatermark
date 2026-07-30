import { fetchFile } from "@ffmpeg/util";
import {
  loadFfmpeg,
  VideoExportCancelledError,
  VideoExportFailedError,
} from "./watermarkVideoExport";

function getInputExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "mov" || extension === "webm" || extension === "mp4") {
    return extension;
  }

  return "mp4";
}

function assertFfmpegOutput(data: Uint8Array | string, label: string) {
  if (!(data instanceof Uint8Array) || data.byteLength === 0) {
    throw new VideoExportFailedError(`${label} produced an empty file.`);
  }

  return data;
}

export async function mergeVideoBlobs({
  onProgress,
  shouldCancel,
  videos,
}: {
  onProgress?: (progress: number) => void;
  shouldCancel?: () => boolean;
  videos: Array<{ blob: Blob; fileName: string }>;
}) {
  if (videos.length < 2) {
    throw new VideoExportFailedError("Add at least two videos before merging.");
  }

  const ffmpeg = await loadFfmpeg(onProgress ?? (() => undefined), {
    logLabel: "ffmpeg video merge",
  });

  const inputFiles: string[] = [];

  for (let index = 0; index < videos.length; index += 1) {
    const video = videos[index]!;
    const extension = getInputExtension(video.fileName);
    const inputFile = `input-${index}.${extension}`;
    inputFiles.push(inputFile);
    await ffmpeg.writeFile(inputFile, await fetchFile(video.blob));
  }

  const listContent = inputFiles.map((file) => `file '${file}'`).join("\n");
  await ffmpeg.writeFile("concat-list.txt", new TextEncoder().encode(listContent));

  const outputFile = "merged.mp4";
  const exitCode = await ffmpeg.exec([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    "concat-list.txt",
    "-c",
    "copy",
    outputFile,
  ]);

  if (shouldCancel?.()) {
    throw new VideoExportCancelledError();
  }

  if (exitCode !== 0) {
    throw new VideoExportFailedError(
      "Video merge failed. Try matching formats or shorter clips.",
    );
  }

  const outputBytes = assertFfmpegOutput(
    await ffmpeg.readFile(outputFile),
    "Merged video",
  );

  await Promise.allSettled([
    ...inputFiles.map((file) => ffmpeg.deleteFile(file)),
    ffmpeg.deleteFile("concat-list.txt"),
    ffmpeg.deleteFile(outputFile),
  ]);

  return new Blob([new Uint8Array(outputBytes)], { type: "video/mp4" });
}

export async function trimVideoBlob({
  endSeconds,
  fileName,
  onProgress,
  shouldCancel,
  startSeconds,
  videoBlob,
}: {
  endSeconds: number;
  fileName: string;
  onProgress?: (progress: number) => void;
  shouldCancel?: () => boolean;
  startSeconds: number;
  videoBlob: Blob;
}) {
  const trimDuration = endSeconds - startSeconds;

  if (trimDuration <= 0) {
    throw new VideoExportFailedError("Choose a valid shorten range.");
  }

  const ffmpeg = await loadFfmpeg(onProgress ?? (() => undefined), {
    logLabel: "ffmpeg video trim",
  });

  const extension = getInputExtension(fileName);
  const inputFile = `input.${extension}`;
  const outputFile = `trimmed.${extension}`;

  await ffmpeg.writeFile(inputFile, await fetchFile(videoBlob));

  const exitCode = await ffmpeg.exec([
    "-ss",
    startSeconds.toFixed(3),
    "-i",
    inputFile,
    "-t",
    trimDuration.toFixed(3),
    "-c",
    "copy",
    "-avoid_negative_ts",
    "make_zero",
    "-movflags",
    "+faststart",
    outputFile,
  ]);

  if (shouldCancel?.()) {
    throw new VideoExportCancelledError();
  }

  if (exitCode !== 0) {
    throw new VideoExportFailedError("Video shorten failed. Please try again.");
  }

  const outputBytes = assertFfmpegOutput(
    await ffmpeg.readFile(outputFile),
    "Shortened video",
  );

  await Promise.allSettled([
    ffmpeg.deleteFile(inputFile),
    ffmpeg.deleteFile(outputFile),
  ]);

  const mimeType = extension === "webm" ? "video/webm" : "video/mp4";

  return new Blob([new Uint8Array(outputBytes)], { type: mimeType });
}
