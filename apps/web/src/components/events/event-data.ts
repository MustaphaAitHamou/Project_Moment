import type { SearchEventResult } from '@tamurt/types';
import { publicStorageUrl } from '@tamurt/api-client';
import { localizedName } from '@tamurt/i18n';
import type { AppLocale } from '@/i18n/routing';

/** Données minimales d'une carte d'événement, quelle que soit la source (recherche, favoris…). */
export interface EventCardData {
  id: string;
  slug: string;
  title: string;
  categorySlug: string;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  countryCode: string | null;
  cityName: string | null;
  venueName: string | null;
  isFree: boolean;
  priceMinMinor: number | null;
  priceMaxMinor: number | null;
  currency: string | null;
  isDemo: boolean;
  isSponsored: boolean;
  organizerName: string | null;
  organizerVerified: boolean;
  coverUrl: string | null;
  status: string;
  distanceKm: number | null;
}

export function coverUrlFor(coverPath: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? publicStorageUrl(base, 'event-media', coverPath) : null;
}

export function fromSearchResult(row: SearchEventResult, locale: AppLocale): EventCardData {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    categorySlug: row.category_slug,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timezone: row.timezone,
    countryCode: row.country_code,
    cityName: localizedName(row.city_names as Record<string, string>, locale),
    venueName: row.venue_name ?? row.location_name,
    isFree: row.is_free,
    priceMinMinor: row.price_min_minor,
    priceMaxMinor: row.price_max_minor,
    currency: row.currency,
    isDemo: row.is_demo,
    isSponsored: row.is_sponsored,
    organizerName: row.organizer_name,
    organizerVerified: row.organizer_verified,
    coverUrl: coverUrlFor(row.cover_path),
    status: row.status,
    distanceKm: row.distance_km,
  };
}

/** URL de l'affiche générative (servie avec un cache long). */
export function posterUrl(seed: string, category: string, ratio: 'card' | 'wide' = 'card'): string {
  return `/api/poster/${encodeURIComponent(seed)}?c=${encodeURIComponent(category)}${ratio === 'wide' ? '&r=wide' : ''}`;
}
