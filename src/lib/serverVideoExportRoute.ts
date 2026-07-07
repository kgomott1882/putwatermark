import {
  createAdminClient,
  WATERMARK_TEMP_BUCKET,
} from "../../utils/supabase/admin";
import {
  getVideoExportRejectionMessage,
  isServerVideoExportEligible,
} from "./videoExportLimits";
import {
  processVideoWithOverlayInTmp,
  ServerVideoProcessingCancelledError,
  ServerVideoProcessingError,
} from "./serverVideoProcessor";

export {
  ServerVideoProcessingCancelledError,
  ServerVideoProcessingError,
} from "./serverVideoProcessor";

type UploadUrlRequest = {
  duration: number;
  fileName: string;
  fileSizeBytes: number;
  height: number;
  width: number;
};

type ProcessVideoRequest = {
  inputFileName: string;
  jobId: string;
  overlayBase64: string;
  videoPath: string;
};

function getInputExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "mov" || extension === "webm" || extension === "mp4") {
    return extension;
  }

  return "mp4";
}

function sanitizeJobId(jobId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) {
    throw new ServerVideoProcessingError("Invalid export job id.");
  }

  return jobId;
}

function decodeOverlayBase64(overlayBase64: string) {
  try {
    const buffer = Buffer.from(overlayBase64, "base64");

    if (!buffer.byteLength) {
      throw new ServerVideoProcessingError("Watermark overlay PNG was empty.");
    }

    return buffer;
  } catch {
    throw new ServerVideoProcessingError("Invalid watermark overlay PNG.");
  }
}

export async function createServerVideoUploadTarget({
  duration,
  fileName,
  fileSizeBytes,
  height,
  width,
}: UploadUrlRequest) {
  if (
    !isServerVideoExportEligible(duration, width, height, fileSizeBytes)
  ) {
    throw new ServerVideoProcessingError(getVideoExportRejectionMessage());
  }

  const jobId = crypto.randomUUID();
  const extension = getInputExtension(fileName);
  const videoPath = `jobs/${jobId}/input.${extension}`;
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(WATERMARK_TEMP_BUCKET)
    .createSignedUploadUrl(videoPath, { upsert: true });

  if (error || !data?.signedUrl || !data.token) {
    throw new ServerVideoProcessingError(
      "Could not prepare server upload. Check Supabase Storage configuration.",
    );
  }

  return {
    jobId,
    token: data.token,
    uploadPath: videoPath,
    uploadUrl: data.signedUrl,
  };
}

async function cleanupStoragePaths(paths: string[]) {
  if (!paths.length) {
    return;
  }

  const supabase = createAdminClient();
  await supabase.storage.from(WATERMARK_TEMP_BUCKET).remove(paths);
}

export async function processServerVideoExport(
  body: ProcessVideoRequest,
  signal?: AbortSignal,
) {
  const jobId = sanitizeJobId(body.jobId);
  const overlayPngBytes = decodeOverlayBase64(body.overlayBase64);
  const supabase = createAdminClient();
  const outputPath = `jobs/${jobId}/output.mp4`;

  try {
    if (signal?.aborted) {
      throw new ServerVideoProcessingCancelledError();
    }

    const { data: inputBlob, error: downloadError } = await supabase.storage
      .from(WATERMARK_TEMP_BUCKET)
      .download(body.videoPath);

    if (downloadError || !inputBlob) {
      throw new ServerVideoProcessingError(
        "Could not read the uploaded video from storage.",
      );
    }

    await cleanupStoragePaths([body.videoPath]);

    const inputVideoBytes = Buffer.from(await inputBlob.arrayBuffer());
    const outputVideoBytes = await processVideoWithOverlayInTmp({
      inputFileName: body.inputFileName,
      inputVideoBytes,
      overlayPngBytes,
      signal,
    });

    const { error: uploadError } = await supabase.storage
      .from(WATERMARK_TEMP_BUCKET)
      .upload(outputPath, outputVideoBytes, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      throw new ServerVideoProcessingError(
        "Could not store the processed video.",
      );
    }

    const { data: signedDownload, error: signedDownloadError } =
      await supabase.storage
        .from(WATERMARK_TEMP_BUCKET)
        .createSignedUrl(outputPath, 60 * 30);

    if (signedDownloadError || !signedDownload?.signedUrl) {
      throw new ServerVideoProcessingError(
        "Processed video was created but could not be shared for download.",
      );
    }

    return {
      downloadUrl: signedDownload.signedUrl,
      jobId,
      outputPath,
    };
  } catch (error) {
    await cleanupStoragePaths([body.videoPath, outputPath]);
    throw error;
  }
}

export async function cleanupCancelledServerVideoJob({
  jobId,
  videoPath,
}: {
  jobId: string;
  videoPath?: string;
}) {
  const safeJobId = sanitizeJobId(jobId);
  const paths = videoPath ? [videoPath] : [];

  await cleanupStoragePaths(paths);
  await cleanupStoragePaths([
    `jobs/${safeJobId}/output.mp4`,
    ...(videoPath ? [] : [`jobs/${safeJobId}`]),
  ]);
}
