import { events } from '@tamurt/server';
import { organizerProfileSchema } from '@tamurt/validation';
import { apiRoute, created, readJson, requireUser } from '@/lib/api';

export const POST = apiRoute(async (args) => {
  const user = await requireUser(args);
  const input = await readJson(args.request, organizerProfileSchema);
  return created(await events.createOrganizer(args.ctx, user, input));
});
