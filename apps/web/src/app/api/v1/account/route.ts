import { account } from '@tamurt/server';
import { deleteAccountSchema } from '@tamurt/validation';
import { apiRoute, readJson, requireUser } from '@/lib/api';

/** Suppression du compte (confirmation par mot de passe ; données anonymisées par le service). */
export const DELETE = apiRoute(async (args) => {
  const user = await requireUser(args);
  const { password } = await readJson(args.request, deleteAccountSchema);
  await account.deleteAccount(args.ctx, user, password);
  return { ok: true };
});
