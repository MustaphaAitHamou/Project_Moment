/**
 * Données de démonstration Tamurt Events (fictives, marquées is_demo, réinitialisables).
 *
 *   pnpm db:seed        -> crée la démo si elle n'existe pas encore
 *   pnpm demo:reset     -> supprime toute la démo puis la recrée (dates recalculées)
 *
 * Par sécurité, le script refuse de s'exécuter sur une base distante sans
 * SEED_DEMO_ALLOW_REMOTE=true. Aucun e-mail n'est envoyé pendant le seed.
 */
import {
  addDaysToKey,
  COUNTRIES,
  isCountryCode,
  localInputToIso,
  parseMajorToMinor,
  resolveWeekend,
  slugify,
  toLocalDateKey,
  type CurrencyCode,
} from '@tamurt/core';
import {
  beta,
  checkout,
  createAnonClient,
  createServerContext,
  createUserClient,
  DisabledEmailAdapter,
  PostgresDemoInventoryStore,
  readServerEnv,
  resale,
  type AuthUser,
} from '@tamurt/server';
import { resolveSupabaseEnv } from '../lib/env';
import {
  DEMO_ACCOUNTS,
  DEMO_ARTISTS,
  DEMO_EMAIL_DOMAIN,
  DEMO_EVENTS,
  DEMO_ORGANIZERS,
  DEMO_PASSWORD,
  DEMO_VENUES,
  type DemoEvent,
} from './data';

const args = new Set(process.argv.slice(2));
const supabase = resolveSupabaseEnv();
if (!supabase.isLocal && process.env.SEED_DEMO_ALLOW_REMOTE !== 'true') {
  console.error(`Refus : ${supabase.url} n'est pas une base locale. Définissez SEED_DEMO_ALLOW_REMOTE=true pour une base de démonstration distante.`);
  process.exit(1);
}

const ctx = createServerContext({
  env: readServerEnv({
    ...process.env,
    NODE_ENV: 'development',
    SUPABASE_URL: supabase.url,
    SUPABASE_ANON_KEY: supabase.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: supabase.serviceRoleKey,
  }),
  email: new DisabledEmailAdapter(),
  logger: { info: () => undefined, warn: (m, meta) => console.warn(m, meta ?? ''), error: (m, meta) => console.error(m, meta ?? '') },
});
const admin = ctx.admin;
const store = new PostgresDemoInventoryStore(admin);

function check<T>(result: { data: T; error: { message: string } | null }, label: string): NonNullable<T> {
  if (result.error) throw new Error(`${label} : ${result.error.message}`);
  if (result.data === null || result.data === undefined) throw new Error(`${label} : aucune donnée`);
  return result.data as NonNullable<T>;
}

async function listDemoUsers() {
  const users: { id: string; email: string }[] = [];
  for (let page = 1; page < 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users.filter((u) => u.email?.endsWith(`@${DEMO_EMAIL_DOMAIN}`)).map((u) => ({ id: u.id, email: u.email ?? '' })));
    if (data.users.length < 200) break;
  }
  return users;
}

async function reset() {
  const { data, error } = await admin.rpc('demo_reset_data');
  if (error) throw error;
  const users = await listDemoUsers();
  for (const user of users) {
    // Les commandes de démo sont déjà supprimées : la suppression du compte est complète.
    await admin.auth.admin.deleteUser(user.id);
  }
  console.info(`Démo réinitialisée : ${JSON.stringify(data)}, ${users.length} comptes supprimés.`);
}

interface SeededAccount {
  id: string;
  email: string;
  auth: AuthUser;
}

async function seedAccounts(): Promise<Record<string, SeededAccount>> {
  const accounts: Record<string, SeededAccount> = {};
  for (const account of DEMO_ACCOUNTS) {
    const email = `${account.key}@${DEMO_EMAIL_DOMAIN}`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: account.displayName, locale: account.locale, country_code: account.country },
    });
    if (error || !data.user) throw new Error(`compte ${email} : ${error?.message}`);
    if (account.roles.length) {
      check(await admin.from('user_roles').upsert(account.roles.map((role) => ({ user_id: data.user.id, role }))).select('role'), 'rôles');
    }
    accounts[account.key] = {
      id: data.user.id,
      email,
      auth: {
        id: data.user.id,
        email,
        emailVerified: true,
        displayName: account.displayName,
        locale: account.locale,
        roles: account.roles,
        suspended: false,
        accessToken: '',
      },
    };
  }
  return accounts;
}

function eventDates(event: DemoEvent, timezone: string, country: keyof typeof COUNTRIES, now: Date) {
  const todayKey = toLocalDateKey(now, timezone);
  let dayKey: string;
  if (event.day === 'today') {
    dayKey = localInputToIso(todayKey, event.time, timezone) > now.toISOString() ? todayKey : addDaysToKey(todayKey, 1);
  } else if (event.day === 'weekend') {
    dayKey = resolveWeekend(addDaysToKey(todayKey, 1), COUNTRIES[country].week.weekendDays).firstKey;
  } else {
    dayKey = addDaysToKey(todayKey, event.day);
  }
  const startsAt = localInputToIso(dayKey, event.time, timezone);
  const endDayKey = event.endDay !== undefined ? addDaysToKey(todayKey, event.endDay) : dayKey;
  const endsAt = event.endDay !== undefined
    ? new Date(new Date(localInputToIso(endDayKey, event.time, timezone)).getTime() + event.durationHours * 3_600_000).toISOString()
    : new Date(new Date(startsAt).getTime() + event.durationHours * 3_600_000).toISOString();
  return { startsAt, endsAt, dayKey, todayKey };
}

async function main() {
  const { count } = await admin.from('events').select('id', { count: 'exact', head: true }).eq('is_demo', true);
  if (args.has('--reset') || args.has('--reset-only')) {
    await reset();
    if (args.has('--reset-only')) return;
  } else if ((count ?? 0) > 0) {
    console.info('Données de démonstration déjà présentes. Utilisez `pnpm demo:reset` pour les recréer.');
    return;
  }

  const now = new Date();
  const accounts = await seedAccounts();
  const { data: cities } = await admin.from('cities').select('id, slug, country_code, region_id, timezone, lat, lng');
  const cityBySlug = new Map((cities ?? []).map((c) => [c.slug, c]));

  // Organisateurs (le trigger crée la relation « propriétaire » et le rôle organisateur).
  const organizerIds: Record<string, string> = {};
  for (const org of DEMO_ORGANIZERS) {
    const row = check(
      await admin
        .from('organizer_profiles')
        .insert({
          name: org.name,
          slug: `${slugify(org.name)}`.slice(0, 80),
          kind: org.kind,
          bio: org.bio,
          country_code: org.country,
          created_by: accounts[org.owner]!.id,
          verification_status: org.verified ? 'verified' : 'unverified',
          is_demo: true,
        })
        .select('id')
        .single(),
      `organisateur ${org.name}`,
    );
    organizerIds[org.key] = row.id;
  }

  const venueIds: Record<string, string> = {};
  for (const venue of DEMO_VENUES) {
    const city = cityBySlug.get(venue.city)!;
    const row = check(
      await admin
        .from('venues')
        .insert({
          name: venue.name,
          slug: slugify(venue.name),
          description: `${venue.description} Lieu fictif de démonstration.`,
          address_line1: venue.address,
          postal_code: venue.postalCode,
          city_id: city.id,
          region_id: city.region_id,
          country_code: city.country_code,
          lat: city.lat + venue.dLat,
          lng: city.lng + venue.dLng,
          timezone: city.timezone,
          capacity: venue.capacity,
          accessibility: { wheelchair: true, accessibleToilets: true },
          practical_info: 'Lieu fictif : informations pratiques de démonstration.',
          is_demo: true,
          created_by: accounts.organisateur!.id,
        })
        .select('id')
        .single(),
      `lieu ${venue.name}`,
    );
    venueIds[venue.key] = row.id;
  }

  const artistIds: Record<string, string> = {};
  for (const name of DEMO_ARTISTS) {
    const row = check(
      await admin.from('artists').insert({ name, slug: slugify(name), bio: 'Artiste fictif créé pour la démonstration.', is_demo: true }).select('id').single(),
      `artiste ${name}`,
    );
    artistIds[name] = row.id;
  }

  const eventIds: Record<string, string> = {};
  const offerIds: Record<string, string[]> = {};
  for (const event of DEMO_EVENTS) {
    const city = cityBySlug.get(event.city)!;
    if (!isCountryCode(city.country_code)) throw new Error('pays');
    const country = city.country_code;
    const currency = COUNTRIES[country].currency as CurrencyCode;
    const { startsAt, endsAt } = eventDates(event, city.timezone, country, now);
    const prices = (event.offers ?? []).map((o) => parseMajorToMinor(String(o.price), currency));
    const status = event.status ?? 'published';
    const row = check(
      await admin
        .from('events')
        .insert({
          organizer_id: organizerIds[event.organizer]!,
          venue_id: event.venue ? venueIds[event.venue]! : null,
          category_slug: event.category,
          title: event.title,
          slug: `${slugify(event.title)}-${event.city}-demo`.slice(0, 110),
          summary: event.summary,
          description: event.description,
          tags: event.tags ?? [],
          status,
          country_code: country,
          region_id: city.region_id,
          city_id: city.id,
          location_name: event.venue ? null : 'Lieu fictif communiqué aux inscrits',
          lat: event.venue ? null : city.lat + 0.008,
          lng: event.venue ? null : city.lng - 0.006,
          timezone: city.timezone,
          starts_at: startsAt,
          ends_at: endsAt,
          is_free: event.isFree,
          price_min_minor: prices.length ? Math.min(...prices) : null,
          price_max_minor: prices.length ? Math.max(...prices) : null,
          currency: prices.length ? currency : null,
          capacity: event.capacity ?? null,
          registration_mode: event.mode,
          accessibility: event.accessibility ?? {},
          age_min: event.ageMin ?? null,
          cancellation_policy: 'Événement fictif : aucune politique d’annulation réelle.',
          cancellation_reason: event.cancellationReason ?? null,
          moderation_note: event.moderationNote ?? null,
          is_demo: true,
          is_sponsored: event.sponsored ?? false,
          created_by: accounts[DEMO_ORGANIZERS.find((o) => o.key === event.organizer)!.owner]!.id,
          views_count: Math.floor(40 + Math.random() * 900),
        })
        .select('id, slug')
        .single(),
      `événement ${event.title}`,
    );
    eventIds[event.key] = row.id;

    if (event.artists?.length) {
      check(
        await admin
          .from('event_artists')
          .insert(event.artists.map((name, i) => ({ event_id: row.id, artist_id: artistIds[name]!, billing_order: i, role: i === 0 ? 'headliner' : 'performer' })))
          .select('event_id'),
        'artistes liés',
      );
    }
    if (event.sessions?.length) {
      for (const offset of event.sessions) {
        const sessionDay = addDaysToKey(toLocalDateKey(new Date(startsAt), city.timezone), offset - (typeof event.day === 'number' ? event.day : 0));
        const sessionStart = localInputToIso(sessionDay, event.time, city.timezone);
        check(
          await admin
            .from('event_sessions')
            .insert({ event_id: row.id, starts_at: sessionStart, ends_at: new Date(new Date(sessionStart).getTime() + event.durationHours * 3_600_000).toISOString() })
            .select('id'),
          'session',
        );
      }
    }
    offerIds[event.key] = [];
    for (const [index, offer] of (event.offers ?? []).entries()) {
      const externalOfferId = `DEMO-${row.slug.slice(0, 40)}-${index + 1}`;
      const face = parseMajorToMinor(String(offer.price), currency);
      const fee = parseMajorToMinor(String(offer.fee), currency);
      await store.upsertInventory({
        offerRef: externalOfferId,
        eventRef: `DEMO-EV-${row.slug}`,
        label: offer.name,
        currency,
        faceValueMinor: face,
        bookingFeeMinor: fee,
        capacity: offer.capacity,
        maxPerOrder: offer.maxPerOrder ?? 8,
      });
      const offerRow = check(
        await admin
          .from('ticket_offers')
          .insert({
            event_id: row.id,
            provider_id: 'demo',
            external_offer_id: externalOfferId,
            environment: 'demo',
            name: offer.name,
            currency,
            face_value_minor: face,
            provider_fee_minor: fee,
            max_per_order: offer.maxPerOrder ?? 8,
            resale_allowed: true,
            available_estimate: offer.capacity,
            sort_order: index,
          })
          .select('id')
          .single(),
        'offre',
      );
      offerIds[event.key]!.push(offerRow.id);
    }
  }

  // Statistiques quotidiennes (graphiques des tableaux de bord organisateur).
  const statsRows = Object.values(eventIds).flatMap((eventId) =>
    Array.from({ length: 14 }, (_, i) => ({
      event_id: eventId,
      day: new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10),
      views: Math.floor(5 + Math.random() * 60),
      favorites: Math.floor(Math.random() * 6),
      shares: Math.floor(Math.random() * 4),
    })),
  );
  check(await admin.from('event_daily_stats').upsert(statsRows).select('event_id'), 'statistiques');

  // Interactions du testeur via son propre client (RLS, compteurs, notifications).
  const anon = createAnonClient(supabase.url, supabase.anonKey);
  const session = await anon.auth.signInWithPassword({ email: accounts.testeur!.email, password: DEMO_PASSWORD });
  if (session.error || !session.data.session) throw session.error;
  const testerClient = createUserClient(supabase.url, supabase.anonKey, session.data.session.access_token);
  for (const key of ['jardins-suspendus', 'rires-minuit', 'festival-montagnes', 'lakeside-symphony', 'duo-marees-annule', 'tech-futures']) {
    check(await testerClient.from('favorites').insert({ user_id: accounts.testeur!.id, event_id: eventIds[key]! }).select('event_id'), 'favori');
  }
  for (const slug of ['paris', 'alger', 'montreal']) {
    check(await testerClient.from('user_followed_cities').insert({ user_id: accounts.testeur!.id, city_id: cityBySlug.get(slug)!.id }).select('city_id'), 'ville suivie');
  }
  check(await testerClient.rpc('register_for_event', { p_event_id: eventIds['villes-durables']!, p_quantity: 2 }), 'inscription');
  check(await testerClient.rpc('register_for_event', { p_event_id: eventIds['startups-alger']!, p_quantity: 1 }), 'inscription');

  // Commandes fictives via le VRAI parcours d'achat (fournisseur fictif + paiement simulé).
  const buy = async (account: string, eventKey: string, quantity: number, offerIndex = 0) => {
    const user = accounts[account]!.auth;
    const reservation = await checkout.createReservation(ctx, user, { offerId: offerIds[eventKey]![offerIndex]!, quantity }, crypto.randomUUID());
    const order = await checkout.createOrder(ctx, user, reservation.id, crypto.randomUUID());
    return checkout.payOrder(ctx, user, order.id, { scenario: 'success' });
  };
  const testerElectro = await buy('testeur', 'electro-lumiere', 2);
  await buy('testeur', 'soiree-chaabi', 1);
  const testerJazz = await buy('testeur', 'rooftop-jazz', 2);
  const buyerSymphony = await buy('acheteur', 'lakeside-symphony', 2);
  const buyerElectro = await buy('acheteur', 'electro-lumiere', 2, 1);
  await buy('acheteur', 'festival-montagnes', 1);

  // Annonces de revente fictives (prix plafonné au prix d'origine).
  await resale.createListing(ctx, accounts.acheteur!.auth, { ticketId: buyerSymphony.ticketIds[0]!, askingPriceMinor: 8000, note: 'Empêchement (démo).' });
  await resale.createListing(ctx, accounts.acheteur!.auth, { ticketId: buyerElectro.ticketIds[0]!, askingPriceMinor: 4500 });
  await resale.createListing(ctx, accounts.testeur!.auth, { ticketId: testerJazz.ticketIds[1]!, askingPriceMinor: 4000 });
  void testerElectro;

  // Programme bêta : liste d'attente fictive, invitation, retours.
  const waitlist = [
    { email: `ines@${DEMO_EMAIL_DOMAIN}`, full_name: 'Inès (démo)', country_code: 'DZ', platforms: ['android'], status: 'verified' as const },
    { email: `lucas@${DEMO_EMAIL_DOMAIN}`, full_name: 'Lucas (démo)', country_code: 'FR', platforms: ['ios', 'web'], status: 'pending_verification' as const },
    { email: `maya@${DEMO_EMAIL_DOMAIN}`, full_name: 'Maya (démo)', country_code: 'CA', platforms: ['ios'], status: 'verified' as const },
    { email: `sam@${DEMO_EMAIL_DOMAIN}`, full_name: 'Sam (demo)', country_code: 'US', platforms: ['android', 'web'], status: 'verified' as const },
  ];
  const insertedWaitlist = check(
    await admin
      .from('beta_waitlist')
      .insert(waitlist.map((w) => ({ ...w, consent_at: now.toISOString(), locale: 'fr', verified_at: w.status === 'verified' ? now.toISOString() : null, source: 'demo' })))
      .select('id, email'),
    'liste d’attente',
  );
  const invitation = await beta.createInvitation(ctx, accounts.admin!.auth, { waitlistId: insertedWaitlist[0]!.id, expiresInDays: 30 });
  check(
    await testerClient
      .from('beta_feedback')
      .insert([
        { kind: 'bug', title: 'Le filtre « Ce week-end » se réinitialise', message: 'Exemple de retour de démonstration.', platform: 'web', screen: '/fr/search' },
        { kind: 'suggestion', title: 'Afficher le temps de trajet', message: 'Exemple de suggestion de démonstration.', platform: 'ios' },
        { kind: 'rating', rating: 4, platform: 'android' },
      ])
      .select('id'),
    'retours bêta',
  );

  console.info('\n=== Démo Tamurt Events prête (données FICTIVES) ===');
  console.info(`Événements : ${Object.keys(eventIds).length} · Organisateurs : ${DEMO_ORGANIZERS.length} · Lieux : ${DEMO_VENUES.length}`);
  console.info(`Mot de passe de tous les comptes de démo : ${DEMO_PASSWORD}`);
  for (const account of DEMO_ACCOUNTS) {
    console.info(`  ${account.key.padEnd(13)} ${account.key}@${DEMO_EMAIL_DOMAIN}  rôles : ${account.roles.join(', ') || '(aucun — sans accès bêta)'}`);
  }
  console.info(`Code d'invitation bêta de démonstration (Inès) : ${invitation.code}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
