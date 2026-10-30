import { beta } from '@tamurt/server';
import { z } from 'zod';
import { apiRoute, readJson } from '@/lib/api';

export const POST = apiRoute(async ({ ctx, request }) => {
  const { token } = await readJson(request, z.object({ token: z.string().min(16).max(128) }));
  return { verified: await beta.verifyWaitlistEmail(ctx, token) };
});
