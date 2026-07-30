import { PDFDocument } from "pdf-lib";

export type PdfCompressResult = {
  blob: Blob;
  compressedSize: number;
  originalSize: number;
  savedBytes: number;
  savedPercent: number;
};

export async function compressPdfBytes(
  bytes: Uint8Array,
): Promise<PdfCompressResult> {
  const originalSize = bytes.byteLength;
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const compressed = await PDFDocument.create();
  const copiedPages = await compressed.copyPages(
    source,
    source.getPageIndices(),
  );

  for (const page of copiedPages) {
    compressed.addPage(page);
  }

  const compressedBytes = await compressed.save({
    addDefaultPage: false,
    useObjectStreams: true,
  });
  const compressedSize = compressedBytes.byteLength;
  const savedBytes = Math.max(0, originalSize - compressedSize);
  const savedPercent =
    originalSize > 0 ? (savedBytes / originalSize) * 100 : 0;

  return {
    blob: new Blob([Uint8Array.from(compressedBytes)], {
      type: "application/pdf",
    }),
    compressedSize,
    originalSize,
    savedBytes,
    savedPercent,
  };
}

export function buildCompressedPdfFileName(fileName: string) {
  const baseName = fileName.replace(/\.pdf$/i, "");
  return `${baseName}-compressed.pdf`;
}
