import { NextResponse } from "next/server";
import {
  processLongVideoExportChunk,
  ServerVideoProcessingCancelledError,
  ServerVideoProcessingError,
} from "../../../../../../../../lib/serverVideoExportRoute";
import { requireAuthenticatedUserId, requireCleanServerVideoJobAuthorization } from "../../../../../../../../lib/serverVideoExportAuth";
import { isServerVideoExportConfigured } from "../../../../../../../../../utils/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ index: string; jobId: string }>;
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
    const { index, jobId } = await context.params;
    await requireCleanServerVideoJobAuthorization(jobId, userId);
    const chunkIndex = Number(index);
    const body = (await request.json()) as {
      inputFileName?: string;
      overlayBase64?: string;
      overlayPasses?: Array<{
        overlayBase64?: string;
        visibleFromSeconds?: number;
        visibleUntilSeconds?: number;
      }>;
    };

    const hasOverlayPasses =
      Array.isArray(body.overlayPasses) && body.overlayPasses.length > 0;
    const hasLegacyOverlay = typeof body.overlayBase64 === "string";

    if (
      !Number.isInteger(chunkIndex) ||
      chunkIndex < 0 ||
      typeof body.inputFileName !== "string" ||
      (!hasOverlayPasses && !hasLegacyOverlay)
    ) {
      return NextResponse.json(
        { error: "Missing video chunk processing payload." },
        { status: 400 },
      );
    }

    const job = await processLongVideoExportChunk(
      {
        chunkIndex,
        inputFileName: body.inputFileName,
        jobId,
        overlayBase64: body.overlayBase64,
        overlayPasses: body.overlayPasses as
          | Array<{
              overlayBase64: string;
              visibleFromSeconds?: number;
              visibleUntilSeconds?: number;
            }>
          | undefined,
        userId,
      },
      request.signal,
    );

    return NextResponse.json({ job });
  } catch (error) {
    if (error instanceof ServerVideoProcessingCancelledError) {
      return NextResponse.json({ error: "Export cancelled." }, { status: 499 });
    }

    const message =
      error instanceof ServerVideoProcessingError
        ? error.message
        : "Video chunk processing failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
