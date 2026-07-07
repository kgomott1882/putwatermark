const invalidFileNamePattern = /[\\/:*?"<>|]/g;

export function sanitizeDownloadFileName(
  fileName: string,
  fallback = "download",
) {
  const sanitized = fileName
    .replace(invalidFileNamePattern, "-")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return sanitized.length > 0 ? sanitized : fallback;
}

export function ensureBlobMimeType(blob: Blob, mimeType: string) {
  if (blob.type === mimeType) {
    return blob;
  }

  return new Blob([blob], { type: mimeType });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const safeFileName = sanitizeDownloadFileName(fileName);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = safeFileName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }, 2000);
}

export function downloadImageBlob(blob: Blob, fileName: string, mimeType: string) {
  downloadBlob(ensureBlobMimeType(blob, mimeType), fileName);
}
