'use client';
import type { SellabilityReason } from '@tamurt/core';
import { generateIdempotencyKey } from '@tamurt/core';
import { Ticket } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { errorMessage, useApi } from '@/hooks/use-api';
import { Link, useRouter } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface OfferOption {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  faceValueMinor: number;
  providerFeeMinor: number;
  available: number | null;
  minPerOrder: number;
  maxPerOrder: number;
  reason: SellabilityReason;
  environment: 'demo' | 'live';
}

/**
 * Choix d'une catégorie de billets puis réservation temporaire (blocage des places chez le
 * fournisseur). En démonstration, le fournisseur est fictif et aucun paiement réel n'a lieu.
 */
export function OfferPicker({
  offers,
  country,
  signedIn,
  hasAccess,
  returnTo,
  maxPerOrder,
}: {
  offers: OfferOption[];
  country: string;
  signedIn: boolean;
  hasAccess: boolean;
  returnTo: string;
  maxPerOrder: number;
}) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const api = useApi();
  const router = useRouter();
  const firstSellable = offers.find((offer) => offer.reason === 'ok');
  const [offerId, setOfferId] = useState(firstSellable?.id ?? '');
  const [quantity, setQuantity] = useState(firstSellable?.minPerOrder ?? 1);
  const [promoCode, setPromoCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const idempotencyKey = useMemo(() => generateIdempotencyKey(), []);
  const selected = offers.find((offer) => offer.id === offerId);

  const quantities = useMemo(() => {
    if (!selected) return [];
    const max = Math.min(selected.maxPerOrder, maxPerOrder, selected.available ?? maxPerOrder);
    return Array.from({ length: Math.max(0, max - selected.minPerOrder + 1) }, (_, index) => selected.minPerOrder + index);
  }, [maxPerOrder, selected]);

  const reasonLabel = (reason: SellabilityReason, available: number | null) => {
    if (available === 0) return t('common.soldOut');
    if (reason === 'sales_not_started') return t('event.salesNotStarted');
    if (reason === 'sales_ended') return t('event.salesEnded');
    if (reason !== 'ok') return t('common.notAvailable');
    return null;
  };

  async function reserve() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const reservation = await api.checkout.reserve({ offerId: selected.id, quantity, ...(promoCode.trim() ? { promoCode: promoCode.trim() } : {}) }, `${idempotencyKey}-${selected.id}-${quantity}-${promoCode.trim().toUpperCase()}`);
      router.push(`/checkout/${reservation.id}`);
    } catch (caught) {
      setError(errorMessage(caught, t('common.unknownError')));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">{t('checkout.chooseOffer')}</legend>
        {offers.map((offer) => {
          const unavailable = reasonLabel(offer.reason, offer.available);
          const disabled = offer.reason !== 'ok' || offer.available === 0;
          return (
            <label key={offer.id} className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors', offer.id === offerId ? 'border-primary bg-primary-soft/60' : 'border-line hover:bg-sunken', disabled && 'cursor-not-allowed opacity-60')}>
              <input type="radio" name="offer" value={offer.id} checked={offer.id === offerId} disabled={disabled} onChange={() => { setOfferId(offer.id); setQuantity(offer.minPerOrder); }} className="mt-1 accent-[var(--tm-primary)]" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{offer.name}</span>
                  <span className="font-bold">{money(offer.faceValueMinor, offer.currency, locale, country)}</span>
                </span>
                {offer.description ? <span className="mt-0.5 block text-sm text-muted">{offer.description}</span> : null}
                <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-subtle">
                  {offer.providerFeeMinor > 0 ? <span>+ {money(offer.providerFeeMinor, offer.currency, locale, country)} · {t('checkout.providerFees')}</span> : null}
                  {offer.available !== null && offer.available > 0 && offer.available <= 20 ? <Badge tone="warning">{t('checkout.available', { count: offer.available })}</Badge> : null}
                  {unavailable ? <Badge tone="neutral">{unavailable}</Badge> : null}
                  {offer.environment === 'demo' ? <Badge tone="demo">{t('checkout.demoMode')}</Badge> : null}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {!signedIn ? (
        <Link href={{ pathname: '/auth/login', query: { next: returnTo } }} className={buttonClasses({ size: 'lg', className: 'w-full' })}>
          <Ticket className="h-5 w-5" aria-hidden />
          {t('checkout.loginToBuy')}
        </Link>
      ) : !hasAccess ? (
        <Alert tone="info" title={t('checkout.betaToBuy')} action={<Link href="/beta" className={buttonClasses({ variant: 'outline', size: 'sm' })}>{t('nav.beta')}</Link>} />
      ) : selected && selected.reason === 'ok' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-[6rem_1fr] gap-3">
            <Field label={t('checkout.quantity')} htmlFor="ticket-quantity">
              <Select id="ticket-quantity" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}>
                {quantities.map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </Field>
            <Field label={t('checkout.promoCode')} htmlFor="promo-code" optionalLabel={t('common.optional')}>
              <Input id="promo-code" value={promoCode} maxLength={32} autoComplete="off" onChange={(e) => setPromoCode(e.target.value.replace(/[^A-Za-z0-9_-]/g, ''))} />
            </Field>
          </div>
          <p className="text-xs text-subtle">{t('checkout.limitPerOrder', { max: Math.min(selected.maxPerOrder, maxPerOrder) })}</p>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Button size="lg" className="w-full" loading={busy} onClick={reserve}>
            <Ticket className="h-5 w-5" aria-hidden />
            {busy ? t('checkout.reserving') : t('checkout.reserve')}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted">{t('event.ticketsUnavailable')}</p>
      )}
    </div>
  );
}
