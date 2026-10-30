import {
  AppError,
  COUNTRIES,
  computePricing,
  isCountryCode,
  isCurrencyCode,
  offerSellability,
  pricingToSnapshot,
  termsFromAgreementRow,
  toAppError,
  type AgreementModel,
  type AgreementStatus,
  type PricingBreakdown,
} from '@tamurt/core';
import { requireMethod } from '@tamurt/ticketing';
import type { CreateReservationInput, DemoPaymentInput } from '@tamurt/validation';
import { requireAppAccess, type AuthUser, type ServerContext } from '../context';
import { holderRefFor, sha256Hex } from '../crypto';
import { compositeOrNull, unwrap, unwrapMaybe } from '../db';
import { enforceRateLimit, withIdempotency } from '../reliability';

/**
 * Parcours d'achat :
 *   1. réservation temporaire (blocage des places chez le fournisseur + instantané de prix) ;
 *   2. création de la commande (une seule par réservation) ;
 *   3. paiement (simulé en démonstration) puis confirmation chez le fournisseur et émission des billets.
 * Garanties : idempotence, verrou par commande pour le paiement, compensation (libération du
 * blocage, remboursement) en cas d'échec, séparation stricte démonstration / réel.
 */

/**
 * Tarification visible par l'acheteur : la répartition interne des revenus Tamurt (commission,
 * partage de frais, marge) et les avertissements de simulation restent côté serveur.
 */
export type BuyerPricing = Omit<PricingBreakdown, 'tamurtRevenue' | 'warnings'>;

export function toBuyerPricing(pricing: PricingBreakdown): BuyerPricing {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tamurtRevenue, warnings, ...buyer } = pricing;
  return buyer;
}

export interface ReservationView {
  id: string;
  status: string;
  expiresAt: string;
  quantity: number;
  environment: 'demo' | 'live';
  offer: { id: string; name: string };
  event: { id: string; slug: string; title: string; startsAt: string; timezone: string };
  pricing: BuyerPricing;
}

export interface OrderView {
  id: string;
  orderNumber: string;
  status: string;
  environment: 'demo' | 'live';
  totalMinor: number;
  currency: string;
  expiresAt: string;
  ticketIds: string[];
}

async function loadCommerceSettings(ctx: ServerContext) {
  const { data } = await ctx.admin.from('app_settings').select('value').eq('key', 'commerce').maybeSingle();
  const value = (data?.value ?? {}) as { reservation_ttl_seconds?: number; max_tickets_per_order?: number };
  return {
    ttlSeconds: Math.min(Math.max(value.reservation_ttl_seconds ?? 600, 60), 1800),
    maxTicketsPerOrder: value.max_tickets_per_order ?? 10,
  };
}

async function updateAvailabilityEstimate(ctx: ServerContext, offerId: string, providerId: string, environment: 'demo' | 'live', externalOfferId: string) {
  try {
    const connector = ctx.registry.get(providerId, environment);
    const availability = await requireMethod(connector, 'getAvailability')(externalOfferId);
    await ctx.admin
      .from('ticket_offers')
      .update({ available_estimate: availability.available, status: availability.available === 0 ? 'sold_out' : 'on_sale' })
      .eq('id', offerId)
      .in('status', ['on_sale', 'sold_out']);
  } catch (error) {
    ctx.logger.warn('availability_refresh_failed', { offerId, error: (error as Error).message });
  }
}

export async function createReservation(
  ctx: ServerContext,
  user: AuthUser,
  input: CreateReservationInput,
  idempotencyKey: string,
): Promise<ReservationView> {
  await requireAppAccess(ctx, user);
  await enforceRateLimit(ctx, `reserve:${user.id}`, 10, 60);

  const result = await withIdempotency(
    ctx,
    { userId: user.id, scope: 'checkout.reserve', key: idempotencyKey, request: input },
    async () => ({ status: 201, body: await reserve(ctx, user, input, idempotencyKey) }),
  );
  return result.body;
}

async function reserve(ctx: ServerContext, user: AuthUser, input: CreateReservationInput, idempotencyKey: string): Promise<ReservationView> {
  const offer = unwrap(
    await ctx.admin
      .from('ticket_offers')
      .select('*, event:events!inner(id, slug, title, status, visibility, registration_mode, starts_at, timezone, country_code, deleted_at)')
      .eq('id', input.offerId)
      .maybeSingle(),
    'offer_not_found',
  );
  const event = offer.event;
  const reason = offerSellability(offer, event, ctx.now());
  if (reason !== 'ok') throw new AppError(reason);

  const settings = await loadCommerceSettings(ctx);
  if (input.quantity < offer.min_per_order || input.quantity > Math.min(offer.max_per_order, settings.maxTicketsPerOrder)) {
    throw new AppError('invalid_quantity');
  }
  if (!isCountryCode(event.country_code) || !isCurrencyCode(offer.currency)) throw new AppError('internal_error');

  const environment = offer.environment;
  const connector = ctx.registry.get(offer.provider_id, environment);

  const agreementRow = compositeOrNull(
    unwrapMaybe(await ctx.admin.rpc('resolve_commercial_agreement', { p_provider_id: offer.provider_id, p_event_id: event.id })),
  );
  const terms = agreementRow
    ? termsFromAgreementRow({
        ...agreementRow,
        model: agreementRow.model as AgreementModel,
        status: agreementRow.status as AgreementStatus,
      })
    : null;

  let promotion: { id: string; code: string; discountBps: number; maxDiscountMinor: number | null } | null = null;
  if (input.promoCode) {
    if (!agreementRow) throw new AppError('promo_code_not_allowed');
    const promo = compositeOrNull(
      unwrapMaybe(await ctx.admin.rpc('find_promotion', { p_code: input.promoCode, p_agreement_id: agreementRow.id })),
    );
    if (!promo) throw new AppError('promo_code_invalid');
    promotion = { id: promo.id, code: promo.code, discountBps: promo.discount_bps, maxDiscountMinor: promo.max_discount_minor };
  }

  const pricing = computePricing({
    currency: offer.currency,
    unitFaceValueMinor: offer.face_value_minor,
    unitProviderFeeMinor: offer.provider_fee_minor,
    quantity: input.quantity,
    terms,
    promotion: promotion ? { code: promotion.code, discountBps: promotion.discountBps, maxDiscountMinor: promotion.maxDiscountMinor } : null,
    taxDisplay: COUNTRIES[event.country_code].taxDisplay,
    taxRules: [],
  });
  if (promotion && !pricing.promotion?.applied) throw new AppError('promo_code_not_allowed');

  const hold = await requireMethod(connector, 'createHold')({
    externalOfferId: offer.external_offer_id,
    quantity: input.quantity,
    ttlSeconds: settings.ttlSeconds,
    clientKey: `res-${sha256Hex(`${user.id}:${idempotencyKey}`).slice(0, 40)}`,
  });

  const { data: reservation, error } = await ctx.admin.rpc('checkout_create_reservation', {
    p_user_id: user.id,
    p_offer_id: offer.id,
    p_quantity: input.quantity,
    p_provider_hold_ref: hold.holdRef,
    p_expires_at: hold.expiresAt,
    p_pricing: pricingToSnapshot(pricing, agreementRow?.id ?? null) as never,
    ...(promotion ? { p_promotion_id: promotion.id } : {}),
    p_idempotency_key: idempotencyKey,
  });
  if (error || !reservation) {
    // Compensation : on libère les places bloquées chez le fournisseur.
    if (!hold.replayed) {
      await requireMethod(connector, 'releaseHold')(hold.holdRef).catch((releaseError: unknown) =>
        ctx.logger.error('hold_release_failed', { holdRef: hold.holdRef, error: (releaseError as Error).message }),
      );
    }
    throw toAppError(error ?? new AppError('internal_error'));
  }

  void updateAvailabilityEstimate(ctx, offer.id, offer.provider_id, environment, offer.external_offer_id);

  return {
    id: reservation.id,
    status: reservation.status,
    expiresAt: reservation.expires_at,
    quantity: reservation.quantity,
    environment,
    offer: { id: offer.id, name: offer.name },
    event: { id: event.id, slug: event.slug, title: event.title, startsAt: event.starts_at, timezone: event.timezone },
    pricing: toBuyerPricing(pricing),
  };
}

export async function getReservation(ctx: ServerContext, user: AuthUser, reservationId: string): Promise<ReservationView> {
  const row = unwrap(
    await ctx.admin
      .from('reservations')
      .select('*, offer:ticket_offers!inner(id, name), event:events!inner(id, slug, title, starts_at, timezone)')
      .eq('id', reservationId)
      .eq('user_id', user.id)
      .maybeSingle(),
    'reservation_not_found',
  );
  const snapshot = row.pricing as unknown as Record<string, unknown>;
  return {
    id: row.id,
    status: row.status,
    expiresAt: row.expires_at,
    quantity: row.quantity,
    environment: row.environment,
    offer: { id: row.offer.id, name: row.offer.name },
    event: { id: row.event.id, slug: row.event.slug, title: row.event.title, startsAt: row.event.starts_at, timezone: row.event.timezone },
    pricing: toBuyerPricing(snapshotToBreakdown(snapshot)),
  };
}

function snapshotToBreakdown(s: Record<string, unknown>): PricingBreakdown {
  const n = (key: string) => Number(s[key] ?? 0);
  return {
    currency: s.currency as PricingBreakdown['currency'],
    quantity: n('quantity'),
    unitFaceValueMinor: n('unit_face_value_minor'),
    unitProviderFeeMinor: n('unit_provider_fee_minor'),
    serviceFeePerTicketMinor: n('service_fee_per_ticket_minor'),
    subtotalMinor: n('subtotal_minor'),
    providerFeesMinor: n('provider_fees_minor'),
    serviceFeesMinor: n('service_fees_minor'),
    discountMinor: n('discount_minor'),
    taxAddedMinor: n('tax_added_minor'),
    taxIncludedMinor: n('tax_included_minor'),
    totalMinor: n('total_minor'),
    taxLines: (s.tax_lines as PricingBreakdown['taxLines']) ?? [],
    promotion: (s.promotion as PricingBreakdown['promotion']) ?? null,
    tamurtRevenue: (s.tamurt_revenue as PricingBreakdown['tamurtRevenue']) ?? {
      commissionMinor: 0,
      feeShareMinor: 0,
      catalogMarginMinor: 0,
      serviceFeesMinor: 0,
      promotionCostMinor: 0,
      netMinor: 0,
    },
    isSimulation: Boolean(s.is_simulation),
    warnings: (s.warnings as PricingBreakdown['warnings']) ?? [],
  };
}

export async function releaseReservation(ctx: ServerContext, user: AuthUser, reservationId: string): Promise<void> {
  const reservation = unwrap(
    await ctx.admin.from('reservations').select('*').eq('id', reservationId).eq('user_id', user.id).maybeSingle(),
    'reservation_not_found',
  );
  if (reservation.status !== 'active') return;
  const connector = ctx.registry.get(reservation.provider_id, reservation.environment);
  await requireMethod(connector, 'releaseHold')(reservation.provider_hold_ref).catch((error: unknown) => {
    const appError = toAppError(error);
    if (appError.code !== 'hold_not_found') throw appError;
  });
  unwrap(await ctx.admin.rpc('checkout_release_reservation', { p_user_id: user.id, p_reservation_id: reservationId }));
}

export async function createOrder(ctx: ServerContext, user: AuthUser, reservationId: string, idempotencyKey: string): Promise<OrderView> {
  await requireAppAccess(ctx, user);
  const result = await withIdempotency(
    ctx,
    { userId: user.id, scope: 'checkout.order', key: idempotencyKey, request: { reservationId } },
    async () => {
      const reservation = unwrap(
        await ctx.admin.from('reservations').select('environment').eq('id', reservationId).eq('user_id', user.id).maybeSingle(),
        'reservation_not_found',
      );
      const order = unwrap(
        await ctx.admin.rpc('checkout_create_order', {
          p_user_id: user.id,
          p_reservation_id: reservationId,
          p_idempotency_key: idempotencyKey,
          p_payment_provider: ctx.payments.resolve(reservation.environment).id,
          p_buyer_email: user.email,
          p_buyer_name: user.displayName,
        }),
      );
      return { status: 201, body: toOrderView(order, []) };
    },
  );
  return result.body;
}

function toOrderView(
  order: { id: string; order_number: string; status: string; environment: 'demo' | 'live'; total_minor: number; currency: string; expires_at: string },
  ticketIds: string[],
): OrderView {
  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    environment: order.environment,
    totalMinor: Number(order.total_minor),
    currency: order.currency,
    expiresAt: order.expires_at,
    ticketIds,
  };
}

/**
 * Paiement puis émission des billets. Un verrou d'idempotence PAR COMMANDE empêche tout double
 * débit (deux onglets, double clic, nouvelle tentative réseau). Un refus libère le verrou pour
 * permettre une nouvelle tentative tant que les places sont bloquées.
 */
export async function payOrder(ctx: ServerContext, user: AuthUser, orderId: string, payment: DemoPaymentInput): Promise<OrderView> {
  await requireAppAccess(ctx, user);
  await enforceRateLimit(ctx, `pay:${user.id}`, 20, 60);
  const result = await withIdempotency(
    ctx,
    { userId: user.id, scope: 'checkout.pay', key: `order-${orderId}`, request: { orderId } },
    async () => ({ status: 200, body: await pay(ctx, user, orderId, payment) }),
  );
  return result.body;
}

async function pay(ctx: ServerContext, user: AuthUser, orderId: string, payment: DemoPaymentInput): Promise<OrderView> {
  const order = unwrap(
    await ctx.admin.from('orders').select('*').eq('id', orderId).eq('user_id', user.id).maybeSingle(),
    'order_not_found',
  );
  if (order.status === 'fulfilled') {
    const { data: tickets } = await ctx.admin.from('tickets').select('id').eq('order_id', order.id);
    return toOrderView(order, (tickets ?? []).map((t) => t.id));
  }
  if (order.status !== 'pending_payment') throw new AppError('order_not_payable');
  if (new Date(order.expires_at) <= ctx.now()) throw new AppError('order_expired');

  const reservation = unwrap(
    await ctx.admin.from('reservations').select('*, offer:ticket_offers!inner(id, external_offer_id)').eq('id', order.reservation_id).maybeSingle(),
    'reservation_not_found',
  );
  const connector = ctx.registry.get(order.provider_id, order.environment);
  const paymentProvider = ctx.payments.resolve(order.environment);

  // Une tentative = une clé ; l'historique des tentatives refusées reste consultable.
  const { count } = await ctx.admin.from('payment_references').select('id', { count: 'exact', head: true }).eq('order_id', order.id);
  const charge = await paymentProvider.charge({
    amountMinor: Number(order.total_minor),
    currency: order.currency,
    reference: order.id,
    idempotencyKey: `${order.id}_${(count ?? 0) + 1}`,
    scenario: payment.scenario,
  });

  const recorded = await ctx.admin.rpc('checkout_record_payment', {
    p_order_id: order.id,
    p_provider: charge.provider,
    p_external_ref: charge.externalRef,
    p_status: charge.status,
    p_amount_minor: charge.amountMinor,
    p_currency: charge.currency,
    ...(charge.failureCode ? { p_failure_code: charge.failureCode } : {}),
    p_raw: charge.raw as never,
  });
  if (recorded.error) {
    // Paiement accepté mais commande non payable (délai expiré entre-temps) : remboursement immédiat.
    if (charge.status === 'succeeded') await refundCharge(ctx, order.id, charge.externalRef, Number(order.total_minor), 'order_not_payable', user.id);
    throw toAppError(recorded.error);
  }
  if (charge.status !== 'succeeded') throw new AppError('payment_declined');

  let providerOrderRef: string;
  let tickets: { provider_ticket_ref: string; delivery_mode?: string; offline_allowed?: boolean }[];
  try {
    const providerOrder = await requireMethod(connector, 'confirmOrder')({
      holdRef: reservation.provider_hold_ref,
      holderRef: holderRefFor(ctx.env.TAMURT_SERVER_SECRET, user.id),
    });
    providerOrderRef = providerOrder.orderRef;
    const delivery = connector.capabilities['delivery.retrieve']
      ? await requireMethod(connector, 'getDelivery')(providerOrder.orderRef)
      : null;
    tickets = providerOrder.tickets.map((ticket) => {
      const delivered = delivery?.tickets.find((d) => d.ticketRef === ticket.ticketRef);
      return {
        provider_ticket_ref: ticket.ticketRef,
        ...(delivery ? { delivery_mode: delivery.mode } : {}),
        offline_allowed: delivered?.offlineAllowed ?? false,
      };
    });
  } catch (error) {
    const appError = toAppError(error);
    await refundCharge(ctx, order.id, charge.externalRef, Number(order.total_minor), `provider:${appError.code}`, user.id);
    await ctx.admin.rpc('checkout_fail_order', { p_order_id: order.id, p_status: 'cancelled', p_reason: `provider:${appError.code}` });
    throw appError;
  }

  const fulfilled = unwrap(
    await ctx.admin.rpc('checkout_fulfill_order', {
      p_order_id: order.id,
      p_provider_order_ref: providerOrderRef,
      p_tickets: tickets as never,
    }),
  );
  void updateAvailabilityEstimate(ctx, reservation.offer.id, order.provider_id, order.environment, reservation.offer.external_offer_id);
  const { data: ticketRows } = await ctx.admin.from('tickets').select('id').eq('order_id', order.id);
  return toOrderView(fulfilled, (ticketRows ?? []).map((t) => t.id));
}

async function refundCharge(ctx: ServerContext, orderId: string, externalRef: string, amountMinor: number, reason: string, requestedBy: string) {
  const { data: order } = await ctx.admin.from('orders').select('environment').eq('id', orderId).maybeSingle();
  const provider = ctx.payments.resolve(order?.environment ?? 'demo');
  const refund = await provider.refund(externalRef, amountMinor);
  await ctx.admin.rpc('checkout_record_refund', {
    p_order_id: orderId,
    p_amount_minor: amountMinor,
    p_reason: reason,
    p_status: refund.status,
    p_provider_refund_ref: refund.refundRef,
    p_requested_by: requestedBy,
  });
}

/**
 * Annulation + remboursement d'une commande de DÉMONSTRATION (le remboursement réel dépendra
 * de la politique de l'organisateur et des capacités du fournisseur).
 */
export async function refundDemoOrder(ctx: ServerContext, user: AuthUser, orderId: string): Promise<OrderView> {
  const order = unwrap(
    await ctx.admin.from('orders').select('*').eq('id', orderId).eq('user_id', user.id).maybeSingle(),
    'order_not_found',
  );
  if (order.environment !== 'demo') throw new AppError('forbidden', 'remboursement réel non disponible en libre-service');
  if (order.status === 'refunded') return toOrderView(order, []);
  if (order.status !== 'fulfilled' || !order.provider_order_ref) throw new AppError('order_not_paid');
  const { data: listed } = await ctx.admin
    .from('resale_listings')
    .select('id')
    .in('status', ['active', 'reserved'])
    .in('ticket_id', ((await ctx.admin.from('tickets').select('id').eq('order_id', order.id)).data ?? []).map((t) => t.id));
  if ((listed ?? []).length > 0) throw new AppError('ticket_already_listed');

  const connector = ctx.registry.get(order.provider_id, 'demo');
  await requireMethod(connector, 'refundOrder')(order.provider_order_ref);
  const payment = unwrap(
    await ctx.admin
      .from('payment_references')
      .select('external_ref')
      .eq('order_id', order.id)
      .eq('status', 'succeeded')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
  await refundCharge(ctx, order.id, payment.external_ref, Number(order.total_minor), 'customer_request_demo', user.id);
  const refreshed = unwrap(await ctx.admin.from('orders').select('*').eq('id', order.id).single());
  return toOrderView(refreshed, []);
}
