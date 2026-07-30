import { NextResponse } from "next/server";
import {
  getLongVideoExportJobStatus,
  ServerVideoProcessingError,
} from "../../../../../../lib/serverVideoExportRoute";
import { requireAuthenticatedUserId } from "../../../../../../lib/serverVideoExportAuth";
import { isServerVideoExportConfigured } from "../../../../../../../utils/supabase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  if (!isServerVideoExportConfigured()) {
    return NextResponse.json(
      { error: "Server video export is not configured." },
      { status: 503 },
    );
  }

  try {
    const userId = await requireAuthenticatedUserId();
    const { jobId } = await context.params;
    const job = await getLongVideoExportJobStatus(jobId, userId);
    return NextResponse.json({ job });
  } catch (error) {
    const message =
      error instanceof ServerVideoProcessingError
        ? error.message
        : "Could not load video export job.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
