import * as tus from "tus-js-client";
import { getSupabasePublicKey } from "../../utils/supabase/publicServer";
import { VideoExportCancelledError, VideoExportFailedError } from "./watermarkVideoExport";
import {
  clearPendingVideoUpload,
  getVideoUploadFingerprint,
  readPendingVideoUpload,
  writePendingVideoUpload,
} from "./videoUploadResume";

const TUS_CHUNK_SIZE_BYTES = 6 * 1024 * 1024;

type UploadVideoWithTusInput = {
  abortSignal?: AbortSignal;
  bucketName: string;
  fileName: string;
  fileSizeBytes: number;
  inputFileName: string;
  jobId: string;
  onProgress: (progress: number) => void;
  progressRange?: { from: number; to: number };
  shouldCancel: () => boolean;
  tusEndpoint: string;
  uploadContentType: string;
  uploadPath: string;
  uploadToken: string;
  videoBlob: Blob;
};

function isSignedUploadAuthError(error: unknown) {
  if (!(error instanceof tus.DetailedError)) {
    return false;
  }

  const status = error.originalResponse?.getStatus();
  const body = error.originalResponse?.getBody?.() ?? "";

  return (
    status === 401 ||
    status === 403 ||
    /invalid compact jws/i.test(body) ||
    /invalid signature/i.test(body) ||
    /unauthorized/i.test(body)
  );
}

function getUploadErrorMessage(error: unknown) {
  if (error instanceof tus.DetailedError) {
    const status = error.originalResponse?.getStatus();

    if (status === 413) {
      return "Video too large for server upload. Try a shorter or smaller clip.";
    }

    if (error.message) {
      return `Video upload failed: ${error.message}`;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Video upload failed. Please check your connection and try again.";
}

function blobToUploadFile(
  videoBlob: Blob,
  inputFileName: string,
  uploadContentType: string,
) {
  if (videoBlob instanceof File) {
    return videoBlob;
  }

  return new File([videoBlob], inputFileName, { type: uploadContentType });
}

export async function uploadVideoWithTus({
  abortSignal,
  bucketName,
  fileSizeBytes,
  inputFileName,
  jobId,
  onProgress,
  progressRange,
  shouldCancel,
  tusEndpoint,
  uploadContentType,
  uploadPath,
  uploadToken,
  videoBlob,
}: UploadVideoWithTusInput) {
  const progressFrom = progressRange?.from ?? 0;
  const progressTo = progressRange?.to ?? 40;
  const fingerprintKey = getVideoUploadFingerprint(inputFileName, fileSizeBytes);
  const uploadFile = blobToUploadFile(videoBlob, inputFileName, uploadContentType);

  writePendingVideoUpload(fingerprintKey, {
    createdAt: Date.now(),
    jobId,
    uploadPath,
  });

  const supabaseAnonKey = getSupabasePublicKey();

  if (!supabaseAnonKey) {
    throw new VideoExportFailedError(
      "Server video upload is missing Supabase configuration.",
    );
  }

  return new Promise<void>((resolve, reject) => {
    let upload: tus.Upload | null = null;
    let abortRequested = false;
    let clearedStaleResume = false;

    const handleAbort = () => {
      abortRequested = true;
      upload?.abort(true);
      reject(new VideoExportCancelledError());
    };

    abortSignal?.addEventListener("abort", handleAbort, { once: true });

    const startUpload = (resumeFromPrevious: boolean) => {
      upload = new tus.Upload(uploadFile, {
        chunkSize: TUS_CHUNK_SIZE_BYTES,
        endpoint: tusEndpoint,
        fingerprint: () =>
          Promise.resolve(
            `putwatermark-signed-v1-${uploadPath}-${uploadFile.size}`,
          ),
        headers: {
          apikey: supabaseAnonKey,
          "x-signature": uploadToken,
          "x-upsert": "true",
        },
        metadata: {
          bucketName,
          cacheControl: "3600",
          contentType: uploadContentType,
          objectName: uploadPath,
        },
        onError: (error) => {
          abortSignal?.removeEventListener("abort", handleAbort);

          if (abortRequested || shouldCancel()) {
            reject(new VideoExportCancelledError());
            return;
          }

          if (!clearedStaleResume && isSignedUploadAuthError(error)) {
            clearedStaleResume = true;
            clearPendingVideoUpload(fingerprintKey);
            const urlStorage =
              upload?.options.urlStorage ?? tus.defaultOptions.urlStorage;
            void upload
              ?.findPreviousUploads()
              .then((previousUploads) =>
                Promise.all(
                  previousUploads.map((entry) =>
                    urlStorage.removeUpload(entry.urlStorageKey),
                  ),
                ),
              )
              .finally(() => {
                startUpload(false);
              });
            return;
          }

          reject(
            new VideoExportFailedError(
              `${getUploadErrorMessage(error)} You can click Export again to resume this upload.`,
            ),
          );
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          if (bytesTotal > 0) {
            const ratio = bytesUploaded / bytesTotal;
            onProgress(
              Math.round(progressFrom + ratio * (progressTo - progressFrom)),
            );
          }
        },
        onSuccess: () => {
          abortSignal?.removeEventListener("abort", handleAbort);
          clearPendingVideoUpload(fingerprintKey);
          resolve();
        },
        removeFingerprintOnSuccess: true,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        uploadDataDuringCreation: true,
      });

      void upload
        .findPreviousUploads()
        .then((previousUploads) => {
          if (shouldCancel()) {
            handleAbort();
            return;
          }

          if (resumeFromPrevious && previousUploads.length > 0) {
            upload?.resumeFromPreviousUpload(previousUploads[0]);
          }

          upload?.start();
        })
        .catch((error) => {
          abortSignal?.removeEventListener("abort", handleAbort);
          reject(
            new VideoExportFailedError(
              `${getUploadErrorMessage(error)} You can click Export again to resume this upload.`,
            ),
          );
        });
    };

    startUpload(true);
  });
}

export function getResumeJobIdForVideoUpload(
  inputFileName: string,
  fileSizeBytes: number,
) {
  return readPendingVideoUpload(
    getVideoUploadFingerprint(inputFileName, fileSizeBytes),
  )?.jobId;
}
