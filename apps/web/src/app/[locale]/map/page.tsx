import { COUNTRIES, EVENT_CATEGORY_SLUGS, type CountryCode } from '@tamurt/core';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EventGrid } from '@/components/events/event-card';
import { EventMap } from '@/components/map/event-map';
import { CountryChips } from '@/components/search/country-chips';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import type { AppLocale } from '@/i18n/routing';
import { mapStyleUrl } from '@/lib/env';
import { preferredCountry, safeSearch } from '@/lib/search';
import { pageMetadata } from '@/lib/seo';
import { firstParam } from '@/lib/utils';

export async function generateMetadata({ params }: PageProps<'/[locale]/map'>): Promise<Metadata> {
  const locale = (await params).locale as AppLocale;
  const t = await getTranslations({ locale, namespace: 'map' });
  return pageMetadata({ locale, path: '/map', title: t('title') });
}

function num(value: string | undefined, min: number, max: number): number | null {
  const n = Number(value);
  return value !== undefined && Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export default async function MapPage({ params, searchParams }: PageProps<'/[locale]/map'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const query = await searchParams;
  const t = await getTranslations();
  const country = await preferredCountry(firstParam(query.country));
  const lat = num(firstParam(query.lat), -90, 90);
  const lng = num(firstParam(query.lng), -180, 180);
  const zoom = num(firstParam(query.z), 1, 18);
  const config = country ? COUNTRIES[country as CountryCode].center : { lat: 35, lng: -30, zoom: 2 };
  const center = lat !== null && lng !== null ? { lat, lng, zoom: zoom ?? 13 } : config;
  const category = firstParam(query.category);
  const categories = category && (EVENT_CATEGORY_SLUGS as readonly string[]).includes(category) ? [category] : undefined;
  // Alternative accessible (et sans JavaScript) : liste des prochains événements de la zone.
  const list = await safeSearch({ categories: (categories ?? []) as never, sort: 'date', page: 1, ...(country ? { country } : {}) }, locale, { pageSize: 6 });
  return (
    <div className="container-page space-y-6 py-8">
      <PageHeader title={t('map.title')} />
      <CountryChips active={country} pathname="/map" />
      <EventMap center={center} styleUrl={mapStyleUrl} categories={categories} free={firstParam(query.free) === '1'} />
      <p className="text-xs text-subtle">{t('map.attribution')}</p>
      <section>
        <SectionHeader title={t('map.listView')} />
        <EventGrid events={list.items} />
      </section>
    </div>
  );
}
