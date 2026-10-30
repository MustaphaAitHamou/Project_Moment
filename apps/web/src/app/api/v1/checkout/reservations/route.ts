import { checkout } from '@tamurt/server';
import { createReservationSchema } from '@tamurt/validation';
import { apiRoute, created, readJson, requireIdempotencyKey, requireUser } from '@/lib/api';

export const POST = apiRoute(async (args) => {
  const user = await requireUser(args);
  const key = requireIdempotencyKey(args.request);
  const input = await readJson(args.request, createReservationSchema);
  return created(await checkout.createReservation(args.ctx, user, input, key));
});
