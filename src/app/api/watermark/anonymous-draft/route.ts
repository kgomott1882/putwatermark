import { NextResponse } from "next/server";
import { isSupabaseAdminConfigured } from "../../../../../utils/supabase/admin";
import {
  AnonymousExportDraftError,
  deleteAnonymousExportDraft,
  getAnonymousExportDraft,
} from "../../../../lib/anonymousExportDraftRoute";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Anonymous draft storage is not configured." },
      { status: 503 },
    );
  }

  try {
    const sessionId = new URL(request.url).searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    const draft = await getAnonymousExportDraft(sessionId);
    return NextResponse.json(draft);
  } catch (error) {
    const message =
      error instanceof AnonymousExportDraftError
        ? error.message
        : "Could not load anonymous export draft.";

    const status = error instanceof AnonymousExportDraftError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Anonymous draft storage is not configured." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as { sessionId?: string };

    if (typeof body.sessionId !== "string") {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    await deleteAnonymousExportDraft(body.sessionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof AnonymousExportDraftError
        ? error.message
        : "Could not delete anonymous export draft.";

    const status = error instanceof AnonymousExportDraftError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
