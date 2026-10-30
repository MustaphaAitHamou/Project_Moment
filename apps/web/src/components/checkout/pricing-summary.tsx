import type { PricingBreakdown } from '@tamurt/core';
import { useLocale, useTranslations } from 'next-intl';
import type { AppLocale } from '@/i18n/routing';
import { money } from '@/lib/format';

export type BuyerPricing = Omit<PricingBreakdown, 'tamurtRevenue' | 'warnings'>;

/** Récapitulatif transparent : valeur faciale, frais du fournisseur, frais de service, remise, taxes. */
export function PricingSummary({ pricing, country }: { pricing: BuyerPricing; country?: string | null }) {
  const t = useTranslations('checkout');
  const locale = useLocale() as AppLocale;
  const format = (amount: number) => money(amount, pricing.currency, locale, country);
  const row = 'flex items-baseline justify-between gap-4 py-1.5 text-sm';
  return (
    <div className="space-y-1">
      <div className={row}>
        <span className="text-muted">{t('faceValue', { count: pricing.quantity, price: format(pricing.unitFaceValueMinor) })}</span>
        <span className="tabular-nums">{format(pricing.subtotalMinor)}</span>
      </div>
      {pricing.providerFeesMinor > 0 ? (
        <div className={row}><span className="text-muted">{t('providerFees')}</span><span className="tabular-nums">{format(pricing.providerFeesMinor)}</span></div>
      ) : null}
      {pricing.serviceFeesMinor > 0 ? (
        <div className={row}><span className="text-muted">{t('serviceFees')}</span><span className="tabular-nums">{format(pricing.serviceFeesMinor)}</span></div>
      ) : null}
      {pricing.discountMinor > 0 && pricing.promotion ? (
        <div className={`${row} text-success`}><span>{t('discount', { code: pricing.promotion.code })}</span><span className="tabular-nums">−{format(pricing.discountMinor)}</span></div>
      ) : null}
      {pricing.taxLines.map((line) =>
        line.included ? null : (
          <div key={line.label} className={row}><span className="text-muted">{t('taxesAdded', { label: line.label })}</span><span className="tabular-nums">{format(line.amountMinor)}</span></div>
        ),
      )}
      <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3 font-display text-lg font-bold">
        <span>{t('total')}</span>
        <span className="tabular-nums">{format(pricing.totalMinor)}</span>
      </div>
      {pricing.taxLines.filter((line) => line.included).map((line) => (
        <p key={line.label} className="text-end text-xs text-subtle">{t('taxesIncluded', { label: line.label, amount: format(line.amountMinor) })}</p>
      ))}
      {pricing.isSimulation ? <p className="pt-2 text-xs text-subtle">{t('simulationNotice')}</p> : null}
    </div>
  );
}
