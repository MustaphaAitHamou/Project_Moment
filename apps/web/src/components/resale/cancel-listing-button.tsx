'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { errorMessage, useApi } from '@/hooks/use-api';
import { useRouter } from '@/i18n/navigation';

export function CancelListingButton({ listingId }: { listingId: string }) {
  const t = useTranslations();
  const api = useApi();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <Button size="sm" variant="ghost" loading={busy} onClick={async () => {
        setBusy(true);
        try {
          await api.resale.cancelListing(listingId);
          router.refresh();
        } catch (caught) {
          setError(errorMessage(caught, t('common.unknownError')));
        }
        setBusy(false);
      }}>{t('resale.cancelListing')}</Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </span>
  );
}
