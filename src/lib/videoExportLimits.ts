export const CLIENT_VIDEO_MAX_DURATION_SECONDS = 60;
export const CLIENT_VIDEO_MAX_LONG_EDGE = 1920;
export const CLIENT_VIDEO_MAX_SHORT_EDGE = 1080;

export const SERVER_VIDEO_MAX_DURATION_SECONDS = 600;
export const SERVER_VIDEO_MAX_FILE_BYTES = 250 * 1024 * 1024;
export const SERVER_VIDEO_MAX_FILE_MB = Math.floor(
  SERVER_VIDEO_MAX_FILE_BYTES / (1024 * 1024),
);
export const SERVER_VIDEO_MAX_DURATION_MINUTES = Math.floor(
  SERVER_VIDEO_MAX_DURATION_SECONDS / 60,
);

export const LONG_VIDEO_MAX_DURATION_SECONDS = 60 * 60;
export const LONG_VIDEO_MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;
export const LONG_VIDEO_MAX_FILE_MB = Math.floor(
  LONG_VIDEO_MAX_FILE_BYTES / (1024 * 1024),
);
export const LONG_VIDEO_MAX_DURATION_MINUTES = Math.floor(
  LONG_VIDEO_MAX_DURATION_SECONDS / 60,
);
/** Per-chunk cap for long-video serverless encode steps (4 minutes). */
export const LONG_VIDEO_CHUNK_MAX_DURATION_SECONDS = 4 * 60;
export const LONG_VIDEO_CHUNK_MAX_DURATION_MINUTES = 4;

export type VideoExportRoute = "client" | "server" | "long-server" | "reject";

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

export function isLongServerVideoExportEligible(
  duration: number,
  width: number,
  height: number,
  fileSizeBytes: number,
) {
  if (!Number.isFinite(duration) || duration <= 0) {
    return false;
  }

  if (duration <= SERVER_VIDEO_MAX_DURATION_SECONDS) {
    return false;
  }

  if (duration > LONG_VIDEO_MAX_DURATION_SECONDS) {
    return false;
  }

  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    return false;
  }

  if (fileSizeBytes > LONG_VIDEO_MAX_FILE_BYTES) {
    return false;
  }

  const longEdge = Math.max(width, height);
  const shortEdge = Math.min(width, height);

  return (
    longEdge <= CLIENT_VIDEO_MAX_LONG_EDGE &&
    shortEdge <= CLIENT_VIDEO_MAX_SHORT_EDGE
  );
}

export function isAnyVideoExportEligible(
  duration: number,
  width: number,
  height: number,
  fileSizeBytes: number,
) {
  return (
    isClientVideoExportEligible(duration, width, height) ||
    isServerVideoExportEligible(duration, width, height, fileSizeBytes) ||
    isLongServerVideoExportEligible(duration, width, height, fileSizeBytes)
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

  if (isLongServerVideoExportEligible(duration, width, height, fileSizeBytes)) {
    return "long-server";
  }

  return "reject";
}

export function isServerSideVideoExportRoute(
  route: VideoExportRoute,
): route is "server" | "long-server" {
  return route === "server" || route === "long-server";
}

export function getVideoExportRejectionMessage() {
  return `This video exceeds our processing limits (up to ${SERVER_VIDEO_MAX_FILE_MB}MB or ${SERVER_VIDEO_MAX_DURATION_MINUTES} minutes for standard server export, or up to ${LONG_VIDEO_MAX_FILE_MB}MB or ${LONG_VIDEO_MAX_DURATION_MINUTES} minutes for long-video export). Try a shorter or smaller clip.`;
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

export function getServerVideoUploadLimitDescription() {
  return `up to ${SERVER_VIDEO_MAX_FILE_MB}MB or ${SERVER_VIDEO_MAX_DURATION_MINUTES} minutes (${LONG_VIDEO_MAX_DURATION_MINUTES} minutes max for longer videos up to ${LONG_VIDEO_MAX_FILE_MB}MB)`;
}
