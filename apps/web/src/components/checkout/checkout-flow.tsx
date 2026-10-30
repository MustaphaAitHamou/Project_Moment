'use client';
import { formatCountdown, generateIdempotencyKey, secondsRemaining } from '@tamurt/core';
import { CreditCard, Timer } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { errorMessage, useApi } from '@/hooks/use-api';
import { Link, useRouter } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PricingSummary, type BuyerPricing } from './pricing-summary';

interface Props {
  reservation: {
    id: string;
    status: string;
    expiresAt: string;
    quantity: number;
    environment: 'demo' | 'live';
    offerName: string;
    event: { slug: string; title: string; dateLabel: string };
    pricing: BuyerPricing;
  };
  existingOrder: { id: string; status: string } | null;
  country: string | null;
}

type Scenario = 'success' | 'declined' | 'error';

/**
 * Tunnel d'achat : minuteur de réservation, création de la commande puis paiement SIMULÉ.
 * Aucun numéro de carte n'est demandé ; le résultat du paiement est choisi pour la démonstration.
 */
export function CheckoutFlow({ reservation, existingOrder, country }: Props) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const api = useApi();
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [order, setOrder] = useState(existingOrder);
  const [scenario, setScenario] = useState<Scenario>('success');
  const [busy, setBusy] = useState<null | 'order' | 'pay' | 'release'>(null);
  const [error, setError] = useState<string | null>(null);
  const orderKey = useMemo(() => generateIdempotencyKey(), []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = secondsRemaining(reservation.expiresAt, new Date(now));
  const expired = remaining <= 0 || ['expired', 'released', 'failed'].includes(reservation.status);

  async function continueToPayment() {
    setBusy('order');
    setError(null);
    try {
      const created = await api.checkout.createOrder(reservation.id, orderKey);
      setOrder({ id: created.id, status: created.status });
    } catch (caught) {
      setError(errorMessage(caught, t('common.unknownError')));
    } finally {
      setBusy(null);
    }
  }

  async function pay() {
    if (!order) return;
    setBusy('pay');
    setError(null);
    try {
      const result = await api.checkout.pay(order.id, { scenario });
      if (result.status === 'fulfilled' || result.status === 'paid') {
        router.replace(`/checkout/confirmation/${order.id}`);
        return;
      }
      setError(t('checkout.paymentError'));
    } catch (caught) {
      const code = (caught as { code?: string }).code;
      setError(code === 'payment_declined' ? t('checkout.paymentDeclined') : code === 'payment_failed' ? t('checkout.paymentError') : errorMessage(caught, t('common.unknownError')));
    }
    setBusy(null);
  }

  async function release() {
    setBusy('release');
    try {
      await api.checkout.releaseReservation(reservation.id);
    } catch {
      // déjà libérée ou expirée : on revient simplement à l'événement
    }
    router.replace(`/events/${reservation.event.slug}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-5">
        {expired ? (
          <Alert tone="warning" title={t('checkout.holdExpired')} action={<Link href={`/events/${reservation.event.slug}`} className={buttonClasses({ size: 'sm' })}>{t('checkout.backToEvent')}</Link>} />
        ) : (
          <div className={cn('flex items-center gap-3 rounded-xl border p-4', remaining < 120 ? 'border-warning/40 bg-warning-soft' : 'border-line bg-surface')} role="timer" aria-live="off">
            <Timer className="h-6 w-6 text-primary" aria-hidden />
            <div>
              <p className="font-semibold">{t('checkout.holdTitle')}</p>
              <p className="text-sm text-muted">{t('checkout.holdTimer', { time: formatCountdown(remaining) })}</p>
            </div>
          </div>
        )}

        {reservation.environment === 'demo' ? <Alert tone="demo" title={t('checkout.paymentTitle')}>{t('checkout.paymentDisclaimer')}</Alert> : null}

        {!expired && order ? (
          <Card className="space-y-4">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold"><CreditCard className="h-5 w-5" aria-hidden />{t('checkout.paymentTitle')}</h2>
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm text-muted">{t('checkout.scenarioIntro')}</legend>
              {(['success', 'declined', 'error'] as const).map((value) => (
                <label key={value} className={cn('flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm', scenario === value ? 'border-primary bg-primary-soft/60' : 'border-line')}>
                  <input type="radio" name="scenario" value={value} checked={scenario === value} onChange={() => setScenario(value)} className="accent-[var(--tm-primary)]" />
                  {value === 'success' ? t('checkout.scenarioSuccess') : value === 'declined' ? t('checkout.scenarioDeclined') : t('checkout.scenarioError')}
                </label>
              ))}
            </fieldset>
            {error ? <Alert tone="danger">{error}</Alert> : null}
            <Button size="lg" className="w-full" loading={busy === 'pay'} onClick={pay}>
              {busy === 'pay' ? t('checkout.processing') : t('checkout.payNow', { amount: money(reservation.pricing.totalMinor, reservation.pricing.currency, locale, country) })}
            </Button>
          </Card>
        ) : null}

        {!expired && !order ? (
          <div className="space-y-3">
            {error ? <Alert tone="danger">{error}</Alert> : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button size="lg" className="flex-1" loading={busy === 'order'} onClick={continueToPayment}>{t('checkout.proceedToPayment')}</Button>
              <Button size="lg" variant="ghost" loading={busy === 'release'} onClick={release}>{t('checkout.releaseHold')}</Button>
            </div>
          </div>
        ) : null}
        {!expired && order ? (
          <Button variant="ghost" loading={busy === 'release'} onClick={release}>{t('checkout.releaseHold')}</Button>
        ) : null}
      </div>

      <Card className="h-fit space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-display text-lg font-bold">{t('checkout.summary')}</h2>
          {reservation.environment === 'demo' ? <Badge tone="demo">{t('checkout.demoMode')}</Badge> : null}
        </div>
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{reservation.event.title}</p>
          <p className="text-muted">{reservation.event.dateLabel}</p>
          <p className="text-muted">{reservation.offerName} × {reservation.quantity}</p>
        </div>
        <PricingSummary pricing={reservation.pricing} country={country} />
      </Card>
    </div>
  );
}
