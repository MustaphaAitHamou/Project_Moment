'use client';
import { COUNTRY_CODES, ORGANIZER_KINDS } from '@tamurt/core';
import { localizedName } from '@tamurt/i18n';
import { organizerProfileSchema, type OrganizerProfileInput } from '@tamurt/validation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { errorMessage, useApi } from '@/hooks/use-api';
import { useTranslateError } from '@/hooks/use-translate-error';
import { useRouter } from '@/i18n/navigation';
import { updateOrganizerAction } from '@/lib/actions/organizer';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function OrganizerForm({ organizerId, initial }: { organizerId?: string; initial: OrganizerProfileInput }) {
  const t = useTranslations();
  const translate = useTranslateError();
  const locale = useLocale() as 'fr' | 'en' | 'ar';
  const api = useApi();
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [cities, setCities] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    void getSupabaseBrowserClient().from('cities').select('id, names').eq('country_code', values.countryCode).order('sort_order').then(({ data }) => setCities((data ?? []).map((city) => ({ id: city.id, label: localizedName(city.names as Record<string, string>, locale) }))));
  }, [values.countryCode, locale]);

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        const parsed = organizerProfileSchema.safeParse(values);
        if (!parsed.success) {
          setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
          return;
        }
        setErrors({});
        setBusy(true);
        setFeedback(null);
        try {
          if (organizerId) {
            const result = await updateOrganizerAction(organizerId, parsed.data);
            setFeedback(result.ok ? { ok: true, text: t('organizer.updated') } : { ok: false, text: result.message });
            if (result.ok) router.refresh();
          } else {
            const created = await api.organizers.create(parsed.data);
            router.push(`/organizer/${created.id}`);
            return;
          }
        } catch (caught) {
          setFeedback({ ok: false, text: errorMessage(caught, t('common.unknownError')) });
        }
        setBusy(false);
      }}
    >
      <Field label={t('organizer.name')} htmlFor="org-name" required error={translate(errors.name)}>
        <Input id="org-name" value={values.name} maxLength={120} onChange={(e) => setValues({ ...values, name: e.target.value })} />
      </Field>
      <Field label={t('organizer.kind')} htmlFor="org-kind" required>
        <Select id="org-kind" value={values.kind} onChange={(e) => setValues({ ...values, kind: e.target.value as OrganizerProfileInput['kind'] })}>
          {ORGANIZER_KINDS.map((kind) => <option key={kind} value={kind}>{t(`organizer.kinds.${kind}`)}</option>)}
        </Select>
      </Field>
      <Field label={t('common.country')} htmlFor="org-country" required>
        <Select id="org-country" value={values.countryCode} onChange={(e) => setValues({ ...values, countryCode: e.target.value as OrganizerProfileInput['countryCode'], cityId: null })}>
          {COUNTRY_CODES.map((code) => <option key={code} value={code}>{t(`countries.${code}`)}</option>)}
        </Select>
      </Field>
      <Field label={t('common.city')} htmlFor="org-city" optionalLabel={t('common.optional')}>
        <Select id="org-city" value={values.cityId ?? ''} onChange={(e) => setValues({ ...values, cityId: e.target.value || null })}>
          <option value="">—</option>
          {cities.map((city) => <option key={city.id} value={city.id}>{city.label}</option>)}
        </Select>
      </Field>
      <Field label={t('organizer.bio')} htmlFor="org-bio" className="sm:col-span-2" error={translate(errors.bio)}>
        <Textarea id="org-bio" maxLength={4000} value={values.bio ?? ''} onChange={(e) => setValues({ ...values, bio: e.target.value || undefined })} />
      </Field>
      <Field label={t('organizer.website')} htmlFor="org-website" error={translate(errors.websiteUrl)} optionalLabel={t('common.optional')}>
        <Input id="org-website" type="url" placeholder="https://" value={values.websiteUrl ?? ''} onChange={(e) => setValues({ ...values, websiteUrl: e.target.value || undefined })} />
      </Field>
      <Field label={t('organizer.publicEmail')} htmlFor="org-email" error={translate(errors.publicEmail)} optionalLabel={t('common.optional')}>
        <Input id="org-email" type="email" value={values.publicEmail ?? ''} onChange={(e) => setValues({ ...values, publicEmail: e.target.value || undefined })} />
      </Field>
      <Field label={t('organizer.publicPhone')} htmlFor="org-phone" error={translate(errors.publicPhone)} optionalLabel={t('common.optional')}>
        <Input id="org-phone" type="tel" value={values.publicPhone ?? ''} onChange={(e) => setValues({ ...values, publicPhone: e.target.value || undefined })} />
      </Field>
      {feedback ? <Alert tone={feedback.ok ? 'success' : 'danger'} className="sm:col-span-2">{feedback.text}</Alert> : null}
      <div className="sm:col-span-2">
        <Button type="submit" loading={busy}>{organizerId ? t('common.save') : t('organizer.createOrganization')}</Button>
      </div>
    </form>
  );
}
