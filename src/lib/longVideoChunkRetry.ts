import { VideoExportTimeoutError } from "./watermarkVideoExport";

/** Initial attempt plus two retries before failing the export. */
export const LONG_VIDEO_CHUNK_MAX_ATTEMPTS = 3;
export const LONG_VIDEO_CHUNK_RETRY_BASE_DELAY_MS = 2000;

export function getLongVideoChunkRetryDelayMs(attemptIndex: number) {
  return LONG_VIDEO_CHUNK_RETRY_BASE_DELAY_MS * 2 ** attemptIndex;
}

export function formatLongVideoChunkFailureMessage(
  chunkIndex: number,
  chunkCount: number,
  serverError?: string,
) {
  const segmentLabel = `segment ${chunkIndex + 1} of ${chunkCount}`;
  const base = `Video processing failed on ${segmentLabel} after ${LONG_VIDEO_CHUNK_MAX_ATTEMPTS} attempts.`;

  if (serverError?.trim()) {
    return `${base} ${serverError.trim()}`;
  }

  return `${base} Please try exporting again, or contact support and mention ${segmentLabel}.`;
}

export function sleepMs(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function isRetryableLongVideoChunkHttpStatus(status: number) {
  return status >= 500 || status === 408 || status === 429;
}

export function isRetryableLongVideoChunkTransportError(error: unknown) {
  if (error instanceof VideoExportTimeoutError) {
    return true;
  }

  if (error instanceof TypeError) {
    return true;
  }

  if (error instanceof DOMException && error.name === "NetworkError") {
    return true;
  }

  return false;
}
