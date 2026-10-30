import 'server-only';
import { searchEvents } from '@tamurt/api-client';
import { COUNTRIES, filtersToRpcArgs, isCountryCode, type CountryCode, type EventSearchFilters } from '@tamurt/core';
import { cookies, headers } from 'next/headers';
import { fromSearchResult, type EventCardData } from '@/components/events/event-data';
import type { AppLocale } from '@/i18n/routing';
import { getSupabase } from './session';

export const PAGE_SIZE = 18;

/**
 * Pays de navigation : paramètre d'URL > choix mémorisé > pays détecté par l'hébergeur
 * (en-tête Vercel, sans géolocalisation précise) > aucun (tous les pays).
 */
export async function preferredCountry(fromQuery?: string | null): Promise<CountryCode | null> {
  if (fromQuery === 'all') return null;
  const upper = fromQuery?.toUpperCase();
  if (upper && isCountryCode(upper)) return upper;
  const cookieValue = (await cookies()).get('TAMURT_COUNTRY')?.value;
  if (cookieValue === 'all') return null;
  if (cookieValue && isCountryCode(cookieValue)) return cookieValue;
  const geo = (await headers()).get('x-vercel-ip-country');
  return geo && isCountryCode(geo) ? geo : null;
}

export async function runSearch(
  filters: EventSearchFilters,
  locale: AppLocale,
  options: { pageSize?: number; includePast?: boolean; organizerId?: string; venueId?: string; artistId?: string } = {},
): Promise<{ items: EventCardData[]; total: number }> {
  const country = filters.country ?? null;
  const config = country ? COUNTRIES[country] : COUNTRIES.FR;
  const args = filtersToRpcArgs(filters, {
    now: new Date(),
    timeZone: config.defaultTimeZone,
    week: config.week,
    pageSize: options.pageSize ?? PAGE_SIZE,
  });
  const supabase = await getSupabase();
  const result = await searchEvents(supabase, {
    ...args,
    ...(options.includePast ? { p_include_past: true } : {}),
    ...(options.organizerId ? { p_organizer_id: options.organizerId } : {}),
    ...(options.venueId ? { p_venue_id: options.venueId } : {}),
    ...(options.artistId ? { p_artist_id: options.artistId } : {}),
  });
  return { items: result.items.map((row) => fromSearchResult(row, locale)), total: Number(result.total) };
}

/** Variante tolérante pour les sections secondaires (une erreur n'empêche pas la page). */
export async function safeSearch(...params: Parameters<typeof runSearch>) {
  try {
    return await runSearch(...params);
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', message: 'search_failed', error: (error as Error).message }));
    return { items: [], total: 0, failed: true as const };
  }
}
