import { bpsOf, multiplyMinor, sumMinor, type CurrencyCode, assertNonNegativeMinor } from './money';

/**
 * Moteur de tarification Tamurt.
 *
 * Il distingue ce que paie le client (prix facial, frais du fournisseur, frais de service Tamurt,
 * remise éventuelle, taxes) de ce que Tamurt perçoit (commission de distribution, part de frais,
 * marge sur remise catalogue, frais de service, coût des promotions).
 *
 * Règles non négociables :
 *  - tous les calculs sont en unités mineures entières ;
 *  - aucune remise n'est appliquée si l'accord commercial ne l'autorise pas explicitement ;
 *  - une remise ne peut jamais dépasser ce que Tamurt perçoit sur la commande ;
 *  - un accord en statut « simulation » est signalé (objectif de négociation, jamais un tarif acquis).
 */

export type AgreementModel = 'distribution_commission' | 'fee_share' | 'catalog_discount';
export type AgreementStatus = 'draft' | 'simulation' | 'active' | 'expired';

export interface CommercialTerms {
  id?: string;
  model: AgreementModel;
  status: AgreementStatus;
  /** Commission de distribution versée par le fournisseur (sur le prix facial). */
  commissionBps: number;
  /** Part des frais de location du fournisseur reversée à Tamurt. */
  feeShareBps: number;
  /** Remise d'achat sur catalogue autorisé (marge Tamurt). */
  catalogDiscountBps: number;
  /** Frais de service Tamurt facturés au client, en % du prix facial. */
  customerServiceFeeBps: number;
  /** Frais de service Tamurt fixes par billet. */
  customerServiceFeeFixedMinor: number;
  /** L'accord autorise-t-il Tamurt à financer des promotions sur sa rémunération ? */
  promoFundingAllowed: boolean;
  /** Remise maximale finançable, en % du prix facial. */
  promoMaxBps: number;
}

export interface PromotionInput {
  code: string;
  discountBps: number;
  maxDiscountMinor?: number | null;
}

export interface TaxRule {
  label: string;
  rateBps: number;
  appliesTo: 'service_fee' | 'all';
}

export type TaxDisplay = 'inclusive' | 'exclusive';

export interface PricingInput {
  currency: CurrencyCode;
  unitFaceValueMinor: number;
  unitProviderFeeMinor: number;
  quantity: number;
  terms: CommercialTerms | null;
  promotion?: PromotionInput | null;
  taxDisplay: TaxDisplay;
  taxRules?: readonly TaxRule[];
}

export type PricingWarning =
  | 'no_agreement'
  | 'simulated_agreement'
  | 'promotion_not_allowed'
  | 'promotion_exceeds_agreement'
  | 'promotion_capped_by_revenue'
  | 'promotion_capped_by_maximum';

export interface TaxLine {
  label: string;
  rateBps: number;
  amountMinor: number;
  included: boolean;
}

export interface PricingBreakdown {
  currency: CurrencyCode;
  quantity: number;
  unitFaceValueMinor: number;
  unitProviderFeeMinor: number;
  serviceFeePerTicketMinor: number;
  subtotalMinor: number;
  providerFeesMinor: number;
  serviceFeesMinor: number;
  discountMinor: number;
  taxAddedMinor: number;
  taxIncludedMinor: number;
  totalMinor: number;
  taxLines: TaxLine[];
  promotion: { code: string; discountBps: number; applied: boolean } | null;
  tamurtRevenue: {
    commissionMinor: number;
    feeShareMinor: number;
    catalogMarginMinor: number;
    serviceFeesMinor: number;
    promotionCostMinor: number;
    netMinor: number;
  };
  isSimulation: boolean;
  warnings: PricingWarning[];
}

export function computePricing(input: PricingInput): PricingBreakdown {
  const { currency, unitFaceValueMinor, unitProviderFeeMinor, quantity, terms } = input;
  assertNonNegativeMinor(unitFaceValueMinor, 'unitFaceValueMinor');
  assertNonNegativeMinor(unitProviderFeeMinor, 'unitProviderFeeMinor');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    throw new RangeError('quantity doit être un entier entre 1 et 20');
  }

  const warnings: PricingWarning[] = [];
  if (!terms) warnings.push('no_agreement');
  if (terms?.status === 'simulation') warnings.push('simulated_agreement');

  const subtotalMinor = multiplyMinor(unitFaceValueMinor, quantity);
  const providerFeesMinor = multiplyMinor(unitProviderFeeMinor, quantity);
  const serviceFeePerTicketMinor = terms
    ? bpsOf(unitFaceValueMinor, terms.customerServiceFeeBps) + terms.customerServiceFeeFixedMinor
    : 0;
  const serviceFeesMinor = multiplyMinor(serviceFeePerTicketMinor, quantity);

  const commissionMinor = terms ? bpsOf(subtotalMinor, terms.commissionBps) : 0;
  const feeShareMinor = terms ? bpsOf(providerFeesMinor, terms.feeShareBps) : 0;
  const catalogMarginMinor = terms ? bpsOf(subtotalMinor, terms.catalogDiscountBps) : 0;
  const grossRevenueMinor = sumMinor([commissionMinor, feeShareMinor, catalogMarginMinor, serviceFeesMinor]);

  let discountMinor = 0;
  let promotion: PricingBreakdown['promotion'] = null;
  if (input.promotion) {
    const promo = input.promotion;
    promotion = { code: promo.code, discountBps: promo.discountBps, applied: false };
    if (!terms || !terms.promoFundingAllowed) {
      warnings.push('promotion_not_allowed');
    } else if (promo.discountBps > terms.promoMaxBps) {
      warnings.push('promotion_exceeds_agreement');
    } else {
      let candidate = bpsOf(subtotalMinor, promo.discountBps);
      if (promo.maxDiscountMinor != null && candidate > promo.maxDiscountMinor) {
        candidate = promo.maxDiscountMinor;
        warnings.push('promotion_capped_by_maximum');
      }
      if (candidate > grossRevenueMinor) {
        candidate = grossRevenueMinor;
        warnings.push('promotion_capped_by_revenue');
      }
      discountMinor = candidate;
      promotion.applied = candidate > 0;
    }
  }

  const taxLines: TaxLine[] = [];
  let taxAddedMinor = 0;
  let taxIncludedMinor = 0;
  for (const rule of input.taxRules ?? []) {
    const base =
      rule.appliesTo === 'service_fee'
        ? Math.max(serviceFeesMinor - discountMinor, 0)
        : subtotalMinor + providerFeesMinor + serviceFeesMinor - discountMinor;
    if (input.taxDisplay === 'exclusive') {
      const amount = bpsOf(base, rule.rateBps);
      taxAddedMinor += amount;
      taxLines.push({ label: rule.label, rateBps: rule.rateBps, amountMinor: amount, included: false });
    } else {
      // Montant de taxe inclus dans un prix TTC : base - base / (1 + taux)
      const net = Number((BigInt(base) * 10000n + BigInt(10000 + rule.rateBps) / 2n) / BigInt(10000 + rule.rateBps));
      const amount = base - net;
      taxIncludedMinor += amount;
      taxLines.push({ label: rule.label, rateBps: rule.rateBps, amountMinor: amount, included: true });
    }
  }

  const totalMinor = subtotalMinor + providerFeesMinor + serviceFeesMinor - discountMinor + taxAddedMinor;

  return {
    currency,
    quantity,
    unitFaceValueMinor,
    unitProviderFeeMinor,
    serviceFeePerTicketMinor,
    subtotalMinor,
    providerFeesMinor,
    serviceFeesMinor,
    discountMinor,
    taxAddedMinor,
    taxIncludedMinor,
    totalMinor,
    taxLines,
    promotion,
    tamurtRevenue: {
      commissionMinor,
      feeShareMinor,
      catalogMarginMinor,
      serviceFeesMinor,
      promotionCostMinor: discountMinor,
      netMinor: grossRevenueMinor - discountMinor,
    },
    isSimulation: terms?.status === 'simulation',
    warnings,
  };
}

/** Instantané stocké en base (clés snake_case attendues par les fonctions SQL). */
export interface PricingSnapshot {
  currency: CurrencyCode;
  quantity: number;
  unit_face_value_minor: number;
  unit_provider_fee_minor: number;
  service_fee_per_ticket_minor: number;
  subtotal_minor: number;
  provider_fees_minor: number;
  service_fees_minor: number;
  discount_minor: number;
  tax_added_minor: number;
  tax_included_minor: number;
  total_minor: number;
  tax_lines: TaxLine[];
  promotion: PricingBreakdown['promotion'];
  tamurt_revenue: PricingBreakdown['tamurtRevenue'];
  is_simulation: boolean;
  warnings: PricingWarning[];
  agreement_id: string | null;
}

export function pricingToSnapshot(breakdown: PricingBreakdown, agreementId: string | null): PricingSnapshot {
  return {
    currency: breakdown.currency,
    quantity: breakdown.quantity,
    unit_face_value_minor: breakdown.unitFaceValueMinor,
    unit_provider_fee_minor: breakdown.unitProviderFeeMinor,
    service_fee_per_ticket_minor: breakdown.serviceFeePerTicketMinor,
    subtotal_minor: breakdown.subtotalMinor,
    provider_fees_minor: breakdown.providerFeesMinor,
    service_fees_minor: breakdown.serviceFeesMinor,
    discount_minor: breakdown.discountMinor,
    tax_added_minor: breakdown.taxAddedMinor,
    tax_included_minor: breakdown.taxIncludedMinor,
    total_minor: breakdown.totalMinor,
    tax_lines: breakdown.taxLines,
    promotion: breakdown.promotion,
    tamurt_revenue: breakdown.tamurtRevenue,
    is_simulation: breakdown.isSimulation,
    warnings: breakdown.warnings,
    agreement_id: agreementId,
  };
}

/** Lecture tolérante d'un instantané stocké (pour l'affichage d'une commande). */
export function snapshotTotals(snapshot: Partial<PricingSnapshot> | null | undefined): {
  subtotalMinor: number;
  providerFeesMinor: number;
  serviceFeesMinor: number;
  discountMinor: number;
  taxAddedMinor: number;
  taxIncludedMinor: number;
  totalMinor: number;
} {
  return {
    subtotalMinor: snapshot?.subtotal_minor ?? 0,
    providerFeesMinor: snapshot?.provider_fees_minor ?? 0,
    serviceFeesMinor: snapshot?.service_fees_minor ?? 0,
    discountMinor: snapshot?.discount_minor ?? 0,
    taxAddedMinor: snapshot?.tax_added_minor ?? 0,
    taxIncludedMinor: snapshot?.tax_included_minor ?? 0,
    totalMinor: snapshot?.total_minor ?? 0,
  };
}

/** Conversion d'une ligne SQL commercial_agreements en conditions de calcul. */
export function termsFromAgreementRow(row: {
  id?: string | null;
  model: AgreementModel;
  status: AgreementStatus;
  commission_bps: number;
  fee_share_bps: number;
  catalog_discount_bps: number;
  customer_service_fee_bps: number;
  customer_service_fee_fixed_minor: number;
  promo_funding_allowed: boolean;
  promo_max_bps: number;
}): CommercialTerms {
  return {
    ...(row.id ? { id: row.id } : {}),
    model: row.model,
    status: row.status,
    commissionBps: row.commission_bps,
    feeShareBps: row.fee_share_bps,
    catalogDiscountBps: row.catalog_discount_bps,
    customerServiceFeeBps: row.customer_service_fee_bps,
    customerServiceFeeFixedMinor: row.customer_service_fee_fixed_minor,
    promoFundingAllowed: row.promo_funding_allowed,
    promoMaxBps: row.promo_max_bps,
  };
}
