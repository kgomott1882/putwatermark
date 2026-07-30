export type BatchVideoEntry = {
  duration: number;
  file: File;
  fileName: string;
  fileSize: number;
  height: number;
  id: string;
  objectUrl: string;
  width: number;
};

export function createVideoBatchId() {
  return `vid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadVideoMetadata(objectUrl: string) {
  return new Promise<{
    duration: number;
    height: number;
    width: number;
  }>((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const finalize = () => {
      resolve({
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        height: video.videoHeight,
        width: video.videoWidth,
      });
    };

    const handleError = () => {
      reject(new Error("We could not read that video metadata."));
    };

    video.onerror = handleError;

    video.onloadedmetadata = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        finalize();
        return;
      }

      video.onloadeddata = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          finalize();
          return;
        }

        reject(new Error("We could not read that video dimensions."));
      };
    };

    video.src = objectUrl;
    video.load();
  });
}

export async function createBatchVideoEntryFromFile(
  file: File,
  id = createVideoBatchId(),
  fallbackDimensions?: { height: number; width: number },
): Promise<BatchVideoEntry> {
  const objectUrl = URL.createObjectURL(file);
  const metadata = await loadVideoMetadata(objectUrl);
  const width =
    metadata.width > 0
      ? metadata.width
      : (fallbackDimensions?.width ?? metadata.width);
  const height =
    metadata.height > 0
      ? metadata.height
      : (fallbackDimensions?.height ?? metadata.height);

  if (width <= 0 || height <= 0) {
    URL.revokeObjectURL(objectUrl);
    throw new Error("We could not read that video dimensions.");
  }

  return {
    duration: metadata.duration,
    file,
    fileName: file.name,
    fileSize: file.size,
    height,
    id,
    objectUrl,
    width,
  };
}

export function revokeBatchVideoObjectUrls(entries: BatchVideoEntry[]) {
  for (const entry of entries) {
    URL.revokeObjectURL(entry.objectUrl);
  }
}

export function getTotalVideoBatchDuration(entries: BatchVideoEntry[]) {
  return entries.reduce((total, entry) => total + entry.duration, 0);
}

export function getTotalVideoBatchFileSize(entries: BatchVideoEntry[]) {
  return entries.reduce((total, entry) => total + entry.fileSize, 0);
}
