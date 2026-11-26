import { CreationRecord, SavedPresetRecord } from "@/types/simulation";

const DB_NAME = "satisfying-video-maker-db";
const DB_VERSION = 1;
const CREATIONS_STORE = "creations";
const PRESETS_STORE = "presets";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB is unavailable in this browser."));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CREATIONS_STORE)) {
        const s = db.createObjectStore(CREATIONS_STORE, { keyPath: "id" });
        s.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(PRESETS_STORE)) {
        const s = db.createObjectStore(PRESETS_STORE, { keyPath: "id" });
        s.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Failed to open IndexedDB"));
  });
}

export async function saveCreation(record: CreationRecord): Promise<{ savedBlob: boolean }> {
  const db = await openDb();
  const tryPut = (item: CreationRecord) =>
    new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CREATIONS_STORE, "readwrite");
      const store = tx.objectStore(CREATIONS_STORE);
      store.put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("IndexedDB write failed"));
    });

  try {
    await tryPut(record);
    db.close();
    return { savedBlob: Boolean(record.videoBlob) };
  } catch {
    // Fallback without video blob if browser storage quota is exceeded
    const metadataOnly: CreationRecord = {
      ...record,
      hasVideoBlob: false,
      videoBlob: undefined,
    };
    await tryPut(metadataOnly);
    db.close();
    return { savedBlob: false };
  }
}

export async function listCreations(): Promise<CreationRecord[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(CREATIONS_STORE, "readonly");
      const store = tx.objectStore(CREATIONS_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as CreationRecord[]).sort((a, b) => b.createdAt - a.createdAt);
        db.close();
        resolve(items);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return [];
  }
}

export async function deleteCreation(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CREATIONS_STORE, "readwrite");
    tx.objectStore(CREATIONS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function clearAllCreations(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CREATIONS_STORE, "readwrite");
    tx.objectStore(CREATIONS_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function savePreset(preset: SavedPresetRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PRESETS_STORE, "readwrite");
    tx.objectStore(PRESETS_STORE).put(preset);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listPresets(gameId?: string): Promise<SavedPresetRecord[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(PRESETS_STORE, "readonly");
      const req = tx.objectStore(PRESETS_STORE).getAll();
      req.onsuccess = () => {
        let items = (req.result as SavedPresetRecord[]).sort((a, b) => b.createdAt - a.createdAt);
        if (gameId) {
          items = items.filter((p) => p.gameId === gameId);
        }
        db.close();
        resolve(items);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return [];
  }
}

export async function getPresetById(id: string): Promise<SavedPresetRecord | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(PRESETS_STORE, "readonly");
      const req = tx.objectStore(PRESETS_STORE).get(id);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as SavedPresetRecord) || null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

export async function deletePreset(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PRESETS_STORE, "readwrite");
    tx.objectStore(PRESETS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
