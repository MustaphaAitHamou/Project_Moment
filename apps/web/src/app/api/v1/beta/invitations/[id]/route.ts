import { beta } from '@tamurt/server';
import { uuidSchema } from '@tamurt/validation';
import { apiRoute, parseWith, requireUser } from '@/lib/api';

export const DELETE = apiRoute<{ id: string }>(async (args) => {
  const staff = await requireUser(args);
  await beta.revokeInvitation(args.ctx, staff, parseWith(uuidSchema, args.params.id));
  return { ok: true };
});
