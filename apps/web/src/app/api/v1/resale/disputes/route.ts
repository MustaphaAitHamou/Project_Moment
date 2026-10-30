import { resale } from '@tamurt/server';
import { disputeSchema } from '@tamurt/validation';
import { apiRoute, created, readJson, requireUser } from '@/lib/api';

export const POST = apiRoute(async (args) => {
  const user = await requireUser(args);
  const input = await readJson(args.request, disputeSchema);
  return created(await resale.openDispute(args.ctx, user, input));
});
