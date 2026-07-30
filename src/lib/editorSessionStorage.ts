import type { EditorPanelId } from "../../components/watermark/ToolIconRail";
import type { SerializedPdfPageFillMap } from "./pdfPageFillFields";
import type { SerializedPdfPageSignatureMap } from "./pdfPageSignatures";
import type { SignatureKind } from "./signatureValidation";
import type { StoredWatermarkSettings } from "./watermarkSettingsStorage";

const DB_NAME = "putwatermark-editor-session";
const DB_VERSION = 1;
const STORE_NAME = "session";
const FILES_KEY = "files";
const META_KEY = "meta";

export type StoredSessionFile = {
  buffer: ArrayBuffer;
  lastModified: number;
  name: string;
  type: string;
};

export type StoredEditorSessionMeta = {
  activeBatchImageId: string | null;
  activeEditorPanel: EditorPanelId | null;
  activePdfPageId: string | null;
  activeSignatureId: string | null;
  activeLogoTemplate?: string | null;
  activeTemplate: string | null;
  backgroundRemovedLogoDataUrl: string | null;
  batchEntryIds: string[];
  batchFileNames: string[];
  customPosition: { xPercent: number; yPercent: number } | null;
  fileName: string;
  logoDataUrl: string | null;
  logoFileName: string;
  mediaKind: "image" | "pdf" | "video";
  pdfDocumentTool?: "signature" | "fill";
  pdfPageFillMap?: SerializedPdfPageFillMap;
  pdfPageSignatures?: SerializedPdfPageSignatureMap;
  savedSignatures: Array<{
    id: string;
    kind?: SignatureKind;
    label: string;
    previewSrc: string;
    source: "draw" | "type";
    typedText?: string | null;
  }>;
  version: 1;
  videoDuration: number;
  videoFileSize: number;
  videoSize: { height: number; width: number } | null;
  watermarkSettings: StoredWatermarkSettings;
};

function openSessionDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open session database."));
  });
}

function runSessionTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) {
  return openSessionDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = operation(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error("Session transaction failed."));

        transaction.oncomplete = () => database.close();
        transaction.onerror = () => {
          reject(transaction.error ?? new Error("Session transaction failed."));
          database.close();
        };
      }),
  );
}

export async function persistEditorSession(
  files: StoredSessionFile[],
  meta: StoredEditorSessionMeta,
) {
  await runSessionTransaction("readwrite", (store) => {
    store.put(files, FILES_KEY);
    store.put(meta, META_KEY);
    return store.put(meta, META_KEY);
  });
}

export async function readEditorSession() {
  const [files, meta] = await Promise.all([
    runSessionTransaction<StoredSessionFile[] | undefined>("readonly", (store) =>
      store.get(FILES_KEY),
    ),
    runSessionTransaction<StoredEditorSessionMeta | undefined>("readonly", (store) =>
      store.get(META_KEY),
    ),
  ]);

  if (!files?.length || !meta || meta.version !== 1) {
    return null;
  }

  return { files, meta };
}

export async function clearEditorSession() {
  await runSessionTransaction("readwrite", (store) => {
    store.delete(FILES_KEY);
    return store.delete(META_KEY);
  });
}

export async function blobToStoredSessionFile(
  blob: Blob,
  name: string,
  type: string,
  lastModified = Date.now(),
): Promise<StoredSessionFile> {
  return {
    buffer: await blob.arrayBuffer(),
    lastModified,
    name,
    type: type || blob.type || "application/octet-stream",
  };
}

export function storedSessionFilesToFiles(storedFiles: StoredSessionFile[]) {
  return storedFiles.map(
    (file) =>
      new File([file.buffer], file.name, {
        lastModified: file.lastModified,
        type: file.type,
      }),
  );
}
