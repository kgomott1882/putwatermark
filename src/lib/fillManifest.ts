import { buildPdfPageId } from "./pdfPageSignatures";
import type { SerializedPdfPageFillMap } from "./pdfPageFillFields";

export type FillManifestDocument = {
  version: 1;
  pages: SerializedPdfPageFillMap;
};

export function buildFillManifestDocument(
  pages: SerializedPdfPageFillMap,
): FillManifestDocument {
  return {
    version: 1,
    pages,
  };
}

export function parseFillManifestDocument(value: unknown): FillManifestDocument {
  if (!value || typeof value !== "object") {
    throw new Error("Fill manifest must be a JSON object.");
  }

  const manifest = value as FillManifestDocument;

  if (manifest.version !== 1 || !manifest.pages || typeof manifest.pages !== "object") {
    throw new Error("Invalid fill manifest format.");
  }

  return manifest;
}

export function countFillPagesFromManifest(
  manifest: FillManifestDocument,
  pdfPageCount: number,
): number {
  let count = 0;

  for (let pageNumber = 1; pageNumber <= pdfPageCount; pageNumber += 1) {
    const pageId = buildPdfPageId(pageNumber);
    const fields = manifest.pages[pageId] ?? [];

    if (fields.some((field) => field.text.trim().length > 0)) {
      count += 1;
    }
  }

  return count;
}

export function validateFillManifestForPdf(
  manifest: FillManifestDocument,
  pdfPageCount: number,
) {
  for (const pageId of Object.keys(manifest.pages)) {
    const match = /^pdf-page-(\d+)$/.exec(pageId);

    if (!match) {
      throw new Error(`Invalid fill page id: ${pageId}.`);
    }

    const pageNumber = Number(match[1]);

    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pdfPageCount) {
      throw new Error(`Fill manifest references invalid page: ${pageId}.`);
    }
  }
}
