export type PreviewImageSource = {
  file?: File;
  objectUrl: string;
};

export function getCanvasImageSourceSize(
  source: CanvasImageSource,
  fallback?: { height: number; width: number },
) {
  if (source instanceof HTMLImageElement) {
    return {
      height: source.naturalHeight || fallback?.height || 0,
      width: source.naturalWidth || fallback?.width || 0,
    };
  }

  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
    return {
      height: source.height,
      width: source.width,
    };
  }

  if (source instanceof HTMLCanvasElement) {
    return {
      height: source.height,
      width: source.width,
    };
  }

  return {
    height: fallback?.height ?? 0,
    width: fallback?.width ?? 0,
  };
}

export async function loadPreviewImageBitmap(source: PreviewImageSource) {
  const blob = source.file
    ? source.file
    : await fetch(source.objectUrl).then((response) => {
        if (!response.ok) {
          throw new Error("We could not load that image preview.");
        }

        return response.blob();
      });

  return createImageBitmap(blob);
}

export function closePreviewImageBitmap(bitmap: ImageBitmap | null | undefined) {
  bitmap?.close();
}

export function closePreviewImageBitmapCache(cache: Map<string, ImageBitmap>) {
  for (const bitmap of cache.values()) {
    bitmap.close();
  }

  cache.clear();
}
