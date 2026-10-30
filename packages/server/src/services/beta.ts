import { AppError, generateInvitationCode, normalizeInvitationCode, toAppError } from '@tamurt/core';
import type { Locale } from '@tamurt/i18n';
import type { BetaInvitationCreateInput, BetaWaitlistInput } from '@tamurt/validation';
import { requireStaff, type AuthUser, type ServerContext } from '../context';
import { hmacSha256Hex, randomToken, sha256Hex } from '../crypto';
import { unwrap, unwrapMaybe } from '../db';
import { betaInvitationEmail, betaVerificationEmail } from '../email/templates';
import { enforceRateLimit } from '../reliability';

/**
 * Programme Tamurt Beta. Les réponses publiques ne révèlent jamais si une adresse est déjà inscrite.
 * Les codes d'invitation ne sont stockés que sous forme d'empreinte HMAC.
 */

export function invitationCodeHash(secret: string, code: string): string {
  return hmacSha256Hex(secret, `beta-invite:${normalizeInvitationCode(code)}`);
}

export async function joinWaitlist(
  ctx: ServerContext,
  input: BetaWaitlistInput,
  meta: { ip: string; source?: string },
): Promise<{ emailSent: boolean; emailConfigured: boolean }> {
  await enforceRateLimit(ctx, `beta-join-ip:${meta.ip}`, 5, 3600);
  await enforceRateLimit(ctx, `beta-join-email:${sha256Hex(input.email)}`, 3, 3600);

  const token = randomToken(24);
  const existing = unwrapMaybe(
    await ctx.admin.from('beta_waitlist').select('id, status').eq('email', input.email).maybeSingle(),
  );
  if (existing && existing.status !== 'pending_verification') {
    // Déjà vérifiée / invitée : réponse identique, sans renvoi d'e-mail.
    return { emailSent: false, emailConfigured: ctx.email.enabled };
  }
  if (existing) {
    unwrap(
      await ctx.admin
        .from('beta_waitlist')
        .update({ verification_token_hash: sha256Hex(token), verification_sent_at: ctx.now().toISOString() })
        .eq('id', existing.id)
        .select('id')
        .single(),
    );
  } else {
    const inserted = await ctx.admin.from('beta_waitlist').insert({
      email: input.email,
      full_name: input.fullName,
      country_code: input.countryCode,
      platforms: input.platforms,
      social_handle: input.socialHandle ?? null,
      motivation: input.motivation ?? null,
      locale: input.locale,
      consent_at: ctx.now().toISOString(),
      verification_token_hash: sha256Hex(token),
      verification_sent_at: ctx.now().toISOString(),
      source: meta.source ?? null,
    });
    if (inserted.error && inserted.error.code !== '23505') throw toAppError(inserted.error);
  }
  const verifyUrl = `${ctx.env.APP_URL}/${input.locale}/beta/verify?token=${encodeURIComponent(token)}`;
  const delivery = await ctx.email.send(betaVerificationEmail(input.email, input.locale, verifyUrl));
  return { emailSent: delivery.delivered, emailConfigured: ctx.email.enabled };
}

export async function verifyWaitlistEmail(ctx: ServerContext, token: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return false;
  const { data } = await ctx.admin
    .from('beta_waitlist')
    .update({ status: 'verified', verified_at: ctx.now().toISOString(), verification_token_hash: null })
    .eq('verification_token_hash', sha256Hex(token))
    .eq('status', 'pending_verification')
    .gte('verification_sent_at', new Date(ctx.now().getTime() - 7 * 86_400_000).toISOString())
    .select('id');
  return (data ?? []).length === 1;
}

export interface CreatedInvitation {
  id: string;
  code: string;
  email: string | null;
  expiresAt: string;
  emailSent: boolean;
}

export async function createInvitation(ctx: ServerContext, staff: AuthUser, input: BetaInvitationCreateInput): Promise<CreatedInvitation> {
  requireStaff(staff);
  let email = input.email ?? null;
  let locale: Locale = 'fr';
  if (input.waitlistId) {
    const entry = unwrap(
      await ctx.admin.from('beta_waitlist').select('id, email, locale, status').eq('id', input.waitlistId).maybeSingle(),
    );
    if (entry.status === 'removed') throw new AppError('conflict', 'entrée retirée de la liste');
    email = entry.email;
    locale = (entry.locale as Locale) ?? 'fr';
  }
  const code = generateInvitationCode();
  const expiresAt = new Date(ctx.now().getTime() + input.expiresInDays * 86_400_000).toISOString();
  const invitation = unwrap(
    await ctx.admin
      .from('beta_invitations')
      .insert({
        waitlist_id: input.waitlistId ?? null,
        email,
        code_hash: invitationCodeHash(ctx.env.TAMURT_SERVER_SECRET, code),
        code_hint: code.slice(-4),
        note: input.note ?? null,
        created_by: staff.id,
        expires_at: expiresAt,
      })
      .select('id')
      .single(),
  );
  if (input.waitlistId) {
    await ctx.admin.from('beta_waitlist').update({ status: 'invited' }).eq('id', input.waitlistId).in('status', ['pending_verification', 'verified']);
  }
  let emailSent = false;
  if (email) {
    const redeemUrl = `${ctx.env.APP_URL}/${locale}/beta/redeem`;
    emailSent = (await ctx.email.send(betaInvitationEmail(email, locale, code, redeemUrl, input.expiresInDays))).delivered;
  }
  return { id: invitation.id, code, email, expiresAt, emailSent };
}

export async function revokeInvitation(ctx: ServerContext, staff: AuthUser, invitationId: string): Promise<void> {
  requireStaff(staff);
  unwrap(
    await ctx.admin
      .from('beta_invitations')
      .update({ revoked_at: ctx.now().toISOString() })
      .eq('id', invitationId)
      .is('redeemed_at', null)
      .select('id')
      .single(),
  );
}

export async function redeemInvitation(ctx: ServerContext, user: AuthUser, code: string): Promise<{ status: string }> {
  if (!user.emailVerified) throw new AppError('email_not_verified');
  await enforceRateLimit(ctx, `beta-redeem:${user.id}`, 5, 3600);
  const result = unwrap(
    await ctx.admin.rpc('beta_redeem_invitation', {
      p_user_id: user.id,
      p_code_hash: invitationCodeHash(ctx.env.TAMURT_SERVER_SECRET, code),
    }),
  ) as { status: string };
  return result;
}

/** Informations publiques du programme (places, liens de distribution). */
export async function publicBetaInfo(ctx: ServerContext) {
  const { data } = await ctx.admin.from('app_settings').select('value').eq('key', 'beta').maybeSingle();
  const value = (data?.value ?? {}) as { mode?: string; max_testers?: number; testflight_url?: string | null; play_testing_url?: string | null };
  const { count } = await ctx.admin.from('user_roles').select('user_id', { count: 'exact', head: true }).eq('role', 'beta_tester');
  return {
    mode: value.mode === 'open' ? 'open' : 'closed',
    seatsTotal: value.max_testers ?? 0,
    seatsUsed: count ?? 0,
    testflightUrl: value.testflight_url ?? null,
    playTestingUrl: value.play_testing_url ?? null,
  };
}
