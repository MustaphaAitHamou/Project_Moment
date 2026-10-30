import { clearCache, offlineEligible, readCache, saveCache } from '../src/lib/offline';

describe('cache hors ligne', () => {
  it('ne conserve que les billets autorisés hors connexion', () => {
    const tickets = [{ id: 'a', offline_allowed: true }, { id: 'b', offline_allowed: false }, { id: 'c', offline_allowed: null }];
    expect(offlineEligible(tickets).map((ticket) => ticket.id)).toEqual(['a']);
  });

  it('enregistre, relit (horodaté) puis vide le cache', async () => {
    await saveCache('tickets', [{ id: 'a' }]);
    const cached = await readCache<{ id: string }[]>('tickets');
    expect(cached?.data).toEqual([{ id: 'a' }]);
    expect(Date.parse(cached!.savedAt)).not.toBeNaN();
    await clearCache();
    expect(await readCache('tickets')).toBeNull();
  });
});
