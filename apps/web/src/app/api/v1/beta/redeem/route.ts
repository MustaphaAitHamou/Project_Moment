import { beta } from '@tamurt/server';
import { betaRedeemSchema } from '@tamurt/validation';
import { apiRoute, readJson, requireUser } from '@/lib/api';

export const POST = apiRoute(async (args) => {
  const user = await requireUser(args);
  const { code } = await readJson(args.request, betaRedeemSchema);
  return beta.redeemInvitation(args.ctx, user, code);
});
