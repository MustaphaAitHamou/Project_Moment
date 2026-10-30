import { checkout } from '@tamurt/server';
import { uuidSchema } from '@tamurt/validation';
import { apiRoute, parseWith, requireUser } from '@/lib/api';

export const GET = apiRoute<{ id: string }>(async (args) => {
  const user = await requireUser(args);
  return checkout.getReservation(args.ctx, user, parseWith(uuidSchema, args.params.id));
});

export const DELETE = apiRoute<{ id: string }>(async (args) => {
  const user = await requireUser(args);
  await checkout.releaseReservation(args.ctx, user, parseWith(uuidSchema, args.params.id));
  return { ok: true };
});
