import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { account, checkout, events, notifications } from '../src';
import { adminClient, anonClient, closePool, createTestUser, sql, testContext, type TestUser } from './helpers';

describe('événements, recherche, agenda et notifications', () => {
  const ctx = testContext();
  let owner: TestUser;
  let organizerId: string;
  let parisId: string;

  const form = (overrides: Record<string, unknown> = {}) => ({
    title: 'Festival intégration',
    summary: 'Résumé de démonstration',
    categorySlug: 'festivals' as const,
    countryCode: 'FR' as const,
    cityId: parisId,
    timezone: 'Europe/Paris',
    startDate: '2027-06-20',
    startTime: '18:00',
    endDate: '2027-06-20',
    endTime: '23:30',
    isFree: true,
    registrationMode: 'free_registration' as const,
    capacity: 2,
    artistNames: ['Artiste Fictif Un', 'Artiste Fictif Deux'],
    ...overrides,
  });

  beforeAll(async () => {
    owner = await createTestUser({ roles: ['beta_tester'] });
    const { data: city } = await adminClient().from('cities').select('id').eq('slug', 'paris').single();
    parisId = city!.id;
    const org = await events.createOrganizer(ctx, owner.auth, { name: 'Collectif Intégration', kind: 'association', countryCode: 'FR' });
    organizerId = org.id;
  });

  afterAll(async () => {
    await closePool();
  });

  it('crée un brouillon, soumet à la modération et conserve les artistes', async () => {
    const created = await events.createEvent(ctx, owner.auth, organizerId, form(), 'save_draft');
    expect(created.status).toBe('draft');
    const submitted = await events.changeEventStatus(ctx, owner.auth, created.id, { action: 'publish' });
    expect(submitted.status).toBe('pending_review');
    const { data: artists } = await owner.client.from('event_artists').select('artist:artists(name)').eq('event_id', created.id).order('billing_order');
    expect(artists?.map((a) => a.artist?.name)).toEqual(['Artiste Fictif Un', 'Artiste Fictif Deux']);
  });

  it('refuse un formulaire invalide avec des erreurs par champ', async () => {
    await expect(events.createEvent(ctx, owner.auth, organizerId, form({ endTime: '17:00' }), 'save_draft')).rejects.toMatchObject({
      code: 'validation_failed',
      details: { issues: [{ path: 'endTime', message: 'validation.end_before_start' }] },
    });
  });

  it('publie directement pour un organisateur vérifié et alimente la recherche', async () => {
    await adminClient().from('organizer_profiles').update({ verification_status: 'verified' }).eq('id', organizerId);
    const created = await events.createEvent(ctx, owner.auth, organizerId, form({ title: 'Nuit du Jazz Imaginaire' }), 'publish');
    expect(created.status).toBe('published');
    const anon = anonClient();
    const { data: byTitle } = await anon.rpc('search_events', { p_query: 'jazz imagin' });
    expect(byTitle?.some((e) => e.id === created.id)).toBe(true);
    const { data: byArtist } = await anon.rpc('search_events', { p_query: 'Artiste Fictif Deux' });
    expect(byArtist?.some((e) => e.id === created.id)).toBe(true);
    const { data: byTypo } = await anon.rpc('search_events', { p_query: 'collectif integation' });
    expect(byTypo?.some((e) => e.id === created.id)).toBe(true);
    const { data: geo } = await anon.rpc('search_events', { p_lat: 48.86, p_lng: 2.35, p_radius_km: 10, p_sort: 'distance', p_categories: ['festivals'] });
    expect(geo?.some((e) => e.id === created.id && (e.distance_km ?? 99) < 10)).toBe(true);
    const { data: farAway } = await anon.rpc('search_events', { p_lat: 40.71, p_lng: -74.0, p_radius_km: 50 });
    expect(farAway?.some((e) => e.id === created.id)).toBe(false);
    const { data: agenda } = await anon.rpc('agenda_events', { p_from: '2027-06-01T00:00:00Z', p_to: '2027-07-01T00:00:00Z' });
    expect(agenda?.some((o) => o.event_id === created.id)).toBe(true);
  });

  it('configure une billetterie FICTIVE sur un événement géré, achetable de bout en bout', async () => {
    const created = await events.createEvent(
      ctx,
      owner.auth,
      organizerId,
      form({ title: 'Concert billetterie démo', isFree: false, registrationMode: 'tickets', capacity: null, priceMinMinor: 1500, priceMaxMinor: 1500, currency: 'EUR' }),
      'publish',
    );
    const offer = await events.addDemoOffer(ctx, owner.auth, created.id, { name: 'Plein tarif', priceMinor: 1500, feeMinor: 100, capacity: 3, maxPerOrder: 2 });
    const { data: row } = await adminClient().from('ticket_offers').select('environment, provider_id, status').eq('id', offer.id).single();
    expect(row).toMatchObject({ environment: 'demo', provider_id: 'demo', status: 'on_sale' });

    const stranger = await createTestUser({ roles: ['beta_tester'] });
    await expect(events.addDemoOffer(ctx, stranger.auth, created.id, { name: 'Pirate', priceMinor: 100, capacity: 1 })).rejects.toMatchObject({ code: 'forbidden' });

    const reservation = await checkout.createReservation(ctx, stranger.auth, { offerId: offer.id, quantity: 2 }, `demo-offer-${offer.id}`);
    expect(reservation.environment).toBe('demo');
    expect(reservation.pricing.subtotalMinor).toBe(3000);

    await events.closeDemoOffer(ctx, owner.auth, created.id, offer.id);
    const { data: closed } = await adminClient().from('ticket_offers').select('status').eq('id', offer.id).single();
    expect(closed?.status).toBe('ended');
    await expect(events.addDemoOffer(ctx, owner.auth, created.id, { name: 'Gratuit ?', priceMinor: 0, capacity: 1 })).rejects.toMatchObject({ code: 'validation_failed' });
  });

  it('gère les inscriptions gratuites avec contrôle de capacité', async () => {
    const created = await events.createEvent(ctx, owner.auth, organizerId, form({ title: 'Atelier complet', capacity: 2 }), 'publish');
    const [a, b, c] = await Promise.all([createTestUser(), createTestUser(), createTestUser()]);
    expect((await a.client.rpc('register_for_event', { p_event_id: created.id, p_quantity: 1 })).error).toBeNull();
    expect((await b.client.rpc('register_for_event', { p_event_id: created.id, p_quantity: 1 })).error).toBeNull();
    const full = await c.client.rpc('register_for_event', { p_event_id: created.id, p_quantity: 1 });
    expect(full.error?.message).toBe('event_full');
    expect((await a.client.rpc('cancel_event_registration', { p_event_id: created.id })).error).toBeNull();
    expect((await c.client.rpc('register_for_event', { p_event_id: created.id, p_quantity: 1 })).error).toBeNull();
    const { data: stats } = await owner.client.rpc('organizer_event_stats', { p_event_id: created.id });
    expect((stats as { registrations: unknown[] }).registrations).toHaveLength(2);
  });

  it('notifie favoris et inscrits lors d’un changement de date puis d’une annulation', async () => {
    const created = await events.createEvent(ctx, owner.auth, organizerId, form({ title: 'Concert notifié' }), 'publish');
    const fan = await createTestUser();
    await fan.client.from('favorites').insert({ user_id: fan.id, event_id: created.id });
    await events.updateEvent(ctx, owner.auth, created.id, form({ title: 'Concert notifié', startTime: '19:00' }));
    await events.changeEventStatus(ctx, owner.auth, created.id, { action: 'cancel', reason: 'Intempéries annoncées' });
    const { data: notifs } = await fan.client.from('notifications').select('type, data').order('created_at');
    expect(notifs?.map((n) => n.type)).toEqual(['event_rescheduled', 'event_cancelled']);
    expect((notifs?.[1]?.data as { reason: string }).reason).toBe('Intempéries annoncées');
    const rendered = notifications.renderNotification('fr', 'event_cancelled', { title: 'Concert notifié' }, null, null);
    expect(rendered.title).toBe('« Concert notifié » est annulé.');
    const renderedAr = notifications.renderNotification('ar', 'event_cancelled', { title: 'X' }, null, null);
    expect(renderedAr.title).toContain('X');
  });

  it('programme des rappels avant l’événement (dédupliqués)', async () => {
    const soon = new Date(Date.now() + 2 * 3_600_000);
    const local = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' }).format(soon).split(' ');
    const created = await events.createEvent(ctx, owner.auth, organizerId, form({ title: 'Rappel imminent', startDate: local[0], startTime: local[1], endDate: undefined, endTime: undefined }), 'publish');
    const fan = await createTestUser();
    await fan.client.from('favorites').insert({ user_id: fan.id, event_id: created.id });
    await fan.client.from('notification_preferences').update({ reminder_lead_hours: 3 }).eq('user_id', fan.id);
    await adminClient().rpc('maintenance_queue_reminders');
    await adminClient().rpc('maintenance_queue_reminders');
    const { data: reminders } = await fan.client.from('notifications').select('type').eq('type', 'event_reminder');
    expect(reminders).toHaveLength(1);
  });

  it('exporte un fichier iCalendar et compte les vues par visiteur', async () => {
    const created = await events.createEvent(ctx, owner.auth, organizerId, form({ title: 'Export agenda' }), 'publish');
    const ics = await events.buildEventIcs(ctx, created.slug, 'fr');
    expect(ics.content).toContain('BEGIN:VEVENT');
    expect(ics.content).toContain('SUMMARY:Export agenda');
    await events.trackEventInteraction(ctx, created.id, 'view', 'visitor-1');
    await events.trackEventInteraction(ctx, created.id, 'view', 'visitor-1');
    await events.trackEventInteraction(ctx, created.id, 'view', 'visitor-2');
    const { data } = await adminClient().from('events').select('views_count').eq('id', created.id).single();
    expect(data?.views_count).toBe(2);
  });

  it('archive automatiquement les événements terminés (toujours consultables, hors « à venir »)', async () => {
    const created = await events.createEvent(ctx, owner.auth, organizerId, form({ title: 'Événement terminé' }), 'publish');
    await sql().query(`update public.events set starts_at = now() - interval '3 days', ends_at = now() - interval '3 days' + interval '2 hours' where id = $1`, [created.id]);
    await adminClient().rpc('maintenance_archive_events');
    const anon = anonClient();
    const { data: page } = await anon.from('events').select('status').eq('id', created.id).single();
    expect(page?.status).toBe('archived');
    const { data: upcoming } = await anon.rpc('search_events', { p_query: 'Événement terminé' });
    expect(upcoming?.some((e) => e.id === created.id)).toBe(false);
    const { data: past } = await anon.rpc('search_events', { p_query: 'Événement terminé', p_include_past: true });
    expect(past?.some((e) => e.id === created.id)).toBe(true);
  });

  it('supprime un compte après ré-authentification et conserve les commandes anonymisées', async () => {
    const leaving = await createTestUser();
    await expect(account.deleteAccount(ctx, leaving.auth, 'MauvaisMotDePasse1')).rejects.toMatchObject({ code: 'forbidden' });
    await account.deleteAccount(ctx, leaving.auth, 'TestPassw0rd!');
    const { data } = await adminClient().auth.admin.getUserById(leaving.id);
    expect(data.user).toBeNull();
    const { rows } = await sql().query('select count(*)::int as n from public.profiles where id = $1', [leaving.id]);
    expect(rows[0].n).toBe(0);
  });

  it('refuse la suppression d’un propriétaire unique d’une organisation active', async () => {
    await expect(account.deleteAccount(ctx, owner.auth, 'TestPassw0rd!')).rejects.toMatchObject({ code: 'account_has_owned_organizers' });
  });
});
