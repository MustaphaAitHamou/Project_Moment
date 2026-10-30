import { events } from '@tamurt/server';
import { demoOfferSchema, uuidSchema } from '@tamurt/validation';
import { apiRoute, created, parseWith, readJson, requireUser } from '@/lib/api';

/** Ajout d'une offre du fournisseur FICTIF (démonstration uniquement). */
export const POST = apiRoute<{ id: string }>(async (args) => {
  const user = await requireUser(args);
  const input = await readJson(args.request, demoOfferSchema);
  return created(await events.addDemoOffer(args.ctx, user, parseWith(uuidSchema, args.params.id), input));
});
