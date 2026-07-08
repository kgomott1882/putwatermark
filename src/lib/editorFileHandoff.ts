const DB_NAME = "putwatermark-editor-handoff";
const DB_VERSION = 1;
const STORE_NAME = "files";
const HANDOFF_KEY = "pending-upload";

type StoredHandoffFile = {
  buffer: ArrayBuffer;
  lastModified: number;
  name: string;
  type: string;
};

function openHandoffDatabase() {
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
      reject(request.error ?? new Error("Could not open handoff database."));
  });
}

function runHandoffTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) {
  return openHandoffDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = operation(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error("Handoff transaction failed."));

        transaction.oncomplete = () => database.close();
        transaction.onerror = () => {
          reject(transaction.error ?? new Error("Handoff transaction failed."));
          database.close();
        };
      }),
  );
}

export async function stashEditorHandoffFiles(files: File[]) {
  const storedFiles: StoredHandoffFile[] = await Promise.all(
    files.map(async (file) => ({
      buffer: await file.arrayBuffer(),
      lastModified: file.lastModified,
      name: file.name,
      type: file.type,
      })),
  );

  await runHandoffTransaction("readwrite", (store) =>
    store.put(storedFiles, HANDOFF_KEY),
  );
}

export async function consumeEditorHandoffFiles() {
  const storedFiles = await runHandoffTransaction<StoredHandoffFile[] | undefined>(
    "readwrite",
    (store) => {
      const getRequest = store.get(HANDOFF_KEY);

      getRequest.onsuccess = () => {
        store.delete(HANDOFF_KEY);
      };

      return getRequest;
    },
  );

  if (!storedFiles?.length) {
    return null;
  }

  return storedFiles.map(
    (file) =>
      new File([file.buffer], file.name, {
        lastModified: file.lastModified,
        type: file.type,
      }),
  );
}
