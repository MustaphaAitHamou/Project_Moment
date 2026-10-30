import { resale } from '@tamurt/server';
import { uuidSchema } from '@tamurt/validation';
import { apiRoute, parseWith, requireUser } from '@/lib/api';

export const DELETE = apiRoute<{ id: string }>(async (args) => {
  const user = await requireUser(args);
  return resale.cancelListing(args.ctx, user, parseWith(uuidSchema, args.params.id));
});
