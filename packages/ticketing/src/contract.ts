import type { DemoInventoryStore } from './providers/demo/store';

/**
 * Suite de tests de CONTRAT du fournisseur fictif, exécutée sur chaque implémentation du store
 * (mémoire et PostgreSQL). L'API de test est injectée pour ne pas dépendre d'un framework ici.
 */
interface TestApi {
  describe: (name: string, fn: () => void) => void;
  it: (name: string, fn: () => Promise<void>, timeout?: number) => void;
  expect: (value: unknown) => {
    toBe: (expected: unknown) => void;
    toEqual: (expected: unknown) => void;
    toHaveLength: (length: number) => void;
    toBeNull: () => void;
    toMatch: (pattern: RegExp) => void;
    not: { toBe: (expected: unknown) => void };
    rejects: { toMatchObject: (expected: unknown) => Promise<void> };
  };
}

export interface ContractContext {
  store: DemoInventoryStore;
  /** Identifiant unique pour isoler chaque test (références d'offres). */
  uid: () => string;
  /** Force l'expiration d'un blocage (horloge mémoire ou mise à jour SQL). */
  expireHold: (holdRef: string) => Promise<void>;
}

export function runDemoStoreContract(name: string, setup: () => Promise<ContractContext>, t: TestApi): void {
  const { describe, it, expect } = t;

  const errorWithCode = (code: string) => ({ code });

  describe(`contrat DemoInventoryStore — ${name}`, () => {
    async function offer(ctx: ContractContext, capacity = 10, extra: { maxPerOrder?: number; transferable?: boolean } = {}) {
      const offerRef = `OF-${ctx.uid()}`;
      await ctx.store.upsertInventory({
        offerRef,
        eventRef: `EV-${ctx.uid()}`,
        label: 'Catégorie test',
        currency: 'EUR',
        faceValueMinor: 2500,
        bookingFeeMinor: 150,
        capacity,
        maxPerOrder: extra.maxPerOrder ?? 6,
        transferable: extra.transferable ?? true,
      });
      return offerRef;
    }

    it('bloque puis libère des places', async () => {
      const ctx = await setup();
      const ref = await offer(ctx, 10);
      const hold = await ctx.store.createHold(ref, 4, 600, `k-${ctx.uid()}`);
      expect(hold.status).toBe('held');
      expect((await ctx.store.availability(ref)).available).toBe(6);
      const released = await ctx.store.releaseHold(hold.hold_ref);
      expect(released.status).toBe('released');
      expect((await ctx.store.availability(ref)).available).toBe(10);
    });

    it('est idempotent avec la même clé client', async () => {
      const ctx = await setup();
      const ref = await offer(ctx, 10);
      const key = `k-${ctx.uid()}`;
      const first = await ctx.store.createHold(ref, 2, 600, key);
      const second = await ctx.store.createHold(ref, 2, 600, key);
      expect(second.hold_ref).toBe(first.hold_ref);
      expect(second.replayed).toBe(true);
      expect((await ctx.store.availability(ref)).available).toBe(8);
    });

    it('refuse la survente et les quantités hors limite', async () => {
      const ctx = await setup();
      const ref = await offer(ctx, 3, { maxPerOrder: 6 });
      await expect(ctx.store.createHold(ref, 4, 600, `k-${ctx.uid()}`)).rejects.toMatchObject(errorWithCode('sold_out'));
      await expect(ctx.store.createHold(ref, 7, 600, `k-${ctx.uid()}`)).rejects.toMatchObject(errorWithCode('quantity_above_limit'));
    });

    it('ne survend jamais sous forte concurrence', async () => {
      const ctx = await setup();
      const ref = await offer(ctx, 5, { maxPerOrder: 1 });
      const attempts = await Promise.allSettled(
        Array.from({ length: 25 }, () => ctx.store.createHold(ref, 1, 600, `k-${ctx.uid()}`)),
      );
      const succeeded = attempts.filter((a) => a.status === 'fulfilled');
      expect(succeeded).toHaveLength(5);
      const availability = await ctx.store.availability(ref);
      expect(availability.available).toBe(0);
      expect(availability.held).toBe(5);
    }, 30_000);

    it('confirme une commande, émet les billets et reste idempotent', async () => {
      const ctx = await setup();
      const ref = await offer(ctx, 10);
      const hold = await ctx.store.createHold(ref, 3, 600, `k-${ctx.uid()}`);
      const order = await ctx.store.confirmHold(hold.hold_ref, 'holder-a');
      expect(order.quantity).toBe(3);
      expect(order.tickets).toHaveLength(3);
      expect(Number(order.amount_minor)).toBe(3 * (2500 + 150));
      const replay = await ctx.store.confirmHold(hold.hold_ref, 'holder-a');
      expect(replay.order_ref).toBe(order.order_ref);
      expect(replay.replayed).toBe(true);
      const availability = await ctx.store.availability(ref);
      expect(availability.sold).toBe(3);
      expect(availability.held).toBe(0);
    });

    it('refuse de confirmer un blocage expiré et libère son stock', async () => {
      const ctx = await setup();
      const ref = await offer(ctx, 4);
      const hold = await ctx.store.createHold(ref, 4, 600, `k-${ctx.uid()}`);
      await ctx.expireHold(hold.hold_ref);
      await expect(ctx.store.confirmHold(hold.hold_ref, 'holder-a')).rejects.toMatchObject(errorWithCode('hold_expired'));
      expect((await ctx.store.availability(ref)).available).toBe(4);
    });

    it('rembourse une commande et remet les places en vente', async () => {
      const ctx = await setup();
      const ref = await offer(ctx, 10);
      const hold = await ctx.store.createHold(ref, 2, 600, `k-${ctx.uid()}`);
      const order = await ctx.store.confirmHold(hold.hold_ref, 'holder-a');
      const refunded = await ctx.store.refundOrder(order.order_ref);
      expect(refunded.status).toBe('refunded');
      expect((await ctx.store.availability(ref)).available).toBe(10);
      const again = await ctx.store.refundOrder(order.order_ref);
      expect(again.replayed).toBe(true);
    });

    it('transfère un billet par réémission et vérifie la propriété', async () => {
      const ctx = await setup();
      const ref = await offer(ctx, 10);
      const hold = await ctx.store.createHold(ref, 1, 600, `k-${ctx.uid()}`);
      const order = await ctx.store.confirmHold(hold.hold_ref, 'seller');
      const ticketRef = order.tickets[0]?.ticket_ref ?? '';
      expect(await ctx.store.verifyOwnership(ticketRef, 'seller')).toBe(true);
      const transfer = await ctx.store.transferTicket(ticketRef, 'buyer');
      expect(transfer.ticket_ref).not.toBe(ticketRef);
      expect(await ctx.store.verifyOwnership(ticketRef, 'seller')).toBe(false);
      expect(await ctx.store.verifyOwnership(transfer.ticket_ref, 'buyer')).toBe(true);
      await expect(ctx.store.transferTicket(ticketRef, 'other')).rejects.toMatchObject(errorWithCode('ticket_not_transferable'));
    });

    it('refuse le transfert d’un billet non transférable', async () => {
      const ctx = await setup();
      const ref = await offer(ctx, 10, { transferable: false });
      const hold = await ctx.store.createHold(ref, 1, 600, `k-${ctx.uid()}`);
      const order = await ctx.store.confirmHold(hold.hold_ref, 'seller');
      await expect(ctx.store.transferTicket(order.tickets[0]?.ticket_ref ?? '', 'buyer')).rejects.toMatchObject(
        errorWithCode('ticket_not_transferable'),
      );
    });
  });
}
