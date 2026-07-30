import { NextResponse } from "next/server";
import { isSupabaseAdminConfigured } from "../../../../../../utils/supabase/admin";
import {
  AnonymousExportDraftError,
  finalizeAnonymousExportDraft,
} from "../../../../../lib/anonymousExportDraftRoute";
import type { AnonymousExportDraftState } from "../../../../../lib/anonymousExportDraftState";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Anonymous draft storage is not configured." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as {
      sessionId?: string;
      state?: AnonymousExportDraftState;
      storagePaths?: string[];
    };

    if (
      typeof body.sessionId !== "string" ||
      !body.state ||
      !Array.isArray(body.storagePaths)
    ) {
      return NextResponse.json(
        { error: "sessionId, state, and storagePaths are required." },
        { status: 400 },
      );
    }

    await finalizeAnonymousExportDraft({
      sessionId: body.sessionId,
      state: body.state,
      storagePaths: body.storagePaths,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof AnonymousExportDraftError
        ? error.message
        : "Could not finalize anonymous export draft.";

    const status = error instanceof AnonymousExportDraftError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
