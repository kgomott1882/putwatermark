import { createAdminClient } from "../../utils/supabase/admin";

export type VideoExportJobStatus =
  | "uploaded"
  | "splitting"
  | "split_complete"
  | "processing"
  | "concatenating"
  | "ready"
  | "failed";

export type VideoExportChunkStatus = "pending" | "split" | "encoded" | "failed";

export type VideoExportChunkRecord = {
  encodedPath: string;
  index: number;
  rawPath: string;
  status: VideoExportChunkStatus;
};

export type VideoExportJobRecord = {
  id: string;
  user_id: string;
  export_id: string | null;
  status: VideoExportJobStatus;
  input_path: string;
  input_file_name: string;
  output_path: string | null;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  split_at_seconds: number[];
  chunk_count: number;
  chunks: VideoExportChunkRecord[];
  error: string | null;
  created_at: string;
  updated_at: string;
};

function mapJobRow(row: Record<string, unknown>): VideoExportJobRecord {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    export_id: row.export_id ? String(row.export_id) : null,
    status: row.status as VideoExportJobStatus,
    input_path: String(row.input_path),
    input_file_name: String(row.input_file_name),
    output_path: row.output_path ? String(row.output_path) : null,
    duration_seconds:
      row.duration_seconds === null || row.duration_seconds === undefined
        ? null
        : Number(row.duration_seconds),
    file_size_bytes:
      row.file_size_bytes === null || row.file_size_bytes === undefined
        ? null
        : Number(row.file_size_bytes),
    split_at_seconds: Array.isArray(row.split_at_seconds)
      ? row.split_at_seconds.map((value) => Number(value))
      : [],
    chunk_count: Number(row.chunk_count ?? 0),
    chunks: Array.isArray(row.chunks)
      ? (row.chunks as VideoExportChunkRecord[])
      : [],
    error: row.error ? String(row.error) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function insertVideoExportJob({
  exportId,
  inputFileName,
  inputPath,
  jobId,
  userId,
}: {
  exportId?: string;
  inputFileName: string;
  inputPath: string;
  jobId: string;
  userId: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("video_export_jobs")
    .insert({
      export_id: exportId ?? null,
      id: jobId,
      input_file_name: inputFileName,
      input_path: inputPath,
      status: "uploaded",
      user_id: userId,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create video export job.");
  }

  return mapJobRow(data);
}

export async function getVideoExportJob(jobId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("video_export_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapJobRow(data) : null;
}

export async function getVideoExportJobByExportId(
  exportId: string,
  userId?: string,
) {
  const supabase = createAdminClient();
  let query = supabase
    .from("video_export_jobs")
    .select("*")
    .eq("export_id", exportId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapJobRow(data) : null;
}

export async function updateVideoExportJob(
  jobId: string,
  patch: Partial<{
    chunk_count: number;
    chunks: VideoExportChunkRecord[];
    duration_seconds: number;
    error: string | null;
    file_size_bytes: number;
    output_path: string | null;
    split_at_seconds: number[];
    status: VideoExportJobStatus;
  }>,
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("video_export_jobs")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not update video export job.");
  }

  return mapJobRow(data);
}

export async function markVideoExportJobFailed(jobId: string, message: string) {
  return updateVideoExportJob(jobId, {
    error: message,
    status: "failed",
  });
}

export function serializeVideoExportJob(job: VideoExportJobRecord) {
  return {
    chunkCount: job.chunk_count,
    chunks: job.chunks,
    durationSeconds: job.duration_seconds,
    error: job.error,
    exportId: job.export_id,
    jobId: job.id,
    outputPath: job.output_path,
    splitAtSeconds: job.split_at_seconds,
    status: job.status,
  };
}
