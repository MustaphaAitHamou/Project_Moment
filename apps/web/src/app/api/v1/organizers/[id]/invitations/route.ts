import { toAppError } from '@tamurt/core';
import { enforceRateLimit, requireAppAccess } from '@tamurt/server';
import { organizerInvitationSchema, uuidSchema } from '@tamurt/validation';
import { apiRoute, created, parseWith, readJson, requireUser } from '@/lib/api';

/**
 * Invitation d'un membre dans une organisation. L'insertion passe par le client UTILISATEUR :
 * la RLS exige la permission « manage_team ». L'invité accepte depuis son compte (même e-mail).
 */
export const POST = apiRoute<{ id: string }>(async (args) => {
  const user = await requireUser(args);
  await requireAppAccess(args.ctx, user);
  await enforceRateLimit(args.ctx, `org-invite:${user.id}`, 20, 3600);
  const organizerId = parseWith(uuidSchema, args.params.id);
  const input = await readJson(args.request, organizerInvitationSchema);
  const { data, error } = await args.ctx
    .userClient(user.accessToken)
    .from('organizer_invitations')
    .insert({ organizer_id: organizerId, email: input.email, role: input.role, invited_by: user.id })
    .select('id')
    .single();
  if (error) throw toAppError(error);
  return created({ id: data.id });
});
