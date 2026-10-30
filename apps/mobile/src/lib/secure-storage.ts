import * as SecureStore from 'expo-secure-store';

/**
 * Stockage de la session dans le trousseau (iOS Keychain / Android Keystore) via expo-secure-store.
 * Les valeurs longues (jetons JWT) sont découpées en morceaux pour respecter la limite de taille.
 */
const CHUNK_SIZE = 1800;

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

export function createChunkedStore(backend: Pick<typeof SecureStore, 'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'> = SecureStore): KeyValueStore {
  return {
    async getItem(key) {
      const base = safeKey(key);
      const count = Number(await backend.getItemAsync(`${base}.n`));
      if (!Number.isInteger(count) || count <= 0) return null;
      const parts: string[] = [];
      for (let index = 0; index < count; index += 1) {
        const part = await backend.getItemAsync(`${base}.${index}`);
        if (part === null) return null;
        parts.push(part);
      }
      return parts.join('');
    },
    async setItem(key, value) {
      const base = safeKey(key);
      const previous = Number(await backend.getItemAsync(`${base}.n`)) || 0;
      const count = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
      for (let index = 0; index < count; index += 1) {
        await backend.setItemAsync(`${base}.${index}`, value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE));
      }
      await backend.setItemAsync(`${base}.n`, String(count));
      for (let index = count; index < previous; index += 1) await backend.deleteItemAsync(`${base}.${index}`);
    },
    async removeItem(key) {
      const base = safeKey(key);
      const count = Number(await backend.getItemAsync(`${base}.n`)) || 0;
      for (let index = 0; index < count; index += 1) await backend.deleteItemAsync(`${base}.${index}`);
      await backend.deleteItemAsync(`${base}.n`);
    },
  };
}
