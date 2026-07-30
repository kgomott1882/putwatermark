import { buildPdfPageId } from "./pdfPageSignatures";
import type { SerializedPdfPageSignatureMap } from "./pdfPageSignatures";
import type { FillManifestDocument } from "./fillManifest";

export type SignaturePlacementManifestDocument = {
  version: 1;
  pages: SerializedPdfPageSignatureMap;
};

export function buildSignaturePlacementManifestDocument(
  pages: SerializedPdfPageSignatureMap,
): SignaturePlacementManifestDocument {
  return {
    version: 1,
    pages,
  };
}

export function parseSignaturePlacementManifestDocument(
  value: unknown,
): SignaturePlacementManifestDocument {
  if (!value || typeof value !== "object") {
    throw new Error("Signature placement manifest must be a JSON object.");
  }

  const manifest = value as SignaturePlacementManifestDocument;

  if (manifest.version !== 1 || !manifest.pages || typeof manifest.pages !== "object") {
    throw new Error("Invalid signature placement manifest format.");
  }

  return manifest;
}

export function validateSignaturePlacementManifestForPdf(
  manifest: SignaturePlacementManifestDocument,
  pdfPageCount: number,
) {
  for (const pageId of Object.keys(manifest.pages)) {
    const match = /^pdf-page-(\d+)$/.exec(pageId);

    if (!match) {
      throw new Error(`Invalid signature page id: ${pageId}.`);
    }

    const pageNumber = Number(match[1]);

    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pdfPageCount) {
      throw new Error(`Signature manifest references invalid page: ${pageId}.`);
    }
  }
}

export function countSignedPagesFromManifest(
  manifest: SignaturePlacementManifestDocument,
  pdfPageCount: number,
): number {
  let count = 0;

  for (let pageNumber = 1; pageNumber <= pdfPageCount; pageNumber += 1) {
    const pageId = buildPdfPageId(pageNumber);
    const placements = manifest.pages[pageId] ?? [];

    if (placements.length > 0) {
      count += 1;
    }
  }

  return count;
}

export function countBillableSignFillPagesFromManifests(
  signatureManifest: SignaturePlacementManifestDocument | null,
  fillManifest: FillManifestDocument | null,
  pdfPageCount: number,
): number {
  const billable = new Set<number>();

  if (signatureManifest) {
    for (let pageNumber = 1; pageNumber <= pdfPageCount; pageNumber += 1) {
      const pageId = buildPdfPageId(pageNumber);
      const placements = signatureManifest.pages[pageId] ?? [];

      if (placements.length > 0) {
        billable.add(pageNumber);
      }
    }
  }

  if (fillManifest) {
    for (let pageNumber = 1; pageNumber <= pdfPageCount; pageNumber += 1) {
      const pageId = buildPdfPageId(pageNumber);
      const fields = fillManifest.pages[pageId] ?? [];

      if (fields.some((field) => field.text.trim().length > 0)) {
        billable.add(pageNumber);
      }
    }
  }

  return billable.size;
}
