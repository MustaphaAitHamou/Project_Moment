'use client';
import { generateIdempotencyKey } from '@tamurt/core';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Button, buttonClasses } from '@/components/ui/button';
import { errorMessage, useApi } from '@/hooks/use-api';
import { Link, useRouter } from '@/i18n/navigation';

export function BuyListingButton({ listingId, signedIn, hasAccess }: { listingId: string; signedIn: boolean; hasAccess: boolean }) {
  const t = useTranslations();
  const api = useApi();
  const router = useRouter();
  const key = useMemo(() => generateIdempotencyKey(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!signedIn) return <Link href={{ pathname: '/auth/login', query: { next: '/resale' } }} className={buttonClasses({ size: 'sm' })}>{t('resale.buy')}</Link>;
  if (!hasAccess) return <Link href="/beta" className={buttonClasses({ size: 'sm', variant: 'outline' })}>{t('nav.beta')}</Link>;
  return (
    <div className="space-y-1 text-end">
      <Button
        size="sm"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const tx = await api.resale.purchase(listingId, key);
            router.push(`/resale/transactions/${tx.id}`);
          } catch (caught) {
            setError(errorMessage(caught, t('common.unknownError')));
            setBusy(false);
          }
        }}
      >
        {busy ? t('resale.buying') : t('resale.buy')}
      </Button>
      {error ? <p className="text-xs text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
