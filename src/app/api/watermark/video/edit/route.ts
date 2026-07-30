import { NextResponse } from "next/server";
import {
  mergeServerVideos,
  ServerVideoEditError,
  trimServerVideo,
} from "../../../../../lib/serverVideoEdit";
import {
  ServerVideoProcessingCancelledError,
  ServerVideoProcessingError,
} from "../../../../../lib/serverVideoProcessor";

export const runtime = "nodejs";
export const maxDuration = 300;

type MergePayload = {
  action: "merge";
  videos: Array<{ fileName: string; videoBase64: string }>;
};

type TrimPayload = {
  action: "trim";
  endSeconds: number;
  fileName: string;
  startSeconds: number;
  videoBase64: string;
};

function decodeBase64Video(value: string) {
  const buffer = Buffer.from(value, "base64");

  if (!buffer.byteLength) {
    throw new ServerVideoEditError("Uploaded video payload was empty.");
  }

  return buffer;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MergePayload | TrimPayload;

    if (body.action === "merge") {
      if (!Array.isArray(body.videos) || body.videos.length < 2) {
        return NextResponse.json(
          { error: "Provide at least two videos to merge." },
          { status: 400 },
        );
      }

      const videos = body.videos.map((entry, index) => {
        if (
          typeof entry?.fileName !== "string" ||
          typeof entry?.videoBase64 !== "string"
        ) {
          throw new ServerVideoEditError(
            `Video ${index + 1} is missing file data.`,
          );
        }

        return {
          bytes: decodeBase64Video(entry.videoBase64),
          fileName: entry.fileName,
        };
      });

      const mergedBytes = await mergeServerVideos({
        signal: request.signal,
        videos,
      });

      return NextResponse.json({
        fileName: "merged-video.mp4",
        videoBase64: mergedBytes.toString("base64"),
      });
    }

    if (body.action === "trim") {
      if (
        typeof body.fileName !== "string" ||
        typeof body.videoBase64 !== "string" ||
        typeof body.startSeconds !== "number" ||
        typeof body.endSeconds !== "number"
      ) {
        return NextResponse.json(
          { error: "Missing trim video payload." },
          { status: 400 },
        );
      }

      const trimmedBytes = await trimServerVideo({
        endSeconds: body.endSeconds,
        fileName: body.fileName,
        signal: request.signal,
        startSeconds: body.startSeconds,
        videoBytes: decodeBase64Video(body.videoBase64),
      });

      return NextResponse.json({
        fileName: body.fileName.replace(/(\.[^.]+)?$/, "-shortened.mp4"),
        videoBase64: trimmedBytes.toString("base64"),
      });
    }

    return NextResponse.json({ error: "Unsupported video edit action." }, { status: 400 });
  } catch (error) {
    if (error instanceof ServerVideoProcessingCancelledError) {
      return NextResponse.json({ error: error.message }, { status: 499 });
    }

    if (
      error instanceof ServerVideoEditError ||
      error instanceof ServerVideoProcessingError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("[video edit] unexpected failure", error);
    return NextResponse.json(
      { error: "Video edit failed. Please try again." },
      { status: 500 },
    );
  }
}
