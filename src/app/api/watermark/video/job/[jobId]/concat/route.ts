import { NextResponse } from "next/server";
import {
  concatLongVideoExportJob,
  ServerVideoProcessingCancelledError,
  ServerVideoProcessingError,
} from "../../../../../../../lib/serverVideoExportRoute";
import { requireAuthenticatedUserId, requireCleanServerVideoJobAuthorization } from "../../../../../../../lib/serverVideoExportAuth";
import { isServerVideoExportConfigured } from "../../../../../../../../utils/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  if (!isServerVideoExportConfigured()) {
    return NextResponse.json(
      { error: "Server video export is not configured." },
      { status: 503 },
    );
  }

  try {
    const userId = await requireAuthenticatedUserId();
    const { jobId } = await context.params;
    await requireCleanServerVideoJobAuthorization(jobId, userId);
    const result = await concatLongVideoExportJob(jobId, userId, request.signal);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServerVideoProcessingCancelledError) {
      return NextResponse.json({ error: "Export cancelled." }, { status: 499 });
    }

    const message =
      error instanceof ServerVideoProcessingError
        ? error.message
        : "Video concatenation failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
