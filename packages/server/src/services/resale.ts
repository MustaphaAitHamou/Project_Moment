import { AppError, toAppError } from '@tamurt/core';
import { requireMethod } from '@tamurt/ticketing';
import type { CreateListingInput, DemoPaymentInput, DisputeInput } from '@tamurt/validation';
import { requireAppAccess, type AuthUser, type ServerContext } from '../context';
import { holderRefFor } from '../crypto';
import { unwrap } from '../db';
import { enforceRateLimit, withIdempotency } from '../reliability';

/**
 * Revente entre particuliers. Sécurité :
 *  - seul un billet émis via Tamurt, détenu par le vendeur, est revendable ;
 *  - la propriété est revérifiée auprès du fournisseur (capacité ticket.ownership_verification) ;
 *  - le transfert passe par une RÉÉMISSION chez le fournisseur (ancien billet invalidé) ;
 *  - en démonstration, aucun paiement réel ; le mode réel est verrouillé en base.
 */

export interface ListingView {
  id: string;
  status: string;
  askingPriceMinor: number;
  maxAllowedPriceMinor: number;
  buyerFeeMinor: number;
  sellerFeeMinor: number;
  currency: string;
  environment: 'demo' | 'live';
}

export interface ResaleTransactionView {
  id: string;
  status: string;
  totalMinor: number;
  currency: string;
  expiresAt: string;
  environment: 'demo' | 'live';
  newTicketId: string | null;
}

function toListingView(row: {
  id: string;
  status: string;
  asking_price_minor: number;
  max_allowed_price_minor: number;
  buyer_fee_minor: number;
  seller_fee_minor: number;
  currency: string;
  environment: 'demo' | 'live';
}): ListingView {
  return {
    id: row.id,
    status: row.status,
    askingPriceMinor: Number(row.asking_price_minor),
    maxAllowedPriceMinor: Number(row.max_allowed_price_minor),
    buyerFeeMinor: Number(row.buyer_fee_minor),
    sellerFeeMinor: Number(row.seller_fee_minor),
    currency: row.currency,
    environment: row.environment,
  };
}

function toTxView(row: {
  id: string;
  status: string;
  total_minor: number;
  currency: string;
  expires_at: string;
  environment: 'demo' | 'live';
  new_ticket_id: string | null;
}): ResaleTransactionView {
  return {
    id: row.id,
    status: row.status,
    totalMinor: Number(row.total_minor),
    currency: row.currency,
    expiresAt: row.expires_at,
    environment: row.environment,
    newTicketId: row.new_ticket_id,
  };
}

export async function quoteResale(ctx: ServerContext, user: AuthUser, ticketId: string, askingPriceMinor: number | null) {
  unwrap(await ctx.admin.from('tickets').select('id').eq('id', ticketId).eq('owner_id', user.id).maybeSingle(), 'ticket_not_found');
  return unwrap(
    await ctx.admin.rpc('resale_quote', { p_ticket_id: ticketId, ...(askingPriceMinor !== null ? { p_asking_price_minor: askingPriceMinor } : {}) }),
  ) as Record<string, unknown>;
}

export async function createListing(ctx: ServerContext, user: AuthUser, input: CreateListingInput): Promise<ListingView> {
  await requireAppAccess(ctx, user);
  await enforceRateLimit(ctx, `resale-list:${user.id}`, 10, 3600);
  const ticket = unwrap(
    await ctx.admin.from('tickets').select('*').eq('id', input.ticketId).eq('owner_id', user.id).maybeSingle(),
    'ticket_not_found',
  );
  const connector = ctx.registry.get(ticket.provider_id, ticket.environment);
  if (!connector.capabilities['ticket.transfer'] || !connector.capabilities['ticket.ownership_verification']) {
    throw new AppError('resale_not_allowed', 'le fournisseur ne permet pas de transfert sécurisé');
  }
  const owns = await requireMethod(connector, 'verifyOwnership')(ticket.provider_ticket_ref, holderRefFor(ctx.env.TAMURT_SERVER_SECRET, user.id));
  if (!owns) throw new AppError('ticket_not_resellable', 'propriété non confirmée par le fournisseur');

  const listing = unwrap(
    await ctx.admin.rpc('resale_create_listing', {
      p_seller_id: user.id,
      p_ticket_id: ticket.id,
      p_asking_price_minor: input.askingPriceMinor,
      p_note: input.note ?? '',
    }),
  );
  return toListingView(listing);
}

export async function cancelListing(ctx: ServerContext, user: AuthUser, listingId: string): Promise<ListingView> {
  return toListingView(unwrap(await ctx.admin.rpc('resale_cancel_listing', { p_seller_id: user.id, p_listing_id: listingId })));
}

export async function startPurchase(ctx: ServerContext, user: AuthUser, listingId: string, idempotencyKey: string): Promise<ResaleTransactionView> {
  await requireAppAccess(ctx, user);
  await enforceRateLimit(ctx, `resale-buy:${user.id}`, 10, 300);
  const { data } = await ctx.admin.from('app_settings').select('value').eq('key', 'resale').maybeSingle();
  const ttl = Number((data?.value as { listing_reservation_ttl_seconds?: number } | null)?.listing_reservation_ttl_seconds ?? 600);
  const tx = unwrap(
    await ctx.admin.rpc('resale_start_purchase', {
      p_buyer_id: user.id,
      p_listing_id: listingId,
      p_idempotency_key: idempotencyKey,
      p_ttl_seconds: ttl,
    }),
  );
  return toTxView(tx);
}

export async function payPurchase(ctx: ServerContext, user: AuthUser, transactionId: string, payment: DemoPaymentInput): Promise<ResaleTransactionView> {
  await requireAppAccess(ctx, user);
  const result = await withIdempotency(
    ctx,
    { userId: user.id, scope: 'resale.pay', key: `tx-${transactionId}`, request: { transactionId } },
    async () => ({ status: 200, body: await payResale(ctx, user, transactionId, payment) }),
  );
  return result.body;
}

async function payResale(ctx: ServerContext, user: AuthUser, transactionId: string, payment: DemoPaymentInput): Promise<ResaleTransactionView> {
  const tx = unwrap(
    await ctx.admin.from('resale_transactions').select('*').eq('id', transactionId).eq('buyer_id', user.id).maybeSingle(),
    'transaction_not_found',
  );
  if (tx.status === 'completed') return toTxView(tx);
  if (tx.status !== 'payment_pending') throw new AppError('transaction_not_payable');
  if (new Date(tx.expires_at) <= ctx.now()) throw new AppError('transaction_expired');

  const original = unwrap(await ctx.admin.from('tickets').select('*').eq('id', tx.original_ticket_id).maybeSingle(), 'ticket_not_found');
  const connector = ctx.registry.get(original.provider_id, tx.environment);
  const provider = ctx.payments.resolve(tx.environment);
  const { count } = await ctx.admin.from('payment_references').select('id', { count: 'exact', head: true }).eq('resale_transaction_id', tx.id);
  const charge = await provider.charge({
    amountMinor: Number(tx.total_minor),
    currency: tx.currency,
    reference: tx.id,
    idempotencyKey: `${tx.id}_${(count ?? 0) + 1}`,
    scenario: payment.scenario,
  });
  const recorded = await ctx.admin.rpc('resale_record_payment', {
    p_tx_id: tx.id,
    p_provider: charge.provider,
    p_external_ref: charge.externalRef,
    p_status: charge.status,
    p_amount_minor: charge.amountMinor,
    p_currency: charge.currency,
    ...(charge.failureCode ? { p_failure_code: charge.failureCode } : {}),
    p_raw: charge.raw as never,
  });
  if (recorded.error) {
    if (charge.status === 'succeeded') await provider.refund(charge.externalRef, charge.amountMinor);
    throw toAppError(recorded.error);
  }
  if (charge.status !== 'succeeded') throw new AppError('payment_declined');

  try {
    const transfer = await requireMethod(connector, 'transferTicket')(
      original.provider_ticket_ref,
      holderRefFor(ctx.env.TAMURT_SERVER_SECRET, user.id),
    );
    const completed = unwrap(
      await ctx.admin.rpc('resale_complete_transfer', { p_tx_id: tx.id, p_new_provider_ticket_ref: transfer.ticketRef }),
    );
    return toTxView(completed);
  } catch (error) {
    const appError = toAppError(error);
    const refund = await provider.refund(charge.externalRef, charge.amountMinor);
    ctx.logger.warn('resale_transfer_failed', { transactionId: tx.id, code: appError.code, refund: refund.status });
    await ctx.admin.rpc('resale_fail_transaction', { p_tx_id: tx.id, p_status: 'refunded', p_reason: `transfer:${appError.code}` });
    throw appError;
  }
}

export async function openDispute(ctx: ServerContext, user: AuthUser, input: DisputeInput) {
  await enforceRateLimit(ctx, `resale-dispute:${user.id}`, 5, 3600);
  return unwrap(
    await ctx.admin.rpc('resale_open_dispute', {
      p_user_id: user.id,
      p_tx_id: input.transactionId,
      p_reason: input.reason,
      p_details: input.details ?? '',
    }),
  );
}
