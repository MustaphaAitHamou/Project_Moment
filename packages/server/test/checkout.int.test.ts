import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkout } from '../src';
import { adminClient, closePool, createTestUser, createTicketedEvent, sql, testContext, type TestUser } from './helpers';

const key = () => randomUUID();

describe('billetterie de démonstration — parcours complet', () => {
  const ctx = testContext();
  let organizer: TestUser;
  let buyer: TestUser;

  beforeAll(async () => {
    [organizer, buyer] = await Promise.all([createTestUser({ roles: ['beta_tester', 'organizer'] }), createTestUser()]);
  });

  afterAll(async () => {
    await closePool();
  });

  it('réserve, crée la commande, paie (simulé) et émet des billets SANS code d’accès', async () => {
    const event = await createTicketedEvent(organizer, { capacity: 20, faceValueMinor: 3500 });
    const reservation = await checkout.createReservation(ctx, buyer.auth, { offerId: event.offerId, quantity: 2 }, key());
    expect(reservation.status).toBe('active');
    expect(reservation.environment).toBe('demo');
    // 2 × 35,00 + frais fournisseur 2 × 1,50 + frais de service simulés 2 % (0,70 × 2)
    expect(reservation.pricing.subtotalMinor).toBe(7000);
    expect(reservation.pricing.providerFeesMinor).toBe(300);
    expect(reservation.pricing.serviceFeesMinor).toBe(140);
    expect(reservation.pricing.totalMinor).toBe(7440);
    expect(reservation.pricing.isSimulation).toBe(true);
    // La ventilation interne des revenus Tamurt n'est jamais exposée à l'acheteur.
    expect('tamurtRevenue' in reservation.pricing).toBe(false);

    const order = await checkout.createOrder(ctx, buyer.auth, reservation.id, key());
    expect(order.orderNumber).toMatch(/^TD-\d{6}-[A-F0-9]{8}$/);
    expect(order.status).toBe('pending_payment');

    const paid = await checkout.payOrder(ctx, buyer.auth, order.id, { scenario: 'success' });
    expect(paid.status).toBe('fulfilled');
    expect(paid.ticketIds).toHaveLength(2);

    const { data: tickets } = await buyer.client.from('tickets').select('*').eq('order_id', order.id);
    expect(tickets).toHaveLength(2);
    for (const ticket of tickets ?? []) {
      expect(ticket.environment).toBe('demo');
      expect(ticket.delivery_mode).toBe('demo_specimen');
      expect(ticket.barcode_value).toBeNull();
      expect(ticket.offline_allowed).toBe(false);
    }
    const { data: notifications } = await buyer.client.from('notifications').select('type, is_demo').eq('type', 'order_confirmed');
    expect(notifications?.[0]?.is_demo).toBe(true);
    const { data: offer } = await adminClient().from('ticket_offers').select('available_estimate').eq('id', event.offerId).single();
    expect(offer?.available_estimate).toBe(18);
  });

  it('applique un code promo autorisé par l’accord (simulation) et refuse un code inconnu', async () => {
    const event = await createTicketedEvent(organizer, { capacity: 10, faceValueMinor: 4000 });
    const withPromo = await checkout.createReservation(ctx, buyer.auth, { offerId: event.offerId, quantity: 1, promoCode: 'DEMO5' }, key());
    expect(withPromo.pricing.discountMinor).toBe(200);
    expect(withPromo.pricing.promotion?.applied).toBe(true);
    await checkout.releaseReservation(ctx, buyer.auth, withPromo.id);
    await expect(
      checkout.createReservation(ctx, buyer.auth, { offerId: event.offerId, quantity: 1, promoCode: 'INCONNU' }, key()),
    ).rejects.toMatchObject({ code: 'promo_code_invalid' });
  });

  it('est idempotent : même clé => même réservation et même commande', async () => {
    const event = await createTicketedEvent(organizer, { capacity: 10 });
    const reservationKey = key();
    const first = await checkout.createReservation(ctx, buyer.auth, { offerId: event.offerId, quantity: 1 }, reservationKey);
    const second = await checkout.createReservation(ctx, buyer.auth, { offerId: event.offerId, quantity: 1 }, reservationKey);
    expect(second.id).toBe(first.id);
    const { data: availability } = await adminClient().rpc('demo_provider_availability', { p_offer_ref: event.externalOfferId });
    expect((availability as { available: number }).available).toBe(9);
    await expect(
      checkout.createReservation(ctx, buyer.auth, { offerId: event.offerId, quantity: 2 }, reservationKey),
    ).rejects.toMatchObject({ code: 'idempotency_key_reused' });

    const orderA = await checkout.createOrder(ctx, buyer.auth, first.id, key());
    const orderB = await checkout.createOrder(ctx, buyer.auth, first.id, key());
    expect(orderB.id).toBe(orderA.id);
  });

  it('ne survend jamais les dernières places sous concurrence (plusieurs acheteurs)', async () => {
    const event = await createTicketedEvent(organizer, { capacity: 3, maxPerOrder: 1 });
    const buyers = await Promise.all(Array.from({ length: 6 }, () => createTestUser()));
    const results = await Promise.allSettled(
      buyers.map((b) => checkout.createReservation(ctx, b.auth, { offerId: event.offerId, quantity: 1 }, key())),
    );
    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(ok).toHaveLength(3);
    expect(failed.every((f) => (f.reason as { code: string }).code === 'sold_out')).toBe(true);
  });

  it('un paiement refusé laisse la commande payable, puis un nouvel essai réussit', async () => {
    const event = await createTicketedEvent(organizer, { capacity: 5 });
    const reservation = await checkout.createReservation(ctx, buyer.auth, { offerId: event.offerId, quantity: 1 }, key());
    const order = await checkout.createOrder(ctx, buyer.auth, reservation.id, key());
    await expect(checkout.payOrder(ctx, buyer.auth, order.id, { scenario: 'declined' })).rejects.toMatchObject({ code: 'payment_declined' });
    await expect(checkout.payOrder(ctx, buyer.auth, order.id, { scenario: 'error' })).rejects.toMatchObject({ code: 'payment_failed' });
    const paid = await checkout.payOrder(ctx, buyer.auth, order.id, { scenario: 'success' });
    expect(paid.status).toBe('fulfilled');
    // Rejouer le paiement ne débite pas une seconde fois.
    const replay = await checkout.payOrder(ctx, buyer.auth, order.id, { scenario: 'success' });
    expect(replay.id).toBe(order.id);
    const { rows } = await sql().query(`select status, count(*)::int as n from public.payment_references where order_id = $1 group by status`, [order.id]);
    expect(rows.find((r) => r.status === 'succeeded')?.n).toBe(1);
    expect(rows.find((r) => r.status === 'failed')?.n).toBe(1);
  });

  it('refuse de payer après expiration de la réservation et libère les places', async () => {
    const event = await createTicketedEvent(organizer, { capacity: 4 });
    const reservation = await checkout.createReservation(ctx, buyer.auth, { offerId: event.offerId, quantity: 4 }, key());
    const order = await checkout.createOrder(ctx, buyer.auth, reservation.id, key());
    await sql().query(`update public.orders set expires_at = now() - interval '1 second' where id = $1`, [order.id]);
    await sql().query(`update public.reservations set expires_at = now() - interval '1 second' where id = $1`, [reservation.id]);
    const { rows: holdRows } = await sql().query(`select provider_hold_ref from public.reservations where id = $1`, [reservation.id]);
    await sql().query(`update demo_provider.holds set expires_at = now() - interval '1 second' where hold_ref = $1`, [holdRows[0].provider_hold_ref]);
    await expect(checkout.payOrder(ctx, buyer.auth, order.id, { scenario: 'success' })).rejects.toMatchObject({ code: 'order_expired' });
    const { data: maintenance } = await adminClient().rpc('maintenance_expire_commerce');
    expect((maintenance as { holds: number }).holds).toBeGreaterThanOrEqual(1);
    const { data: availability } = await adminClient().rpc('demo_provider_availability', { p_offer_ref: event.externalOfferId });
    expect((availability as { available: number }).available).toBe(4);
    const { data: expiredOrder } = await adminClient().from('orders').select('status').eq('id', order.id).single();
    expect(expiredOrder?.status).toBe('expired');
  });

  it('rembourse automatiquement si le fournisseur ne peut plus confirmer après paiement', async () => {
    const event = await createTicketedEvent(organizer, { capacity: 2 });
    const reservation = await checkout.createReservation(ctx, buyer.auth, { offerId: event.offerId, quantity: 1 }, key());
    const order = await checkout.createOrder(ctx, buyer.auth, reservation.id, key());
    const { rows } = await sql().query(`select provider_hold_ref from public.reservations where id = $1`, [reservation.id]);
    await sql().query(`update demo_provider.holds set expires_at = now() - interval '1 second' where hold_ref = $1`, [rows[0].provider_hold_ref]);
    await expect(checkout.payOrder(ctx, buyer.auth, order.id, { scenario: 'success' })).rejects.toMatchObject({ code: 'hold_expired' });
    const { data: finalOrder } = await adminClient().from('orders').select('status').eq('id', order.id).single();
    expect(finalOrder?.status).toBe('refunded');
    const { rows: refunds } = await sql().query(`select status from public.refunds where order_id = $1`, [order.id]);
    expect(refunds[0]?.status).toBe('succeeded');
  });

  it('annule et rembourse une commande de démonstration, et remet les places en vente', async () => {
    const event = await createTicketedEvent(organizer, { capacity: 5 });
    const reservation = await checkout.createReservation(ctx, buyer.auth, { offerId: event.offerId, quantity: 2 }, key());
    const order = await checkout.createOrder(ctx, buyer.auth, reservation.id, key());
    await checkout.payOrder(ctx, buyer.auth, order.id, { scenario: 'success' });
    const refunded = await checkout.refundDemoOrder(ctx, buyer.auth, order.id);
    expect(refunded.status).toBe('refunded');
    const { data: tickets } = await adminClient().from('tickets').select('status').eq('order_id', order.id);
    expect(tickets?.every((t) => t.status === 'refunded')).toBe(true);
    const { data: availability } = await adminClient().rpc('demo_provider_availability', { p_offer_ref: event.externalOfferId });
    expect((availability as { available: number }).available).toBe(5);
  });

  it('limite le débit des réservations par utilisateur', async () => {
    const event = await createTicketedEvent(organizer, { capacity: 50 });
    const spammer = await createTestUser();
    const attempts = await Promise.allSettled(
      Array.from({ length: 12 }, () => checkout.releaseReservation(ctx, spammer.auth, randomUUID()).catch(() => undefined).then(() =>
        checkout.createReservation(ctx, spammer.auth, { offerId: event.offerId, quantity: 1 }, key()),
      )),
    );
    const rateLimited = attempts.filter((a) => a.status === 'rejected' && (a.reason as { code: string }).code === 'rate_limited');
    expect(rateLimited.length).toBeGreaterThanOrEqual(2);
  });

  it('limite le nombre de réservations simultanées par utilisateur', async () => {
    const event = await createTicketedEvent(organizer, { capacity: 50 });
    const hoarder = await createTestUser();
    for (let i = 0; i < 3; i += 1) {
      await checkout.createReservation(ctx, hoarder.auth, { offerId: event.offerId, quantity: 1 }, key());
    }
    await expect(checkout.createReservation(ctx, hoarder.auth, { offerId: event.offerId, quantity: 1 }, key())).rejects.toMatchObject({
      code: 'too_many_active_reservations',
    });
    // Le blocage refusé a été libéré (compensation) : 3 places bloquées seulement.
    const { data: availability } = await adminClient().rpc('demo_provider_availability', { p_offer_ref: event.externalOfferId });
    expect((availability as { available: number }).available).toBe(47);
  });

  it('refuse la billetterie aux comptes sans accès bêta pendant la bêta fermée', async () => {
    const event = await createTicketedEvent(organizer, { capacity: 5 });
    const noBeta = await createTestUser({ roles: [] });
    await expect(checkout.createReservation(ctx, noBeta.auth, { offerId: event.offerId, quantity: 1 }, key())).rejects.toMatchObject({
      code: 'beta_access_required',
    });
  });

  it('bloque toute vente réelle sans accord ni activation explicite', async () => {
    const event = await createTicketedEvent(organizer, { capacity: 5 });
    const buyer = await createTestUser();
    const admin = adminClient();
    const { data: liveOffer, error } = await admin
      .from('ticket_offers')
      .insert({
        event_id: event.eventId,
        provider_id: 'ticketmaster',
        external_offer_id: `LIVE-${randomUUID().slice(0, 8)}`,
        environment: 'live',
        name: 'Offre réelle (test)',
        currency: 'EUR',
        face_value_minor: 5000,
      })
      .select('id')
      .single();
    expect(error).toBeNull();
    await expect(checkout.createReservation(ctx, buyer.auth, { offerId: liveOffer!.id, quantity: 1 }, key())).rejects.toMatchObject({
      code: 'provider_not_configured',
    });
    // Même en appelant directement la fonction SQL, le mode réel est refusé par la base.
    const direct = await admin.rpc('checkout_create_reservation', {
      p_user_id: buyer.id,
      p_offer_id: liveOffer!.id,
      p_quantity: 1,
      p_provider_hold_ref: 'fake',
      p_expires_at: new Date(Date.now() + 60_000).toISOString(),
      p_pricing: {},
      p_idempotency_key: key(),
    });
    expect(direct.error?.message).toBe('live_mode_disabled');
  });

  it('refuse une commande pour la réservation d’un autre utilisateur', async () => {
    const event = await createTicketedEvent(organizer, { capacity: 5 });
    const buyer = await createTestUser();
    const reservation = await checkout.createReservation(ctx, buyer.auth, { offerId: event.offerId, quantity: 1 }, key());
    const intruder = await createTestUser();
    await expect(checkout.createOrder(ctx, intruder.auth, reservation.id, key())).rejects.toMatchObject({ code: 'reservation_not_found' });
  });
});
