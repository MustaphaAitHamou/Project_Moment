'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { errorMessage, useApi } from '@/hooks/use-api';
import { useRouter } from '@/i18n/navigation';

export function RedeemForm() {
  const t = useTranslations('beta');
  const tc = useTranslations('common');
  const api = useApi();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (message?.ok) return <Alert tone="success">{message.text}</Alert>;
  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
          await api.beta.redeem(code);
          setMessage({ ok: true, text: t('redeemed') });
          router.refresh();
        } catch (caught) {
          setMessage({ ok: false, text: errorMessage(caught, tc('unknownError')) });
        }
        setBusy(false);
      }}
    >
      <p className="text-sm text-muted">{t('redeemHelp')}</p>
      <Field label={t('code')} htmlFor="invite-code">
        <Input id="invite-code" value={code} autoComplete="off" spellCheck={false} placeholder="TAMURT-XXXX-XXXX" className="font-mono uppercase tracking-wider" onChange={(e) => setCode(e.target.value.toUpperCase())} />
      </Field>
      {message ? <Alert tone="danger">{message.text}</Alert> : null}
      <Button type="submit" loading={busy} disabled={code.trim().length < 6}>{t('redeem')}</Button>
    </form>
  );
}
