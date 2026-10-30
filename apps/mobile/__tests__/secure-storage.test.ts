import { createChunkedStore } from '../src/lib/secure-storage';

function memoryBackend() {
  const map = new Map<string, string>();
  return {
    map,
    getItemAsync: async (key: string) => map.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void map.set(key, value),
    deleteItemAsync: async (key: string) => void map.delete(key),
  };
}

describe('stockage sécurisé découpé', () => {
  it('reconstitue une valeur longue (jeton) découpée en morceaux', async () => {
    const backend = memoryBackend();
    const store = createChunkedStore(backend as never);
    const value = 'x'.repeat(5000);
    await store.setItem('sb-auth-token', value);
    expect(await store.getItem('sb-auth-token')).toBe(value);
    expect(Number(backend.map.get('sb-auth-token.n'))).toBeGreaterThan(1);
  });

  it('supprime les anciens morceaux quand la valeur raccourcit, puis efface tout', async () => {
    const backend = memoryBackend();
    const store = createChunkedStore(backend as never);
    await store.setItem('k', 'a'.repeat(4000));
    await store.setItem('k', 'court');
    expect(await store.getItem('k')).toBe('court');
    expect([...backend.map.keys()].filter((key) => key.startsWith('k.')).length).toBe(2);
    await store.removeItem('k');
    expect(await store.getItem('k')).toBeNull();
    expect(backend.map.size).toBe(0);
  });

  it('normalise les clés incompatibles avec le trousseau', async () => {
    const backend = memoryBackend();
    const store = createChunkedStore(backend as never);
    await store.setItem('sb:auth/token', 'v');
    expect(backend.map.has('sb_auth_token.0')).toBe(true);
  });
});
