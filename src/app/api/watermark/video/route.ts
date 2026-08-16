import { NextResponse } from "next/server";
import {
  cleanupCancelledServerVideoJob,
  processServerVideoExport,
  ServerVideoProcessingCancelledError,
  ServerVideoProcessingError,
} from "../../../../lib/serverVideoExportRoute";
import {
  requireAuthenticatedUserId,
  requireCleanServerVideoExportAuthorization,
} from "../../../../lib/serverVideoExportAuth";
import { sanitizeExportId } from "../../../../lib/exportAuthorize";
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
    const userId = await requireAuthenticatedUserId();
    const body = (await request.json()) as {
      durationSeconds?: number;
      exportId?: string;
      fileSizeBytes?: number;
      height?: number;
      inputFileName?: string;
      jobId?: string;
      overlayBase64?: string;
      overlayPasses?: Array<{
        overlayBase64?: string;
        visibleFromSeconds?: number;
        visibleUntilSeconds?: number;
      }>;
      trimDurationSeconds?: number;
      trimStartSeconds?: number;
      videoLongServerRouted?: boolean;
      videoPath?: string;
      videoServerRouted?: boolean;
      width?: number;
    };

    jobId = body.jobId;
    videoPath = body.videoPath;

    const hasOverlayPasses =
      Array.isArray(body.overlayPasses) && body.overlayPasses.length > 0;
    const hasLegacyOverlay = typeof body.overlayBase64 === "string";

    if (
      typeof body.exportId !== "string" ||
      typeof body.jobId !== "string" ||
      typeof body.videoPath !== "string" ||
      (!hasOverlayPasses && !hasLegacyOverlay) ||
      typeof body.inputFileName !== "string" ||
      typeof body.durationSeconds !== "number" ||
      typeof body.fileSizeBytes !== "number" ||
      typeof body.width !== "number" ||
      typeof body.height !== "number"
    ) {
      return NextResponse.json(
        { error: "Missing server video export payload." },
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
        videoLongServerRouted: body.videoLongServerRouted === true,
        videoServerRouted: body.videoServerRouted === true,
        width: body.width,
      },
      userId,
    });

    const result = await processServerVideoExport(
      {
        inputFileName: body.inputFileName,
        jobId: body.jobId,
        overlayBase64: body.overlayBase64,
        overlayPasses: body.overlayPasses as
          | Array<{
              overlayBase64: string;
              visibleFromSeconds?: number;
              visibleUntilSeconds?: number;
            }>
          | undefined,
        trimDurationSeconds: body.trimDurationSeconds,
        trimStartSeconds: body.trimStartSeconds,
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

    const status =
      error instanceof ServerVideoProcessingError &&
      message.includes("requires sufficient credits")
        ? 402
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
