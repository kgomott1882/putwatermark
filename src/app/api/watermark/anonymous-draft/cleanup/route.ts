import { NextResponse } from "next/server";
import { isSupabaseAdminConfigured } from "../../../../../../utils/supabase/admin";
import {
  AnonymousExportDraftError,
  cleanupExpiredAnonymousExportDrafts,
} from "../../../../../lib/anonymousExportDraftRoute";

export const runtime = "nodejs";

export async function POST() {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Anonymous draft storage is not configured." },
      { status: 503 },
    );
  }

  try {
    const result = await cleanupExpiredAnonymousExportDrafts();
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof AnonymousExportDraftError
        ? error.message
        : "Could not clean up anonymous export drafts.";

    const status = error instanceof AnonymousExportDraftError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
