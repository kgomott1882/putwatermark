import { NextResponse } from "next/server";
import {
  createVideoEditUploadTarget,
  ServerVideoEditError,
} from "../../../../../../lib/serverVideoEditRoute";
import {
  ServerVideoProcessingError,
} from "../../../../../../lib/serverVideoExportRoute";
import { isServerVideoExportConfigured } from "../../../../../../../utils/supabase/admin";

export const runtime = "nodejs";

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
    const body = (await request.json()) as {
      duration?: number;
      fileName?: string;
      fileSizeBytes?: number;
      height?: number;
      resumeJobId?: string;
      storageObjectName?: string;
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

    const uploadTarget = await createVideoEditUploadTarget({
      duration: body.duration,
      fileName: body.fileName,
      fileSizeBytes: body.fileSizeBytes,
      height: body.height,
      resumeJobId:
        typeof body.resumeJobId === "string" ? body.resumeJobId : undefined,
      storageObjectName:
        typeof body.storageObjectName === "string"
          ? body.storageObjectName
          : undefined,
      width: body.width,
    });

    return NextResponse.json(uploadTarget);
  } catch (error) {
    const message =
      error instanceof ServerVideoEditError ||
      error instanceof ServerVideoProcessingError
        ? error.message
        : "Could not prepare server video upload.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
