import { getVenueBySlug, publicStorageUrl } from '@tamurt/api-client';
import { formatAddress, isCountryCode } from '@tamurt/core';
import { ExternalLink, MapPin, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { EventGrid } from '@/components/events/event-card';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { nameOf } from '@/lib/format';
import { safeSearch } from '@/lib/search';
import { pageMetadata } from '@/lib/seo';
import { getSupabase } from '@/lib/session';

const loadVenue = cache(async (slug: string) => getVenueBySlug(await getSupabase(), slug));

export async function generateMetadata({ params }: PageProps<'/[locale]/venues/[slug]'>): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: AppLocale; slug: string };
  const venue = await loadVenue(slug).catch(() => null);
  if (!venue) return { robots: { index: false } };
  return pageMetadata({ locale, path: `/venues/${slug}`, title: `${venue.name} — ${nameOf(venue.city.names, locale)}`, description: venue.description?.slice(0, 160) ?? undefined, noindex: venue.is_demo });
}

export default async function VenuePage({ params }: PageProps<'/[locale]/venues/[slug]'>) {
  const { locale, slug } = (await params) as { locale: AppLocale; slug: string };
  setRequestLocale(locale);
  const venue = await loadVenue(slug);
  if (!venue) notFound();
  const t = await getTranslations();
  const country = isCountryCode(venue.city.country_code) ? venue.city.country_code : 'FR';
  const [upcoming, history] = await Promise.all([
    safeSearch({ categories: [], sort: 'date', page: 1 }, locale, { venueId: venue.id, pageSize: 12 }),
    safeSearch({ categories: [], sort: 'date', page: 1 }, locale, { venueId: venue.id, includePast: true, pageSize: 12 }),
  ]);
  const past = history.items.filter((item) => new Date(item.endsAt ?? item.startsAt) < new Date());
  const photos = venue.media.filter((media) => media.status === 'approved');
  const address = formatAddress({ line1: venue.address_line1, line2: venue.address_line2, postalCode: venue.postal_code, city: nameOf(venue.city.names, locale) }, country);
  const accessibility = (venue.accessibility ?? {}) as Record<string, unknown>;
  const accessible = (['wheelchair', 'accessibleToilets', 'hearingLoop', 'signLanguage', 'quietSpace'] as const).filter((key) => accessibility[key] === true);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

  return (
    <div className="container-page space-y-10 py-8">
      {venue.is_demo ? <Alert tone="demo">{t('event.demoBanner')}</Alert> : null}
      <PageHeader eyebrow={t('venue.title')} title={venue.name} subtitle={venue.description ?? undefined} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-2">
          <h2 className="flex items-center gap-2 font-bold"><MapPin className="h-4 w-4" aria-hidden />{t('venue.address')}</h2>
          <address className="text-sm not-italic text-muted">{address.map((line) => <span key={line} className="block">{line}</span>)}</address>
          <Link href={`/countries/${country.toLowerCase()}/${venue.city.slug}`} className="text-sm font-semibold text-primary hover:underline">{nameOf(venue.city.names, locale)}</Link>
          {venue.lat !== null && venue.lng !== null ? (
            <a href={`https://www.openstreetmap.org/?mlat=${venue.lat}&mlon=${venue.lng}#map=16/${venue.lat}/${venue.lng}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              OpenStreetMap <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : null}
        </Card>
        <Card className="space-y-2">
          <h2 className="flex items-center gap-2 font-bold"><Users className="h-4 w-4" aria-hidden />{t('venue.capacity')}</h2>
          <p className="text-sm text-muted">{venue.capacity ? t('event.capacity', { capacity: venue.capacity }) : t('common.notAvailable')}</p>
          {venue.practical_info ? (
            <>
              <h3 className="pt-2 font-semibold">{t('venue.practicalInfo')}</h3>
              <p className="whitespace-pre-line text-sm text-muted">{venue.practical_info}</p>
            </>
          ) : null}
        </Card>
        <Card className="space-y-2">
          <h2 className="font-bold">{t('venue.accessibility')}</h2>
          {accessible.length ? (
            <ul className="list-inside list-disc text-sm text-muted">{accessible.map((key) => <li key={key}>{t(`event.accessibilityItems.${key}`)}</li>)}</ul>
          ) : (
            <p className="text-sm text-muted">{t('event.noAccessibilityInfo')}</p>
          )}
        </Card>
      </div>
      <section>
        <SectionHeader title={t('venue.photos')} />
        {photos.length ? (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {photos.map((photo) => {
              const src = publicStorageUrl(base, 'venue-media', photo.storage_path);
              return src ? (
                <li key={photo.id} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-sunken">
                  <Image src={src} alt={photo.alt_text ?? venue.name} fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" />
                  {photo.credit ? <span className="absolute bottom-0 end-0 bg-black/60 px-1.5 py-0.5 text-[10px] text-white">© {photo.credit}{photo.license ? ` · ${photo.license}` : ''}</span> : null}
                </li>
              ) : null;
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t('venue.noPhotos')}</p>
        )}
      </section>
      <section>
        <SectionHeader title={t('venue.upcomingEvents')} />
        {upcoming.items.length ? <EventGrid events={upcoming.items} /> : <EmptyState title={t('organizer.noUpcoming')} />}
      </section>
      {past.length ? (
        <section>
          <SectionHeader title={t('venue.history')} />
          <EventGrid events={past} />
        </section>
      ) : null}
    </div>
  );
}
