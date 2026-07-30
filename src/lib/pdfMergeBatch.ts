import { PDFDocument } from "pdf-lib";

export type PdfMergeEntry = {
  file: File;
  fileName: string;
  fileSize: number;
  id: string;
  pageCount: number;
  source?: "added" | "loaded";
};

export const LOADED_PDF_MERGE_ENTRY_ID = "loaded-pdf";

export function createPdfMergeBatchId() {
  return `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createPdfMergeEntryFromLoadedDocument(
  bytes: Uint8Array,
  fileName: string,
  pageCount: number,
  id = LOADED_PDF_MERGE_ENTRY_ID,
): PdfMergeEntry {
  return {
    file: new File([Uint8Array.from(bytes)], fileName, {
      type: "application/pdf",
    }),
    fileName,
    fileSize: bytes.byteLength,
    id,
    pageCount,
    source: "loaded",
  };
}

export async function getPdfFilePageCount(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const document = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return document.getPageCount();
}

export async function createPdfMergeEntryFromFile(
  file: File,
  id = createPdfMergeBatchId(),
): Promise<PdfMergeEntry> {
  const pageCount = await getPdfFilePageCount(file);

  return {
    file,
    fileName: file.name,
    fileSize: file.size,
    id,
    pageCount,
    source: "added",
  };
}

export async function mergePdfFiles(files: readonly File[]) {
  if (files.length < 2) {
    throw new Error("Select at least two PDF files to merge.");
  }

  const merged = await PDFDocument.create();

  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const copiedPages = await merged.copyPages(source, source.getPageIndices());

    for (const page of copiedPages) {
      merged.addPage(page);
    }
  }

  const mergedBytes = await merged.save();
  return new Blob([Uint8Array.from(mergedBytes)], { type: "application/pdf" });
}

export function buildMergedPdfFileName(entries: readonly PdfMergeEntry[]) {
  if (entries.length === 0) {
    return "merged-document.pdf";
  }

  if (entries.length === 1) {
    return entries[0]!.fileName.replace(/(\.pdf)?$/i, "-merged.pdf");
  }

  const firstName = entries[0]!.fileName.replace(/\.pdf$/i, "");

  return `${firstName}-merged.pdf`;
}
