import { checkout } from '@tamurt/server';
import { demoPaymentSchema, uuidSchema } from '@tamurt/validation';
import { apiRoute, parseWith, readJson, requireUser } from '@/lib/api';

/** Paiement SIMULÉ (démonstration) : aucun moyen de paiement réel n'est accepté ni stocké. */
export const POST = apiRoute<{ id: string }>(async (args) => {
  const user = await requireUser(args);
  const payment = await readJson(args.request, demoPaymentSchema);
  return checkout.payOrder(args.ctx, user, parseWith(uuidSchema, args.params.id), payment);
});
