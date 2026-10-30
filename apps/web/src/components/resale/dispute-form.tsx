'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, Select, Textarea } from '@/components/ui/field';
import { errorMessage, useApi } from '@/hooks/use-api';

const REASONS = ['ticket_not_received', 'ticket_invalid', 'event_cancelled', 'not_as_described', 'payment_issue', 'other'] as const;

export function DisputeForm({ transactionId }: { transactionId: string }) {
  const t = useTranslations();
  const api = useApi();
  const [reason, setReason] = useState<(typeof REASONS)[number]>('ticket_not_received');
  const [details, setDetails] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (result?.ok) return <Alert tone="success">{result.text}</Alert>;
  return (
    <details className="rounded-xl border border-line bg-surface p-4">
      <summary className="cursor-pointer font-semibold">{t('resale.openDispute')}</summary>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          try {
            await api.resale.dispute({ transactionId, reason, ...(details.trim() ? { details: details.trim() } : {}) });
            setResult({ ok: true, text: t('resale.disputeOpened') });
          } catch (caught) {
            setResult({ ok: false, text: errorMessage(caught, t('common.unknownError')) });
          }
          setBusy(false);
        }}
      >
        <Field label={t('common.details')} htmlFor="dispute-reason">
          <Select id="dispute-reason" value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}>
            {REASONS.map((value) => <option key={value} value={value}>{t(`resale.disputeReasons.${value}`)}</option>)}
          </Select>
        </Field>
        <Field label={t('common.description')} htmlFor="dispute-details" optionalLabel={t('common.optional')}>
          <Textarea id="dispute-details" maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} />
        </Field>
        {result && !result.ok ? <Alert tone="danger">{result.text}</Alert> : null}
        <Button type="submit" variant="danger" loading={busy}>{t('common.send')}</Button>
      </form>
    </details>
  );
}
