import { getEventById } from '@tamurt/api-client';
import { isoToLocalInput, isCountryCode, isCurrencyCode, COUNTRIES } from '@tamurt/core';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { EventForm, majorString, type EventFormState } from '@/components/organizer/event-form';
import { PageHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { requireViewer } from '@/lib/guards';
import { getMembership } from '@/lib/organizer';
import { getSupabase } from '@/lib/session';

export default async function EditEventPage({ params }: PageProps<'/[locale]/organizer/events/[eventId]/edit'>) {
  const { locale, eventId } = (await params) as { locale: AppLocale; eventId: string };
  setRequestLocale(locale);
  await requireViewer(locale, `/organizer/events/${eventId}/edit`);
  const event = /^[0-9a-f-]{36}$/i.test(eventId) ? await getEventById(await getSupabase(), eventId) : null;
  if (!event) notFound();
  const membership = await getMembership(event.organizer_id);
  if (!membership || !membership.can('manage_events')) notFound();
  const t = await getTranslations();
  const country = isCountryCode(event.country_code) ? event.country_code : 'FR';
  const currency = event.currency && isCurrencyCode(event.currency) ? event.currency : COUNTRIES[country].currency;
  const start = isoToLocalInput(event.starts_at, event.timezone);
  const end = event.ends_at ? isoToLocalInput(event.ends_at, event.timezone) : { date: '', time: '' };
  const accessibility = (event.accessibility ?? {}) as Record<string, unknown>;
  const initial: EventFormState = {
    title: event.title,
    summary: event.summary ?? '',
    description: event.description ?? '',
    categorySlug: event.category_slug,
    tags: (event.tags ?? []).join(', '),
    artistNames: [...event.artists].sort((a, b) => a.billing_order - b.billing_order).map((row) => row.artist?.name).filter(Boolean).join('\n'),
    countryCode: country,
    regionId: event.region_id ?? '',
    cityId: event.city_id,
    venueId: event.venue_id ?? '',
    locationName: event.location_name ?? '',
    addressLine: event.address_line ?? '',
    postalCode: event.postal_code ?? '',
    lat: event.lat?.toString() ?? '',
    lng: event.lng?.toString() ?? '',
    isOnline: event.is_online,
    onlineUrl: event.online_url ?? '',
    timezone: event.timezone,
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    isFree: event.is_free,
    priceMin: majorString(event.price_min_minor, currency),
    priceMax: majorString(event.price_max_minor, currency),
    currency,
    capacity: event.capacity?.toString() ?? '',
    registrationMode: event.registration_mode,
    accessibility: {
      wheelchair: accessibility.wheelchair === true,
      accessibleToilets: accessibility.accessibleToilets === true,
      hearingLoop: accessibility.hearingLoop === true,
      signLanguage: accessibility.signLanguage === true,
      quietSpace: accessibility.quietSpace === true,
      notes: typeof accessibility.notes === 'string' ? accessibility.notes : '',
    },
    entryConditions: event.entry_conditions ?? '',
    ageMin: event.age_min?.toString() ?? '',
    contactEmail: event.contact_email ?? '',
    contactPhone: event.contact_phone ?? '',
    officialLinks: (Array.isArray(event.official_links) ? event.official_links : []) as { label: string; url: string }[],
    cancellationPolicy: event.cancellation_policy ?? '',
    visibility: event.visibility,
  };
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader eyebrow={<Link href={`/organizer/events/${event.id}`} className="hover:underline">← {event.title}</Link>} title={t('eventForm.editTitle')} />
      <EventForm mode="edit" organizerId={event.organizer_id} eventId={event.id} initial={initial} verified={membership.organizer.verification_status === 'verified'} />
    </div>
  );
}
