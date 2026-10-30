import type { Database, Json } from './database.generated';

export type { Database, Json };

type PublicSchema = Database['public'];

/** Ligne d'une table du schéma public. */
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
/** Données d'insertion d'une table du schéma public. */
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert'];
/** Données de mise à jour d'une table du schéma public. */
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update'];
/** Type énuméré PostgreSQL. */
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];
/** Arguments et résultat d'une fonction RPC. */
export type RpcArgs<T extends keyof PublicSchema['Functions']> = PublicSchema['Functions'][T]['Args'];
export type RpcReturns<T extends keyof PublicSchema['Functions']> = PublicSchema['Functions'][T]['Returns'];

/**
 * Les types générés pour les fonctions RPC ne connaissent pas la nullabilité des colonnes
 * renvoyées. Ce helper rend explicitement nullables les champs indiqués.
 */
export type WithNullable<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[P] | null };

export type EventRow = Tables<'events'>;
export type OrganizerRow = Tables<'organizer_profiles'>;
export type VenueRow = Tables<'venues'>;
export type ArtistRow = Tables<'artists'>;
export type CityRow = Tables<'cities'>;
export type CountryRow = Tables<'countries'>;
export type RegionRow = Tables<'regions'>;
export type CategoryRow = Tables<'event_categories'>;
export type ProfileRow = Tables<'profiles'>;
export type TicketOfferRow = Tables<'ticket_offers'>;
export type ReservationRow = Tables<'reservations'>;
export type OrderRow = Tables<'orders'>;
export type OrderItemRow = Tables<'order_items'>;
export type TicketRow = Tables<'tickets'>;
export type ResaleListingRow = Tables<'resale_listings'>;
export type ResaleTransactionRow = Tables<'resale_transactions'>;
export type NotificationRow = Tables<'notifications'>;
export type BetaFeedbackRow = Tables<'beta_feedback'>;
export type BetaWaitlistRow = Tables<'beta_waitlist'>;

export type EventStatus = Enums<'event_status'>;
export type EventVisibility = Enums<'event_visibility'>;
export type RegistrationMode = Enums<'registration_mode'>;
export type OrganizerKind = Enums<'organizer_kind'>;
export type OrganizerMemberRole = Enums<'organizer_member_role'>;
export type AppRole = Enums<'app_role'>;
export type CommerceEnvironment = Enums<'commerce_environment'>;
export type OrderStatus = Enums<'order_status'>;
export type TicketStatus = Enums<'ticket_status'>;
export type ReservationStatus = Enums<'reservation_status'>;
export type ResaleListingStatus = Enums<'resale_listing_status'>;
export type ResaleTxStatus = Enums<'resale_tx_status'>;
export type ReportReason = Enums<'report_reason'>;
export type MediaStatus = Enums<'media_status'>;
export type VerificationStatus = Enums<'verification_status'>;

export type SearchEventResult = WithNullable<
  RpcReturns<'search_events'>[number],
  | 'summary'
  | 'ends_at'
  | 'venue_id'
  | 'venue_name'
  | 'venue_slug'
  | 'location_name'
  | 'lat'
  | 'lng'
  | 'price_min_minor'
  | 'price_max_minor'
  | 'currency'
  | 'cover_path'
  | 'distance_km'
>;

export type AgendaOccurrence = WithNullable<RpcReturns<'agenda_events'>[number], 'session_id' | 'ends_at' | 'venue_name'>;
export type MapEventPoint = RpcReturns<'map_events'>[number];
export type MyAgendaEntry = WithNullable<RpcReturns<'my_agenda'>[number], 'ends_at' | 'venue_name'>;
export type PublicResaleListing = WithNullable<RpcReturns<'public_resale_listings'>[number], 'offer_name' | 'note'>;

/** Libellés multilingues stockés en JSON ({ fr, en, ar }). */
export type LocalizedNames = { fr: string; en?: string; ar?: string } & Record<string, string | undefined>;
