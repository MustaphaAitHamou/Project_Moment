import { beta } from '@tamurt/server';
import { betaWaitlistSchema } from '@tamurt/validation';
import { apiRoute, clientIp, created, readJson } from '@/lib/api';

/** Inscription à la liste d'attente (double opt-in par e-mail, limitée par IP et par adresse). */
export const POST = apiRoute(async ({ ctx, request }) => {
  const input = await readJson(request, betaWaitlistSchema);
  return created(await beta.joinWaitlist(ctx, input, { ip: clientIp(request), source: request.headers.get('x-tamurt-source') ?? 'web' }));
});
