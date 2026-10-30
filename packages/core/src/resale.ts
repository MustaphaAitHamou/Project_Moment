import { bpsOf, bpsOfCeil, bpsOfFloor, assertNonNegativeMinor } from './money';

/**
 * Revente entre particuliers. Miroir de public.resale_quote(), public.resale_tx_transition_allowed()
 * et public.resale_live_allowed().
 */

export const RESALE_TX_STATUSES = [
  'initiated',
  'payment_pending',
  'paid',
  'transfer_pending',
  'completed',
  'failed',
  'cancelled',
  'refunded',
  'disputed',
] as const;
export type ResaleTxStatus = (typeof RESALE_TX_STATUSES)[number];

export const RESALE_TX_TRANSITIONS: Record<ResaleTxStatus, readonly ResaleTxStatus[]> = {
  initiated: ['payment_pending', 'cancelled', 'failed'],
  payment_pending: ['paid', 'failed', 'cancelled'],
  paid: ['transfer_pending', 'refunded', 'failed', 'disputed'],
  transfer_pending: ['completed', 'failed', 'refunded', 'disputed'],
  completed: ['disputed', 'refunded'],
  failed: ['refunded', 'disputed'],
  disputed: ['completed', 'refunded', 'failed'],
  cancelled: [],
  refunded: [],
};

export function canTransitionResaleTx(from: ResaleTxStatus, to: ResaleTxStatus): boolean {
  return RESALE_TX_TRANSITIONS[from].includes(to);
}

export function isResaleTxActive(status: ResaleTxStatus): boolean {
  return status === 'initiated' || status === 'payment_pending' || status === 'paid' || status === 'transfer_pending';
}

export interface ResaleRule {
  enabled: boolean;
  maxPriceBps: number;
  minPriceBps: number;
  sellerFeeBps: number;
  buyerFeeBps: number;
  buyerFeeFixedMinor: number;
  listingCutoffHours: number;
  legalStatus: 'not_reviewed' | 'allowed_with_conditions' | 'prohibited';
}

export interface ResaleQuote {
  allowed: boolean;
  reason: 'ok' | 'resale_not_allowed' | 'resale_price_above_cap' | 'resale_price_below_minimum';
  originalPriceMinor: number;
  askingPriceMinor: number;
  minAllowedPriceMinor: number;
  maxAllowedPriceMinor: number;
  buyerFeeMinor: number;
  sellerFeeMinor: number;
  buyerTotalMinor: number;
  sellerPayoutMinor: number;
}

export function computeResaleQuote(originalPriceMinor: number, askingPriceMinor: number, rule: ResaleRule): ResaleQuote {
  assertNonNegativeMinor(originalPriceMinor, 'originalPriceMinor');
  assertNonNegativeMinor(askingPriceMinor, 'askingPriceMinor');
  const maxAllowedPriceMinor = bpsOfFloor(originalPriceMinor, rule.maxPriceBps);
  const minAllowedPriceMinor = bpsOfCeil(originalPriceMinor, rule.minPriceBps);
  const buyerFeeMinor = bpsOf(askingPriceMinor, rule.buyerFeeBps) + rule.buyerFeeFixedMinor;
  const sellerFeeMinor = bpsOf(askingPriceMinor, rule.sellerFeeBps);
  let reason: ResaleQuote['reason'] = 'ok';
  if (!rule.enabled || rule.legalStatus === 'prohibited') reason = 'resale_not_allowed';
  else if (askingPriceMinor > maxAllowedPriceMinor) reason = 'resale_price_above_cap';
  else if (askingPriceMinor < minAllowedPriceMinor || askingPriceMinor <= 0) reason = 'resale_price_below_minimum';
  return {
    allowed: reason === 'ok',
    reason,
    originalPriceMinor,
    askingPriceMinor,
    minAllowedPriceMinor,
    maxAllowedPriceMinor,
    buyerFeeMinor,
    sellerFeeMinor,
    buyerTotalMinor: askingPriceMinor + buyerFeeMinor,
    sellerPayoutMinor: askingPriceMinor - sellerFeeMinor,
  };
}

export interface ResaleLiveConditions {
  platformLiveEnabled: boolean;
  countryResaleLiveEnabled: boolean;
  countryLegalStatus: 'not_reviewed' | 'allowed_with_conditions' | 'prohibited';
  providerLiveEnabled: boolean;
  providerContractSigned: boolean;
  providerSupportsTransfer: boolean;
  providerSupportsOwnershipVerification: boolean;
}

/**
 * La revente RÉELLE n'est possible que si TOUTES les conditions sont réunies.
 * Renvoie la liste des conditions manquantes (vide = autorisé).
 */
export function missingResaleLiveConditions(c: ResaleLiveConditions): string[] {
  const missing: string[] = [];
  if (!c.platformLiveEnabled) missing.push('platform_live_disabled');
  if (!c.countryResaleLiveEnabled) missing.push('country_live_disabled');
  if (c.countryLegalStatus !== 'allowed_with_conditions') missing.push('legal_review_missing');
  if (!c.providerLiveEnabled) missing.push('provider_live_disabled');
  if (!c.providerContractSigned) missing.push('provider_contract_missing');
  if (!c.providerSupportsTransfer) missing.push('provider_transfer_unsupported');
  if (!c.providerSupportsOwnershipVerification) missing.push('provider_ownership_verification_unsupported');
  return missing;
}

export function ruleFromRow(row: {
  enabled: boolean;
  max_price_bps: number;
  min_price_bps: number;
  seller_fee_bps: number;
  buyer_fee_bps: number;
  buyer_fee_fixed_minor: number;
  listing_cutoff_hours: number;
  legal_status: string;
}): ResaleRule {
  const legal = row.legal_status === 'allowed_with_conditions' || row.legal_status === 'prohibited'
    ? row.legal_status
    : 'not_reviewed';
  return {
    enabled: row.enabled,
    maxPriceBps: row.max_price_bps,
    minPriceBps: row.min_price_bps,
    sellerFeeBps: row.seller_fee_bps,
    buyerFeeBps: row.buyer_fee_bps,
    buyerFeeFixedMinor: row.buyer_fee_fixed_minor,
    listingCutoffHours: row.listing_cutoff_hours,
    legalStatus: legal,
  };
}
