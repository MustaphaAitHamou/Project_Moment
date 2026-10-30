import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkout, resale } from '../src';
import { adminClient, closePool, createTestUser, createTicketedEvent, sql, testContext, type TestUser } from './helpers';

const key = () => randomUUID();

async function buyTicket(ctx: ReturnType<typeof testContext>, buyer: TestUser, offerId: string) {
  const reservation = await checkout.createReservation(ctx, buyer.auth, { offerId, quantity: 1 }, key());
  const order = await checkout.createOrder(ctx, buyer.auth, reservation.id, key());
  const paid = await checkout.payOrder(ctx, buyer.auth, order.id, { scenario: 'success' });
  return paid.ticketIds[0] as string;
}

describe('revente de démonstration', () => {
  const ctx = testContext();
  let organizer: TestUser;

  beforeAll(async () => {
    organizer = await createTestUser({ roles: ['beta_tester', 'organizer'] });
  });

  afterAll(async () => {
    await closePool();
  });

  it('plafonne le prix au prix d’origine et refuse les doublons', async () => {
    const event = await createTicketedEvent(organizer, { faceValueMinor: 4000 });
    const seller = await createTestUser();
    const ticketId = await buyTicket(ctx, seller, event.offerId);
    await expect(resale.createListing(ctx, seller.auth, { ticketId, askingPriceMinor: 4001 })).rejects.toMatchObject({
      code: 'resale_price_above_cap',
    });
    const listing = await resale.createListing(ctx, seller.auth, { ticketId, askingPriceMinor: 3800 });
    expect(listing.status).toBe('active');
    expect(listing.maxAllowedPriceMinor).toBe(4000);
    expect(listing.buyerFeeMinor).toBe(190); // 5 % (simulation)
    await expect(resale.createListing(ctx, seller.auth, { ticketId, askingPriceMinor: 3500 })).rejects.toMatchObject({
      code: 'ticket_already_listed',
    });
  });

  it('refuse la revente d’un billet qui n’appartient pas au vendeur', async () => {
    const event = await createTicketedEvent(organizer);
    const owner = await createTestUser();
    const thief = await createTestUser();
    const ticketId = await buyTicket(ctx, owner, event.offerId);
    await expect(resale.createListing(ctx, thief.auth, { ticketId, askingPriceMinor: 1000 })).rejects.toMatchObject({ code: 'ticket_not_found' });
  });

  it('achat complet : paiement simulé, réémission du billet, ancien billet invalidé', async () => {
    const event = await createTicketedEvent(organizer, { faceValueMinor: 5000 });
    const seller = await createTestUser();
    const buyer = await createTestUser();
    const ticketId = await buyTicket(ctx, seller, event.offerId);
    const listing = await resale.createListing(ctx, seller.auth, { ticketId, askingPriceMinor: 4500, note: 'Empêchement' });

    const { data: publicListings } = await buyer.client.rpc('public_resale_listings', { p_event_id: event.eventId });
    const publicRow = (publicListings ?? []).find((l) => l.id === listing.id);
    expect(publicRow?.seller_alias).toMatch(/^V-[0-9A-F]{6}$/);
    expect(JSON.stringify(publicRow)).not.toContain(seller.id);

    await expect(resale.startPurchase(ctx, seller.auth, listing.id, key())).rejects.toMatchObject({ code: 'cannot_buy_own_listing' });
    const tx = await resale.startPurchase(ctx, buyer.auth, listing.id, key());
    expect(tx.status).toBe('payment_pending');
    expect(tx.totalMinor).toBe(4500 + 225);

    const other = await createTestUser();
    await expect(resale.startPurchase(ctx, other.auth, listing.id, key())).rejects.toMatchObject({ code: 'listing_not_available' });

    await expect(resale.payPurchase(ctx, buyer.auth, tx.id, { scenario: 'declined' })).rejects.toMatchObject({ code: 'payment_declined' });
    const completed = await resale.payPurchase(ctx, buyer.auth, tx.id, { scenario: 'success' });
    expect(completed.status).toBe('completed');
    expect(completed.newTicketId).toBeTruthy();

    const { data: oldTicket } = await adminClient().from('tickets').select('status, transferred_to_ticket_id').eq('id', ticketId).single();
    expect(oldTicket?.status).toBe('transferred');
    const { data: newTicket } = await buyer.client.from('tickets').select('owner_id, source, original_price_minor, barcode_value').eq('id', completed.newTicketId!).single();
    expect(newTicket).toMatchObject({ owner_id: buyer.id, source: 'resale', original_price_minor: 5000, barcode_value: null });
    const { data: history } = await buyer.client.from('resale_transaction_events').select('to_status').eq('transaction_id', tx.id).order('id');
    expect(history?.map((h) => h.to_status)).toEqual(['payment_pending', 'paid', 'transfer_pending', 'completed']);
    const { data: sellerNotif } = await seller.client.from('notifications').select('type').eq('type', 'resale_listing_sold');
    expect(sellerNotif).toHaveLength(1);

    // Le vendeur conserve l'ancien billet (statut « transféré ») mais ne peut plus le revendre.
    await expect(resale.createListing(ctx, seller.auth, { ticketId, askingPriceMinor: 1000 })).rejects.toMatchObject({ code: 'ticket_not_resellable' });
  });

  it('libère l’annonce si l’acheteur ne paie pas dans le délai', async () => {
    const event = await createTicketedEvent(organizer);
    const seller = await createTestUser();
    const buyer = await createTestUser();
    const ticketId = await buyTicket(ctx, seller, event.offerId);
    const listing = await resale.createListing(ctx, seller.auth, { ticketId, askingPriceMinor: 2000 });
    const tx = await resale.startPurchase(ctx, buyer.auth, listing.id, key());
    await sql().query(`update public.resale_transactions set expires_at = now() - interval '1 second' where id = $1`, [tx.id]);
    await adminClient().rpc('maintenance_expire_commerce');
    const { data: refreshed } = await adminClient().from('resale_listings').select('status').eq('id', listing.id).single();
    expect(refreshed?.status).toBe('active');
    const { data: txRow } = await adminClient().from('resale_transactions').select('status').eq('id', tx.id).single();
    expect(txRow?.status).toBe('cancelled');
  });

  it('permet d’ouvrir un litige et de signaler une annonce', async () => {
    const event = await createTicketedEvent(organizer);
    const seller = await createTestUser();
    const buyer = await createTestUser();
    const ticketId = await buyTicket(ctx, seller, event.offerId);
    const listing = await resale.createListing(ctx, seller.auth, { ticketId, askingPriceMinor: 2000 });
    const report = await buyer.client.rpc('report_resale_listing', { p_listing_id: listing.id, p_reason: 'price_abuse', p_details: 'Test' });
    expect(report.error).toBeNull();
    const tx = await resale.startPurchase(ctx, buyer.auth, listing.id, key());
    await resale.payPurchase(ctx, buyer.auth, tx.id, { scenario: 'success' });
    const dispute = await resale.openDispute(ctx, buyer.auth, { transactionId: tx.id, reason: 'ticket_invalid', details: 'Test' });
    expect((dispute as { status: string }).status).toBe('open');
    const { data: txRow } = await adminClient().from('resale_transactions').select('status').eq('id', tx.id).single();
    expect(txRow?.status).toBe('disputed');
  });

  it('respecte la désactivation de la démonstration de revente', async () => {
    const event = await createTicketedEvent(organizer);
    const seller = await createTestUser();
    const ticketId = await buyTicket(ctx, seller, event.offerId);
    await sql().query(`update public.app_settings set value = value || '{"demo_enabled": false}' where key = 'resale'`);
    try {
      await expect(resale.createListing(ctx, seller.auth, { ticketId, askingPriceMinor: 1000 })).rejects.toMatchObject({ code: 'resale_demo_disabled' });
    } finally {
      await sql().query(`update public.app_settings set value = value || '{"demo_enabled": true}' where key = 'resale'`);
    }
  });
});
