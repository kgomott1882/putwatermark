import { NextResponse } from "next/server";
import { ExportAuthorizeError, sanitizeExportId } from "../../../../lib/exportAuthorize";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
  WATERMARK_TEMP_BUCKET,
} from "../../../../../utils/supabase/admin";

export const runtime = "nodejs";

function getPdfExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension === "pdf" ? "pdf" : "pdf";
}

export async function POST(request: Request) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Export upload is not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as {
      artifact?: string;
      exportId?: string;
      fileName?: string;
    };

    if (typeof body.exportId !== "string") {
      return NextResponse.json({ error: "exportId is required." }, { status: 400 });
    }

    const exportId = sanitizeExportId(body.exportId);
    const artifact = body.artifact === "fill-manifest" ? "fill-manifest" : "pdf";

    if (artifact === "fill-manifest") {
      const uploadPath = `exports/${exportId}/fill-manifest.json`;
      const supabase = createAdminClient();
      const { data, error } = await supabase.storage
        .from(WATERMARK_TEMP_BUCKET)
        .createSignedUploadUrl(uploadPath, { upsert: true });

      if (error || !data?.signedUrl) {
        return NextResponse.json(
          { error: "Could not prepare fill manifest upload." },
          { status: 503 },
        );
      }

      return NextResponse.json({
        uploadPath,
        uploadUrl: data.signedUrl,
      });
    }

    if (typeof body.fileName !== "string") {
      return NextResponse.json(
        { error: "fileName is required for PDF upload." },
        { status: 400 },
      );
    }
    const extension = getPdfExtension(body.fileName);
    const uploadPath = `exports/${exportId}/input.${extension}`;
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(WATERMARK_TEMP_BUCKET)
      .createSignedUploadUrl(uploadPath, { upsert: true });

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: "Could not prepare export upload." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      uploadPath,
      uploadUrl: data.signedUrl,
    });
  } catch (error) {
    const message =
      error instanceof ExportAuthorizeError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not prepare export upload.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
