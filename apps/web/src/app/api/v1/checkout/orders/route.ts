import { checkout } from '@tamurt/server';
import { createOrderSchema } from '@tamurt/validation';
import { apiRoute, created, readJson, requireIdempotencyKey, requireUser } from '@/lib/api';

export const POST = apiRoute(async (args) => {
  const user = await requireUser(args);
  const key = requireIdempotencyKey(args.request);
  const { reservationId } = await readJson(args.request, createOrderSchema);
  return created(await checkout.createOrder(args.ctx, user, reservationId, key));
});
