'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/use-api';

/** Confirmation par clic explicite (un simple GET ne consomme pas le jeton : protège des scanners de liens). */
export function VerifyEmail({ token }: { token: string }) {
  const t = useTranslations();
  const api = useApi();
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'failed'>('idle');
  if (state === 'ok') return <Alert tone="success" title={t('beta.verifiedTitle')}>{t('beta.verifiedText')}</Alert>;
  if (state === 'failed') return <Alert tone="danger">{t('beta.verifyFailed')}</Alert>;
  return (
    <Button
      size="lg"
      loading={state === 'busy'}
      onClick={async () => {
        setState('busy');
        try {
          const result = await api.beta.verify(token);
          setState(result.verified ? 'ok' : 'failed');
        } catch {
          setState('failed');
        }
      }}
    >
      {t('common.confirm')}
    </Button>
  );
}
