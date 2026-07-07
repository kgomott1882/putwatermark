import { NextResponse } from "next/server";
import { cleanupCancelledServerVideoJob } from "../../../../../lib/serverVideoExportRoute";
import { isServerVideoExportConfigured } from "../../../../../../utils/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isServerVideoExportConfigured()) {
    return NextResponse.json({ ok: true });
  }

  try {
    const body = (await request.json()) as {
      jobId?: string;
      outputPath?: string;
    };

    if (typeof body.jobId !== "string") {
      return NextResponse.json({ error: "Missing export job id." }, { status: 400 });
    }

    await cleanupCancelledServerVideoJob({
      jobId: body.jobId,
      videoPath: body.outputPath,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
