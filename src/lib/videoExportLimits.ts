export const CLIENT_VIDEO_MAX_DURATION_SECONDS = 60;
export const CLIENT_VIDEO_MAX_LONG_EDGE = 1920;
export const CLIENT_VIDEO_MAX_SHORT_EDGE = 1080;

export const SERVER_VIDEO_MAX_DURATION_SECONDS = 600;
export const SERVER_VIDEO_MAX_FILE_BYTES = 250 * 1024 * 1024;

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
  const maxFileSizeMb = Math.floor(SERVER_VIDEO_MAX_FILE_BYTES / (1024 * 1024));
  const maxDurationMinutes = Math.floor(SERVER_VIDEO_MAX_DURATION_SECONDS / 60);

  return `This video exceeds our processing limits (${maxFileSizeMb}MB max file size, ${maxDurationMinutes} minutes max duration). Try a shorter or smaller clip.`;
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
