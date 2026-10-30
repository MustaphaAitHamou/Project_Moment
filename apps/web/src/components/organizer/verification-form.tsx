'use client';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { useRouter } from '@/i18n/navigation';
import { requestVerificationAction } from '@/lib/actions/organizer';

export function VerificationForm({ organizerId }: { organizerId: string }) {
  const t = useTranslations('organizer');
  const router = useRouter();
  const [values, setValues] = useState({ legalName: '', registrationNumber: '', message: '' });
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  if (result?.ok) return <Alert tone="success">{result.text}</Alert>;
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const response = await requestVerificationAction(organizerId, {
            legalName: values.legalName.trim(),
            ...(values.registrationNumber.trim() ? { registrationNumber: values.registrationNumber.trim() } : {}),
            ...(values.message.trim() ? { message: values.message.trim() } : {}),
          });
          setResult(response.ok ? { ok: true, text: t('verificationRequested') } : { ok: false, text: response.message });
          if (response.ok) router.refresh();
        });
      }}
    >
      <p className="text-sm text-muted">{t('verificationHelp')}</p>
      <Field label={t('legalName')} htmlFor="ver-legal" required><Input id="ver-legal" maxLength={200} value={values.legalName} onChange={(e) => setValues({ ...values, legalName: e.target.value })} /></Field>
      <Field label={t('registrationNumber')} htmlFor="ver-number"><Input id="ver-number" maxLength={64} value={values.registrationNumber} onChange={(e) => setValues({ ...values, registrationNumber: e.target.value })} /></Field>
      <Field label={t('verificationMessage')} htmlFor="ver-message"><Textarea id="ver-message" maxLength={2000} value={values.message} onChange={(e) => setValues({ ...values, message: e.target.value })} /></Field>
      {result && !result.ok ? <Alert tone="danger">{result.text}</Alert> : null}
      <Button type="submit" loading={pending} disabled={values.legalName.trim().length < 2}>{t('requestVerification')}</Button>
    </form>
  );
}
