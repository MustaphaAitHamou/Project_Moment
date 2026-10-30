'use client';
import { COUNTRY_CODES, COUNTRIES, isCountryCode } from '@tamurt/core';
import { LOCALE_INFO, LOCALES } from '@tamurt/i18n';
import type { ProfileUpdateInput } from '@tamurt/validation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { usePathname, useRouter } from '@/i18n/navigation';
import { updateProfileAction } from '@/lib/actions/account';

export function ProfileForm({ initial, cities }: { initial: ProfileUpdateInput; cities: { id: string; name: string; countryCode: string }[] }) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [values, setValues] = useState(initial);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const timezones = values.countryCode && isCountryCode(values.countryCode) ? [COUNTRIES[values.countryCode].defaultTimeZone] : [];
  const zoneOptions = Array.from(new Set([...(values.timezone ? [values.timezone] : []), ...timezones, ...(typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [])]));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (!result.ok) return setFeedback({ ok: false, text: result.message });
      setFeedback({ ok: true, text: t('account.profileSaved') });
      if (values.locale !== initial.locale) router.replace(pathname, { locale: values.locale });
      else router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label={t('account.displayName')} htmlFor="displayName" className="sm:col-span-2">
        <Input id="displayName" value={values.displayName} maxLength={80} required onChange={(e) => setValues({ ...values, displayName: e.target.value })} />
      </Field>
      <Field label={t('settings.language')} htmlFor="locale">
        <Select id="locale" value={values.locale} onChange={(e) => setValues({ ...values, locale: e.target.value as ProfileUpdateInput['locale'] })}>
          {LOCALES.map((code) => <option key={code} value={code}>{LOCALE_INFO[code].nativeName}</option>)}
        </Select>
      </Field>
      <Field label={t('settings.country')} htmlFor="countryCode">
        <Select id="countryCode" value={values.countryCode ?? ''} onChange={(e) => setValues({ ...values, countryCode: (e.target.value || null) as ProfileUpdateInput['countryCode'], homeCityId: null })}>
          <option value="">—</option>
          {COUNTRY_CODES.map((code) => <option key={code} value={code}>{t(`countries.${code}`)}</option>)}
        </Select>
      </Field>
      <Field label={t('account.homeCity')} htmlFor="homeCity" optionalLabel={t('common.optional')}>
        <Select id="homeCity" value={values.homeCityId ?? ''} onChange={(e) => setValues({ ...values, homeCityId: e.target.value || null })}>
          <option value="">—</option>
          {cities.filter((city) => !values.countryCode || city.countryCode === values.countryCode).map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
        </Select>
      </Field>
      <Field label={t('account.timezone')} htmlFor="timezone" optionalLabel={t('common.optional')}>
        <Select id="timezone" value={values.timezone ?? ''} onChange={(e) => setValues({ ...values, timezone: e.target.value || null })}>
          <option value="">—</option>
          {zoneOptions.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
        </Select>
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" loading={pending}>{t('common.save')}</Button>
        {feedback ? <Alert tone={feedback.ok ? 'success' : 'danger'} className="flex-1 py-2">{feedback.text}</Alert> : null}
      </div>
    </form>
  );
}
