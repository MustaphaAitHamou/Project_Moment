import { resale } from '@tamurt/server';
import { createListingSchema } from '@tamurt/validation';
import { apiRoute, created, readJson, requireUser } from '@/lib/api';

export const POST = apiRoute(async (args) => {
  const user = await requireUser(args);
  const input = await readJson(args.request, createListingSchema);
  return created(await resale.createListing(args.ctx, user, input));
});
