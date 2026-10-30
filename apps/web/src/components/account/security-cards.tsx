'use client';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input } from '@/components/ui/field';
import { errorMessage, useApi } from '@/hooks/use-api';
import { useRouter } from '@/i18n/navigation';
import { signOutOthersAction } from '@/lib/actions/account';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function SignOutOthersButton() {
  const t = useTranslations('account');
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  return done ? (
    <Alert tone="success">{t('loggedOutOthers')}</Alert>
  ) : (
    <Button variant="outline" loading={pending} onClick={() => startTransition(async () => { const r = await signOutOthersAction(); if (r.ok) setDone(true); })}>
      {t('logoutOthers')}
    </Button>
  );
}

/** Suppression définitive : confirmation explicite + mot de passe (ré-authentification). */
export function DeleteAccountForm() {
  const t = useTranslations();
  const api = useApi();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api.account.delete(password);
          await getSupabaseBrowserClient().auth.signOut();
          router.replace('/');
          router.refresh();
        } catch (caught) {
          setError(errorMessage(caught, t('common.unknownError')));
          setBusy(false);
        }
      }}
    >
      <p className="text-sm text-muted">{t('account.deleteAccountText')}</p>
      <Checkbox label={t('account.deleteConfirmLabel')} checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
      <Field label={t('account.deletePasswordLabel')} htmlFor="delete-password" className="max-w-sm">
        <Input id="delete-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button type="submit" variant="danger" disabled={!confirmed || !password} loading={busy}>{t('account.deleteAccountButton')}</Button>
    </form>
  );
}
