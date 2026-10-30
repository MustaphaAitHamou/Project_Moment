import { isDatePreset, resolveDatePreset, type DatePreset, type WeekConvention } from './calendar';
import { isCountryCode, type CountryCode } from './countries';
import { isDateKey, localDaysRange } from './dates';

/**
 * Filtres de recherche partagés (URL web, état mobile, arguments de la fonction SQL search_events).
 * L'analyse est tolérante : une valeur invalide est ignorée plutôt que de provoquer une erreur.
 */

export const SEARCH_SORTS = ['date', 'relevance', 'popularity', 'distance'] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export const EVENT_CATEGORY_SLUGS = [
  'concerts',
  'festivals',
  'shows',
  'theatre',
  'comedy',
  'conferences',
  'fairs',
  'exhibitions',
  'sports',
  'community',
  'culture',
  'family',
  'other',
] as const;
export type EventCategorySlug = (typeof EVENT_CATEGORY_SLUGS)[number];

export interface EventSearchFilters {
  q?: string;
  country?: CountryCode;
  city?: string;
  categories: EventCategorySlug[];
  date?: DatePreset | 'custom';
  from?: string;
  to?: string;
  free?: boolean;
  sort: SearchSort;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  page: number;
}

export const DEFAULT_SEARCH_FILTERS: EventSearchFilters = { categories: [], sort: 'date', page: 1 };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function getAll(source: ParamSource, key: string): string[] {
  if (source instanceof URLSearchParams) return source.getAll(key);
  const value = source[key];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function getOne(source: ParamSource, key: string): string | undefined {
  return getAll(source, key)[0];
}

function parseNumber(value: string | undefined, min: number, max: number): number | undefined {
  if (value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
}

export function parseSearchParams(source: ParamSource): EventSearchFilters {
  const filters: EventSearchFilters = { categories: [], sort: 'date', page: 1 };
  const q = getOne(source, 'q')?.trim();
  if (q) filters.q = q.slice(0, 120);
  const country = getOne(source, 'country')?.toUpperCase();
  if (isCountryCode(country)) filters.country = country;
  const city = getOne(source, 'city');
  if (city && UUID_RE.test(city)) filters.city = city.toLowerCase();
  const categories = getAll(source, 'category')
    .flatMap((value) => value.split(','))
    .filter((value): value is EventCategorySlug => (EVENT_CATEGORY_SLUGS as readonly string[]).includes(value));
  filters.categories = Array.from(new Set(categories));
  const date = getOne(source, 'date');
  if (isDatePreset(date)) filters.date = date;
  const from = getOne(source, 'from');
  const to = getOne(source, 'to');
  if (isDateKey(from)) {
    filters.from = from;
    filters.date = 'custom';
    if (isDateKey(to) && to >= from) filters.to = to;
  }
  const free = getOne(source, 'free');
  if (free === '1' || free === 'true') filters.free = true;
  const sort = getOne(source, 'sort');
  if (sort && (SEARCH_SORTS as readonly string[]).includes(sort)) filters.sort = sort as SearchSort;
  const lat = parseNumber(getOne(source, 'lat'), -90, 90);
  const lng = parseNumber(getOne(source, 'lng'), -180, 180);
  if (lat !== undefined && lng !== undefined) {
    filters.lat = lat;
    filters.lng = lng;
    const radius = parseNumber(getOne(source, 'radius'), 1, 500);
    if (radius !== undefined) filters.radiusKm = radius;
  }
  if (filters.sort === 'distance' && filters.lat === undefined) filters.sort = 'date';
  if (filters.sort === 'relevance' && !filters.q) filters.sort = 'date';
  const page = parseNumber(getOne(source, 'page'), 1, 500);
  if (page !== undefined) filters.page = Math.floor(page);
  return filters;
}

export function serializeSearchParams(filters: Partial<EventSearchFilters>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.country) params.set('country', filters.country);
  if (filters.city) params.set('city', filters.city);
  if (filters.categories?.length) params.set('category', filters.categories.join(','));
  if (filters.date && filters.date !== 'custom') params.set('date', filters.date);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.free) params.set('free', '1');
  if (filters.sort && filters.sort !== 'date') params.set('sort', filters.sort);
  if (filters.lat !== undefined && filters.lng !== undefined) {
    params.set('lat', filters.lat.toFixed(4));
    params.set('lng', filters.lng.toFixed(4));
    if (filters.radiusKm) params.set('radius', String(filters.radiusKm));
  }
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  return params;
}

export interface SearchRpcArgs {
  p_query?: string;
  p_country?: string;
  p_city_id?: string;
  p_categories?: string[];
  p_from?: string;
  p_to?: string;
  p_free?: boolean;
  p_lat?: number;
  p_lng?: number;
  p_radius_km?: number;
  p_sort: SearchSort;
  p_limit: number;
  p_offset: number;
}

export interface SearchContext {
  now: Date;
  /** Fuseau de référence pour les périodes (ex. celui de la ville choisie ou de l'utilisateur). */
  timeZone: string;
  week: WeekConvention;
  pageSize: number;
}

export function filtersToRpcArgs(filters: EventSearchFilters, ctx: SearchContext): SearchRpcArgs {
  const args: SearchRpcArgs = {
    p_sort: filters.sort,
    p_limit: ctx.pageSize,
    p_offset: (Math.max(filters.page, 1) - 1) * ctx.pageSize,
  };
  if (filters.q) args.p_query = filters.q;
  if (filters.country) args.p_country = filters.country;
  if (filters.city) args.p_city_id = filters.city;
  if (filters.categories.length) args.p_categories = filters.categories;
  if (filters.free) args.p_free = true;
  if (filters.lat !== undefined && filters.lng !== undefined) {
    args.p_lat = filters.lat;
    args.p_lng = filters.lng;
    if (filters.radiusKm) args.p_radius_km = filters.radiusKm;
  }
  if (filters.date && filters.date !== 'custom') {
    const range = resolveDatePreset(filters.date, ctx.now, ctx.timeZone, ctx.week);
    args.p_from = range.from.toISOString();
    args.p_to = range.to.toISOString();
  } else if (filters.from) {
    const range = localDaysRange(filters.from, filters.to ?? filters.from, ctx.timeZone);
    args.p_from = (range.start < ctx.now ? ctx.now : range.start).toISOString();
    args.p_to = range.end.toISOString();
  }
  return args;
}

export function countActiveFilters(filters: EventSearchFilters): number {
  let count = 0;
  if (filters.country) count += 1;
  if (filters.city) count += 1;
  count += filters.categories.length;
  if (filters.date) count += 1;
  if (filters.free) count += 1;
  if (filters.lat !== undefined) count += 1;
  return count;
}
