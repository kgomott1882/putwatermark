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

async function primeVideoFirstFrame(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    try {
      video.currentTime = 0;
    } catch {
      // Ignore seek errors before the frame is decodable.
    }
    return;
  }

  await new Promise<void>((resolve) => {
    const timeoutId = window.setTimeout(resolve, 2500);

    const finish = () => {
      window.clearTimeout(timeoutId);
      video.removeEventListener("loadeddata", finish);
      video.removeEventListener("canplay", finish);
      resolve();
    };

    video.addEventListener("loadeddata", finish, { once: true });
    video.addEventListener("canplay", finish, { once: true });

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      finish();
    }
  });

  const wasMuted = video.muted;
  video.muted = true;

  try {
    await video.play();
    video.pause();
    video.currentTime = 0;
  } catch {
    try {
      video.currentTime = 0;
    } catch {
      // Ignore seek errors on browsers that block programmatic seeks.
    }
  } finally {
    video.muted = wasMuted;
  }
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

    const finalize = async () => {
      try {
        await primeVideoFirstFrame(video);
      } catch {
        // Metadata is still usable even if the first frame could not be primed.
      }

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
        void finalize();
        return;
      }

      video.onloadeddata = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          void finalize();
          return;
        }

        reject(new Error("We could not read that video dimensions."));
      };
    };

    video.src = objectUrl;
    video.load();
  });
}

export function attachVideoPreviewFramePrime(video: HTMLVideoElement) {
  let cancelled = false;

  const prime = async () => {
    if (cancelled) {
      return;
    }

    try {
      await primeVideoFirstFrame(video);
    } catch {
      // Preview still works once the user presses play.
    }
  };

  const handleReady = () => {
    void prime();
  };

  video.preload = "auto";
  video.playsInline = true;

  video.addEventListener("loadeddata", handleReady, { once: true });
  video.addEventListener("canplay", handleReady, { once: true });

  if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    void prime();
  }

  return () => {
    cancelled = true;
    video.removeEventListener("loadeddata", handleReady);
    video.removeEventListener("canplay", handleReady);
  };
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
