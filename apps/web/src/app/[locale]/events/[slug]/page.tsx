import { getEventBySlug, isFavorite, listEventAnnouncements, listPublicResaleListings, type EventDetail } from '@tamurt/api-client';
import { COUNTRIES, formatAddress, isCountryCode, offerSellability, type CountryCode } from '@tamurt/core';
import { BadgeCheck, CalendarClock, Clock, ExternalLink, Globe, Mail, MapPin, Megaphone, Phone, Repeat2, Users } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { OfferPicker, type OfferOption } from '@/components/checkout/offer-picker';
import { AddToCalendar } from '@/components/events/add-to-calendar';
import { CategoryIcon, categoryColor } from '@/components/events/category-icon';
import { EventGrid } from '@/components/events/event-card';
import { coverUrlFor } from '@/components/events/event-data';
import { EventPoster } from '@/components/events/event-poster';
import { FavoriteButton } from '@/components/events/favorite-button';
import { LocalTimeHint } from '@/components/events/local-time-hint';
import { RegisterBox } from '@/components/events/register-box';
import { ReportDialog } from '@/components/events/report-dialog';
import { ShareButton } from '@/components/events/share-button';
import { ViewTracker } from '@/components/events/view-tracker';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { dateTimeShort, eventRange, money, nameOf } from '@/lib/format';
import { safeSearch } from '@/lib/search';
import { absoluteUrl, pageMetadata } from '@/lib/seo';
import { getPublicConfig, getSupabase, getViewer } from '@/lib/session';

const loadEvent = cache(async (slug: string) => getEventBySlug(await getSupabase(), slug));

export async function generateMetadata({ params }: PageProps<'/[locale]/events/[slug]'>): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: AppLocale; slug: string };
  const event = await loadEvent(slug).catch(() => null);
  const t = await getTranslations({ locale, namespace: 'event' });
  if (!event) return { title: t('notFound'), robots: { index: false } };
  const city = nameOf(event.city.names, locale);
  return pageMetadata({
    locale,
    path: `/events/${event.slug}`,
    title: `${event.title} — ${city}`,
    description: event.summary ?? event.description?.slice(0, 160) ?? undefined,
    image: `/${locale}/events/${event.slug}/opengraph-image`,
    // Les événements fictifs et non publiés ne doivent jamais être indexés.
    noindex: event.is_demo || event.status !== 'published' || event.visibility !== 'public',
  });
}

function jsonLd(event: EventDetail, locale: AppLocale) {
  const country = event.city.country_code;
  const offers = event.offers.filter((offer) => offer.status === 'on_sale');
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.summary ?? undefined,
    startDate: event.starts_at,
    endDate: event.ends_at ?? undefined,
    eventStatus: event.status === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: event.is_online ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
    location: event.is_online
      ? { '@type': 'VirtualLocation', url: event.online_url ?? undefined }
      : {
          '@type': 'Place',
          name: event.venue?.name ?? event.location_name ?? nameOf(event.city.names, locale),
          address: { '@type': 'PostalAddress', streetAddress: event.venue?.address_line1 ?? event.address_line ?? undefined, postalCode: event.venue?.postal_code ?? event.postal_code ?? undefined, addressLocality: nameOf(event.city.names, locale), addressCountry: country },
        },
    organizer: { '@type': 'Organization', name: event.organizer.name, url: absoluteUrl(locale, `/organizers/${event.organizer.slug}`) },
    url: absoluteUrl(locale, `/events/${event.slug}`),
    ...(event.is_free
      ? { isAccessibleForFree: true }
      : offers.length
        ? { offers: offers.map((offer) => ({ '@type': 'Offer', name: offer.name, price: (offer.face_value_minor / 100).toFixed(2), priceCurrency: offer.currency, availability: 'https://schema.org/InStock', url: absoluteUrl(locale, `/events/${event.slug}`) })) }
        : {}),
  };
}

export default async function EventPage({ params }: PageProps<'/[locale]/events/[slug]'>) {
  const { locale, slug } = (await params) as { locale: AppLocale; slug: string };
  setRequestLocale(locale);
  const event = await loadEvent(slug);
  if (!event) notFound();

  const t = await getTranslations();
  const supabase = await getSupabase();
  const [viewer, settings] = await Promise.all([getViewer(), getPublicConfig()]);
  const returnTo = `/events/${event.slug}`;
  const country = (isCountryCode(event.city.country_code) ? event.city.country_code : 'FR') as CountryCode;
  const now = new Date();
  const isPast = new Date(event.ends_at ?? event.starts_at) < now;

  const [favorite, registration, announcements, resale, canManage, similar] = await Promise.all([
    viewer ? isFavorite(supabase, viewer.id, event.id).catch(() => false) : Promise.resolve(false),
    viewer
      ? supabase.from('event_registrations').select('status').eq('event_id', event.id).eq('user_id', viewer.id).maybeSingle().then((r) => r.data?.status === 'registered')
      : Promise.resolve(false),
    viewer ? listEventAnnouncements(supabase, event.id).catch(() => []) : Promise.resolve([]),
    listPublicResaleListings(supabase, event.id, 1).catch(() => ({ items: [], total: 0 })),
    viewer ? supabase.rpc('can_manage_event', { p_event_id: event.id }).then((r) => r.data === true) : Promise.resolve(false),
    safeSearch({ categories: [event.category_slug as never], sort: 'date', page: 1, country }, locale, { pageSize: 4 }),
  ]);

  const offers: OfferOption[] = [...event.offers]
    .filter((offer) => offer.status !== 'draft')
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((offer) => ({
      id: offer.id,
      name: offer.name,
      description: offer.description,
      currency: offer.currency,
      faceValueMinor: offer.face_value_minor,
      providerFeeMinor: offer.provider_fee_minor,
      available: offer.available_estimate,
      minPerOrder: offer.min_per_order,
      maxPerOrder: offer.max_per_order,
      reason: offerSellability(offer, event, now),
      environment: offer.environment,
    }));

  const venueAddress = event.venue
    ? formatAddress({ line1: event.venue.address_line1, line2: event.venue.address_line2, postalCode: event.venue.postal_code, city: nameOf(event.city.names, locale) }, country)
    : formatAddress({ line1: event.address_line, postalCode: event.postal_code, city: nameOf(event.city.names, locale) }, country);
  const lat = event.venue?.lat ?? event.lat;
  const lng = event.venue?.lng ?? event.lng;
  const accessibility = (event.accessibility ?? {}) as Record<string, boolean | string | undefined>;
  const accessibilityItems = (['wheelchair', 'accessibleToilets', 'hearingLoop', 'signLanguage', 'quietSpace'] as const).filter((key) => accessibility[key] === true);
  const officialLinks = (Array.isArray(event.official_links) ? event.official_links : []) as { label: string; url: string }[];
  const spotsLeft = event.capacity ? Math.max(0, event.capacity - event.registrations_count) : null;
  const coverUrl = event.cover_status === 'approved' ? coverUrlFor(event.cover_path) : null;
  const upcomingSessions = event.sessions.filter((session) => new Date(session.starts_at) > now && session.status !== 'cancelled').sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const calendarInput = {
    uid: `${event.id}@tamurt.events`,
    title: event.title,
    description: event.summary,
    location: [event.venue?.name ?? event.location_name, ...venueAddress].filter(Boolean).join(', '),
    url: absoluteUrl(locale, `/events/${event.slug}`),
    start: new Date(event.starts_at),
    end: event.ends_at ? new Date(event.ends_at) : null,
  };

  return (
    <article className="pb-12">
      {event.is_demo || event.status !== 'published' ? null : (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(event, locale)).replace(/</g, '\\u003c') }} />
      )}
      {event.status === 'published' ? <ViewTracker eventId={event.id} /> : null}

      <div className="relative">
        <EventPoster slug={event.slug} category={event.category_slug} coverUrl={coverUrl} alt={event.title} ratio="wide" priority sizes="100vw" className="h-56 sm:h-72 lg:h-96" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/10 to-transparent" aria-hidden />
      </div>

      <div className="container-page relative -mt-20 sm:-mt-28">
        <div className="space-y-3">
          {event.is_demo ? <Alert tone="demo">{t('event.demoBanner')}</Alert> : null}
          {event.status === 'cancelled' ? (
            <Alert tone="danger" title={t('event.cancelledBanner')}>{event.cancellation_reason ? t('event.cancelledReason', { reason: event.cancellation_reason }) : null}</Alert>
          ) : null}
          {event.status === 'pending_review' ? <Alert tone="warning">{t('event.pendingBanner')}</Alert> : null}
          {event.status === 'draft' ? <Alert tone="info">{t('event.draftBanner')}</Alert> : null}
          {event.status === 'rejected' ? <Alert tone="danger">{t('event.rejectedBanner')}</Alert> : null}
          {isPast && event.status !== 'cancelled' ? <Alert tone="info">{t('event.pastBanner')}</Alert> : null}
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0 space-y-8">
            <header className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/categories/${event.category_slug}`} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-white" style={{ backgroundColor: categoryColor(event.category_slug) }}>
                  <CategoryIcon slug={event.category_slug} className="h-4 w-4" />
                  {t(`categories.${event.category_slug}` as 'categories.other')}
                </Link>
                {event.is_demo ? <Badge tone="demo">{t('app.demoBadge')}</Badge> : null}
                {event.is_sponsored ? <Badge tone="accent">{t('app.sponsored')}</Badge> : null}
              </div>
              <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">{event.title}</h1>
              {event.summary ? <p className="text-lg text-muted">{event.summary}</p> : null}
              <Link href={`/organizers/${event.organizer.slug}`} className="inline-flex items-center gap-2 font-semibold hover:underline">
                <span className="text-muted">{t('event.organizer')} :</span> {event.organizer.name}
                {event.organizer.verification_status === 'verified' ? <BadgeCheck className="h-5 w-5 text-info" aria-label={t('app.verifiedOrganizer')} /> : null}
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <FavoriteButton eventId={event.id} initial={favorite} signedIn={Boolean(viewer)} returnTo={returnTo} />
                <ShareButton eventId={event.id} title={event.title} url={absoluteUrl(locale, returnTo)} />
                {event.status !== 'cancelled' && !isPast ? <AddToCalendar slug={event.slug} locale={locale} event={calendarInput} /> : null}
                {canManage ? <Link href={`/organizer/events/${event.id}`} className={buttonClasses({ variant: 'soft', size: 'md' })}>{t('nav.organizer')}</Link> : null}
              </div>
            </header>

            <section className="grid gap-4 sm:grid-cols-2">
              <Card className="space-y-2">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-subtle"><Clock className="h-4 w-4" aria-hidden />{t('event.dateTime')}</h2>
                <p className="font-semibold">{eventRange(event.starts_at, event.ends_at, event.timezone, locale, country)}</p>
                <p className="text-xs text-subtle">{t('dates.localTimeCity', { timezone: event.timezone })}</p>
                <LocalTimeHint startsAt={event.starts_at} eventTimeZone={event.timezone} />
              </Card>
              <Card className="space-y-2">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-subtle"><MapPin className="h-4 w-4" aria-hidden />{t('event.location')}</h2>
                {event.is_online ? (
                  <p className="flex items-center gap-2 font-semibold"><Globe className="h-4 w-4" aria-hidden />{t('event.online')}</p>
                ) : (
                  <>
                    {event.venue ? (
                      <Link href={`/venues/${event.venue.slug}`} className="font-semibold hover:underline">{event.venue.name}</Link>
                    ) : event.location_name ? (
                      <p className="font-semibold">{event.location_name}</p>
                    ) : null}
                    <address className="text-sm not-italic text-muted">{venueAddress.map((line) => <span key={line} className="block">{line}</span>)}</address>
                    <p className="text-sm text-muted">{t(`countries.${country}`)}</p>
                    {lat !== null && lat !== undefined && lng !== null && lng !== undefined ? (
                      <div className="flex flex-wrap gap-3 pt-1 text-sm font-semibold">
                        <Link href={{ pathname: '/map', query: { lat: String(lat), lng: String(lng), z: '14' } }} className="text-primary hover:underline">{t('event.viewOnMap')}</Link>
                        <a href={`https://www.openstreetmap.org/directions?to=${lat}%2C${lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          {t('event.directions')} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </a>
                      </div>
                    ) : null}
                  </>
                )}
              </Card>
            </section>

            {upcomingSessions.length ? (
              <section>
                <SectionHeader title={t('event.sessions')} />
                <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                  {upcomingSessions.map((session) => (
                    <li key={session.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <CalendarClock className="h-4 w-4 text-subtle" aria-hidden />
                      <span className="font-medium">{eventRange(session.starts_at, session.ends_at, event.timezone, locale, country)}</span>
                      {session.note ? <span className="text-muted">— {session.note}</span> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {event.description ? (
              <section>
                <SectionHeader title={t('event.about')} />
                <div className="prose-tm text-fg">
                  {event.description.split(/\n{2,}/).map((paragraph, index) => <p key={index} className="whitespace-pre-line">{paragraph}</p>)}
                </div>
              </section>
            ) : null}

            {event.artists.length ? (
              <section>
                <SectionHeader title={t('event.artists')} />
                <ul className="flex flex-wrap gap-2">
                  {[...event.artists].sort((a, b) => a.billing_order - b.billing_order).map(({ artist }) =>
                    artist ? (
                      <li key={artist.id}>
                        <Link href={`/artists/${artist.slug}`} className="inline-flex rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold hover:bg-sunken">{artist.name}</Link>
                      </li>
                    ) : null,
                  )}
                </ul>
              </section>
            ) : null}

            {announcements.length ? (
              <section>
                <SectionHeader title={t('event.announcements')} />
                <ul className="space-y-3">
                  {announcements.map((announcement) => (
                    <li key={announcement.id} className="rounded-xl border border-line bg-surface p-4">
                      <p className="flex items-center gap-2 font-semibold"><Megaphone className="h-4 w-4 text-primary" aria-hidden />{announcement.title}</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-muted">{announcement.body}</p>
                      <p className="mt-2 text-xs text-subtle">{dateTimeShort(announcement.created_at, locale, event.timezone)}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="grid gap-4 sm:grid-cols-2">
              <Card className="space-y-2">
                <h2 className="font-bold">{t('event.accessibility')}</h2>
                {accessibilityItems.length ? (
                  <ul className="list-inside list-disc text-sm text-muted">
                    {accessibilityItems.map((key) => <li key={key}>{t(`event.accessibilityItems.${key}`)}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">{t('event.noAccessibilityInfo')}</p>
                )}
                {typeof accessibility.notes === 'string' && accessibility.notes ? <p className="text-sm text-muted">{accessibility.notes}</p> : null}
              </Card>
              <Card className="space-y-2 text-sm">
                <h2 className="font-bold">{t('event.entryConditions')}</h2>
                {event.age_min ? <p>{t('event.ageMin', { age: event.age_min })}</p> : null}
                {event.capacity ? <p className="flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden />{t('event.capacity', { capacity: event.capacity })}</p> : null}
                {event.entry_conditions ? <p className="whitespace-pre-line text-muted">{event.entry_conditions}</p> : null}
                {event.cancellation_policy ? (
                  <>
                    <h3 className="pt-2 font-semibold">{t('event.cancellationPolicy')}</h3>
                    <p className="whitespace-pre-line text-muted">{event.cancellation_policy}</p>
                  </>
                ) : null}
                {event.contact_email || event.contact_phone ? (
                  <>
                    <h3 className="pt-2 font-semibold">{t('event.contact')}</h3>
                    {event.contact_email ? <a href={`mailto:${event.contact_email}`} className="flex items-center gap-1.5 text-primary hover:underline"><Mail className="h-4 w-4" aria-hidden />{event.contact_email}</a> : null}
                    {event.contact_phone ? <a href={`tel:${event.contact_phone}`} className="flex items-center gap-1.5 text-primary hover:underline"><Phone className="h-4 w-4" aria-hidden />{event.contact_phone}</a> : null}
                  </>
                ) : null}
              </Card>
            </section>

            {officialLinks.length ? (
              <section>
                <SectionHeader title={t('event.officialLinks')} />
                <ul className="flex flex-wrap gap-2">
                  {officialLinks.map((link) => (
                    <li key={link.url}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold hover:bg-sunken">
                        {link.label} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="flex justify-end">
              <ReportDialog eventId={event.id} signedIn={Boolean(viewer)} returnTo={returnTo} />
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="space-y-4">
              <h2 className="font-display text-xl font-bold">{event.registration_mode === 'tickets' ? t('event.tickets') : t('event.price')}</h2>
              {event.status === 'cancelled' || isPast ? (
                <p className="text-sm text-muted">{t('event.ticketsUnavailable')}</p>
              ) : event.registration_mode === 'tickets' && offers.length ? (
                <>
                  <OfferPicker offers={offers} country={country} signedIn={Boolean(viewer)} hasAccess={Boolean(viewer?.hasAppAccess)} returnTo={returnTo} maxPerOrder={settings.commerce?.max_tickets_per_order ?? 10} />
                  {offers.some((offer) => offer.environment === 'demo') ? <p className="text-xs text-subtle">{t('checkout.liveDisabled')}</p> : null}
                </>
              ) : event.registration_mode === 'free_registration' ? (
                <>
                  <p className="font-semibold text-success">{t('event.free')}</p>
                  <RegisterBox eventId={event.id} registered={registration} signedIn={Boolean(viewer)} spotsLeft={spotsLeft} returnTo={returnTo} />
                </>
              ) : (
                <>
                  <p className="font-semibold">
                    {event.is_free
                      ? t('event.free')
                      : event.price_min_minor !== null && event.currency
                        ? event.price_max_minor && event.price_max_minor !== event.price_min_minor
                          ? t('common.priceRange', { min: money(event.price_min_minor, event.currency, locale, country), max: money(event.price_max_minor, event.currency, locale, country) })
                          : money(event.price_min_minor, event.currency, locale, country)
                        : t('common.notAvailable')}
                  </p>
                  <p className="text-sm text-muted">{t('event.externalInfoOnly')}</p>
                </>
              )}
            </Card>
            {resale.total > 0 ? (
              <Link href={{ pathname: '/resale', query: { event: event.id } }} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 font-semibold hover:bg-sunken">
                <Repeat2 className="h-5 w-5 text-primary" aria-hidden />
                {t('event.resaleAvailable', { count: Number(resale.total) })}
              </Link>
            ) : null}
            <p className="px-1 text-xs text-subtle">{COUNTRIES[country].taxDisplay === 'inclusive' ? t('checkout.pricesInclusive') : t('checkout.pricesExclusive')}</p>
          </aside>
        </div>

        {similar.items.filter((item) => item.id !== event.id).length ? (
          <section className="mt-12">
            <SectionHeader title={t('event.similarEvents')} />
            <EventGrid events={similar.items.filter((item) => item.id !== event.id).slice(0, 3)} />
          </section>
        ) : null}
      </div>
    </article>
  );
}
