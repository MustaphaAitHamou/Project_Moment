'use client';
import { TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('common');
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page py-16">
      <EmptyState
        icon={TriangleAlert}
        title={t('error')}
        text={t('unknownError')}
        action={<Button onClick={reset}>{t('retry')}</Button>}
      />
    </div>
  );
}
