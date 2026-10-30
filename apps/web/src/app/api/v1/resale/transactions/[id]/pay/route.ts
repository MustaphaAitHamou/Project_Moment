import { resale } from '@tamurt/server';
import { demoPaymentSchema, uuidSchema } from '@tamurt/validation';
import { apiRoute, parseWith, readJson, requireUser } from '@/lib/api';

export const POST = apiRoute<{ id: string }>(async (args) => {
  const user = await requireUser(args);
  const payment = await readJson(args.request, demoPaymentSchema);
  return resale.payPurchase(args.ctx, user, parseWith(uuidSchema, args.params.id), payment);
});
