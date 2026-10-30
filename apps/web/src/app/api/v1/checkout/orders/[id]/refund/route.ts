import { checkout } from '@tamurt/server';
import { uuidSchema } from '@tamurt/validation';
import { apiRoute, parseWith, requireUser } from '@/lib/api';

export const POST = apiRoute<{ id: string }>(async (args) => {
  const user = await requireUser(args);
  return checkout.refundDemoOrder(args.ctx, user, parseWith(uuidSchema, args.params.id));
});
