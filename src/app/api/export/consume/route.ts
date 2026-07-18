import { NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { isSupabaseAdminConfigured } from "../../../../../utils/supabase/admin";
import {
  consumeExportCredits,
  ExportConsumeError,
} from "../../../../lib/exportConsume";
import {
  ExportAuthorizeError,
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
          "Export billing is not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
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
        { code: "authentication_required", error: "Authentication required." },
        { status: 401 },
      );
    }

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

    const result = await consumeExportCredits({
      exportId,
      fileMeta,
      fileType,
      userId: user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ExportConsumeError) {
      return NextResponse.json(
        {
          balance: error.balance,
          code: error.code,
          cost: error.cost,
          error: error.message,
        },
        { status: error.status },
      );
    }

    if (error instanceof ExportAuthorizeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Could not consume export credits." },
      { status: 500 },
    );
  }
}
