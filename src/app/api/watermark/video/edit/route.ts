import { NextResponse } from "next/server";
import {
  mergeServerVideosFromStorage,
  ServerVideoEditError,
  ServerVideoProcessingCancelledError,
  trimServerVideoFromStorage,
} from "../../../../../lib/serverVideoEditRoute";
import { ServerVideoProcessingError } from "../../../../../lib/serverVideoExportRoute";
import { isServerVideoExportConfigured } from "../../../../../../utils/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

type StorageMergePayload = {
  action: "merge";
  jobId: string;
  videos: Array<{ fileName: string; videoPath: string }>;
};

type StorageTrimPayload = {
  action: "trim";
  endSeconds: number;
  fileName: string;
  jobId: string;
  startSeconds: number;
  videoPath: string;
};

export async function POST(request: Request) {
  if (!isServerVideoExportConfigured()) {
    return NextResponse.json(
      {
        error:
          "Server video processing is not configured. Try a shorter clip under one minute for browser processing.",
      },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as StorageMergePayload | StorageTrimPayload;

    if (body.action === "merge") {
      if (
        typeof body.jobId !== "string" ||
        !Array.isArray(body.videos) ||
        body.videos.length < 2
      ) {
        return NextResponse.json(
          { error: "Provide at least two uploaded videos to merge." },
          { status: 400 },
        );
      }

      for (const [index, video] of body.videos.entries()) {
        if (
          typeof video?.fileName !== "string" ||
          typeof video?.videoPath !== "string"
        ) {
          return NextResponse.json(
            { error: `Video ${index + 1} is missing upload data.` },
            { status: 400 },
          );
        }
      }

      const merged = await mergeServerVideosFromStorage({
        jobId: body.jobId,
        signal: request.signal,
        videos: body.videos,
      });

      return NextResponse.json(merged);
    }

    if (body.action === "trim") {
      if (
        typeof body.jobId !== "string" ||
        typeof body.videoPath !== "string" ||
        typeof body.fileName !== "string" ||
        typeof body.startSeconds !== "number" ||
        typeof body.endSeconds !== "number"
      ) {
        return NextResponse.json(
          { error: "Missing trim video payload." },
          { status: 400 },
        );
      }

      const trimmed = await trimServerVideoFromStorage({
        endSeconds: body.endSeconds,
        fileName: body.fileName,
        jobId: body.jobId,
        signal: request.signal,
        startSeconds: body.startSeconds,
        videoPath: body.videoPath,
      });

      return NextResponse.json(trimmed);
    }

    return NextResponse.json(
      { error: "Unsupported video edit action." },
      { status: 400 },
    );
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
