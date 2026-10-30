import { geocoding } from '@tamurt/server';
import { geocodeQuerySchema } from '@tamurt/validation';
import { apiRoute, parseWith, requireUser } from '@/lib/api';

/** Géocodage (Nominatim/OpenStreetMap) réservé aux utilisateurs connectés : cache + 1 requête/s. */
export const GET = apiRoute(async (args) => {
  const user = await requireUser(args);
  const input = parseWith(geocodeQuerySchema, {
    q: args.request.nextUrl.searchParams.get('q') ?? '',
    country: args.request.nextUrl.searchParams.get('country') ?? undefined,
  });
  return { results: await geocoding.geocode(args.ctx, input, user.id) };
});
