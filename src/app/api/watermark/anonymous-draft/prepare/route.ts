import { NextResponse } from "next/server";
import { isSupabaseAdminConfigured } from "../../../../../../utils/supabase/admin";
import {
  AnonymousExportDraftError,
  prepareAnonymousExportDraft,
} from "../../../../../lib/anonymousExportDraftRoute";
import type {
  AnonymousDraftMediaKind,
  AnonymousDraftUploadDescriptor,
} from "../../../../../lib/anonymousExportDraftState";

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
      files?: AnonymousDraftUploadDescriptor[];
      mediaKind?: AnonymousDraftMediaKind;
      sessionId?: string;
    };

    if (typeof body.sessionId !== "string" || !body.sessionId.trim()) {
      return NextResponse.json(
        { error: "sessionId is required and must be a non-empty string." },
        { status: 400 },
      );
    }

    if (typeof body.mediaKind !== "string") {
      return NextResponse.json(
        { error: "mediaKind is required." },
        { status: 400 },
      );
    }

    if (
      body.mediaKind !== "image" &&
      body.mediaKind !== "pdf" &&
      body.mediaKind !== "video"
    ) {
      return NextResponse.json(
        {
          error: `mediaKind must be "image", "pdf", or "video" (received ${JSON.stringify(body.mediaKind)}).`,
        },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.files)) {
      return NextResponse.json(
        { error: "files is required and must be an array." },
        { status: 400 },
      );
    }

    if (!body.files.length) {
      return NextResponse.json(
        { error: "files must include at least one upload descriptor." },
        { status: 400 },
      );
    }

    const result = await prepareAnonymousExportDraft({
      files: body.files,
      mediaKind: body.mediaKind,
      sessionId: body.sessionId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof AnonymousExportDraftError
        ? error.message
        : "Could not prepare anonymous export draft.";

    const status = error instanceof AnonymousExportDraftError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
