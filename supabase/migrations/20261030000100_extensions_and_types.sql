-- =============================================================================
-- Tamurt Events — 0100 : extensions, fonctions utilitaires et types énumérés
-- =============================================================================
-- Conventions :
--   * Tous les montants sont stockés en unités mineures entières (bigint) + devise ISO 4217.
--   * Toutes les dates sont des timestamptz (UTC) + un fuseau IANA explicite par événement.
--   * Les fonctions SECURITY DEFINER fixent search_path = '' et qualifient tous les objets.
-- =============================================================================

create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Fonctions utilitaires immuables (utilisables dans les index)
-- -----------------------------------------------------------------------------
create or replace function public.immutable_unaccent(input text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, input)
$$;

comment on function public.immutable_unaccent(text) is
  'Wrapper IMMUTABLE de unaccent() pour les index et colonnes de recherche.';

create or replace function public.search_normalize(input text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(public.immutable_unaccent(coalesce(input, '')))
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.is_valid_timezone(tz text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = tz)
$$;

create or replace function public.is_valid_slug(value text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select value ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(value) between 1 and 120
$$;

-- Point géographique (WGS84) à partir de lat/lng ; NULL si incomplet.
create or replace function public.make_geo_point(lat double precision, lng double precision)
returns extensions.geography
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when lat is null or lng is null then null
    else extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
  end
$$;

-- -----------------------------------------------------------------------------
-- Types énumérés
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('organizer', 'moderator', 'admin', 'beta_tester');
create type public.region_type as enum ('region', 'department', 'wilaya', 'state', 'province', 'territory', 'other');
create type public.organizer_kind as enum ('individual', 'association', 'professional');
create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
create type public.organizer_member_role as enum ('owner', 'admin', 'editor', 'analyst');
create type public.event_status as enum ('draft', 'pending_review', 'published', 'rejected', 'cancelled', 'archived');
create type public.event_visibility as enum ('public', 'unlisted', 'private');
create type public.registration_mode as enum ('none', 'free_registration', 'tickets');
create type public.media_status as enum ('pending', 'approved', 'rejected');
create type public.commerce_environment as enum ('demo', 'live');
create type public.provider_status as enum ('disabled', 'demo', 'sandbox', 'live');
create type public.agreement_model as enum ('distribution_commission', 'fee_share', 'catalog_discount');
create type public.agreement_status as enum ('draft', 'simulation', 'active', 'expired');
create type public.reservation_status as enum ('active', 'converted', 'expired', 'released', 'failed');
create type public.order_status as enum ('pending_payment', 'paid', 'fulfilled', 'payment_failed', 'cancelled', 'refunded', 'expired');
create type public.ticket_status as enum ('issued', 'void', 'transferred', 'refunded', 'used');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded');
create type public.refund_status as enum ('requested', 'processing', 'succeeded', 'failed', 'rejected');
create type public.resale_listing_status as enum ('active', 'reserved', 'sold', 'cancelled', 'expired', 'removed');
create type public.resale_tx_status as enum (
  'initiated', 'payment_pending', 'paid', 'transfer_pending', 'completed', 'failed', 'cancelled', 'refunded', 'disputed'
);
create type public.dispute_status as enum ('open', 'investigating', 'resolved_buyer', 'resolved_seller', 'closed');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.report_reason as enum (
  'fake_event', 'scam', 'inappropriate', 'wrong_information', 'duplicate', 'cancelled_not_updated',
  'counterfeit_ticket', 'price_abuse', 'harassment', 'spam', 'other'
);
create type public.moderation_target as enum (
  'event', 'organizer', 'user', 'venue', 'artist', 'media', 'resale_listing', 'resale_transaction', 'beta_feedback', 'report'
);
create type public.outbox_status as enum ('pending', 'sent', 'failed', 'skipped');
create type public.beta_waitlist_status as enum ('pending_verification', 'verified', 'invited', 'accepted', 'declined', 'removed');
create type public.feedback_kind as enum ('bug', 'suggestion', 'rating');
create type public.feedback_status as enum ('new', 'triaged', 'planned', 'done', 'wont_fix');
