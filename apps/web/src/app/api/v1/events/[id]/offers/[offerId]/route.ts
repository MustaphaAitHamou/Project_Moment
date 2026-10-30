import { events } from '@tamurt/server';
import { uuidSchema } from '@tamurt/validation';
import { apiRoute, parseWith, requireUser } from '@/lib/api';

export const DELETE = apiRoute<{ id: string; offerId: string }>(async (args) => {
  const user = await requireUser(args);
  await events.closeDemoOffer(args.ctx, user, parseWith(uuidSchema, args.params.id), parseWith(uuidSchema, args.params.offerId));
  return { ok: true };
});
