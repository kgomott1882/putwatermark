import { createClient } from "../../utils/supabase/server";
import { createAdminClient } from "../../utils/supabase/admin";
import {
  calculateExportCost,
  ExportCostError,
  isServerRoutedVideoFileMeta,
  type ExportFileMeta,
} from "./exportCost";
import { sanitizeExportId } from "./exportAuthorize";
import { getVideoExportJob } from "./serverVideoExportJob";
import { ServerVideoProcessingError } from "./serverVideoProcessor";

export async function requireAuthenticatedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new ServerVideoProcessingError(
      "Sign in to export longer videos on our servers.",
    );
  }

  if (!user.email_confirmed_at) {
    throw new ServerVideoProcessingError(
      "Confirm your email address before exporting server processed videos.",
    );
  }

  return user.id;
}

async function verifyCleanExportAuthorization(
  exportId: string,
  userId: string,
  expectedCost: number,
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("export_authorizations")
    .select("cost, decision")
    .eq("export_id", exportId)
    .eq("user_id", userId)
    .eq("decision", "clean")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new ServerVideoProcessingError(
      "Server video export requires sufficient credits. Authorize export before uploading.",
    );
  }

  if (typeof data.cost !== "number" || data.cost < expectedCost) {
    throw new ServerVideoProcessingError(
      "Export authorization does not match this video's billing.",
    );
  }
}

export async function requireCleanServerVideoExportAuthorization({
  exportId,
  fileMeta,
  userId,
}: {
  exportId: string;
  fileMeta: ExportFileMeta;
  userId: string;
}) {
  const normalizedExportId = sanitizeExportId(exportId);

  if (!isServerRoutedVideoFileMeta(fileMeta)) {
    throw new ServerVideoProcessingError(
      "This video does not require server side export.",
    );
  }

  let costResult;

  try {
    costResult = await calculateExportCost("video", fileMeta, {
      exportId: normalizedExportId,
    });
  } catch (error) {
    throw new ServerVideoProcessingError(
      error instanceof ExportCostError
        ? error.message
        : "Could not calculate server video export billing.",
    );
  }

  if (!costResult.videoServerRouted || costResult.cost <= 0) {
    throw new ServerVideoProcessingError(
      "Server video export requires sufficient credits.",
    );
  }

  await verifyCleanExportAuthorization(
    normalizedExportId,
    userId,
    costResult.cost,
  );

  return {
    cost: costResult.cost,
    exportId: normalizedExportId,
  };
}

export async function requireCleanServerVideoJobAuthorization(
  jobId: string,
  userId: string,
) {
  const job = await getVideoExportJob(jobId);

  if (!job || job.user_id !== userId) {
    throw new ServerVideoProcessingError("Video export job not found.");
  }

  if (!job.export_id) {
    throw new ServerVideoProcessingError(
      "Server video export requires sufficient credits. Authorize export before processing.",
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("export_authorizations")
    .select("cost, decision")
    .eq("export_id", job.export_id)
    .eq("user_id", userId)
    .eq("decision", "clean")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data || typeof data.cost !== "number" || data.cost <= 0) {
    throw new ServerVideoProcessingError(
      "Server video export requires sufficient credits. Authorize export before processing.",
    );
  }

  return {
    cost: data.cost,
    exportId: job.export_id,
    job,
  };
}
