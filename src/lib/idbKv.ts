import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'kyvra-kv';
const STORE = 'kv';

let dbPromise: Promise<IDBPDatabase | null> | null = null;

function getDb(): Promise<IDBPDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      },
    }).catch(() => null);
  }
  return dbPromise;
}

function legacyGetString(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Lê um valor string do IndexedDB. Se não existir lá, tenta o legado
 * localStorage (mesma chave) — isso migra automaticamente dados antigos
 * (store do Zustand e cache de API) sem perda para o usuário.
 */
export async function idbGetString(key: string): Promise<string | null> {
  try {
    const db = await getDb();
    if (db) {
      const value = await db.get(STORE, key);
      if (typeof value === 'string') return value;
    }
  } catch {
    // IndexedDB indisponível: segue para o fallback.
  }
  return legacyGetString(key);
}

/**
 * Grava de forma assíncrona no IndexedDB (fora do caminho bloqueante do
 * localStorage). Se o IndexedDB estiver indisponível, cai para o localStorage.
 */
export async function idbSetString(key: string, value: string): Promise<void> {
  try {
    const db = await getDb();
    if (db) {
      await db.put(STORE, value, key);
      return;
    }
  } catch {
    // IndexedDB indisponível: segue para o fallback.
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    // Quota excedida/modo restrito: silencioso, o cache em memória segue válido.
  }
}

export async function idbRemoveString(key: string): Promise<void> {
  try {
    const db = await getDb();
    if (db) await db.delete(STORE, key);
  } catch {
    // noop
  }
  try {
    localStorage.removeItem(key);
  } catch {
    // noop
  }
}

export async function idbClearByPrefix(prefix: string): Promise<void> {
  try {
    const db = await getDb();
    if (db) {
      const keys = await db.getAllKeys(STORE);
      await Promise.all(
        keys
          .filter((k): k is string => typeof k === 'string' && k.startsWith(prefix))
          .map((k) => db.delete(STORE, k))
      );
    }
  } catch {
    // noop
  }
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // noop
  }
}
