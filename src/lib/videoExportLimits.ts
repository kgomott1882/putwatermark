export const CLIENT_VIDEO_MAX_DURATION_SECONDS = 60;
export const CLIENT_VIDEO_MAX_LONG_EDGE = 1920;
export const CLIENT_VIDEO_MAX_SHORT_EDGE = 1080;

export const SERVER_VIDEO_MAX_DURATION_SECONDS = 600;
export const SERVER_VIDEO_MAX_FILE_BYTES = 250 * 1024 * 1024;

/** Current Supabase simple-upload cap for server-side video (below bucket limit). */
export const SERVER_VIDEO_UPLOAD_MAX_FILE_BYTES = 50 * 1024 * 1024;

export type VideoExportRoute = "client" | "server" | "reject";

export function isClientVideoExportEligible(
  duration: number,
  width: number,
  height: number,
) {
  if (!Number.isFinite(duration) || duration <= 0) {
    return false;
  }

  if (duration > CLIENT_VIDEO_MAX_DURATION_SECONDS) {
    return false;
  }

  const longEdge = Math.max(width, height);
  const shortEdge = Math.min(width, height);

  return (
    longEdge <= CLIENT_VIDEO_MAX_LONG_EDGE &&
    shortEdge <= CLIENT_VIDEO_MAX_SHORT_EDGE
  );
}

export function isServerVideoExportEligible(
  duration: number,
  width: number,
  height: number,
  fileSizeBytes: number,
) {
  if (!Number.isFinite(duration) || duration <= 0) {
    return false;
  }

  if (duration > SERVER_VIDEO_MAX_DURATION_SECONDS) {
    return false;
  }

  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    return false;
  }

  if (fileSizeBytes > SERVER_VIDEO_MAX_FILE_BYTES) {
    return false;
  }

  return true;
}

export function isAnyVideoExportEligible(
  duration: number,
  width: number,
  height: number,
  fileSizeBytes: number,
) {
  return (
    isClientVideoExportEligible(duration, width, height) ||
    isServerVideoExportEligible(duration, width, height, fileSizeBytes)
  );
}

export function getVideoExportRoute(
  duration: number,
  width: number,
  height: number,
  fileSizeBytes: number,
): VideoExportRoute {
  if (isClientVideoExportEligible(duration, width, height)) {
    return "client";
  }

  if (isServerVideoExportEligible(duration, width, height, fileSizeBytes)) {
    return "server";
  }

  return "reject";
}

export function getVideoExportRejectionMessage() {
  const maxUploadMb = Math.floor(
    SERVER_VIDEO_UPLOAD_MAX_FILE_BYTES / (1024 * 1024),
  );

  return `This video exceeds our current processing limits (~${maxUploadMb}MB max upload for server-side video). Try a shorter or smaller clip. Support for longer/larger files is coming soon.`;
}

export function getVideoExportDisabledReason(
  duration: number,
  width: number,
  height: number,
  fileSizeBytes: number,
) {
  if (isAnyVideoExportEligible(duration, width, height, fileSizeBytes)) {
    return undefined;
  }

  return getVideoExportRejectionMessage();
}
