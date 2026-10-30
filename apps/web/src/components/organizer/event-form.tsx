'use client';
import { COUNTRIES, COUNTRY_CODES, EVENT_CATEGORY_SLUGS, isCountryCode, type CurrencyCode } from '@tamurt/core';
import { localizedName } from '@tamurt/i18n';
import { eventFormSchema } from '@tamurt/validation';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field';
import { errorMessage, useApi } from '@/hooks/use-api';
import { useTranslateError } from '@/hooks/use-translate-error';
import { useRouter } from '@/i18n/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { toSchemaInput, type EventFormState } from './event-form-state';

export type { EventFormState };

interface Option {
  id: string;
  label: string;
}

export function EventForm({
  mode,
  organizerId,
  eventId,
  initial,
  verified,
}: {
  mode: 'create' | 'edit';
  organizerId: string;
  eventId?: string;
  initial: EventFormState;
  verified: boolean;
}) {
  const t = useTranslations();
  const translate = useTranslateError();
  const locale = useLocale() as 'fr' | 'en' | 'ar';
  const api = useApi();
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [busy, setBusy] = useState<null | 'save_draft' | 'publish' | 'save'>(null);
  const [cities, setCities] = useState<Option[]>([]);
  const [regions, setRegions] = useState<Option[]>([]);
  const [venues, setVenues] = useState<(Option & { address: string | null; postal: string | null; lat: number | null; lng: number | null })[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const set = <K extends keyof EventFormState>(key: K, value: EventFormState[K]) => setState((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    void supabase.from('cities').select('id, names').eq('country_code', state.countryCode).order('sort_order').then(({ data }) => setCities((data ?? []).map((c) => ({ id: c.id, label: localizedName(c.names as Record<string, string>, locale) }))));
    void supabase.from('regions').select('id, names').eq('country_code', state.countryCode).order('code').then(({ data }) => setRegions((data ?? []).map((r) => ({ id: r.id, label: localizedName(r.names as Record<string, string>, locale) }))));
  }, [state.countryCode, locale]);

  useEffect(() => {
    if (!state.cityId) return setVenues([]);
    void getSupabaseBrowserClient()
      .from('venues')
      .select('id, name, address_line1, postal_code, lat, lng')
      .eq('city_id', state.cityId)
      .is('deleted_at', null)
      .order('name')
      .then(({ data }) => setVenues((data ?? []).map((v) => ({ id: v.id, label: v.name, address: v.address_line1, postal: v.postal_code, lat: v.lat, lng: v.lng }))));
  }, [state.cityId]);

  const timezones = useMemo(() => {
    const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
    return Array.from(new Set([COUNTRIES[state.countryCode].defaultTimeZone, state.timezone, ...all]));
  }, [state.countryCode, state.timezone]);

  function changeCountry(code: string) {
    if (!isCountryCode(code)) return;
    setState((current) => ({ ...current, countryCode: code, cityId: '', regionId: '', venueId: '', timezone: COUNTRIES[code].defaultTimeZone, currency: COUNTRIES[code].currency }));
  }

  async function geocode() {
    const query = [state.addressLine, state.postalCode, cities.find((c) => c.id === state.cityId)?.label].filter(Boolean).join(', ');
    if (!query) return;
    setGeocoding(true);
    try {
      const { results } = await api.geocode(query, state.countryCode);
      const first = results[0];
      if (first) setState((current) => ({ ...current, lat: first.lat.toFixed(6), lng: first.lng.toFixed(6) }));
      else setErrors((current) => ({ ...current, lat: t('eventForm.geocodeNoResult') }));
    } catch (caught) {
      setErrors((current) => ({ ...current, lat: errorMessage(caught, t('eventForm.geocodeNoResult')) }));
    }
    setGeocoding(false);
  }

  function validate() {
    const parsed = eventFormSchema.safeParse(toSchemaInput(state));
    if (parsed.success) {
      setErrors({});
      return true;
    }
    const next: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      const mapped = key === 'priceMinMinor' ? 'priceMin' : key === 'priceMaxMinor' ? 'priceMax' : key;
      next[mapped] ??= issue.message;
    }
    setErrors(next);
    setFeedback({ tone: 'danger', text: t('errors.validation_failed') });
    return false;
  }

  async function submit(action: 'save_draft' | 'publish' | 'save') {
    if (!validate()) return;
    setBusy(action);
    setFeedback(null);
    try {
      const form = toSchemaInput(state);
      if (mode === 'create') {
        const result = await api.events.create(organizerId, form, action === 'save' ? 'save_draft' : action);
        router.push(`/organizer/events/${result.id}?saved=${result.status}`);
        return;
      }
      await api.events.update(eventId!, form);
      if (action === 'publish') await api.events.changeStatus(eventId!, { action: 'publish' });
      setFeedback({ tone: 'success', text: t('eventForm.updated') });
      router.refresh();
    } catch (caught) {
      const details = (caught as { details?: { issues?: { path: string; message: string }[] } }).details;
      if (details?.issues) setErrors(Object.fromEntries(details.issues.map((issue) => [issue.path.split('.')[0] ?? 'form', issue.message])));
      setFeedback({ tone: 'danger', text: errorMessage(caught, t('common.unknownError')) });
    }
    setBusy(null);
  }

  const err = (key: string) => translate(errors[key]);
  const accessibilityKeys = ['wheelchair', 'accessibleToilets', 'hearingLoop', 'signLanguage', 'quietSpace'] as const;

  return (
    <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); void submit(mode === 'create' ? 'save_draft' : 'save'); }} noValidate>
      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">{t('eventForm.sections.basics')}</h2>
        <Field label={t('eventForm.title')} htmlFor="ev-title" required error={err('title')}>
          <Input id="ev-title" value={state.title} maxLength={140} onChange={(e) => set('title', e.target.value)} aria-invalid={Boolean(errors.title)} />
        </Field>
        <Field label={t('eventForm.summary')} htmlFor="ev-summary" error={err('summary')}>
          <Input id="ev-summary" value={state.summary} maxLength={300} onChange={(e) => set('summary', e.target.value)} />
        </Field>
        <Field label={t('eventForm.description')} htmlFor="ev-description" error={err('description')}>
          <Textarea id="ev-description" value={state.description} maxLength={10000} className="min-h-40" onChange={(e) => set('description', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('eventForm.category')} htmlFor="ev-category" required error={err('categorySlug')}>
            <Select id="ev-category" value={state.categorySlug} onChange={(e) => set('categorySlug', e.target.value)}>
              {EVENT_CATEGORY_SLUGS.map((slug) => <option key={slug} value={slug}>{t(`categories.${slug}`)}</option>)}
            </Select>
          </Field>
          <Field label={t('eventForm.tags')} htmlFor="ev-tags" hint={t('eventForm.tagsHelp')} error={err('tags')}>
            <Input id="ev-tags" value={state.tags} onChange={(e) => set('tags', e.target.value)} />
          </Field>
        </div>
        <Field label={t('eventForm.artists')} htmlFor="ev-artists" hint={t('eventForm.artistsHelp')} error={err('artistNames')}>
          <Textarea id="ev-artists" value={state.artistNames} className="min-h-20" onChange={(e) => set('artistNames', e.target.value)} />
        </Field>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">{t('eventForm.sections.dateTime')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('eventForm.startDate')} htmlFor="ev-start-date" required error={err('startDate')}>
            <Input id="ev-start-date" type="date" value={state.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </Field>
          <Field label={t('eventForm.startTime')} htmlFor="ev-start-time" required error={err('startTime')}>
            <Input id="ev-start-time" type="time" value={state.startTime} onChange={(e) => set('startTime', e.target.value)} />
          </Field>
          <Field label={t('eventForm.endDate')} htmlFor="ev-end-date" optionalLabel={t('common.optional')} error={err('endDate')}>
            <Input id="ev-end-date" type="date" value={state.endDate} onChange={(e) => set('endDate', e.target.value)} />
          </Field>
          <Field label={t('eventForm.endTime')} htmlFor="ev-end-time" optionalLabel={t('common.optional')} error={err('endTime')}>
            <Input id="ev-end-time" type="time" value={state.endTime} onChange={(e) => set('endTime', e.target.value)} />
          </Field>
        </div>
        <Field label={t('eventForm.timezone')} htmlFor="ev-timezone" hint={t('eventForm.timezoneHelp')} error={err('timezone')}>
          <Select id="ev-timezone" value={state.timezone} onChange={(e) => set('timezone', e.target.value)}>
            {timezones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
          </Select>
        </Field>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">{t('eventForm.sections.location')}</h2>
        <Checkbox label={t('eventForm.isOnline')} checked={state.isOnline} onChange={(e) => set('isOnline', e.target.checked)} />
        {state.isOnline ? (
          <Field label={t('eventForm.onlineUrl')} htmlFor="ev-online" required error={err('onlineUrl')}>
            <Input id="ev-online" type="url" inputMode="url" placeholder="https://" value={state.onlineUrl} onChange={(e) => set('onlineUrl', e.target.value)} />
          </Field>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('eventForm.country')} htmlFor="ev-country" required>
            <Select id="ev-country" value={state.countryCode} onChange={(e) => changeCountry(e.target.value)}>
              {COUNTRY_CODES.map((code) => <option key={code} value={code}>{t(`countries.${code}`)}</option>)}
            </Select>
          </Field>
          <Field label={t('eventForm.region')} htmlFor="ev-region" optionalLabel={t('common.optional')}>
            <Select id="ev-region" value={state.regionId} onChange={(e) => set('regionId', e.target.value)}>
              <option value="">—</option>
              {regions.map((region) => <option key={region.id} value={region.id}>{region.label}</option>)}
            </Select>
          </Field>
          <Field label={t('eventForm.city')} htmlFor="ev-city" required error={err('cityId')}>
            <Select id="ev-city" value={state.cityId} onChange={(e) => setState((current) => ({ ...current, cityId: e.target.value, venueId: '' }))}>
              <option value="">—</option>
              {cities.map((city) => <option key={city.id} value={city.id}>{city.label}</option>)}
            </Select>
          </Field>
        </div>
        {!state.isOnline ? (
          <>
            <Field label={t('eventForm.venue')} htmlFor="ev-venue">
              <Select
                id="ev-venue"
                value={state.venueId}
                onChange={(e) => {
                  const venue = venues.find((v) => v.id === e.target.value);
                  setState((current) => ({
                    ...current,
                    venueId: e.target.value,
                    ...(venue ? { locationName: venue.label, addressLine: venue.address ?? '', postalCode: venue.postal ?? '', lat: venue.lat?.toString() ?? '', lng: venue.lng?.toString() ?? '' } : {}),
                  }));
                }}
              >
                <option value="">{t('eventForm.noVenue')}</option>
                {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.label}</option>)}
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_10rem]">
              <Field label={t('eventForm.locationName')} htmlFor="ev-location" error={err('locationName')}>
                <Input id="ev-location" value={state.locationName} onChange={(e) => set('locationName', e.target.value)} />
              </Field>
              <Field label={t('eventForm.address')} htmlFor="ev-address" error={err('addressLine')}>
                <Input id="ev-address" value={state.addressLine} autoComplete="street-address" onChange={(e) => set('addressLine', e.target.value)} />
              </Field>
              <Field label={t('eventForm.postalCode')} htmlFor="ev-postal" error={err('postalCode')}>
                <Input id="ev-postal" value={state.postalCode} autoComplete="postal-code" onChange={(e) => set('postalCode', e.target.value)} />
              </Field>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('eventForm.pinOnMap')}</p>
              <p className="text-xs text-muted">{t('eventForm.pinHelp')}</p>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Latitude" htmlFor="ev-lat" error={err('lat')} className="w-40">
                  <Input id="ev-lat" inputMode="decimal" value={state.lat} onChange={(e) => set('lat', e.target.value)} />
                </Field>
                <Field label="Longitude" htmlFor="ev-lng" error={err('lng')} className="w-40">
                  <Input id="ev-lng" inputMode="decimal" value={state.lng} onChange={(e) => set('lng', e.target.value)} />
                </Field>
                <Button variant="outline" loading={geocoding} onClick={geocode}><MapPin className="h-4 w-4" aria-hidden />{t('eventForm.geocode')}</Button>
              </div>
            </div>
          </>
        ) : null}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">{t('eventForm.sections.pricing')}</h2>
        <Checkbox label={t('eventForm.isFree')} checked={state.isFree} onChange={(e) => setState((current) => ({ ...current, isFree: e.target.checked, registrationMode: e.target.checked && current.registrationMode === 'tickets' ? 'none' : current.registrationMode }))} />
        {!state.isFree ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('eventForm.priceMin')} htmlFor="ev-price-min" error={err('priceMin')}>
              <Input id="ev-price-min" inputMode="decimal" value={state.priceMin} onChange={(e) => set('priceMin', e.target.value)} />
            </Field>
            <Field label={t('eventForm.priceMax')} htmlFor="ev-price-max" error={err('priceMax')}>
              <Input id="ev-price-max" inputMode="decimal" value={state.priceMax} onChange={(e) => set('priceMax', e.target.value)} />
            </Field>
            <Field label={t('eventForm.currency')} htmlFor="ev-currency" error={err('currency')}>
              <Select id="ev-currency" value={state.currency} onChange={(e) => set('currency', e.target.value as CurrencyCode)}>
                {(['EUR', 'DZD', 'USD', 'CAD'] as const).map((code) => <option key={code} value={code}>{code}</option>)}
              </Select>
            </Field>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('eventForm.registrationMode')} htmlFor="ev-registration" error={err('registrationMode')}>
            <Select id="ev-registration" value={state.registrationMode} onChange={(e) => set('registrationMode', e.target.value as EventFormState['registrationMode'])}>
              <option value="none">{t('eventForm.registrationModes.none')}</option>
              <option value="free_registration">{t('eventForm.registrationModes.free_registration')}</option>
              {!state.isFree ? <option value="tickets">{t('eventForm.registrationModes.tickets')}</option> : null}
            </Select>
          </Field>
          <Field label={t('eventForm.capacity')} htmlFor="ev-capacity" error={err('capacity')} optionalLabel={state.registrationMode === 'free_registration' ? undefined : t('common.optional')} required={state.registrationMode === 'free_registration'}>
            <Input id="ev-capacity" type="number" min={1} value={state.capacity} onChange={(e) => set('capacity', e.target.value)} />
          </Field>
        </div>
        {state.registrationMode === 'tickets' ? <Alert tone="demo">{t('eventForm.ticketingDemoNote')}</Alert> : null}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">{t('eventForm.sections.practical')}</h2>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium">{t('eventForm.accessibility')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {accessibilityKeys.map((key) => (
              <Checkbox key={key} label={t(`event.accessibilityItems.${key}`)} checked={state.accessibility[key]} onChange={(e) => set('accessibility', { ...state.accessibility, [key]: e.target.checked })} />
            ))}
          </div>
        </fieldset>
        <Field label={t('eventForm.accessibilityNotes')} htmlFor="ev-access-notes">
          <Input id="ev-access-notes" maxLength={500} value={state.accessibility.notes} onChange={(e) => set('accessibility', { ...state.accessibility, notes: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <Field label={t('eventForm.entryConditions')} htmlFor="ev-conditions">
            <Textarea id="ev-conditions" className="min-h-20" maxLength={2000} value={state.entryConditions} onChange={(e) => set('entryConditions', e.target.value)} />
          </Field>
          <Field label={t('eventForm.ageMin')} htmlFor="ev-age" error={err('ageMin')}>
            <Input id="ev-age" type="number" min={0} max={21} value={state.ageMin} onChange={(e) => set('ageMin', e.target.value)} />
          </Field>
        </div>
        <Field label={t('eventForm.cancellationPolicy')} htmlFor="ev-cancellation">
          <Textarea id="ev-cancellation" className="min-h-20" maxLength={3000} value={state.cancellationPolicy} onChange={(e) => set('cancellationPolicy', e.target.value)} />
        </Field>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">{t('eventForm.sections.contact')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('eventForm.contactEmail')} htmlFor="ev-email" error={err('contactEmail')}>
            <Input id="ev-email" type="email" value={state.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
          </Field>
          <Field label={t('eventForm.contactPhone')} htmlFor="ev-phone" error={err('contactPhone')}>
            <Input id="ev-phone" type="tel" placeholder={COUNTRIES[state.countryCode].phonePrefix} value={state.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} />
          </Field>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('eventForm.officialLinks')}</legend>
          {state.officialLinks.map((link, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[12rem_1fr_auto]">
              <Input aria-label={t('eventForm.linkLabel')} placeholder={t('eventForm.linkLabel')} value={link.label} onChange={(e) => set('officialLinks', state.officialLinks.map((l, i) => (i === index ? { ...l, label: e.target.value } : l)))} />
              <Input aria-label={t('eventForm.linkUrl')} placeholder="https://" type="url" value={link.url} onChange={(e) => set('officialLinks', state.officialLinks.map((l, i) => (i === index ? { ...l, url: e.target.value } : l)))} />
              <Button variant="ghost" size="icon" aria-label={t('common.delete')} onClick={() => set('officialLinks', state.officialLinks.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" aria-hidden /></Button>
            </div>
          ))}
          {errors.officialLinks ? <p className="text-xs text-danger">{err('officialLinks')}</p> : null}
          {state.officialLinks.length < 10 ? (
            <Button variant="outline" size="sm" onClick={() => set('officialLinks', [...state.officialLinks, { label: '', url: '' }])}><Plus className="h-4 w-4" aria-hidden />{t('eventForm.addLink')}</Button>
          ) : null}
        </fieldset>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">{t('eventForm.sections.visibility')}</h2>
        <div className="space-y-2">
          {(['public', 'unlisted', 'private'] as const).map((value) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input type="radio" name="visibility" checked={state.visibility === value} onChange={() => set('visibility', value)} className="accent-[var(--tm-primary)]" />
              {t(`eventForm.visibilities.${value}`)}
            </label>
          ))}
        </div>
        <p className="text-sm text-muted">{verified ? t('eventForm.publishVerifiedNote') : t('eventForm.publishReviewNote')} {t('eventForm.publishingFree')}</p>
      </Card>

      {feedback ? <Alert tone={feedback.tone}>{feedback.text}</Alert> : null}
      <div className="sticky bottom-20 z-10 flex flex-wrap gap-2 rounded-xl border border-line bg-raised p-3 shadow-lg md:bottom-4">
        {mode === 'create' ? (
          <>
            <Button type="submit" variant="outline" loading={busy === 'save_draft'}>{t('eventForm.saveDraft')}</Button>
            <Button loading={busy === 'publish'} onClick={() => submit('publish')}>{verified ? t('eventForm.publish') : t('eventForm.submitForReview')}</Button>
          </>
        ) : (
          <Button type="submit" loading={busy === 'save'}>{t('common.save')}</Button>
        )}
      </div>
    </form>
  );
}
