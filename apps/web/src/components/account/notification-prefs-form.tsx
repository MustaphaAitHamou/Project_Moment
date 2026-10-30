'use client';
import type { NotificationPreferencesInput } from '@tamurt/validation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Select } from '@/components/ui/field';
import { updateNotificationPreferencesAction } from '@/lib/actions/account';

const TOGGLES = ['email_enabled', 'push_enabled', 'reminders_enabled', 'followed_city_events_enabled', 'organizer_updates_enabled', 'marketing_enabled'] as const;
const LEADS = [1, 3, 24, 48, 168] as const;

/** Préférences de notification : tout est désactivable ; le marketing est désactivé par défaut. */
export function NotificationPrefsForm({ initial }: { initial: NotificationPreferencesInput }) {
  const t = useTranslations();
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await updateNotificationPreferencesAction(values);
          setStatus(result.ok ? t('common.saved') : result.message);
        });
      }}
    >
      <div className="space-y-2.5">
        {TOGGLES.map((key) => (
          <Checkbox key={key} label={t(`account.notificationPrefs.${key}`)} checked={values[key]} onChange={(e) => setValues({ ...values, [key]: e.target.checked })} />
        ))}
      </div>
      <Field label={t('account.notificationPrefs.reminder_lead_hours')} htmlFor="lead" className="max-w-xs">
        <Select id="lead" value={values.reminder_lead_hours} disabled={!values.reminders_enabled} onChange={(e) => setValues({ ...values, reminder_lead_hours: Number(e.target.value) as NotificationPreferencesInput['reminder_lead_hours'] })}>
          {LEADS.map((lead) => <option key={lead} value={lead}>{t(`account.reminderLeads.${lead}`)}</option>)}
        </Select>
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>{t('common.save')}</Button>
        <span role="status" className="text-sm text-muted">{status}</span>
      </div>
    </form>
  );
}
