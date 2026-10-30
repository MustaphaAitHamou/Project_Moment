import { describe, expect, it } from 'vitest';
import { computePricing, pricingToSnapshot, type CommercialTerms } from '../src/pricing';

const simulation: CommercialTerms = {
  model: 'distribution_commission',
  status: 'simulation',
  commissionBps: 1000,
  feeShareBps: 0,
  catalogDiscountBps: 0,
  customerServiceFeeBps: 200,
  customerServiceFeeFixedMinor: 0,
  promoFundingAllowed: true,
  promoMaxBps: 500,
};

describe('moteur de tarification', () => {
  it('décompose prix facial, frais fournisseur, frais de service et total', () => {
    const p = computePricing({
      currency: 'EUR',
      unitFaceValueMinor: 3500,
      unitProviderFeeMinor: 150,
      quantity: 2,
      terms: simulation,
      taxDisplay: 'inclusive',
    });
    expect(p.subtotalMinor).toBe(7000);
    expect(p.providerFeesMinor).toBe(300);
    expect(p.serviceFeePerTicketMinor).toBe(70); // 2 % de 35,00
    expect(p.serviceFeesMinor).toBe(140);
    expect(p.discountMinor).toBe(0);
    expect(p.totalMinor).toBe(7440);
    expect(p.tamurtRevenue.commissionMinor).toBe(700); // objectif 10 % (simulation)
    expect(p.isSimulation).toBe(true);
    expect(p.warnings).toContain('simulated_agreement');
  });

  it('applique une promotion seulement si l’accord l’autorise', () => {
    const withPromo = computePricing({
      currency: 'EUR',
      unitFaceValueMinor: 3000,
      unitProviderFeeMinor: 0,
      quantity: 1,
      terms: simulation,
      promotion: { code: 'DEMO5', discountBps: 500 },
      taxDisplay: 'inclusive',
    });
    expect(withPromo.discountMinor).toBe(150);
    expect(withPromo.promotion?.applied).toBe(true);
    expect(withPromo.totalMinor).toBe(3000 + 60 - 150);
    expect(withPromo.tamurtRevenue.netMinor).toBe(300 + 60 - 150);

    const forbidden = computePricing({
      currency: 'EUR',
      unitFaceValueMinor: 3000,
      unitProviderFeeMinor: 0,
      quantity: 1,
      terms: { ...simulation, promoFundingAllowed: false, promoMaxBps: 0 },
      promotion: { code: 'DEMO5', discountBps: 500 },
      taxDisplay: 'inclusive',
    });
    expect(forbidden.discountMinor).toBe(0);
    expect(forbidden.promotion?.applied).toBe(false);
    expect(forbidden.warnings).toContain('promotion_not_allowed');
  });

  it('refuse une remise supérieure au maximum de l’accord', () => {
    const p = computePricing({
      currency: 'USD',
      unitFaceValueMinor: 5000,
      unitProviderFeeMinor: 0,
      quantity: 1,
      terms: simulation,
      promotion: { code: 'BIG', discountBps: 2000 },
      taxDisplay: 'exclusive',
    });
    expect(p.discountMinor).toBe(0);
    expect(p.warnings).toContain('promotion_exceeds_agreement');
  });

  it('plafonne une remise au revenu de Tamurt (jamais de vente à perte)', () => {
    const p = computePricing({
      currency: 'EUR',
      unitFaceValueMinor: 1000,
      unitProviderFeeMinor: 0,
      quantity: 1,
      terms: { ...simulation, commissionBps: 100, customerServiceFeeBps: 0, promoMaxBps: 5000 },
      promotion: { code: 'X', discountBps: 5000 },
      taxDisplay: 'inclusive',
    });
    expect(p.tamurtRevenue.commissionMinor).toBe(10);
    expect(p.discountMinor).toBe(10);
    expect(p.tamurtRevenue.netMinor).toBe(0);
    expect(p.warnings).toContain('promotion_capped_by_revenue');
  });

  it('sans accord : aucun frais Tamurt, aucune remise', () => {
    const p = computePricing({
      currency: 'CAD',
      unitFaceValueMinor: 4000,
      unitProviderFeeMinor: 250,
      quantity: 3,
      terms: null,
      promotion: { code: 'DEMO5', discountBps: 500 },
      taxDisplay: 'exclusive',
    });
    expect(p.serviceFeesMinor).toBe(0);
    expect(p.discountMinor).toBe(0);
    expect(p.totalMinor).toBe(12750);
    expect(p.warnings).toEqual(expect.arrayContaining(['no_agreement', 'promotion_not_allowed']));
  });

  it('ajoute les taxes en mode hors taxes (US/CA) et les indique en mode TTC', () => {
    const exclusive = computePricing({
      currency: 'USD',
      unitFaceValueMinor: 10000,
      unitProviderFeeMinor: 0,
      quantity: 1,
      terms: simulation,
      taxDisplay: 'exclusive',
      taxRules: [{ label: 'Taxe de démonstration', rateBps: 800, appliesTo: 'service_fee' }],
    });
    expect(exclusive.serviceFeesMinor).toBe(200);
    expect(exclusive.taxAddedMinor).toBe(16);
    expect(exclusive.totalMinor).toBe(10216);

    const inclusive = computePricing({
      currency: 'EUR',
      unitFaceValueMinor: 10000,
      unitProviderFeeMinor: 0,
      quantity: 1,
      terms: null,
      taxDisplay: 'inclusive',
      taxRules: [{ label: 'TVA (exemple)', rateBps: 2000, appliesTo: 'all' }],
    });
    expect(inclusive.taxAddedMinor).toBe(0);
    expect(inclusive.taxIncludedMinor).toBe(1667); // 100 - 100/1,2
    expect(inclusive.totalMinor).toBe(10000);
  });

  it('produit un instantané cohérent avec la contrainte SQL', () => {
    const p = computePricing({
      currency: 'DZD',
      unitFaceValueMinor: 250000,
      unitProviderFeeMinor: 10000,
      quantity: 4,
      terms: simulation,
      promotion: { code: 'DEMO5', discountBps: 500 },
      taxDisplay: 'inclusive',
    });
    const s = pricingToSnapshot(p, 'agreement-id');
    expect(s.total_minor).toBe(
      s.subtotal_minor + s.provider_fees_minor + s.service_fees_minor - s.discount_minor + s.tax_added_minor,
    );
    expect(Number.isInteger(s.total_minor)).toBe(true);
  });

  it('rejette des quantités invalides', () => {
    expect(() =>
      computePricing({ currency: 'EUR', unitFaceValueMinor: 100, unitProviderFeeMinor: 0, quantity: 0, terms: null, taxDisplay: 'inclusive' }),
    ).toThrow(RangeError);
  });
});
