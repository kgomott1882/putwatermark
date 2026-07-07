import type { PDFDocumentProxy } from "pdfjs-dist";

let workerInitialized = false;

const previewMaxLongEdge = 1600;
const thumbnailScale = 0.22;

async function getPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  if (!workerInitialized && typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    workerInitialized = true;
  }

  return pdfjs;
}

export type RenderedPdfPage = {
  height: number;
  image: HTMLImageElement;
  width: number;
};

function getPreviewScale(pageWidth: number, pageHeight: number) {
  const longEdge = Math.max(pageWidth, pageHeight);

  if (longEdge <= previewMaxLongEdge) {
    return 1.25;
  }

  return previewMaxLongEdge / longEdge;
}

async function renderPdfPageToCanvas(
  pdfDocument: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
) {
  const page = await pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("We could not create a canvas for this PDF page.");
  }

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  await page.render({
    canvas,
    canvasContext: context,
    viewport,
  }).promise;

  return {
    canvas,
    height: canvas.height,
    width: canvas.width,
  };
}

async function canvasToImage(canvas: HTMLCanvasElement) {
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => {
      reject(new Error("We could not render that PDF page."));
    };
    image.src = canvas.toDataURL("image/png");
  });

  return image;
}

export async function loadPdfDocument(file: File) {
  const { getDocument } = await getPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = getDocument({ data });

  return loadingTask.promise;
}

export async function renderPdfPagePreview(
  document: PDFDocumentProxy,
  pageNumber: number,
): Promise<RenderedPdfPage> {
  const page = await document.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = getPreviewScale(baseViewport.width, baseViewport.height);
  const { canvas, height, width } = await renderPdfPageToCanvas(
    document,
    pageNumber,
    scale,
  );
  const image = await canvasToImage(canvas);

  return { height, image, width };
}

export async function renderPdfPageThumbnail(
  document: PDFDocumentProxy,
  pageNumber: number,
) {
  const { canvas } = await renderPdfPageToCanvas(
    document,
    pageNumber,
    thumbnailScale,
  );

  return canvas.toDataURL("image/png");
}

export type PdfPageThumbnail = {
  id: string;
  pageNumber: number;
  thumbnailUrl: string;
};

export async function buildPdfPageThumbnails(document: PDFDocumentProxy) {
  const pages: PdfPageThumbnail[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    pages.push({
      id: `pdf-page-${pageNumber}`,
      pageNumber,
      thumbnailUrl: await renderPdfPageThumbnail(document, pageNumber),
    });
  }

  return pages;
}
