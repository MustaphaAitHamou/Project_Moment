import { createTranslator } from 'use-intl';
import { getMessages, isLocale, type Locale } from '@tamurt/i18n';
import type { ServerContext } from '../context';
import { notificationEmail } from '../email/templates';

/**
 * Traitement de la file d'envoi (outbox) des notifications push et e-mail.
 * Les entrées ne sont créées par la base que si l'utilisateur y a consenti et jamais pour du
 * contenu de démonstration. Sans canal configuré, l'entrée est marquée « skipped ».
 */

export function renderNotification(
  locale: Locale,
  type: string,
  data: Record<string, unknown>,
  title: string | null,
  body: string | null,
): { title: string; body: string } {
  const t = createTranslator({ locale, messages: getMessages(locale) as unknown as Record<string, unknown> });
  const params = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, typeof value === 'string' || typeof value === 'number' ? value : String(value ?? '')]),
  );
  let text: string;
  try {
    text = t(`notifications.types.${type}` as never, params as never);
  } catch {
    text = type;
  }
  return { title: title ?? text, body: body ?? (title ? text : '') };
}

export async function processOutbox(ctx: ServerContext, limit = 100): Promise<{ sent: number; skipped: number; failed: number }> {
  const { data: rows, error } = await ctx.admin
    .from('notification_outbox')
    .select('id, channel, attempts, notification:notifications!inner(id, user_id, type, data, title, body, link, is_demo)')
    .eq('status', 'pending')
    .order('created_at')
    .limit(limit);
  if (error) throw error;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    const notification = row.notification;
    const mark = (status: 'sent' | 'skipped' | 'failed' | 'pending', lastError: string | null = null) =>
      ctx.admin
        .from('notification_outbox')
        .update({ status, last_error: lastError, attempts: row.attempts + 1, sent_at: status === 'sent' ? ctx.now().toISOString() : null })
        .eq('id', row.id);
    if (notification.is_demo) {
      await mark('skipped', 'demo_content');
      skipped += 1;
      continue;
    }
    const { data: profile } = await ctx.admin.from('profiles').select('locale').eq('id', notification.user_id).maybeSingle();
    const locale: Locale = isLocale(profile?.locale) ? profile.locale : 'fr';
    const rendered = renderNotification(
      locale,
      notification.type,
      (notification.data ?? {}) as Record<string, unknown>,
      notification.title,
      notification.body,
    );
    try {
      if (row.channel === 'push') {
        if (!ctx.push.enabled) {
          await mark('skipped', 'push_not_configured');
          skipped += 1;
          continue;
        }
        const { data: tokens } = await ctx.admin.from('device_push_tokens').select('token').eq('user_id', notification.user_id).is('revoked_at', null);
        const result = await ctx.push.send(
          (tokens ?? []).map((t) => ({ to: t.token, title: rendered.title, body: rendered.body, data: { link: notification.link } })),
        );
        if (result.invalidTokens.length) {
          await ctx.admin.from('device_push_tokens').update({ revoked_at: ctx.now().toISOString() }).in('token', result.invalidTokens);
        }
        await mark(result.sent > 0 ? 'sent' : 'skipped', result.sent > 0 ? null : 'no_active_device');
        if (result.sent > 0) sent += 1;
        else skipped += 1;
      } else {
        if (!ctx.email.enabled) {
          await mark('skipped', 'email_not_configured');
          skipped += 1;
          continue;
        }
        const { data: authUser } = await ctx.admin.auth.admin.getUserById(notification.user_id);
        const email = authUser.user?.email;
        if (!email) {
          await mark('skipped', 'no_email');
          skipped += 1;
          continue;
        }
        const url = `${ctx.env.APP_URL}/${locale}${notification.link ?? '/account/notifications'}`;
        const result = await ctx.email.send(notificationEmail(email, locale, rendered.title, rendered.body, url, 'Tamurt Events'));
        await mark(result.delivered ? 'sent' : 'skipped', result.delivered ? null : (result.reason ?? null));
        if (result.delivered) sent += 1;
        else skipped += 1;
      }
    } catch (sendError) {
      await mark(row.attempts + 1 >= 5 ? 'failed' : 'pending', (sendError as Error).message.slice(0, 300));
      failed += 1;
    }
  }
  return { sent, skipped, failed };
}
