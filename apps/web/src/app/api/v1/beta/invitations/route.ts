import { beta } from '@tamurt/server';
import { betaInvitationCreateSchema } from '@tamurt/validation';
import { apiRoute, created, readJson, requireUser } from '@/lib/api';

/** Création d'une invitation (équipe uniquement : vérifié par le service). */
export const POST = apiRoute(async (args) => {
  const staff = await requireUser(args);
  const input = await readJson(args.request, betaInvitationCreateSchema);
  return created(await beta.createInvitation(args.ctx, staff, input));
});
