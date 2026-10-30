'use client';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { useRouter } from '@/i18n/navigation';
import { updateBetaSettingsAction } from '@/lib/actions/admin';

interface BetaSettings {
  mode: 'open' | 'closed';
  max_testers: number;
  testflight_url: string | null;
  play_testing_url: string | null;
}

export function BetaSettingsForm({ initial }: { initial: BetaSettings }) {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await updateBetaSettingsAction(values);
          setMessage(result.ok ? { ok: true, text: t('settingSaved') } : { ok: false, text: result.message });
          if (result.ok) router.refresh();
        });
      }}
    >
      <Field label={t('betaMode')} htmlFor="beta-mode">
        <Select id="beta-mode" value={values.mode} onChange={(e) => setValues({ ...values, mode: e.target.value as BetaSettings['mode'] })}>
          <option value="closed">{t('betaModes.closed')}</option>
          <option value="open">{t('betaModes.open')}</option>
        </Select>
      </Field>
      <Field label={t('maxTesters')} htmlFor="beta-max">
        <Input id="beta-max" type="number" min={0} value={values.max_testers} onChange={(e) => setValues({ ...values, max_testers: Number(e.target.value) })} />
      </Field>
      <Field label={t('testflightUrl')} htmlFor="beta-tf">
        <Input id="beta-tf" type="url" placeholder="https://testflight.apple.com/join/…" value={values.testflight_url ?? ''} onChange={(e) => setValues({ ...values, testflight_url: e.target.value || null })} />
      </Field>
      <Field label={t('playUrl')} htmlFor="beta-play">
        <Input id="beta-play" type="url" placeholder="https://play.google.com/apps/testing/…" value={values.play_testing_url ?? ''} onChange={(e) => setValues({ ...values, play_testing_url: e.target.value || null })} />
      </Field>
      {message ? <Alert tone={message.ok ? 'success' : 'danger'} className="sm:col-span-2">{message.text}</Alert> : null}
      <div className="sm:col-span-2"><Button type="submit" loading={pending}>{tc('save')}</Button></div>
    </form>
  );
}
