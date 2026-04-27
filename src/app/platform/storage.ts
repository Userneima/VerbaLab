export type AppStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const memoryStore = new Map<string, string>();

export const memoryStorage: AppStorage = {
  getItem(key) {
    return memoryStore.get(key) ?? null;
  },
  setItem(key, value) {
    memoryStore.set(key, value);
  },
  removeItem(key) {
    memoryStore.delete(key);
  },
};

function hasWebLocalStorage() {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export const webStorage: AppStorage = {
  getItem(key) {
    if (!hasWebLocalStorage()) return memoryStorage.getItem(key);
    return localStorage.getItem(key);
  },
  setItem(key, value) {
    if (!hasWebLocalStorage()) {
      memoryStorage.setItem(key, value);
      return;
    }
    localStorage.setItem(key, value);
  },
  removeItem(key) {
    if (!hasWebLocalStorage()) {
      memoryStorage.removeItem(key);
      return;
    }
    localStorage.removeItem(key);
  },
};

let activeStorage: AppStorage = webStorage;

export function getAppStorage(): AppStorage {
  return activeStorage;
}

export function setAppStorage(storage: AppStorage) {
  activeStorage = storage;
}
