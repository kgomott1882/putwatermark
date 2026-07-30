import { NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import {
  ExportAuthorizeError,
  sanitizeExportId,
} from "../../../../lib/exportAuthorize";
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Sign in is required to upload export files." },
        { status: 401 },
      );
    }

    if (!user.email_confirmed_at) {
      return NextResponse.json(
        {
          error:
            "Confirm your email address before exporting. Check your inbox, then try again.",
        },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const exportIdRaw = formData.get("exportId");

    if (typeof exportIdRaw !== "string") {
      return NextResponse.json({ error: "exportId is required." }, { status: 400 });
    }

    const exportId = sanitizeExportId(exportIdRaw);
    const artifactRaw = formData.get("artifact");
    const artifact =
      artifactRaw === "fill-manifest"
        ? "fill-manifest"
        : artifactRaw === "signature-placements"
          ? "signature-placements"
          : "pdf";
    const admin = createAdminClient();

    if (artifact === "fill-manifest") {
      const manifestEntry = formData.get("manifest");
      let manifestText: string | null = null;

      if (manifestEntry instanceof File) {
        manifestText = await manifestEntry.text();
      } else if (typeof manifestEntry === "string") {
        manifestText = manifestEntry;
      }

      if (!manifestText?.trim()) {
        return NextResponse.json(
          { error: "Fill manifest payload is required." },
          { status: 400 },
        );
      }

      const uploadPath = `exports/${exportId}/fill-manifest.json`;
      const manifestBytes = Buffer.from(manifestText, "utf-8");
      const { error } = await admin.storage
        .from(WATERMARK_TEMP_BUCKET)
        .upload(uploadPath, manifestBytes, {
          contentType: "application/json",
          upsert: true,
        });

      if (error) {
        return NextResponse.json(
          {
            error:
              error.message ||
              "Could not upload fill manifest for credit check.",
          },
          { status: 503 },
        );
      }

      return NextResponse.json({
        fillManifestPath: uploadPath,
      });
    }

    if (artifact === "signature-placements") {
      const manifestEntry = formData.get("manifest");
      let manifestText: string | null = null;

      if (manifestEntry instanceof File) {
        manifestText = await manifestEntry.text();
      } else if (typeof manifestEntry === "string") {
        manifestText = manifestEntry;
      }

      if (!manifestText?.trim()) {
        return NextResponse.json(
          { error: "Signature placement manifest payload is required." },
          { status: 400 },
        );
      }

      const uploadPath = `exports/${exportId}/signature-placements.json`;
      const manifestBytes = Buffer.from(manifestText, "utf-8");
      const { error } = await admin.storage
        .from(WATERMARK_TEMP_BUCKET)
        .upload(uploadPath, manifestBytes, {
          contentType: "application/json",
          upsert: true,
        });

      if (error) {
        return NextResponse.json(
          {
            error:
              error.message ||
              "Could not upload signature placement manifest for credit check.",
          },
          { status: 503 },
        );
      }

      return NextResponse.json({
        signaturePlacementManifestPath: uploadPath,
      });
    }

    const fileNameRaw = formData.get("fileName");
    const file = formData.get("file");

    if (typeof fileNameRaw !== "string") {
      return NextResponse.json(
        { error: "fileName is required for PDF upload." },
        { status: 400 },
      );
    }

    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json(
        { error: "PDF file payload is required." },
        { status: 400 },
      );
    }

    const extension = getPdfExtension(fileNameRaw);
    const uploadPath = `exports/${exportId}/input.${extension}`;
    const pdfBytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await admin.storage
      .from(WATERMARK_TEMP_BUCKET)
      .upload(uploadPath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (error) {
      return NextResponse.json(
        {
          error: error.message || "Could not upload PDF for credit check.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      storagePath: uploadPath,
    });
  } catch (error) {
    const message =
      error instanceof ExportAuthorizeError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not upload export file.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
