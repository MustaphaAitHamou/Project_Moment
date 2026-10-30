import { toAppError } from '@tamurt/core';
import { enforceRateLimit } from '@tamurt/server';
import { betaFeedbackSchema } from '@tamurt/validation';
import { apiRoute, created, readJson, requireUser } from '@/lib/api';

/** Retours des bêta-testeurs (la RLS réserve l'envoi aux testeurs et à l'équipe). */
export const POST = apiRoute(async (args) => {
  const user = await requireUser(args);
  await enforceRateLimit(args.ctx, `beta-feedback:${user.id}`, 20, 3600);
  const input = await readJson(args.request, betaFeedbackSchema);
  const { data, error } = await args.ctx
    .userClient(user.accessToken)
    .from('beta_feedback')
    .insert({
      user_id: user.id,
      kind: input.kind,
      title: input.title ?? null,
      message: input.message ?? null,
      rating: input.rating ?? null,
      platform: input.platform,
      app_version: input.appVersion ?? null,
      screen: input.screen ?? null,
      device_info: input.deviceInfo ?? {},
    })
    .select('id')
    .single();
  if (error) throw toAppError(error);
  return created({ id: data.id });
});
