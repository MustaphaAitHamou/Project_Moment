import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ORGANIZER_MEMBER_ROLES, ORGANIZER_PERMISSIONS, organizerRoleHasPermission } from '@tamurt/core';
import { adminClient, anonClient, closePool, createTestUser, sql, type TestUser } from './helpers';

/**
 * Tests de sécurité : RLS, privilèges de colonnes, fonctions réservées au serveur, cycle de vie.
 * Chaque requête passe par PostgREST avec un VRAI jeton utilisateur (comme le web et le mobile).
 */
describe('RLS et permissions', () => {
  let alice: TestUser;
  let bob: TestUser;
  let editor: TestUser;
  let analyst: TestUser;
  let outsider: TestUser;
  let orgId: string;
  let cityId: string;
  let publishedEventId: string;
  let draftEventId: string;

  beforeAll(async () => {
    [alice, bob, editor, analyst, outsider] = await Promise.all([
      createTestUser({ displayName: 'Alice' }),
      createTestUser({ displayName: 'Bob' }),
      createTestUser({ displayName: 'Éditrice' }),
      createTestUser({ displayName: 'Analyste' }),
      createTestUser({ displayName: 'Externe' }),
    ]);
    const admin = adminClient();
    const { data: city } = await admin.from('cities').select('id').eq('slug', 'paris').single();
    cityId = city!.id;
    // Alice crée son organisation via son propre client (RLS + trigger propriétaire).
    const { data: org, error } = await alice.client
      .from('organizer_profiles')
      .insert({ name: 'Asso Alice', slug: `asso-alice-${Date.now()}`, kind: 'association', country_code: 'FR' })
      .select('id')
      .single();
    expect(error).toBeNull();
    orgId = org!.id;
    await admin.from('organizer_members').insert([
      { organizer_id: orgId, user_id: editor.id, role: 'editor' },
      { organizer_id: orgId, user_id: analyst.id, role: 'analyst' },
    ]);
    const base = {
      organizer_id: orgId,
      category_slug: 'culture',
      country_code: 'FR',
      city_id: cityId,
      timezone: 'Europe/Paris',
      starts_at: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    };
    const { data: draft } = await alice.client.from('events').insert({ ...base, title: 'Brouillon privé', slug: `brouillon-${Date.now()}` }).select('id').single();
    draftEventId = draft!.id;
    const { data: pub } = await admin
      .from('events')
      .insert({ ...base, title: 'Événement publié', slug: `publie-${Date.now()}`, status: 'published' })
      .select('id')
      .single();
    publishedEventId = pub!.id;
  });

  afterAll(async () => {
    await closePool();
  });

  it('le créateur d’une organisation en devient propriétaire et organisateur', async () => {
    const { data: members } = await alice.client.from('organizer_members').select('role').eq('organizer_id', orgId).eq('user_id', alice.id);
    expect(members?.[0]?.role).toBe('owner');
    const { data: roles } = await alice.client.from('user_roles').select('role');
    expect(roles?.map((r) => r.role)).toContain('organizer');
  });

  it('un visiteur lit les événements publiés mais jamais les brouillons', async () => {
    const anon = anonClient();
    const { data: visible } = await anon.from('events').select('id').eq('id', publishedEventId);
    expect(visible).toHaveLength(1);
    const { data: hidden } = await anon.from('events').select('id').eq('id', draftEventId);
    expect(hidden).toHaveLength(0);
    const { data: hiddenForOutsider } = await outsider.client.from('events').select('id').eq('id', draftEventId);
    expect(hiddenForOutsider).toHaveLength(0);
    const { data: visibleForEditor } = await editor.client.from('events').select('id').eq('id', draftEventId);
    expect(visibleForEditor).toHaveLength(1);
  });

  it('un visiteur ne peut ni écrire ni lire de données privées', async () => {
    const anon = anonClient();
    const insert = await anon.from('events').insert({ title: 'x' } as never);
    expect(insert.error).not.toBeNull();
    for (const table of ['profiles', 'orders', 'tickets', 'reservations', 'favorites', 'notifications', 'audit_logs'] as const) {
      const { data, error } = await anon.from(table).select('*').limit(1);
      expect(error !== null || (data ?? []).length === 0, table).toBe(true);
    }
  });

  it('un utilisateur ne voit jamais le profil, les favoris ou les notifications d’un autre', async () => {
    await alice.client.from('favorites').insert({ user_id: alice.id, event_id: publishedEventId });
    const { data: bobView } = await bob.client.from('profiles').select('id').eq('id', alice.id);
    expect(bobView).toHaveLength(0);
    const { data: favs } = await bob.client.from('favorites').select('*').eq('user_id', alice.id);
    expect(favs).toHaveLength(0);
    const forged = await bob.client.from('favorites').insert({ user_id: alice.id, event_id: publishedEventId });
    expect(forged.error).not.toBeNull();
  });

  it('les favoris fonctionnent et les compteurs restent protégés', async () => {
    const fan = await createTestUser();
    const added = await fan.client.from('favorites').insert({ user_id: fan.id, event_id: publishedEventId });
    expect(added.error).toBeNull();
    const { data: event } = await anonClient().from('events').select('favorites_count').eq('id', publishedEventId).single();
    expect(event?.favorites_count).toBeGreaterThanOrEqual(1);
    const tamper = await alice.client.from('events').update({ favorites_count: 9999 }).eq('id', draftEventId);
    expect(tamper.error?.message).toBe('forbidden_column_change');
  });

  it('les colonnes de modération du profil sont protégées', async () => {
    const own = await alice.client.from('profiles').update({ display_name: 'Alice M.' }).eq('id', alice.id).select('display_name').single();
    expect(own.data?.display_name).toBe('Alice M.');
    const forbidden = await alice.client.from('profiles').update({ is_suspended: false } as never).eq('id', alice.id);
    expect(forbidden.error).not.toBeNull();
  });

  it('un utilisateur ne peut pas s’attribuer un rôle', async () => {
    const result = await bob.client.from('user_roles').insert({ user_id: bob.id, role: 'admin' });
    expect(result.error).not.toBeNull();
  });

  it('les fonctions financières et internes sont réservées au serveur', async () => {
    const calls = [
      bob.client.rpc('demo_provider_create_hold', { p_offer_ref: 'x', p_quantity: 1, p_ttl_seconds: 60 }),
      bob.client.rpc('rate_limit_hit', { p_bucket: 'abc', p_limit: 1, p_window_seconds: 1 }),
      bob.client.rpc('resale_create_listing', { p_seller_id: alice.id, p_ticket_id: alice.id, p_asking_price_minor: 1, p_note: '' }),
      bob.client.rpc('notify_user', { p_user_id: alice.id, p_type: 'order_confirmed', p_data: {}, p_link: '/', p_dedupe_key: 'x' }),
      bob.client.rpc('beta_redeem_invitation', { p_user_id: bob.id, p_code_hash: 'x' }),
    ];
    for (const result of await Promise.all(calls)) {
      expect(result.error?.code).toBe('42501');
    }
  });

  it('les tables commerciales sont en lecture seule pour les clients', async () => {
    const order = await bob.client.from('orders').insert({ order_number: 'TD-000000-ABCDEFGH' } as never);
    expect(order.error).not.toBeNull();
    const ticket = await bob.client.from('tickets').update({ status: 'issued' }).eq('owner_id', bob.id);
    expect(ticket.error).not.toBeNull();
  });

  it('applique les permissions organisateur (éditeur, analyste, externe)', async () => {
    const byEditor = await editor.client.from('events').update({ summary: 'Résumé mis à jour' }).eq('id', draftEventId).select('id');
    expect(byEditor.data).toHaveLength(1);
    const byAnalyst = await analyst.client.from('events').update({ summary: 'Piratage' }).eq('id', draftEventId).select('id');
    expect(byAnalyst.data ?? []).toHaveLength(0);
    const byOutsider = await outsider.client.from('events').update({ summary: 'Piratage' }).eq('id', draftEventId).select('id');
    expect(byOutsider.data ?? []).toHaveLength(0);
    const team = await analyst.client.from('organizer_members').update({ role: 'admin' }).eq('organizer_id', orgId).eq('user_id', analyst.id).select('role');
    expect(team.data ?? []).toHaveLength(0);
  });

  it('un organisateur non vérifié passe par la modération et ne peut pas modifier les champs protégés', async () => {
    const publish = await alice.client.from('events').update({ status: 'published' }).eq('id', draftEventId).select('status').single();
    expect(publish.data?.status).toBe('pending_review');
    const demoFlag = await alice.client.from('events').update({ is_demo: true }).eq('id', draftEventId);
    expect(demoFlag.error?.message).toBe('forbidden_column_change');
    const sponsored = await alice.client.from('events').update({ is_sponsored: true }).eq('id', draftEventId);
    expect(sponsored.error?.message).toBe('forbidden_column_change');
  });

  it('seule la modération peut valider un événement en attente', async () => {
    const moderator = await createTestUser({ roles: ['moderator'] });
    const denied = await bob.client.rpc('admin_review_event', { p_event_id: draftEventId, p_decision: 'approve', p_note: '' });
    expect(denied.error?.message).toBe('forbidden');
    const approved = await moderator.client.rpc('admin_review_event', { p_event_id: draftEventId, p_decision: 'approve', p_note: 'OK' });
    expect(approved.error).toBeNull();
    expect((approved.data as { status: string }).status).toBe('published');
  });

  it('un organisateur conserve toujours un propriétaire', async () => {
    const result = await alice.client.from('organizer_members').delete().eq('organizer_id', orgId).eq('user_id', alice.id);
    expect(result.error?.message).toBe('last_owner_cannot_be_removed');
  });

  it('la matrice de permissions SQL est identique à celle de @tamurt/core', async () => {
    for (const role of ORGANIZER_MEMBER_ROLES) {
      for (const permission of ORGANIZER_PERMISSIONS) {
        const { rows } = await sql().query('select public.organizer_role_has_permission($1, $2) as allowed', [role, permission]);
        expect(rows[0].allowed, `${role}/${permission}`).toBe(organizerRoleHasPermission(role, permission));
      }
    }
  });

  it('le journal d’audit est immuable et réservé aux administrateurs', async () => {
    const { rows } = await sql().query('select id from public.audit_logs order by id desc limit 1');
    expect(rows.length).toBe(1);
    await expect(sql().query('update public.audit_logs set action = $1 where id = $2', ['x', rows[0].id])).rejects.toThrow(/audit_log_immutable/);
    const { data } = await bob.client.from('audit_logs').select('id').limit(1);
    expect(data ?? []).toHaveLength(0);
  });

  it('un compte suspendu ne peut plus écrire', async () => {
    const admin = await createTestUser({ roles: ['admin'] });
    const suspended = await createTestUser();
    const res = await admin.client.rpc('admin_set_user_suspension', { p_user_id: suspended.id, p_suspended: true, p_reason: 'Test' });
    expect(res.error).toBeNull();
    const fav = await suspended.client.from('favorites').insert({ user_id: suspended.id, event_id: publishedEventId });
    expect(fav.error).not.toBeNull();
  });

  it('la bêta fermée bloque la création d’organisation sans accès testeur', async () => {
    const noBeta = await createTestUser({ roles: [] });
    const result = await noBeta.client.from('organizer_profiles').insert({ name: 'Sans accès', slug: `sans-acces-${Date.now()}`, kind: 'individual', country_code: 'FR' });
    expect(result.error).not.toBeNull();
  });
});
