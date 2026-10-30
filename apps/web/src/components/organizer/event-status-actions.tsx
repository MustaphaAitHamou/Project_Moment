'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/field';
import { errorMessage, useApi } from '@/hooks/use-api';
import { useRouter } from '@/i18n/navigation';

/** Transitions de statut (contrôlées à nouveau par la base : cycle de vie et modération). */
export function EventStatusActions({ eventId, status, verified }: { eventId: string; status: string; verified: boolean }) {
  const t = useTranslations();
  const api = useApi();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');

  async function run(action: 'submit' | 'publish' | 'withdraw' | 'cancel', successText: string) {
    setBusy(action);
    setMessage(null);
    try {
      await api.events.changeStatus(eventId, action === 'cancel' ? { action, reason } : { action });
      setMessage({ ok: true, text: successText });
      setCancelling(false);
      router.refresh();
    } catch (caught) {
      setMessage({ ok: false, text: errorMessage(caught, t('common.unknownError')) });
    }
    setBusy(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === 'draft' || status === 'rejected' ? (
          <Button loading={busy === 'publish'} onClick={() => run('publish', verified ? t('eventForm.published') : t('eventForm.submitted'))}>
            {verified ? t('eventForm.publish') : t('eventForm.submitForReview')}
          </Button>
        ) : null}
        {status === 'pending_review' ? <Button variant="outline" loading={busy === 'withdraw'} onClick={() => run('withdraw', t('eventForm.draftSaved'))}>{t('eventForm.withdraw')}</Button> : null}
        {status === 'published' && !cancelling ? <Button variant="danger" onClick={() => setCancelling(true)}>{t('eventForm.cancelEvent')}</Button> : null}
      </div>
      {cancelling ? (
        <div className="space-y-3 rounded-lg border border-danger/30 bg-danger-soft p-4">
          <p className="text-sm">{t('eventForm.cancelConfirm')}</p>
          <Field label={t('eventForm.cancelReason')} htmlFor="cancel-reason" required>
            <Textarea id="cancel-reason" minLength={5} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button variant="danger" disabled={reason.trim().length < 5} loading={busy === 'cancel'} onClick={() => run('cancel', t('eventForm.cancelled'))}>{t('common.confirm')}</Button>
            <Button variant="ghost" onClick={() => setCancelling(false)}>{t('common.cancel')}</Button>
          </div>
        </div>
      ) : null}
      {message ? <Alert tone={message.ok ? 'success' : 'danger'}>{message.text}</Alert> : null}
    </div>
  );
}
