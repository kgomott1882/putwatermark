import type { PDFDocumentProxy } from "pdfjs-dist";

let workerInitialized = false;

const previewMaxLongEdge = 2800;

function getPreviewDevicePixelRatio() {
  if (typeof window === "undefined") {
    return 1;
  }

  return Math.min(window.devicePixelRatio || 1, 2.5);
}

function getPreviewScale(pageWidth: number, pageHeight: number) {
  const devicePixelRatio = getPreviewDevicePixelRatio();
  const longEdge = Math.max(pageWidth, pageHeight);
  const targetLongEdge = previewMaxLongEdge * devicePixelRatio;

  if (longEdge <= previewMaxLongEdge) {
    return Math.max(2, 1.75 * devicePixelRatio);
  }

  return targetLongEdge / longEdge;
}

async function getPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  if (!workerInitialized && typeof window !== "undefined") {
    // Serve the worker from the bundled _next/static URL — not /public — so
    // Supabase middleware does not intercept the worker script fetch.
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    workerInitialized = true;
  }

  return pdfjs;
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

export type RenderedPdfPage = {
  height: number;
  image: HTMLImageElement;
  width: number;
};

const thumbnailScale = 0.22;
const PDF_LOAD_TIMEOUT_MS = 45_000;

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

export async function loadPdfDocumentFromBytes(data: Uint8Array) {
  const { getDocument } = await getPdfJs();
  const loadingTask = getDocument({
    data: data.slice(),
    useWorkerFetch: false,
  });

  return withTimeout(
    loadingTask.promise,
    PDF_LOAD_TIMEOUT_MS,
    "PDF loading timed out. Please try again or choose a smaller file.",
  );
}

export async function loadPdfDocument(file: File) {
  const data = new Uint8Array(await file.arrayBuffer());

  return loadPdfDocumentFromBytes(data);
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
