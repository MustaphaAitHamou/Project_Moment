import { AppError, buildIcsEvent, shortId, slugify, toAppError, uniqueSlug } from '@tamurt/core';
import {
  demoOfferSchema,
  eventFormSchema,
  eventFormToRow,
  flattenIssues,
  organizerProfileSchema,
  type DemoOfferInput,
  type EventFormInput,
  type EventStatusAction,
  type OrganizerProfileInput,
} from '@tamurt/validation';
import { requireAppAccess, type AuthUser, type ServerContext } from '../context';
import { randomToken } from '../crypto';
import { PostgresDemoInventoryStore } from '../demo-store';
import { unwrap } from '../db';
import { enforceRateLimit } from '../reliability';

/**
 * Création et gestion d'événements. Les écritures passent par le client UTILISATEUR :
 * la RLS et les triggers (cycle de vie, champs protégés, modération) s'appliquent toujours.
 */

function parseEventForm(input: EventFormInput) {
  const parsed = eventFormSchema.safeParse(input);
  if (!parsed.success) throw new AppError('validation_failed', undefined, { issues: flattenIssues(parsed.error) });
  return parsed.data;
}

function targetStatus(action: EventStatusAction['action'] | 'save_draft'): 'draft' | 'pending_review' | 'published' {
  if (action === 'publish') return 'published';
  if (action === 'submit') return 'pending_review';
  return 'draft';
}

async function syncArtists(ctx: ServerContext, user: AuthUser, eventId: string, names: string[]): Promise<void> {
  const client = ctx.userClient(user.accessToken);
  unwrap(await client.from('event_artists').delete().eq('event_id', eventId).select('event_id'));
  let order = 0;
  for (const rawName of names) {
    const name = rawName.trim();
    if (!name) continue;
    const slugBase = slugify(name) || 'artiste';
    const existing = await ctx.admin.from('artists').select('id').ilike('name', name).is('deleted_at', null).limit(1).maybeSingle();
    let artistId = existing.data?.id ?? null;
    if (!artistId) {
      const created = unwrap(
        await client.from('artists').insert({ name, slug: `${slugBase}-${shortId(randomToken(6))}`.toLowerCase().replace(/[^a-z0-9-]/g, '') }).select('id').single(),
      );
      artistId = created.id;
    }
    unwrap(await client.from('event_artists').insert({ event_id: eventId, artist_id: artistId, billing_order: order }).select('event_id').single());
    order += 1;
  }
}

export async function createEvent(
  ctx: ServerContext,
  user: AuthUser,
  organizerId: string,
  input: EventFormInput,
  action: 'save_draft' | 'submit' | 'publish',
): Promise<{ id: string; slug: string; status: string }> {
  await requireAppAccess(ctx, user);
  await enforceRateLimit(ctx, `event-create:${user.id}`, 20, 3600);
  const values = parseEventForm(input);
  const row = eventFormToRow(values);
  const client = ctx.userClient(user.accessToken);
  const slug = uniqueSlug(values.title, randomToken(8).replace(/[^a-z0-9]/gi, ''));
  const { data, error } = await client
    .from('events')
    .insert({ ...row, organizer_id: organizerId, slug, status: targetStatus(action) })
    .select('id, slug, status')
    .single();
  if (error) throw toAppError(error);
  await syncArtists(ctx, user, data.id, values.artistNames);
  return data;
}

export async function updateEvent(
  ctx: ServerContext,
  user: AuthUser,
  eventId: string,
  input: EventFormInput,
): Promise<{ id: string; slug: string; status: string }> {
  await requireAppAccess(ctx, user);
  const values = parseEventForm(input);
  const client = ctx.userClient(user.accessToken);
  const { data, error } = await client.from('events').update(eventFormToRow(values)).eq('id', eventId).select('id, slug, status').single();
  if (error) throw toAppError(error);
  await syncArtists(ctx, user, eventId, values.artistNames);
  return data;
}

export async function changeEventStatus(
  ctx: ServerContext,
  user: AuthUser,
  eventId: string,
  action: EventStatusAction,
): Promise<{ id: string; status: string }> {
  await requireAppAccess(ctx, user);
  const client = ctx.userClient(user.accessToken);
  const patch =
    action.action === 'cancel'
      ? { status: 'cancelled' as const, cancellation_reason: action.reason }
      : action.action === 'withdraw'
        ? { status: 'draft' as const }
        : { status: targetStatus(action.action) };
  const { data, error } = await client.from('events').update(patch).eq('id', eventId).select('id, status').single();
  if (error) throw toAppError(error);
  return data;
}

export async function createOrganizer(ctx: ServerContext, user: AuthUser, input: OrganizerProfileInput): Promise<{ id: string; slug: string }> {
  await requireAppAccess(ctx, user);
  await enforceRateLimit(ctx, `organizer-create:${user.id}`, 5, 86_400);
  const parsed = organizerProfileSchema.safeParse(input);
  if (!parsed.success) throw new AppError('validation_failed', undefined, { issues: flattenIssues(parsed.error) });
  const values = parsed.data;
  const client = ctx.userClient(user.accessToken);
  const slug = uniqueSlug(values.name, randomToken(8).replace(/[^a-z0-9]/gi, ''), 'organisateur');
  const { data, error } = await client
    .from('organizer_profiles')
    .insert({
      name: values.name,
      kind: values.kind,
      bio: values.bio ?? null,
      website_url: values.websiteUrl ?? null,
      public_email: values.publicEmail ?? null,
      public_phone: values.publicPhone ?? null,
      country_code: values.countryCode,
      city_id: values.cityId ?? null,
      slug,
    })
    .select('id, slug')
    .single();
  if (error) throw toAppError(error);
  return data;
}

/** Compteur de vues / partages / ajouts à l'agenda, avec limitation par visiteur. */
export async function trackEventInteraction(
  ctx: ServerContext,
  eventId: string,
  kind: 'view' | 'share' | 'calendar_add',
  visitorKey: string,
): Promise<void> {
  try {
    await enforceRateLimit(ctx, `track:${kind}:${eventId}:${visitorKey}`, 1, kind === 'view' ? 1800 : 60);
  } catch {
    return; // déjà compté récemment pour ce visiteur
  }
  const { error } = await ctx.admin.rpc('track_event_interaction', { p_event_id: eventId, p_kind: kind });
  if (error) throw toAppError(error);
}

/** Fichier iCalendar d'un événement visible publiquement. */
export async function buildEventIcs(ctx: ServerContext, slug: string, locale: string): Promise<{ filename: string; content: string }> {
  const event = unwrap(
    await ctx.admin
      .from('events')
      .select('id, slug, title, summary, starts_at, ends_at, status, visibility, deleted_at, address_line, location_name, updated_at, venue:venues(name, address_line1), city:cities(names), organizer:organizer_profiles(name)')
      .eq('slug', slug)
      .maybeSingle(),
    'event_not_found',
  );
  if (event.deleted_at || !['published', 'cancelled', 'archived'].includes(event.status) || event.visibility === 'private') {
    throw new AppError('event_not_found');
  }
  const cityNames = (event.city?.names ?? {}) as Record<string, string>;
  const location = [event.venue?.name ?? event.location_name, event.venue?.address_line1 ?? event.address_line, cityNames[locale] ?? cityNames.fr]
    .filter(Boolean)
    .join(', ');
  const content = buildIcsEvent({
    uid: `${event.id}@tamurt.events`,
    title: event.title,
    description: event.summary,
    location,
    url: `${ctx.env.APP_URL}/${locale}/events/${event.slug}`,
    start: new Date(event.starts_at),
    end: event.ends_at ? new Date(event.ends_at) : null,
    status: event.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
    sequence: Math.floor(new Date(event.updated_at).getTime() / 1000) % 2_000_000_000,
    organizerName: event.organizer?.name ?? null,
    now: ctx.now(),
  });
  return { filename: `${event.slug}.ics`, content };
}

const MAX_DEMO_OFFERS_PER_EVENT = 6;

async function requireManageableTicketedEvent(ctx: ServerContext, user: AuthUser, eventId: string) {
  await requireAppAccess(ctx, user);
  const { data: allowed, error } = await ctx.userClient(user.accessToken).rpc('can_manage_event', { p_event_id: eventId });
  if (error) throw toAppError(error);
  if (allowed !== true) throw new AppError('forbidden');
  const event = unwrap(
    await ctx.admin.from('events').select('id, slug, status, registration_mode, is_free, currency, country_code, deleted_at').eq('id', eventId).maybeSingle(),
    'event_not_found',
  );
  if (event.deleted_at || ['cancelled', 'archived', 'rejected'].includes(event.status)) throw new AppError('invalid_status_transition');
  if (event.registration_mode !== 'tickets' || event.is_free) throw new AppError('validation_failed', 'event_not_ticketed');
  return event;
}

/**
 * Ajoute une offre au fournisseur FICTIF pour un événement géré par l'utilisateur. L'offre est
 * toujours en environnement « demo » : aucune vente réelle n'est possible par ce biais.
 */
export async function addDemoOffer(ctx: ServerContext, user: AuthUser, eventId: string, input: DemoOfferInput): Promise<{ id: string }> {
  const parsed = demoOfferSchema.safeParse(input);
  if (!parsed.success) throw new AppError('validation_failed', undefined, { issues: flattenIssues(parsed.error) });
  const offer = parsed.data;
  await enforceRateLimit(ctx, `demo-offer:${user.id}`, 30, 3600);
  const event = await requireManageableTicketedEvent(ctx, user, eventId);
  const { count } = await ctx.admin.from('ticket_offers').select('id', { count: 'exact', head: true }).eq('event_id', eventId);
  if ((count ?? 0) >= MAX_DEMO_OFFERS_PER_EVENT) throw new AppError('validation_failed', 'too_many_offers');
  const { data: country } = await ctx.admin.from('countries').select('currency').eq('code', event.country_code).maybeSingle();
  const currency = event.currency ?? country?.currency ?? 'EUR';
  const offerRef = `DEMO-${event.id.slice(0, 8)}-${shortId(randomToken(8))}`.toUpperCase();
  await new PostgresDemoInventoryStore(ctx.admin).upsertInventory({
    offerRef,
    eventRef: `DEMO-EV-${event.slug}`,
    label: offer.name,
    currency,
    faceValueMinor: offer.priceMinor,
    bookingFeeMinor: offer.feeMinor,
    capacity: offer.capacity,
    maxPerOrder: offer.maxPerOrder,
  });
  return unwrap(
    await ctx.admin
      .from('ticket_offers')
      .insert({
        event_id: event.id,
        provider_id: 'demo',
        external_offer_id: offerRef,
        environment: 'demo',
        name: offer.name,
        currency,
        face_value_minor: offer.priceMinor,
        provider_fee_minor: offer.feeMinor,
        max_per_order: offer.maxPerOrder,
        resale_allowed: true,
        available_estimate: offer.capacity,
        sort_order: count ?? 0,
      })
      .select('id')
      .single(),
  );
}

/** Ferme la vente d'une offre fictive (les billets déjà émis restent valables pour la démonstration). */
export async function closeDemoOffer(ctx: ServerContext, user: AuthUser, eventId: string, offerId: string): Promise<void> {
  await requireManageableTicketedEvent(ctx, user, eventId);
  unwrap(
    await ctx.admin.from('ticket_offers').update({ status: 'ended' }).eq('id', offerId).eq('event_id', eventId).eq('environment', 'demo').select('id').maybeSingle(),
    'offer_not_found',
  );
}
