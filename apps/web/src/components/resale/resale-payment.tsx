'use client';
import { formatCountdown, secondsRemaining } from '@tamurt/core';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button, buttonClasses } from '@/components/ui/button';
import { errorMessage, useApi } from '@/hooks/use-api';
import { Link, useRouter } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Paiement SIMULÉ d'un achat en revente : aucune donnée bancaire, aucun encaissement réel. */
export function ResalePayment({ transactionId, expiresAt, totalMinor, currency }: { transactionId: string; expiresAt: string; totalMinor: number; currency: string }) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const api = useApi();
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [scenario, setScenario] = useState<'success' | 'declined' | 'error'>('success');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = secondsRemaining(expiresAt, new Date(now));
  if (remaining <= 0) {
    return <Alert tone="warning" title={t('checkout.holdExpired')} action={<Link href="/resale" className={buttonClasses({ size: 'sm' })}>{t('resale.title')}</Link>} />;
  }
  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-sunken px-4 py-3 text-sm font-semibold">{t('resale.reservedFor', { time: formatCountdown(remaining) })}</p>
      <Alert tone="demo">{t('checkout.paymentDisclaimer')}</Alert>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm text-muted">{t('checkout.scenarioIntro')}</legend>
        {(['success', 'declined', 'error'] as const).map((value) => (
          <label key={value} className={cn('flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm', scenario === value ? 'border-primary bg-primary-soft/60' : 'border-line')}>
            <input type="radio" name="scenario" checked={scenario === value} onChange={() => setScenario(value)} className="accent-[var(--tm-primary)]" />
            {value === 'success' ? t('checkout.scenarioSuccess') : value === 'declined' ? t('checkout.scenarioDeclined') : t('checkout.scenarioError')}
          </label>
        ))}
      </fieldset>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button
        size="lg"
        className="w-full"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await api.resale.pay(transactionId, { scenario });
            router.refresh();
          } catch (caught) {
            const code = (caught as { code?: string }).code;
            setError(code === 'payment_declined' ? t('checkout.paymentDeclined') : code === 'payment_failed' ? t('checkout.paymentError') : errorMessage(caught, t('common.unknownError')));
          }
          setBusy(false);
        }}
      >
        {busy ? t('checkout.processing') : t('checkout.payNow', { amount: money(totalMinor, currency, locale) })}
      </Button>
    </div>
  );
}
