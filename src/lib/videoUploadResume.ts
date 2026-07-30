const STORAGE_KEY = "putwatermark.video-upload.pending";
const PENDING_UPLOAD_MAX_AGE_MS = 23 * 60 * 60 * 1000;

export type PendingVideoUpload = {
  createdAt: number;
  jobId: string;
  uploadPath: string;
};

type PendingVideoUploadStore = Record<string, PendingVideoUpload>;

export function getVideoUploadFingerprint(
  fileName: string,
  fileSizeBytes: number,
) {
  return `${fileName}:${fileSizeBytes}`;
}

function readStore(): PendingVideoUploadStore {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as PendingVideoUploadStore;

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function writeStore(store: PendingVideoUploadStore) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore quota or privacy errors.
  }
}

export function readPendingVideoUpload(
  fingerprint: string,
): PendingVideoUpload | null {
  const pending = readStore()[fingerprint];

  if (!pending) {
    return null;
  }

  if (Date.now() - pending.createdAt > PENDING_UPLOAD_MAX_AGE_MS) {
    clearPendingVideoUpload(fingerprint);
    return null;
  }

  return pending;
}

export function writePendingVideoUpload(
  fingerprint: string,
  pending: PendingVideoUpload,
) {
  const store = readStore();
  store[fingerprint] = pending;
  writeStore(store);
}

export function clearPendingVideoUpload(fingerprint: string) {
  const store = readStore();

  if (!(fingerprint in store)) {
    return;
  }

  delete store[fingerprint];
  writeStore(store);
}
