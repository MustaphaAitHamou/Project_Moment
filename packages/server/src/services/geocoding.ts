import { AppError } from '@tamurt/core';
import type { GeocodeQueryInput } from '@tamurt/validation';
import type { ServerContext } from '../context';
import { sha256Hex } from '../crypto';
import { enforceRateLimit } from '../reliability';

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
  postalCode: string | null;
  city: string | null;
}

/**
 * Géocodage via Nominatim (OpenStreetMap), gratuit, dans le respect de sa politique d'usage :
 * User-Agent identifiant l'application avec un contact, 1 requête/seconde maximum (globale),
 * cache de 30 jours, attribution « © OpenStreetMap contributors » affichée dans l'interface.
 * Désactivé tant que GEOCODING_CONTACT_EMAIL n'est pas configuré (placement manuel sur la carte).
 */
export async function geocode(
  ctx: ServerContext,
  input: GeocodeQueryInput,
  visitorKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GeocodeResult[]> {
  const normalized = input.q.trim().toLowerCase().replace(/\s+/g, ' ');
  const queryHash = sha256Hex(normalized);
  const cached = await ctx.admin
    .from('geocode_cache')
    .select('results, created_at')
    .eq('query_hash', queryHash)
    .eq('country_code', input.country)
    .maybeSingle();
  if (cached.data && new Date(cached.data.created_at).getTime() > ctx.now().getTime() - 30 * 86_400_000) {
    return cached.data.results as unknown as GeocodeResult[];
  }
  if (!ctx.env.GEOCODING_CONTACT_EMAIL) throw new AppError('geocoding_unavailable');
  await enforceRateLimit(ctx, `geocode-user:${visitorKey}`, 20, 3600);
  await enforceRateLimit(ctx, 'geocode-global', 1, 1);

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', input.q);
  url.searchParams.set('countrycodes', input.country.toLowerCase());
  url.searchParams.set('limit', '5');
  url.searchParams.set('addressdetails', '1');
  const response = await fetchImpl(url, {
    headers: {
      'user-agent': `TamurtEvents/0.1 (${ctx.env.GEOCODING_CONTACT_EMAIL})`,
      'accept-language': 'fr,en',
    },
  });
  if (!response.ok) throw new AppError('geocoding_unavailable');
  const payload = (await response.json()) as {
    display_name: string;
    lat: string;
    lon: string;
    address?: { postcode?: string; city?: string; town?: string; village?: string };
  }[];
  const results: GeocodeResult[] = payload.map((item) => ({
    label: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
    postalCode: item.address?.postcode ?? null,
    city: item.address?.city ?? item.address?.town ?? item.address?.village ?? null,
  }));
  await ctx.admin
    .from('geocode_cache')
    .upsert({ query_hash: queryHash, country_code: input.country, query: normalized, results: results as never, created_at: ctx.now().toISOString() });
  return results;
}
