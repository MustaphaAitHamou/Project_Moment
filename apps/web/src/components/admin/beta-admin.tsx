'use client';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { errorMessage, useApi } from '@/hooks/use-api';
import { useRouter } from '@/i18n/navigation';
import { updateFeedbackStatusAction } from '@/lib/actions/admin';

/** Le code d'invitation n'est affiché qu'UNE fois (seule son empreinte est conservée en base). */
function CreatedCode({ code, emailSent }: { code: string; emailSent: boolean }) {
  const t = useTranslations('admin');
  return (
    <Alert tone="success" title={t('invitationCreated')}>
      <code className="select-all rounded bg-surface px-2 py-1 font-mono text-base font-bold tracking-wider text-fg">{code}</code>
      <span className="ms-2 text-xs">{emailSent ? '✉︎ ✓' : '✉︎ —'}</span>
    </Alert>
  );
}

export function InviteFromWaitlist({ waitlistId }: { waitlistId: string }) {
  const t = useTranslations();
  const api = useApi();
  const router = useRouter();
  const [result, setResult] = useState<{ code: string; emailSent: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (result) return <CreatedCode code={result.code} emailSent={result.emailSent} />;
  return (
    <span className="inline-flex items-center gap-2">
      <Button size="sm" loading={busy} onClick={async () => {
        setBusy(true);
        try {
          const created = await api.beta.createInvitation({ waitlistId, expiresInDays: 30 });
          setResult({ code: created.code, emailSent: created.emailSent });
          router.refresh();
        } catch (caught) {
          setError(errorMessage(caught, t('common.unknownError')));
        }
        setBusy(false);
      }}>{t('admin.inviteTester')}</Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </span>
  );
}

export function InviteByEmailForm() {
  const t = useTranslations();
  const api = useApi();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [days, setDays] = useState(30);
  const [result, setResult] = useState<{ code: string; emailSent: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const created = await api.beta.createInvitation({ email: email.trim(), expiresInDays: days });
          setResult({ code: created.code, emailSent: created.emailSent });
          setEmail('');
          router.refresh();
        } catch (caught) {
          setError(errorMessage(caught, t('common.unknownError')));
        }
        setBusy(false);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <Field label={t('beta.email')} htmlFor="inv-email"><Input id="inv-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="J+" htmlFor="inv-days">
          <Select id="inv-days" value={days} onChange={(e) => setDays(Number(e.target.value))}>{[7, 14, 30, 60, 90].map((n) => <option key={n} value={n}>{n}</option>)}</Select>
        </Field>
        <Button type="submit" loading={busy}>{t('admin.inviteTester')}</Button>
      </div>
      {result ? <CreatedCode code={result.code} emailSent={result.emailSent} /> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </form>
  );
}

export function RevokeBetaInvitation({ invitationId }: { invitationId: string }) {
  const t = useTranslations('admin');
  const api = useApi();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return <Button size="sm" variant="ghost" loading={busy} onClick={async () => { setBusy(true); await api.beta.revokeInvitation(invitationId).catch(() => undefined); router.refresh(); setBusy(false); }}>{t('revoke')}</Button>;
}

export function FeedbackStatusSelect({ feedbackId, status }: { feedbackId: string; status: string }) {
  const t = useTranslations('beta');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Select aria-label={t('feedbackStatus.new')} value={status} disabled={pending} className="w-36 py-1.5" onChange={(e) => startTransition(async () => { await updateFeedbackStatusAction(feedbackId, e.target.value as 'new'); router.refresh(); })}>
      {(['new', 'triaged', 'planned', 'done', 'wont_fix'] as const).map((value) => <option key={value} value={value}>{t(`feedbackStatus.${value}`)}</option>)}
    </Select>
  );
}
