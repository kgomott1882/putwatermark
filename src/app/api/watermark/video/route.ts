import { NextResponse } from "next/server";
import {
  cleanupCancelledServerVideoJob,
  processServerVideoExport,
  ServerVideoProcessingCancelledError,
  ServerVideoProcessingError,
} from "../../../../lib/serverVideoExportRoute";
import { isServerVideoExportConfigured } from "../../../../../utils/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!isServerVideoExportConfigured()) {
    return NextResponse.json(
      {
        error:
          "Server video export is not configured. Set SUPABASE_SERVICE_ROLE_KEY and create the watermark-temp storage bucket.",
      },
      { status: 503 },
    );
  }

  let jobId: string | undefined;
  let videoPath: string | undefined;

  try {
    const body = (await request.json()) as {
      inputFileName?: string;
      jobId?: string;
      overlayBase64?: string;
      videoPath?: string;
    };

    jobId = body.jobId;
    videoPath = body.videoPath;

    if (
      typeof body.jobId !== "string" ||
      typeof body.videoPath !== "string" ||
      typeof body.overlayBase64 !== "string" ||
      typeof body.inputFileName !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing server video export payload." },
        { status: 400 },
      );
    }

    const result = await processServerVideoExport(
      {
        inputFileName: body.inputFileName,
        jobId: body.jobId,
        overlayBase64: body.overlayBase64,
        videoPath: body.videoPath,
      },
      request.signal,
    );

    return NextResponse.json(result);
  } catch (error) {
    if (jobId) {
      await cleanupCancelledServerVideoJob({
        jobId,
        videoPath,
      }).catch(() => undefined);
    }

    if (error instanceof ServerVideoProcessingCancelledError) {
      return NextResponse.json({ error: "Export cancelled." }, { status: 499 });
    }

    const message =
      error instanceof ServerVideoProcessingError
        ? error.message
        : "Server video export failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
