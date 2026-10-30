import { resale } from '@tamurt/server';
import { uuidSchema } from '@tamurt/validation';
import { apiRoute, created, parseWith, requireIdempotencyKey, requireUser } from '@/lib/api';

export const POST = apiRoute<{ id: string }>(async (args) => {
  const user = await requireUser(args);
  const key = requireIdempotencyKey(args.request);
  return created(await resale.startPurchase(args.ctx, user, parseWith(uuidSchema, args.params.id), key));
});
