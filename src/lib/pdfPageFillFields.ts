import { buildPdfPageId } from "./pdfPageSignatures";

export type PdfFillTextField = {
  color: string;
  fontFamily: string;
  fontSize: number;
  heightPercent: number;
  id: string;
  text: string;
  widthPercent: number;
  xPercent: number;
  yPercent: number;
};

export type PdfPageFillMap = Record<string, PdfFillTextField[]>;

export type SerializedPdfFillTextField = Omit<PdfFillTextField, never>;

export type SerializedPdfPageFillMap = Record<string, SerializedPdfFillTextField[]>;

export function createFillFieldId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `fill-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultFillField(
  partial?: Partial<Pick<PdfFillTextField, "text" | "xPercent" | "yPercent">>,
): PdfFillTextField {
  return {
    color: "#111111",
    fontFamily:
      'Arial, Helvetica, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 16,
    heightPercent: 0.08,
    id: createFillFieldId(),
    text: partial?.text ?? "",
    widthPercent: 0.35,
    xPercent: partial?.xPercent ?? 0.12,
    yPercent: partial?.yPercent ?? 0.12,
  };
}

export function createEmptyPdfPageFillMap(pageCount: number): PdfPageFillMap {
  const map: PdfPageFillMap = {};

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    map[buildPdfPageId(pageNumber)] = [];
  }

  return map;
}

export function hasAnyFillFields(map: PdfPageFillMap) {
  return Object.values(map).some((fields) =>
    fields.some((field) => field.text.trim().length > 0),
  );
}

export function countFillPages(map: PdfPageFillMap) {
  return Object.values(map).filter((fields) =>
    fields.some((field) => field.text.trim().length > 0),
  ).length;
}

export function persistPdfPageFillFields(
  map: PdfPageFillMap,
  pageId: string,
  fields: PdfFillTextField[],
): PdfPageFillMap {
  return {
    ...map,
    [pageId]: fields.map((field) => ({ ...field })),
  };
}

export function serializePdfPageFillMap(map: PdfPageFillMap): SerializedPdfPageFillMap {
  const serialized: SerializedPdfPageFillMap = {};

  for (const [pageId, fields] of Object.entries(map)) {
    serialized[pageId] = fields.map((field) => ({ ...field }));
  }

  return serialized;
}

export function deserializePdfPageFillMap(
  map: SerializedPdfPageFillMap,
): PdfPageFillMap {
  const deserialized: PdfPageFillMap = {};

  for (const [pageId, fields] of Object.entries(map)) {
    deserialized[pageId] = fields.map((field) => ({ ...field }));
  }

  return deserialized;
}
