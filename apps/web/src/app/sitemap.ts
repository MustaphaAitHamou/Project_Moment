import { COUNTRY_CODES, EVENT_CATEGORY_SLUGS } from '@tamurt/core';
import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { isIndexable } from '@/lib/env';
import { absoluteUrl } from '@/lib/seo';
import { createSupabasePublicClient } from '@/lib/supabase/public';

export const revalidate = 3600;

function localized(path: string, lastModified?: string, priority = 0.5): MetadataRoute.Sitemap[number] {
  const languages = Object.fromEntries(routing.locales.map((locale) => [locale, absoluteUrl(locale, path)]));
  return { url: absoluteUrl(routing.defaultLocale, path), lastModified, priority, alternates: { languages } };
}

/**
 * Plan du site multilingue. Les contenus FICTIFS de démonstration et les pages privées en sont
 * exclus ; seuls les événements publics publiés d'organisateurs réels y figurent.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexable()) return [];
  const entries: MetadataRoute.Sitemap = [
    localized('/', undefined, 1),
    localized('/search', undefined, 0.6),
    localized('/agenda', undefined, 0.7),
    localized('/map', undefined, 0.5),
    localized('/beta', undefined, 0.4),
    localized('/support', undefined, 0.3),
    ...EVENT_CATEGORY_SLUGS.map((slug) => localized(`/categories/${slug}`, undefined, 0.6)),
    ...COUNTRY_CODES.map((code) => localized(`/countries/${code.toLowerCase()}`, undefined, 0.7)),
  ];
  try {
    const supabase = createSupabasePublicClient();
    const [events, cities, organizers, venues] = await Promise.all([
      supabase.from('events').select('slug, updated_at').eq('status', 'published').eq('visibility', 'public').eq('is_demo', false).is('deleted_at', null).gte('starts_at', new Date(Date.now() - 30 * 86_400_000).toISOString()).limit(5000),
      supabase.from('cities').select('slug, country_code'),
      supabase.from('organizer_profiles').select('slug, updated_at').eq('is_demo', false).is('deleted_at', null).limit(5000),
      supabase.from('venues').select('slug, updated_at').eq('is_demo', false).is('deleted_at', null).limit(5000),
    ]);
    entries.push(...(cities.data ?? []).map((city) => localized(`/countries/${city.country_code.toLowerCase()}/${city.slug}`, undefined, 0.6)));
    entries.push(...(events.data ?? []).map((event) => localized(`/events/${event.slug}`, event.updated_at, 0.8)));
    entries.push(...(organizers.data ?? []).map((organizer) => localized(`/organizers/${organizer.slug}`, organizer.updated_at, 0.5)));
    entries.push(...(venues.data ?? []).map((venue) => localized(`/venues/${venue.slug}`, venue.updated_at, 0.4)));
  } catch {
    // Base injoignable (ex. construction en CI) : plan du site limité aux pages statiques.
  }
  return entries;
}
