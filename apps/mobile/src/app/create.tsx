import { listCities, listMyOrganizations } from '@tamurt/api-client';
import { COUNTRIES, EVENT_CATEGORY_SLUGS, isCountryCode, organizerRoleHasPermission, parseMajorToMinor } from '@tamurt/core';
import { eventFormSchema } from '@tamurt/validation';
import { useQuery } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { useLocale, useTranslations } from 'use-intl';
import { AppText, Banner, Button, Chip, EmptyState, LoadingState, Row, Screen, TextField } from '@/components/ui';
import { nameOf } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useApi } from '@/providers/api';
import { useAuth } from '@/providers/auth';

/**
 * Création rapide d'un événement depuis le téléphone (formulaire essentiel). Le formulaire complet
 * (accessibilité, liens, sessions…) reste disponible sur le site, dans l'espace organisateur.
 */
export default function CreateEventScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const api = useApi();
  const router = useRouter();
  const { viewer } = useAuth();
  const orgs = useQuery({ queryKey: ['my-orgs', viewer?.id], enabled: Boolean(viewer), queryFn: () => listMyOrganizations(supabase, viewer!.id) });
  const manageable = (orgs.data ?? []).filter(({ role }) => organizerRoleHasPermission(role, 'manage_events'));
  const [orgId, setOrgId] = useState<string | undefined>();
  const organizer = manageable.find(({ organizer: org }) => org.id === orgId)?.organizer ?? manageable[0]?.organizer;
  const country = organizer && isCountryCode(organizer.country_code) ? organizer.country_code : 'FR';
  const cities = useQuery({ queryKey: ['cities', country], queryFn: () => listCities(supabase, country) });
  const [form, setForm] = useState({ title: '', category: 'concerts', date: '', time: '20:00', cityId: '', isFree: true, price: '', registration: 'none' as 'none' | 'free_registration', capacity: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<null | 'save_draft' | 'publish'>(null);
  const [result, setResult] = useState<string | null>(null);

  if (!viewer) return <EmptyState icon="add-circle-outline" title={t('common.requiresLogin')} action={<Link href="/auth/login" asChild><Button title={t('nav.login')} /></Link>} />;
  if (!viewer.hasAppAccess) return <EmptyState icon="sparkles-outline" title={t('common.requiresBeta')} action={<Link href="/beta" asChild><Button title={t('nav.beta')} /></Link>} />;
  if (orgs.isLoading) return <LoadingState />;
  if (!organizer) return <EmptyState icon="business-outline" title={t('eventForm.noOrganizer')} text={t('organizer.createHelp')} />;

  async function submit(action: 'save_draft' | 'publish') {
    let priceMinor: number | null = null;
    try {
      priceMinor = form.isFree || !form.price ? null : parseMajorToMinor(form.price.replace(',', '.'), COUNTRIES[country].currency);
    } catch {
      return setErrors({ price: t('validation.invalid_amount') });
    }
    const input = {
      title: form.title.trim(),
      categorySlug: form.category,
      countryCode: country,
      cityId: form.cityId,
      timezone: COUNTRIES[country].defaultTimeZone,
      startDate: form.date,
      startTime: form.time,
      isFree: form.isFree,
      priceMinMinor: priceMinor,
      currency: form.isFree ? null : COUNTRIES[country].currency,
      registrationMode: form.registration,
      capacity: form.capacity ? Number(form.capacity) : null,
    };
    const parsed = eventFormSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), t(issue.message as never)])));
      return;
    }
    setErrors({});
    setBusy(action);
    try {
      const created = await api.events.create(organizer!.id, input as never, action);
      setResult(created.status === 'published' ? t('eventForm.published') : created.status === 'pending_review' ? t('eventForm.submitted') : t('eventForm.draftSaved'));
      setTimeout(() => router.replace({ pathname: '/events/[slug]', params: { slug: created.slug } }), 900);
    } catch (error) {
      setErrors({ form: (error as Error).message });
    }
    setBusy(null);
  }

  return (
    <Screen edges={['bottom']}>
      <AppText variant="muted">{t('eventForm.publishingFree')}</AppText>
      {manageable.length > 1 ? <Row>{manageable.map(({ organizer: org }) => <Chip key={org.id} label={org.name} selected={org.id === organizer.id} onPress={() => setOrgId(org.id)} />)}</Row> : <AppText variant="label">{t('eventForm.chooseOrganizer')} : {organizer.name}</AppText>}
      {result ? <Banner tone="success" text={result} /> : null}
      {errors.form ? <Banner tone="danger" text={errors.form} /> : null}
      <TextField label={t('eventForm.title')} value={form.title} onChangeText={(title) => setForm({ ...form, title })} maxLength={140} error={errors.title} />
      <AppText variant="label">{t('eventForm.category')}</AppText>
      <Row>{EVENT_CATEGORY_SLUGS.map((slug) => <Chip key={slug} label={t(`categories.${slug}`)} selected={form.category === slug} onPress={() => setForm({ ...form, category: slug })} />)}</Row>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><TextField label={t('eventForm.startDate')} placeholder="2027-05-20" value={form.date} onChangeText={(date) => setForm({ ...form, date })} error={errors.startDate} /></View>
        <View style={{ width: 120 }}><TextField label={t('eventForm.startTime')} placeholder="20:00" value={form.time} onChangeText={(time) => setForm({ ...form, time })} error={errors.startTime} /></View>
      </View>
      <AppText variant="caption">{t('eventForm.timezoneHelp')} ({COUNTRIES[country].defaultTimeZone})</AppText>
      <AppText variant="label">{t('eventForm.city')}</AppText>
      <Row>{(cities.data ?? []).map((city) => <Chip key={city.id} label={nameOf(city.names, locale)} selected={form.cityId === city.id} onPress={() => setForm({ ...form, cityId: city.id })} />)}</Row>
      {errors.cityId ? <AppText variant="caption">{errors.cityId}</AppText> : null}
      <Row><Switch value={form.isFree} onValueChange={(isFree) => setForm({ ...form, isFree })} accessibilityLabel={t('eventForm.isFree')} /><AppText>{t('eventForm.isFree')}</AppText></Row>
      {!form.isFree ? <TextField label={`${t('eventForm.priceMin')} (${COUNTRIES[country].currency})`} keyboardType="decimal-pad" value={form.price} onChangeText={(price) => setForm({ ...form, price })} error={errors.price ?? errors.priceMinMinor} /> : null}
      <Row>
        <Chip label={t('eventForm.registrationModes.none')} selected={form.registration === 'none'} onPress={() => setForm({ ...form, registration: 'none' })} />
        <Chip label={t('eventForm.registrationModes.free_registration')} selected={form.registration === 'free_registration'} onPress={() => setForm({ ...form, registration: 'free_registration' })} />
      </Row>
      {form.registration === 'free_registration' ? <TextField label={t('eventForm.capacity')} keyboardType="number-pad" value={form.capacity} onChangeText={(capacity) => setForm({ ...form, capacity })} error={errors.capacity} /> : null}
      <AppText variant="caption">{organizer.verification_status === 'verified' ? t('eventForm.publishVerifiedNote') : t('eventForm.publishReviewNote')}</AppText>
      <Button title={organizer.verification_status === 'verified' ? t('eventForm.publish') : t('eventForm.submitForReview')} loading={busy === 'publish'} onPress={() => void submit('publish')} />
      <Button title={t('eventForm.saveDraft')} variant="outline" loading={busy === 'save_draft'} onPress={() => void submit('save_draft')} />
    </Screen>
  );
}
