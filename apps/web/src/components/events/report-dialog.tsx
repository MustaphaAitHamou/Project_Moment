'use client';
import { Flag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, Select, Textarea } from '@/components/ui/field';
import { Link } from '@/i18n/navigation';
import { reportEventAction } from '@/lib/actions/events';

const REASONS = ['fake_event', 'scam', 'inappropriate', 'wrong_information', 'duplicate', 'cancelled_not_updated', 'other'] as const;

export function ReportDialog({ eventId, signedIn, returnTo }: { eventId: string; signedIn: boolean; returnTo: string }) {
  const t = useTranslations();
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState<(typeof REASONS)[number]>('fake_event');
  const [details, setDetails] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <Link href={{ pathname: '/auth/login', query: { next: returnTo } }} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-danger">
        <Flag className="h-4 w-4" aria-hidden />
        {t('event.report')}
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-danger">
        <Flag className="h-4 w-4" aria-hidden />
        {t('event.report')}
      </button>
      <dialog ref={dialog} className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-line bg-raised p-0 text-fg shadow-lg backdrop:bg-overlay" aria-labelledby="report-title">
        <form
          className="space-y-4 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const response = await reportEventAction({ eventId, reason, details: details.trim() || undefined });
              setResult(response.ok ? { ok: true, text: t('event.reportSent') } : { ok: false, text: response.message });
            });
          }}
        >
          <h2 id="report-title" className="font-display text-xl font-bold">{t('event.reportTitle')}</h2>
          {result?.ok ? (
            <Alert tone="success">{result.text}</Alert>
          ) : (
            <>
              <Field label={t('common.details')} htmlFor="report-reason" required>
                <Select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}>
                  {REASONS.map((value) => <option key={value} value={value}>{t(`event.reportReasons.${value}`)}</option>)}
                </Select>
              </Field>
              <Field label={t('event.reportDetails')} htmlFor="report-details">
                <Textarea id="report-details" maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} />
              </Field>
              {result && !result.ok ? <Alert tone="danger">{result.text}</Alert> : null}
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => dialog.current?.close()}>{t('common.close')}</Button>
            {result?.ok ? null : <Button type="submit" variant="danger" loading={pending}>{t('common.send')}</Button>}
          </div>
        </form>
      </dialog>
    </>
  );
}
