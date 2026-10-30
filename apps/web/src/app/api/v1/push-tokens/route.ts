import { toAppError } from '@tamurt/core';
import { enforceRateLimit } from '@tamurt/server';
import { pushTokenSchema } from '@tamurt/validation';
import { z } from 'zod';
import { apiRoute, readJson, requireUser } from '@/lib/api';

/**
 * Enregistrement d'un jeton push (après consentement explicite sur l'appareil). Un jeton
 * n'appartient qu'à un seul compte : il est réattribué si l'appareil change d'utilisateur.
 */
export const POST = apiRoute(async (args) => {
  const user = await requireUser(args);
  await enforceRateLimit(args.ctx, `push-token:${user.id}`, 30, 3600);
  const input = await readJson(args.request, pushTokenSchema);
  const { error } = await args.ctx.admin.from('device_push_tokens').upsert(
    {
      user_id: user.id,
      token: input.token,
      platform: input.platform,
      device_name: input.deviceName ?? null,
      app_version: input.appVersion ?? null,
      last_seen_at: new Date().toISOString(),
      revoked_at: null,
    },
    { onConflict: 'token' },
  );
  if (error) throw toAppError(error);
  return { ok: true };
});

/** Révocation (déconnexion ou retrait du consentement). */
export const DELETE = apiRoute(async (args) => {
  const user = await requireUser(args);
  const { token } = await readJson(args.request, z.object({ token: z.string().min(10).max(400) }));
  const { error } = await args.ctx.admin
    .from('device_push_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token', token)
    .eq('user_id', user.id);
  if (error) throw toAppError(error);
  return { ok: true };
});
