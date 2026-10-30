import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError, toAppError, type SearchRpcArgs } from '@tamurt/core';
import type { Database, SearchEventResult, AgendaOccurrence, MapEventPoint, MyAgendaEntry, PublicResaleListing } from '@tamurt/types';

/**
 * Requêtes de lecture/écriture simples partagées par le web (composants serveur) et le mobile.
 * Elles s'exécutent avec le client Supabase de l'appelant : la RLS s'applique toujours.
 */
export type TamurtClient = SupabaseClient<Database>;

function ensure<T>(result: { data: T; error: { message: string; code?: string } | null }): NonNullable<T> {
  if (result.error) throw toAppError(result.error);
  if (result.data === null || result.data === undefined) throw new AppError('not_found');
  return result.data as NonNullable<T>;
}

function ensureList<T>(result: { data: T[] | null; error: { message: string; code?: string } | null }): T[] {
  if (result.error) throw toAppError(result.error);
  return result.data ?? [];
}

// -----------------------------------------------------------------------------
// Référentiels
// -----------------------------------------------------------------------------
export async function listCountries(client: TamurtClient) {
  return ensureList(await client.from('countries').select('*').eq('is_active', true).order('sort_order'));
}

export async function listCities(client: TamurtClient, countryCode?: string) {
  let query = client.from('cities').select('id, slug, country_code, region_id, names, timezone, lat, lng, is_featured').order('country_code').order('sort_order');
  if (countryCode) query = query.eq('country_code', countryCode);
  return ensureList(await query);
}

export async function listRegions(client: TamurtClient, countryCode: string) {
  return ensureList(await client.from('regions').select('id, code, names, type, parent_id').eq('country_code', countryCode).order('code'));
}

export async function listCategories(client: TamurtClient) {
  return ensureList(await client.from('event_categories').select('*').eq('is_active', true).order('sort_order'));
}

export async function getPublicSettings(client: TamurtClient) {
  const { data, error } = await client.rpc('get_public_settings');
  if (error) throw toAppError(error);
  return (data ?? {}) as {
    beta?: { mode?: 'open' | 'closed'; max_testers?: number; testflight_url?: string | null; play_testing_url?: string | null };
    commerce?: { demo_enabled?: boolean; live_enabled?: boolean; reservation_ttl_seconds?: number; max_tickets_per_order?: number };
    resale?: { demo_enabled?: boolean; live_enabled?: boolean };
  };
}

// -----------------------------------------------------------------------------
// Événements
// -----------------------------------------------------------------------------
export async function searchEvents(client: TamurtClient, args: Partial<SearchRpcArgs> & { p_organizer_id?: string; p_venue_id?: string; p_artist_id?: string; p_include_past?: boolean }) {
  const rows = ensureList(await client.rpc('search_events', args)) as unknown as SearchEventResult[];
  return { items: rows, total: rows[0]?.total_count ?? 0 };
}

export const EVENT_DETAIL_SELECT = `
  *,
  organizer:organizer_profiles!inner(id, slug, name, kind, verification_status, logo_path, is_demo, public_email, website_url),
  venue:venues(id, slug, name, address_line1, address_line2, postal_code, lat, lng, capacity, accessibility, practical_info, is_demo),
  city:cities!inner(id, slug, names, country_code, timezone, lat, lng),
  region:regions(id, code, names, type),
  category:event_categories!inner(slug, names, color, icon),
  artists:event_artists(role, billing_order, artist:artists(id, slug, name, is_demo)),
  offers:ticket_offers(id, name, description, currency, face_value_minor, provider_fee_minor, min_per_order, max_per_order, status, sales_start_at, sales_end_at, available_estimate, resale_allowed, environment, provider_id, sort_order),
  sessions:event_sessions(id, starts_at, ends_at, status, note),
  media:event_media(id, storage_path, alt_text, sort_order, status)
` as const;

export async function getEventBySlug(client: TamurtClient, slug: string) {
  const { data, error } = await client.from('events').select(EVENT_DETAIL_SELECT).eq('slug', slug).is('deleted_at', null).maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

export async function getEventById(client: TamurtClient, id: string) {
  const { data, error } = await client.from('events').select(EVENT_DETAIL_SELECT).eq('id', id).maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

export type EventDetail = NonNullable<Awaited<ReturnType<typeof getEventBySlug>>>;

export async function listAgenda(client: TamurtClient, args: Database['public']['Functions']['agenda_events']['Args']) {
  return ensureList(await client.rpc('agenda_events', args)) as unknown as AgendaOccurrence[];
}

export async function listMapEvents(client: TamurtClient, args: Database['public']['Functions']['map_events']['Args']) {
  return ensureList(await client.rpc('map_events', args)) as unknown as MapEventPoint[];
}

export async function getOrganizerBySlug(client: TamurtClient, slug: string) {
  const { data, error } = await client
    .from('organizer_profiles')
    .select('id, slug, name, kind, bio, logo_path, cover_path, website_url, public_email, public_phone, country_code, verification_status, is_demo, created_at, city:cities(names, slug)')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

export async function getVenueBySlug(client: TamurtClient, slug: string) {
  const { data, error } = await client
    .from('venues')
    .select('*, city:cities!inner(id, slug, names, country_code, timezone), region:regions(names, code), media:venue_media(id, storage_path, alt_text, credit, license, status)')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

export async function getArtistBySlug(client: TamurtClient, slug: string) {
  const { data, error } = await client.from('artists').select('*').eq('slug', slug).is('deleted_at', null).maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

export async function listEventAnnouncements(client: TamurtClient, eventId: string) {
  return ensureList(
    await client.from('event_announcements').select('id, title, body, created_at').eq('event_id', eventId).order('created_at', { ascending: false }),
  );
}

export async function listPublicResaleListings(client: TamurtClient, eventId?: string, limit = 20, offset = 0) {
  const rows = ensureList(
    await client.rpc('public_resale_listings', { ...(eventId ? { p_event_id: eventId } : {}), p_limit: limit, p_offset: offset }),
  ) as unknown as PublicResaleListing[];
  return { items: rows, total: rows[0]?.total_count ?? 0 };
}

// -----------------------------------------------------------------------------
// Espace personnel (RLS : uniquement les données de l'utilisateur connecté)
// -----------------------------------------------------------------------------
export async function getMyProfile(client: TamurtClient, userId: string) {
  return ensure(await client.from('profiles').select('*, home_city:cities(id, slug, names)').eq('id', userId).single());
}

export async function getMyRoles(client: TamurtClient, userId: string) {
  return ensureList(await client.from('user_roles').select('role').eq('user_id', userId)).map((r) => r.role);
}

export async function getNotificationPreferences(client: TamurtClient, userId: string) {
  return ensure(await client.from('notification_preferences').select('*').eq('user_id', userId).single());
}

export async function listFavorites(client: TamurtClient) {
  return ensureList(
    await client
      .from('favorites')
      .select('created_at, event:events!inner(id, slug, title, category_slug, starts_at, ends_at, timezone, status, is_demo, is_free, cover_path, cover_status, city:cities(names), venue:venues(name))')
      .order('created_at', { ascending: false }),
  );
}

export async function isFavorite(client: TamurtClient, userId: string, eventId: string): Promise<boolean> {
  const { count, error } = await client.from('favorites').select('event_id', { count: 'exact', head: true }).eq('user_id', userId).eq('event_id', eventId);
  if (error) throw toAppError(error);
  return (count ?? 0) > 0;
}

export async function setFavorite(client: TamurtClient, userId: string, eventId: string, favorite: boolean): Promise<void> {
  const result = favorite
    ? await client.from('favorites').upsert({ user_id: userId, event_id: eventId }, { onConflict: 'user_id,event_id', ignoreDuplicates: true })
    : await client.from('favorites').delete().eq('user_id', userId).eq('event_id', eventId);
  if (result.error) throw toAppError(result.error);
}

export async function listMyTickets(client: TamurtClient) {
  return ensureList(
    await client
      .from('tickets')
      .select('id, status, source, environment, holder_name, seat_label, delivery_mode, offline_allowed, original_price_minor, currency, issued_at, order:orders(order_number), offer:ticket_offers(name, resale_allowed), event:events!inner(id, slug, title, starts_at, ends_at, timezone, status, is_demo, city:cities(names), venue:venues(name, address_line1))')
      .order('issued_at', { ascending: false }),
  );
}

export async function getMyTicket(client: TamurtClient, ticketId: string) {
  const { data, error } = await client
    .from('tickets')
    .select('*, order:orders(id, order_number, environment), offer:ticket_offers(name, resale_allowed), event:events!inner(id, slug, title, starts_at, ends_at, timezone, status, is_demo, category_slug, city:cities(names), venue:venues(name, address_line1, postal_code))')
    .eq('id', ticketId)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

export async function listMyOrders(client: TamurtClient) {
  return ensureList(
    await client
      .from('orders')
      .select('id, order_number, status, environment, total_minor, currency, created_at, event:events!inner(slug, title, starts_at, timezone)')
      .order('created_at', { ascending: false }),
  );
}

export async function getMyOrder(client: TamurtClient, orderId: string) {
  const { data, error } = await client
    .from('orders')
    .select('*, items:order_items(*), tickets(id, status), event:events!inner(id, slug, title, starts_at, ends_at, timezone, city:cities(names), venue:venues(name))')
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

export async function listNotifications(client: TamurtClient, limit = 50) {
  return ensureList(await client.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit));
}

export async function countUnreadNotifications(client: TamurtClient): Promise<number> {
  const { count, error } = await client.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
  if (error) throw toAppError(error);
  return count ?? 0;
}

export async function markNotificationsRead(client: TamurtClient, ids?: string[]): Promise<void> {
  let query = client.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  if (ids?.length) query = query.in('id', ids);
  const { error } = await query;
  if (error) throw toAppError(error);
}

export async function getMyAgenda(client: TamurtClient, from: string, to: string) {
  return ensureList(await client.rpc('my_agenda', { p_from: from, p_to: to })) as unknown as MyAgendaEntry[];
}

export async function listFollowedCities(client: TamurtClient) {
  return ensureList(await client.from('user_followed_cities').select('city:cities!inner(id, slug, names, country_code)'));
}

export async function setFollowedCity(client: TamurtClient, userId: string, cityId: string, follow: boolean): Promise<void> {
  const result = follow
    ? await client.from('user_followed_cities').upsert({ user_id: userId, city_id: cityId }, { onConflict: 'user_id,city_id', ignoreDuplicates: true })
    : await client.from('user_followed_cities').delete().eq('user_id', userId).eq('city_id', cityId);
  if (result.error) throw toAppError(result.error);
}

export async function listMyRegistrations(client: TamurtClient, userId: string) {
  return ensureList(await client.from('event_registrations').select('event_id, quantity, status').eq('user_id', userId).eq('status', 'registered'));
}

export async function listMyOrganizations(client: TamurtClient, userId: string) {
  return ensureList(
    await client
      .from('organizer_members')
      .select('role, organizer:organizer_profiles!inner(id, slug, name, kind, verification_status, is_demo, country_code)')
      .eq('user_id', userId),
  );
}

export async function listMyResaleListings(client: TamurtClient) {
  return ensureList(
    await client
      .from('resale_listings')
      .select('id, status, asking_price_minor, original_price_minor, buyer_fee_minor, currency, environment, created_at, sold_at, event:events!inner(slug, title, starts_at, timezone)')
      .order('created_at', { ascending: false }),
  );
}

export async function listMyResaleTransactions(client: TamurtClient) {
  return ensureList(
    await client
      .from('resale_transactions')
      .select('id, status, total_minor, price_minor, currency, environment, created_at, buyer_id, seller_id, listing:resale_listings!inner(event:events!inner(slug, title))')
      .order('created_at', { ascending: false }),
  );
}
