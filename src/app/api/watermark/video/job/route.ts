import { NextResponse } from "next/server";
import {
  ServerVideoProcessingCancelledError,
  ServerVideoProcessingError,
  splitLongVideoExportJob,
} from "../../../../../lib/serverVideoExportRoute";
import {
  requireAuthenticatedUserId,
  requireCleanServerVideoExportAuthorization,
  requireCleanServerVideoJobAuthorization,
} from "../../../../../lib/serverVideoExportAuth";
import { sanitizeExportId } from "../../../../../lib/exportAuthorize";
import { isServerVideoExportConfigured } from "../../../../../../utils/supabase/admin";

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

  try {
    const userId = await requireAuthenticatedUserId();
    const body = (await request.json()) as {
      durationSeconds?: number;
      exportId?: string;
      fileSizeBytes?: number;
      height?: number;
      inputFileName?: string;
      jobId?: string;
      videoPath?: string;
      width?: number;
    };

    if (
      typeof body.jobId !== "string" ||
      typeof body.videoPath !== "string" ||
      typeof body.inputFileName !== "string" ||
      typeof body.exportId !== "string" ||
      typeof body.durationSeconds !== "number" ||
      typeof body.fileSizeBytes !== "number" ||
      typeof body.width !== "number" ||
      typeof body.height !== "number"
    ) {
      return NextResponse.json(
        { error: "Missing long video job payload." },
        { status: 400 },
      );
    }

    const exportId = sanitizeExportId(body.exportId);

    await requireCleanServerVideoExportAuthorization({
      exportId,
      fileMeta: {
        durationSeconds: body.durationSeconds,
        fileSizeBytes: body.fileSizeBytes,
        height: body.height,
        width: body.width,
      },
      userId,
    });

    const job = await splitLongVideoExportJob(
      {
        exportId,
        inputFileName: body.inputFileName,
        jobId: body.jobId,
        userId,
        videoPath: body.videoPath,
      },
      request.signal,
    );

    return NextResponse.json({ job });
  } catch (error) {
    if (error instanceof ServerVideoProcessingCancelledError) {
      return NextResponse.json({ error: "Export cancelled." }, { status: 499 });
    }

    const message =
      error instanceof ServerVideoProcessingError
        ? error.message
        : "Long video split failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
