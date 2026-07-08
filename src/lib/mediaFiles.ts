export const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export const acceptedVideoTypes = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

export const acceptedMediaInputTypes =
  "image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,.mov,application/pdf,.pdf";

export function isImageFile(file: File) {
  return acceptedImageTypes.includes(
    file.type as (typeof acceptedImageTypes)[number],
  );
}

export function isVideoFile(file: File) {
  const fileName = file.name.toLowerCase();

  return (
    acceptedVideoTypes.includes(
      file.type as (typeof acceptedVideoTypes)[number],
    ) ||
    fileName.endsWith(".mov") ||
    fileName.endsWith(".mp4") ||
    fileName.endsWith(".webm")
  );
}

export function isPdfFile(file: File) {
  const fileName = file.name.toLowerCase();

  return file.type === "application/pdf" || fileName.endsWith(".pdf");
}

export type MediaFilesValidationResult =
  | { ok: true; files: File[] }
  | { ok: false; error: string };

export function validateMediaFiles(files: File[]): MediaFilesValidationResult {
  if (!files.length) {
    return {
      ok: false,
      error: "Please choose a JPG, PNG, WebP, PDF, MP4, MOV, or WebM file.",
    };
  }

  const imageFiles = files.filter(isImageFile);
  const videoFiles = files.filter(isVideoFile);
  const pdfFiles = files.filter(isPdfFile);

  if (
    (imageFiles.length && videoFiles.length) ||
    (imageFiles.length && pdfFiles.length) ||
    (videoFiles.length && pdfFiles.length)
  ) {
    return {
      ok: false,
      error: "Upload one PDF, images together, or a single video at a time.",
    };
  }

  if (pdfFiles.length) {
    if (pdfFiles.length > 1) {
      return { ok: false, error: "Please upload one PDF at a time." };
    }

    return { ok: true, files: [pdfFiles[0]] };
  }

  if (videoFiles.length) {
    if (videoFiles.length > 1) {
      return { ok: false, error: "Please upload one video at a time." };
    }

    return { ok: true, files: [videoFiles[0]] };
  }

  if (imageFiles.length) {
    return { ok: true, files: imageFiles };
  }

  return {
    ok: false,
    error: "Please choose a JPG, PNG, WebP, PDF, MP4, MOV, or WebM file.",
  };
}
