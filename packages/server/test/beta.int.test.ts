import { afterAll, describe, expect, it } from 'vitest';
import { beta } from '../src';
import { adminClient, closePool, createTestUser, findMail, sql, testContext, uniqueEmail } from './helpers';

describe('programme Tamurt Beta', () => {
  const ctx = testContext();

  afterAll(async () => {
    await closePool();
  });

  it('inscription -> e-mail de vérification (Mailpit) -> confirmation', async () => {
    const email = uniqueEmail('beta');
    const result = await beta.joinWaitlist(
      ctx,
      { email, fullName: 'Testeuse Bêta', countryCode: 'DZ', platforms: ['android', 'web'], locale: 'fr', consent: true },
      { ip: `10.0.0.${Math.floor(Math.random() * 200)}` },
    );
    expect(result.emailSent).toBe(true);
    const mail = await findMail(email);
    expect(mail?.subject).toContain('Tamurt Beta');
    const token = /token=([A-Za-z0-9_-]+)/.exec(mail?.text ?? '')?.[1];
    expect(token).toBeTruthy();
    expect(await beta.verifyWaitlistEmail(ctx, token!)).toBe(true);
    expect(await beta.verifyWaitlistEmail(ctx, token!)).toBe(false);
    const { data } = await adminClient().from('beta_waitlist').select('status').eq('email', email).single();
    expect(data?.status).toBe('verified');
  });

  it('ne révèle pas si une adresse est déjà inscrite', async () => {
    const email = uniqueEmail('beta');
    const input = { email, fullName: 'Double', countryCode: 'FR' as const, platforms: ['ios' as const], locale: 'fr' as const, consent: true as const };
    const first = await beta.joinWaitlist(ctx, input, { ip: '10.1.0.1' });
    const second = await beta.joinWaitlist(ctx, input, { ip: '10.1.0.2' });
    expect(Object.keys(first)).toEqual(Object.keys(second));
  });

  it('invitation par le staff -> utilisation du code -> rôle bêta-testeur', async () => {
    const staff = await createTestUser({ roles: ['admin'] });
    const tester = await createTestUser({ roles: [] });
    const invitation = await beta.createInvitation(ctx, staff.auth, { email: tester.email, expiresInDays: 30 });
    expect(invitation.code).toMatch(/^TAMURT-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(invitation.emailSent).toBe(true);
    const mail = await findMail(tester.email);
    expect(mail?.text).toContain(invitation.code);

    const { rows } = await sql().query('select code_hash, code_hint from public.beta_invitations where id = $1', [invitation.id]);
    expect(rows[0].code_hash).not.toContain(invitation.code);
    expect(rows[0].code_hint).toBe(invitation.code.slice(-4));

    const intruder = await createTestUser({ roles: [] });
    await expect(beta.redeemInvitation(ctx, intruder.auth, invitation.code)).rejects.toMatchObject({ code: 'invitation_email_mismatch' });

    const redeemed = await beta.redeemInvitation(ctx, tester.auth, invitation.code.toLowerCase().replace(/-/g, ' '));
    expect(redeemed.status).toBe('redeemed');
    const { data: roles } = await tester.client.from('user_roles').select('role');
    expect(roles?.map((r) => r.role)).toContain('beta_tester');
    expect((await beta.redeemInvitation(ctx, tester.auth, invitation.code)).status).toBe('already_redeemed');
  });

  it('refuse un code invalide, révoqué ou lorsque les places sont épuisées', async () => {
    const staff = await createTestUser({ roles: ['moderator'] });
    const user = await createTestUser({ roles: [] });
    await expect(beta.redeemInvitation(ctx, user.auth, 'TAMURT-AAAA-BBBB')).rejects.toMatchObject({ code: 'invalid_code' });
    const revoked = await beta.createInvitation(ctx, staff.auth, { email: user.email, expiresInDays: 30 });
    await beta.revokeInvitation(ctx, staff.auth, revoked.id);
    await expect(beta.redeemInvitation(ctx, user.auth, revoked.code)).rejects.toMatchObject({ code: 'invitation_revoked' });

    const { rows } = await sql().query(`select value from public.app_settings where key = 'beta'`);
    const previous = rows[0].value;
    await sql().query(`update public.app_settings set value = value || '{"max_testers": 0}' where key = 'beta'`);
    try {
      const fresh = await beta.createInvitation(ctx, staff.auth, { email: user.email, expiresInDays: 30 });
      await expect(beta.redeemInvitation(ctx, user.auth, fresh.code)).rejects.toMatchObject({ code: 'beta_full' });
    } finally {
      await sql().query(`update public.app_settings set value = $1 where key = 'beta'`, [previous]);
    }
  });

  it('un utilisateur non membre du staff ne peut pas créer d’invitation', async () => {
    const user = await createTestUser();
    await expect(beta.createInvitation(ctx, user.auth, { email: 'x@tamurt.test', expiresInDays: 30 })).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('les bêta-testeurs envoient des retours, visibles par le staff uniquement', async () => {
    const tester = await createTestUser();
    const other = await createTestUser();
    const insert = await tester.client
      .from('beta_feedback')
      .insert({ kind: 'bug', title: 'Bouton inactif', message: 'Le bouton ne répond pas', platform: 'web', status: 'done' })
      .select('id, status, user_id')
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data?.status).toBe('new');
    expect(insert.data?.user_id).toBe(tester.id);
    const { data: otherView } = await other.client.from('beta_feedback').select('id').eq('id', insert.data!.id);
    expect(otherView).toHaveLength(0);
    const nonTester = await createTestUser({ roles: [] });
    const denied = await nonTester.client.from('beta_feedback').insert({ kind: 'rating', rating: 5, platform: 'web' });
    expect(denied.error).not.toBeNull();
  });
});
