import { NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { isSupabaseAdminConfigured } from "../../../../../utils/supabase/admin";
import {
  authorizeExport,
  ExportAuthorizeError,
  getClientIp,
  parseExportFileMeta,
  parseExportFileType,
  sanitizeExportId,
} from "../../../../lib/exportAuthorize";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Export authorization is not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as {
      exportId?: string;
      fileType?: string;
      fileMeta?: unknown;
    };

    if (typeof body.exportId !== "string" || typeof body.fileType !== "string") {
      return NextResponse.json(
        { error: "exportId and fileType are required." },
        { status: 400 },
      );
    }

    const exportId = sanitizeExportId(body.exportId);
    const fileType = parseExportFileType(body.fileType);
    const fileMeta = parseExportFileMeta(fileType, exportId, body.fileMeta);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const result = await authorizeExport({
      exportId,
      fileMeta,
      fileType,
      ipAddress: getClientIp(request),
      userId: user?.id ?? null,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ExportAuthorizeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Could not authorize export." },
      { status: 500 },
    );
  }
}
