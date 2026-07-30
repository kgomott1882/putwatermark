import type { CustomPosition, WatermarkPosition } from "./watermarkLayers";

export type PdfPageSignaturePlacement = {
  customPosition: CustomPosition | null;
  fontSizeScale: number;
  id: string;
  opacity: number;
  signatureId: string;
  watermarkPosition: WatermarkPosition;
};

export type PdfPageSignatureMap = Record<string, PdfPageSignaturePlacement[]>;

export type SerializedPdfPageSignaturePlacement = {
  customPosition: CustomPosition | null;
  fontSizeScale: number;
  id: string;
  opacity: number;
  signatureId: string;
  watermarkPosition: WatermarkPosition;
};

export type SerializedPdfPageSignatureMap = Record<
  string,
  SerializedPdfPageSignaturePlacement[]
>;

/** @deprecated Legacy v4 shape — still accepted by deserialize. */
export type LegacySerializedPdfPageSignatureMap = Record<
  string,
  SerializedPdfPageSignaturePlacement | null
>;

export function buildPdfPageId(pageNumber: number) {
  return `pdf-page-${pageNumber}`;
}

export function createSignaturePlacementId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `sig-placement-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyPdfPageSignatureMap(pageCount: number): PdfPageSignatureMap {
  const map: PdfPageSignatureMap = {};

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    map[buildPdfPageId(pageNumber)] = [];
  }

  return map;
}

export const PDF_SIGNATURE_DEFAULT_OPACITY = 100;

export function createPdfPageSignaturePlacement(
  signatureId: string,
  partial?: Partial<Omit<PdfPageSignaturePlacement, "signatureId" | "id">> & {
    id?: string;
  },
): PdfPageSignaturePlacement {
  return {
    customPosition: partial?.customPosition ?? null,
    fontSizeScale: partial?.fontSizeScale ?? 100,
    id: partial?.id ?? createSignaturePlacementId(),
    opacity: partial?.opacity ?? PDF_SIGNATURE_DEFAULT_OPACITY,
    signatureId,
    watermarkPosition: partial?.watermarkPosition ?? "bottom-right",
  };
}

export function persistPdfPageSignaturePlacements(
  map: PdfPageSignatureMap,
  pageId: string,
  placements: PdfPageSignaturePlacement[],
): PdfPageSignatureMap {
  return {
    ...map,
    [pageId]: placements.map((placement) => ({ ...placement })),
  };
}

export function appendPdfPageSignaturePlacement(
  map: PdfPageSignatureMap,
  pageId: string,
  placement: PdfPageSignaturePlacement,
): PdfPageSignatureMap {
  const existing = map[pageId] ?? [];

  return persistPdfPageSignaturePlacements(map, pageId, [...existing, placement]);
}

export function upsertPdfPageSignaturePlacement(
  map: PdfPageSignatureMap,
  pageId: string,
  placement: PdfPageSignaturePlacement,
): PdfPageSignatureMap {
  const existing = map[pageId] ?? [];
  const index = existing.findIndex((entry) => entry.id === placement.id);

  if (index === -1) {
    return appendPdfPageSignaturePlacement(map, pageId, placement);
  }

  const next = [...existing];
  next[index] = { ...placement };
  return persistPdfPageSignaturePlacements(map, pageId, next);
}

export function removePdfPageSignaturePlacement(
  map: PdfPageSignatureMap,
  pageId: string,
  placementId: string,
): PdfPageSignatureMap {
  const existing = map[pageId] ?? [];

  return persistPdfPageSignaturePlacements(
    map,
    pageId,
    existing.filter((entry) => entry.id !== placementId),
  );
}

export function countSignedPdfPages(map: PdfPageSignatureMap) {
  return Object.values(map).filter((placements) => placements.length > 0).length;
}

export function removeSignatureFromPdfPageMap(
  map: PdfPageSignatureMap,
  signatureId: string,
): PdfPageSignatureMap {
  const next: PdfPageSignatureMap = { ...map };

  for (const pageId of Object.keys(next)) {
    const filtered = (next[pageId] ?? []).filter(
      (placement) => placement.signatureId !== signatureId,
    );
    next[pageId] = filtered;
  }

  return next;
}

function normalizeSerializedPageEntry(
  entry: unknown,
): SerializedPdfPageSignaturePlacement[] {
  if (!entry) {
    return [];
  }

  if (Array.isArray(entry)) {
    return entry.map((placement) => normalizeSerializedPlacement(placement));
  }

  if (typeof entry === "object" && entry !== null && "signatureId" in entry) {
    return [normalizeSerializedPlacement(entry as SerializedPdfPageSignaturePlacement)];
  }

  return [];
}

function normalizeSerializedPlacement(
  placement: Partial<SerializedPdfPageSignaturePlacement> & { signatureId: string },
): SerializedPdfPageSignaturePlacement {
  return {
    customPosition: placement.customPosition ?? null,
    fontSizeScale: placement.fontSizeScale ?? 100,
    id: placement.id ?? createSignaturePlacementId(),
    opacity: placement.opacity ?? PDF_SIGNATURE_DEFAULT_OPACITY,
    signatureId: placement.signatureId,
    watermarkPosition: placement.watermarkPosition ?? "bottom-right",
  };
}

export function serializePdfPageSignatureMap(
  map: PdfPageSignatureMap,
): SerializedPdfPageSignatureMap {
  const serialized: SerializedPdfPageSignatureMap = {};

  for (const [pageId, placements] of Object.entries(map)) {
    serialized[pageId] = placements.map((placement) => ({
      customPosition: placement.customPosition
        ? { ...placement.customPosition }
        : null,
      fontSizeScale: placement.fontSizeScale,
      id: placement.id,
      opacity: placement.opacity,
      signatureId: placement.signatureId,
      watermarkPosition: placement.watermarkPosition,
    }));
  }

  return serialized;
}

export function deserializePdfPageSignatureMap(
  map: SerializedPdfPageSignatureMap | LegacySerializedPdfPageSignatureMap,
): PdfPageSignatureMap {
  const deserialized: PdfPageSignatureMap = {};

  for (const [pageId, entry] of Object.entries(map)) {
    deserialized[pageId] = normalizeSerializedPageEntry(entry).map((placement) =>
      createPdfPageSignaturePlacement(placement.signatureId, {
        customPosition: placement.customPosition,
        fontSizeScale: placement.fontSizeScale,
        id: placement.id,
        opacity: placement.opacity,
        watermarkPosition: placement.watermarkPosition,
      }),
    );
  }

  return deserialized;
}

export function mergePdfPageSignatureMaps(
  base: PdfPageSignatureMap,
  incoming: PdfPageSignatureMap,
): PdfPageSignatureMap {
  const merged = { ...base };

  for (const [pageId, placements] of Object.entries(incoming)) {
    merged[pageId] = placements.map((placement) => ({ ...placement }));
  }

  return merged;
}
