import { createAdminClient } from "../utils/supabase/admin";

const supabase = createAdminClient();
const { data, error } = await supabase
  .from("video_export_jobs")
  .select(
    "id,status,chunk_count,chunks,error,duration_seconds,file_size_bytes,updated_at,created_at,input_file_name",
  )
  .order("created_at", { ascending: false })
  .limit(8);

if (error) {
  console.error(error);
  process.exit(1);
}

for (const job of data ?? []) {
  const encodedCount =
    job.chunks?.filter((chunk: { status: string }) => chunk.status === "encoded")
      .length ?? 0;
  console.log(
    JSON.stringify(
      {
        chunkCount: job.chunk_count,
        chunks: job.chunks,
        createdAt: job.created_at,
        durationSeconds: job.duration_seconds,
        encodedCount,
        error: job.error,
        fileSizeBytes: job.file_size_bytes,
        id: job.id,
        inputFileName: job.input_file_name,
        status: job.status,
        updatedAt: job.updated_at,
      },
      null,
      2,
    ),
  );
  console.log("---");
}
