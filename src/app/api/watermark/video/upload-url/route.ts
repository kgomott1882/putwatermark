import { NextResponse } from "next/server";
import {
  createServerVideoUploadTarget,
  ServerVideoProcessingError,
} from "../../../../../lib/serverVideoExportRoute";
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
    const body = (await request.json()) as {
      duration?: number;
      fileName?: string;
      fileSizeBytes?: number;
      height?: number;
      width?: number;
    };

    if (
      typeof body.duration !== "number" ||
      typeof body.fileSizeBytes !== "number" ||
      typeof body.width !== "number" ||
      typeof body.height !== "number" ||
      typeof body.fileName !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing video metadata for server upload." },
        { status: 400 },
      );
    }

    const uploadTarget = await createServerVideoUploadTarget({
      duration: body.duration,
      fileName: body.fileName,
      fileSizeBytes: body.fileSizeBytes,
      height: body.height,
      width: body.width,
    });

    return NextResponse.json(uploadTarget);
  } catch (error) {
    const message =
      error instanceof ServerVideoProcessingError
        ? error.message
        : "Could not prepare server video upload.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
