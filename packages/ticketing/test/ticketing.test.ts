import { describe, expect, it } from 'vitest';
import { AppError } from '@tamurt/core';
import {
  assertConnectorConsistency,
  ConnectorRegistry,
  createUnimplementedConnector,
  DemoTicketProvider,
  enabledCapabilities,
  MemoryDemoInventoryStore,
  PLANNED_PARTNERS,
  requireMethod,
  runDemoStoreContract,
  signDemoWebhook,
  verifyDemoWebhookSignature,
} from '../src';

let counter = 0;
runDemoStoreContract(
  'mémoire',
  async () => {
    let now = new Date('2026-11-01T10:00:00Z');
    const store = new MemoryDemoInventoryStore(() => now);
    return {
      store,
      uid: () => `${Date.now().toString(36)}-${(counter += 1)}`,
      expireHold: async () => {
        now = new Date(now.getTime() + 3_600_000);
      },
    };
  },
  { describe, it, expect: expect as never },
);

describe('DemoTicketProvider', () => {
  const provider = new DemoTicketProvider(new MemoryDemoInventoryStore(), { webhookSecret: 'whsec_test_only' });

  it('déclare explicitement ses capacités et les implémente toutes', () => {
    expect(assertConnectorConsistency(provider)).toEqual([]);
    expect(enabledCapabilities(provider.capabilities)).toContain('inventory.hold');
    expect(provider.capabilities.cart).toBe(false);
    expect(provider.mode).toBe('demo');
  });

  it('parcours complet : offre, blocage, commande, livraison SANS code d’accès', async () => {
    const store = new MemoryDemoInventoryStore();
    const demo = new DemoTicketProvider(store);
    await store.upsertInventory({ offerRef: 'OF-1', eventRef: 'EV-1', label: 'Fosse', currency: 'EUR', faceValueMinor: 3000, bookingFeeMinor: 200, capacity: 50 });
    const offers = await demo.listOffers('EV-1');
    expect(offers[0]?.available).toBe(50);
    const hold = await demo.createHold({ externalOfferId: 'OF-1', quantity: 2, ttlSeconds: 600, clientKey: 'abc12345' });
    const order = await demo.confirmOrder({ holdRef: hold.holdRef, holderRef: 'user-1' });
    const delivery = await demo.getDelivery(order.orderRef);
    expect(delivery.mode).toBe('demo_specimen');
    expect(delivery.tickets.every((t) => t.barcodeValue === null && t.barcodeFormat === null && !t.offlineAllowed)).toBe(true);
  });

  it('vérifie la signature des webhooks et refuse les rejeux', async () => {
    const body = JSON.stringify({ id: 'evt_1', type: 'order.refunded', payload: { order_ref: 'DO-1' } });
    const now = Math.floor(Date.now() / 1000);
    const header = await signDemoWebhook('whsec_test_only', body, now);
    await expect(provider.verifyWebhook({ 'x-demo-signature': header }, body)).resolves.toMatchObject({ id: 'evt_1' });
    await expect(provider.verifyWebhook({ 'x-demo-signature': header }, body + ' ')).rejects.toMatchObject({ code: 'forbidden' });
    const old = await signDemoWebhook('whsec_test_only', body, now - 3600);
    await expect(verifyDemoWebhookSignature('whsec_test_only', old, body, now)).rejects.toMatchObject({ code: 'forbidden' });
  });
});

describe('registre et partenaires', () => {
  const demo = new DemoTicketProvider(new MemoryDemoInventoryStore());

  it('n’expose que le fournisseur fictif en démonstration', () => {
    const registry = new ConnectorRegistry({ demo });
    expect(registry.get('demo', 'demo')).toBe(demo);
    expect(() => registry.get('ticketmaster', 'demo')).toThrow(AppError);
  });

  it('refuse le mode réel sans connecteur implémenté, configuré ET activé', () => {
    const registry = new ConnectorRegistry({ demo, liveEnabledIds: ['ticketmaster'] });
    expect(() => registry.get('ticketmaster', 'live')).toThrowError(expect.objectContaining({ code: 'provider_not_configured' }));
    const fakeLive = { ...createUnimplementedConnector(PLANNED_PARTNERS[0]!), id: 'partner_x' };
    const registry2 = new ConnectorRegistry({ demo, live: [fakeLive], liveEnabledIds: [] });
    expect(() => registry2.get('partner_x', 'live')).toThrowError(expect.objectContaining({ code: 'live_mode_disabled' }));
  });

  it('les partenaires envisagés ne déclarent aucune capacité et ne simulent aucun appel', () => {
    for (const partner of PLANNED_PARTNERS) {
      const connector = createUnimplementedConnector(partner);
      expect(enabledCapabilities(connector.capabilities)).toEqual([]);
      expect(() => requireMethod(connector, 'createHold')).toThrowError(expect.objectContaining({ code: 'capability_not_supported' }));
    }
    const described = new ConnectorRegistry({ demo }).describe();
    expect(described.find((c) => c.id === 'weezevent')?.implemented).toBe(false);
  });
});
