import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cache hors ligne (lecture seule) : dernière version connue d'une donnée, horodatée.
 * Les billets ne sont mis en cache que si le fournisseur l'autorise (offline_allowed) et ne
 * contiennent jamais de code d'accès pour la démonstration.
 */
const PREFIX = 'tamurt.cache.';

export interface Cached<T> {
  savedAt: string;
  data: T;
}

export async function saveCache<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: new Date().toISOString(), data } satisfies Cached<T>));
  } catch {
    // stockage plein ou indisponible : le cache est facultatif
  }
}

export async function readCache<T>(key: string): Promise<Cached<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as Cached<T>) : null;
  } catch {
    return null;
  }
}

export async function clearCache(): Promise<void> {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(PREFIX));
  await AsyncStorage.multiRemove(keys);
}

/** Ne garde que les billets consultables hors ligne. */
export function offlineEligible<T extends { offline_allowed?: boolean | null }>(tickets: T[]): T[] {
  return tickets.filter((ticket) => ticket.offline_allowed === true);
}
