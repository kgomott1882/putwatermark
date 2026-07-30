import { NextResponse } from "next/server";
import {
  createServerVideoUploadTarget,
  ServerVideoProcessingError,
} from "../../../../../lib/serverVideoExportRoute";
import {
  requireAuthenticatedUserId,
  requireCleanServerVideoExportAuthorization,
} from "../../../../../lib/serverVideoExportAuth";
import { sanitizeExportId } from "../../../../../lib/exportAuthorize";
import { isServerVideoExportConfigured } from "../../../../../../utils/supabase/admin";

export const runtime = "nodejs";

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
      duration?: number;
      exportId?: string;
      fileName?: string;
      fileSizeBytes?: number;
      height?: number;
      resumeJobId?: string;
      width?: number;
    };

    if (
      typeof body.duration !== "number" ||
      typeof body.fileSizeBytes !== "number" ||
      typeof body.width !== "number" ||
      typeof body.height !== "number" ||
      typeof body.fileName !== "string" ||
      typeof body.exportId !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing video metadata for server upload." },
        { status: 400 },
      );
    }

    const exportId = sanitizeExportId(body.exportId);
    const fileMeta = {
      durationSeconds: body.duration,
      fileSizeBytes: body.fileSizeBytes,
      height: body.height,
      width: body.width,
    };

    await requireCleanServerVideoExportAuthorization({
      exportId,
      fileMeta,
      userId,
    });

    const uploadTarget = await createServerVideoUploadTarget({
      duration: body.duration,
      fileName: body.fileName,
      fileSizeBytes: body.fileSizeBytes,
      height: body.height,
      resumeJobId:
        typeof body.resumeJobId === "string" ? body.resumeJobId : undefined,
      width: body.width,
    });

    return NextResponse.json(uploadTarget);
  } catch (error) {
    const message =
      error instanceof ServerVideoProcessingError
        ? error.message
        : "Could not prepare server video upload.";

    const status =
      error instanceof ServerVideoProcessingError &&
      message.includes("requires sufficient credits")
        ? 402
        : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
