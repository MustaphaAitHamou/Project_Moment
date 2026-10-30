-- =============================================================================
-- Tamurt Events — 0600 : billetterie multifournisseur
--   * ticket_providers / provider_events / ticket_offers : catalogue distribuable
--   * commercial_agreements / promotions : modèles de rémunération (paramétrables)
--   * reservations / orders / order_items / tickets / payment_references / refunds
--   * demo_provider.* : système d'information du fournisseur FICTIF DemoTicketProvider
--   * idempotency_keys / rate_limits / webhook_events : fiabilité des API
-- Séparation stricte démonstration / réel : colonne environment ('demo' | 'live')
-- contrôlée par contraintes et triggers. Le mode réel est désactivé par défaut.
-- =============================================================================

create table public.ticket_providers (
  id text primary key check (id ~ '^[a-z][a-z0-9_]{1,40}$'),
  display_name text not null,
  kind text not null check (kind in ('demo', 'partner_api')),
  status public.provider_status not null default 'disabled',
  is_demo boolean not null default false,
  declared_capabilities jsonb not null default '{}'::jsonb check (jsonb_typeof(declared_capabilities) = 'object'),
  supported_countries char(2)[] not null default '{}',
  contract_status text not null default 'no_agreement'
    check (contract_status in ('not_applicable', 'no_agreement', 'in_discussion', 'signed', 'terminated')),
  live_enabled boolean not null default false,
  integration_notes text,
  last_health_check_at timestamptz,
  last_health_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ticket_providers_demo_never_live check (not (is_demo and live_enabled)),
  constraint ticket_providers_live_requires_contract check (not live_enabled or contract_status = 'signed'),
  constraint ticket_providers_demo_status check (is_demo = (status = 'demo'))
);

comment on table public.ticket_providers is
  'Fournisseurs de billetterie. Aucun partenariat n''est présumé : contract_status reflète l''état réel des accords.';

create trigger ticket_providers_set_updated_at before update on public.ticket_providers
  for each row execute function public.set_updated_at();

insert into public.ticket_providers (id, display_name, kind, status, is_demo, contract_status, supported_countries, integration_notes, declared_capabilities)
values
  ('demo', 'DemoTicketProvider (fictif)', 'demo', 'demo', true, 'not_applicable', '{FR,DZ,US,CA}',
   'Fournisseur entièrement fictif utilisé pour la démonstration. Aucun billet émis n''est valable.',
   '{}'::jsonb),
  ('ticketmaster', 'Ticketmaster', 'partner_api', 'disabled', false, 'no_agreement', '{}',
   'Aucun accord de distribution. Connecteur non implémenté : nécessite un contrat et un accès API partenaire.', '{}'::jsonb),
  ('france_billet', 'France Billet', 'partner_api', 'disabled', false, 'no_agreement', '{}',
   'Aucun accord de distribution. Connecteur non implémenté.', '{}'::jsonb),
  ('see_tickets', 'See Tickets', 'partner_api', 'disabled', false, 'no_agreement', '{}',
   'Aucun accord de distribution. Connecteur non implémenté.', '{}'::jsonb),
  ('weezevent', 'Weezevent', 'partner_api', 'disabled', false, 'no_agreement', '{}',
   'Aucun accord de distribution. Connecteur non implémenté.', '{}'::jsonb);

create table public.provider_events (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.ticket_providers (id) on delete cascade,
  external_event_id text not null check (char_length(external_event_id) between 1 and 200),
  event_id uuid references public.events (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  sync_status text not null default 'linked' check (sync_status in ('linked', 'unlinked', 'error')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider_id, external_event_id)
);

create index provider_events_event_idx on public.provider_events (event_id);

create table public.ticket_offers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  provider_id text not null references public.ticket_providers (id),
  provider_event_id uuid references public.provider_events (id) on delete set null,
  external_offer_id text not null check (char_length(external_offer_id) between 1 and 200),
  environment public.commerce_environment not null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 300),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  face_value_minor bigint not null check (face_value_minor >= 0),
  provider_fee_minor bigint not null default 0 check (provider_fee_minor >= 0),
  min_per_order smallint not null default 1 check (min_per_order >= 1),
  max_per_order smallint not null default 10 check (max_per_order between 1 and 20),
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  status text not null default 'on_sale' check (status in ('on_sale', 'paused', 'sold_out', 'ended')),
  resale_allowed boolean not null default false,
  available_estimate integer check (available_estimate is null or available_estimate >= 0),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, external_offer_id),
  check (max_per_order >= min_per_order),
  check (sales_end_at is null or sales_start_at is null or sales_end_at > sales_start_at)
);

create index ticket_offers_event_idx on public.ticket_offers (event_id, sort_order);

create trigger ticket_offers_set_updated_at before update on public.ticket_offers
  for each row execute function public.set_updated_at();

create or replace function public.ticket_offers_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_provider public.ticket_providers;
  v_currency char(3);
begin
  select * into v_provider from public.ticket_providers p where p.id = new.provider_id;
  if v_provider.is_demo <> (new.environment = 'demo') then
    raise exception 'environment_provider_mismatch' using errcode = '23514';
  end if;
  select c.currency into v_currency
  from public.events e join public.countries c on c.code = e.country_code
  where e.id = new.event_id;
  if v_currency is distinct from new.currency then
    raise exception 'offer_currency_mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger ticket_offers_validate before insert or update on public.ticket_offers
  for each row execute function public.ticket_offers_validate();

-- -----------------------------------------------------------------------------
-- Accords commerciaux et promotions
-- -----------------------------------------------------------------------------
create table public.commercial_agreements (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.ticket_providers (id) on delete cascade,
  country_code char(2) references public.countries (code),
  organizer_id uuid references public.organizer_profiles (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  model public.agreement_model not null,
  status public.agreement_status not null default 'draft',
  commission_bps integer not null default 0 check (commission_bps between 0 and 10000),
  fee_share_bps integer not null default 0 check (fee_share_bps between 0 and 10000),
  catalog_discount_bps integer not null default 0 check (catalog_discount_bps between 0 and 10000),
  customer_service_fee_bps integer not null default 0 check (customer_service_fee_bps between 0 and 5000),
  customer_service_fee_fixed_minor bigint not null default 0 check (customer_service_fee_fixed_minor >= 0),
  promo_funding_allowed boolean not null default false,
  promo_max_bps integer not null default 0 check (promo_max_bps between 0 and 10000),
  valid_from timestamptz,
  valid_to timestamptz,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to > valid_from),
  check (promo_funding_allowed or promo_max_bps = 0)
);

comment on table public.commercial_agreements is
  'Conditions de rémunération. status=simulation : hypothèse de négociation (ex. objectif 10 %), jamais un tarif acquis.';

create index commercial_agreements_lookup_idx on public.commercial_agreements (provider_id, status);

create trigger commercial_agreements_set_updated_at before update on public.commercial_agreements
  for each row execute function public.set_updated_at();

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  code extensions.citext not null unique check (code ~ '^[A-Za-z0-9_-]{3,32}$'),
  description jsonb not null default '{}'::jsonb,
  agreement_id uuid not null references public.commercial_agreements (id) on delete cascade,
  discount_bps integer not null check (discount_bps between 1 and 10000),
  max_discount_minor bigint check (max_discount_minor is null or max_discount_minor > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemptions_count integer not null default 0 check (redemptions_count >= 0),
  is_demo boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Accord de SIMULATION pour le fournisseur fictif : objectif de négociation de 10 %.
insert into public.commercial_agreements
  (provider_id, model, status, commission_bps, customer_service_fee_bps, customer_service_fee_fixed_minor,
   promo_funding_allowed, promo_max_bps, notes)
values
  ('demo', 'distribution_commission', 'simulation', 1000, 200, 0, true, 500,
   'Simulation : commission de 10 % = objectif de négociation, non contractuel. Frais de service et promotions fictifs.');

insert into public.promotions (code, description, agreement_id, discount_bps, is_demo)
select 'DEMO5', '{"fr":"Remise de démonstration de 5 % financée par la commission Tamurt (simulation)","en":"5% demo discount funded by Tamurt commission (simulation)"}',
       a.id, 500, true
from public.commercial_agreements a where a.provider_id = 'demo';

-- -----------------------------------------------------------------------------
-- Garde-fou : le mode réel exige accord signé + activation explicite (pays, fournisseur, plateforme)
-- -----------------------------------------------------------------------------
create or replace function public.commerce_live_allowed(p_provider_id text, p_country_code char(2))
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (s.value ->> 'live_enabled')::boolean from public.app_settings s where s.key = 'commerce'), false)
     and exists (
       select 1 from public.ticket_providers p
       where p.id = p_provider_id and p.live_enabled and not p.is_demo and p.contract_status = 'signed' and p.status = 'live'
     )
     and exists (select 1 from public.countries c where c.code = p_country_code and c.ticket_sales_live_enabled)
$$;

-- -----------------------------------------------------------------------------
-- Réservations temporaires, commandes, billets
-- -----------------------------------------------------------------------------
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  offer_id uuid not null references public.ticket_offers (id) on delete cascade,
  provider_id text not null references public.ticket_providers (id),
  environment public.commerce_environment not null,
  quantity smallint not null check (quantity between 1 and 20),
  currency char(3) not null,
  unit_face_value_minor bigint not null check (unit_face_value_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  pricing jsonb not null,
  promotion_id uuid references public.promotions (id) on delete set null,
  provider_hold_ref text not null,
  status public.reservation_status not null default 'active',
  expires_at timestamptz not null,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 128),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  unique (provider_id, provider_hold_ref)
);

create index reservations_user_status_idx on public.reservations (user_id, status);
create index reservations_expiry_idx on public.reservations (expires_at) where status = 'active';

create trigger reservations_set_updated_at before update on public.reservations
  for each row execute function public.set_updated_at();

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique check (order_number ~ '^T[DL]-[0-9]{6}-[A-Z0-9]{8}$'),
  user_id uuid references auth.users (id) on delete set null,
  reservation_id uuid not null unique references public.reservations (id),
  event_id uuid not null references public.events (id),
  provider_id text not null references public.ticket_providers (id),
  environment public.commerce_environment not null,
  status public.order_status not null default 'pending_payment',
  currency char(3) not null,
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  provider_fees_minor bigint not null default 0 check (provider_fees_minor >= 0),
  service_fees_minor bigint not null default 0 check (service_fees_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  tax_added_minor bigint not null default 0 check (tax_added_minor >= 0),
  tax_included_minor bigint not null default 0 check (tax_included_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  pricing jsonb not null,
  promotion_id uuid references public.promotions (id) on delete set null,
  provider_order_ref text,
  payment_provider text not null,
  idempotency_key text not null,
  buyer_email extensions.citext,
  buyer_name text,
  expires_at timestamptz not null,
  paid_at timestamptz,
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  constraint orders_total_consistency check (
    total_minor = subtotal_minor + provider_fees_minor + service_fees_minor - discount_minor + tax_added_minor
  ),
  constraint orders_demo_payment check (environment = 'live' or payment_provider = 'demo'),
  constraint orders_number_env check (
    (environment = 'demo' and order_number like 'TD-%') or (environment = 'live' and order_number like 'TL-%')
  ),
  constraint orders_paid_at check (status not in ('paid', 'fulfilled') or paid_at is not null)
);

comment on table public.orders is 'Commandes. environment=demo : commande fictive, aucun paiement réel ; numéro préfixé TD-.';

create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_event_idx on public.orders (event_id, status);
create index orders_env_status_idx on public.orders (environment, status, created_at desc);

create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  offer_id uuid not null references public.ticket_offers (id),
  offer_name text not null,
  quantity smallint not null check (quantity between 1 and 20),
  unit_face_value_minor bigint not null check (unit_face_value_minor >= 0),
  unit_provider_fee_minor bigint not null default 0 check (unit_provider_fee_minor >= 0),
  unit_service_fee_minor bigint not null default 0 check (unit_service_fee_minor >= 0),
  line_total_minor bigint not null check (line_total_minor >= 0),
  constraint order_items_line_total check (
    line_total_minor = quantity * (unit_face_value_minor + unit_provider_fee_minor + unit_service_fee_minor)
  )
);

create index order_items_order_idx on public.order_items (order_id);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete set null,
  order_item_id uuid references public.order_items (id) on delete set null,
  event_id uuid not null references public.events (id),
  offer_id uuid references public.ticket_offers (id) on delete set null,
  owner_id uuid references auth.users (id) on delete set null,
  provider_id text not null references public.ticket_providers (id),
  provider_ticket_ref text not null,
  environment public.commerce_environment not null,
  status public.ticket_status not null default 'issued',
  source text not null default 'purchase' check (source in ('purchase', 'resale')),
  holder_name text check (holder_name is null or char_length(holder_name) <= 120),
  seat_label text check (seat_label is null or char_length(seat_label) <= 80),
  original_price_minor bigint not null check (original_price_minor >= 0),
  currency char(3) not null,
  delivery_mode text not null check (delivery_mode in ('demo_specimen', 'provider_app', 'provider_pdf', 'wallet_pass')),
  barcode_format text,
  barcode_value text,
  offline_allowed boolean not null default false,
  issued_at timestamptz not null default now(),
  voided_at timestamptz,
  transferred_to_ticket_id uuid references public.tickets (id) on delete set null,
  transferred_from_ticket_id uuid references public.tickets (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (provider_id, provider_ticket_ref),
  -- Un billet de démonstration ne porte JAMAIS de code-barres / QR code exploitable.
  constraint tickets_demo_no_barcode check (environment = 'live' or (barcode_value is null and barcode_format is null)),
  constraint tickets_demo_delivery check ((environment = 'demo') = (delivery_mode = 'demo_specimen'))
);

create index tickets_owner_idx on public.tickets (owner_id, status);
create index tickets_event_idx on public.tickets (event_id);
create index tickets_order_idx on public.tickets (order_id);

create table public.payment_references (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete cascade,
  resale_transaction_id uuid,
  provider text not null check (char_length(provider) between 2 and 40),
  environment public.commerce_environment not null,
  external_ref text not null,
  status public.payment_status not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency char(3) not null,
  failure_code text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_ref),
  constraint payment_references_target check (num_nonnulls(order_id, resale_transaction_id) = 1),
  constraint payment_references_demo check (environment = 'live' or provider = 'demo')
);

comment on column public.payment_references.raw is
  'Réponse PSP assainie. Ne contient JAMAIS de numéro de carte, cryptogramme ou donnée sensible de paiement.';

create index payment_references_order_idx on public.payment_references (order_id);

create trigger payment_references_set_updated_at before update on public.payment_references
  for each row execute function public.set_updated_at();

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete cascade,
  resale_transaction_id uuid,
  payment_reference_id uuid references public.payment_references (id) on delete set null,
  environment public.commerce_environment not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  reason text not null check (char_length(reason) between 2 and 500),
  status public.refund_status not null default 'requested',
  requested_by uuid references auth.users (id) on delete set null,
  provider_refund_ref text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint refunds_target check (num_nonnulls(order_id, resale_transaction_id) = 1)
);

create index refunds_order_idx on public.refunds (order_id);

-- -----------------------------------------------------------------------------
-- Fiabilité : idempotence, limitation de débit, webhooks
-- -----------------------------------------------------------------------------
create table public.idempotency_keys (
  user_id uuid not null,
  scope text not null check (char_length(scope) between 2 and 64),
  key text not null check (char_length(key) between 8 and 128),
  request_hash text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  response_status integer,
  response_body jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  primary key (user_id, scope, key)
);

create index idempotency_keys_expiry_idx on public.idempotency_keys (expires_at);

create table public.rate_limits (
  bucket text not null check (char_length(bucket) between 3 and 200),
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  event_type text not null,
  signature_valid boolean not null,
  payload jsonb not null,
  status text not null default 'received' check (status in ('received', 'processed', 'failed', 'ignored')),
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, external_event_id)
);

-- =============================================================================
-- Système d'information du fournisseur FICTIF (DemoTicketProvider)
-- Schéma non exposé par l'API : accessible uniquement via les fonctions RPC
-- demo_provider_* réservées au rôle service.
-- =============================================================================
create schema if not exists demo_provider;
revoke all on schema demo_provider from public;
revoke all on schema demo_provider from anon, authenticated;

create table demo_provider.inventory (
  offer_ref text primary key,
  event_ref text not null,
  label text not null,
  currency char(3) not null,
  face_value_minor bigint not null check (face_value_minor >= 0),
  booking_fee_minor bigint not null default 0 check (booking_fee_minor >= 0),
  capacity integer not null check (capacity >= 0),
  sold integer not null default 0 check (sold >= 0),
  held integer not null default 0 check (held >= 0),
  max_per_order smallint not null default 10 check (max_per_order between 1 and 20),
  transferable boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint inventory_stock_check check (sold + held <= capacity)
);

create table demo_provider.holds (
  hold_ref text primary key,
  offer_ref text not null references demo_provider.inventory (offer_ref) on delete cascade,
  quantity integer not null check (quantity > 0),
  status text not null check (status in ('held', 'confirmed', 'released', 'expired')),
  expires_at timestamptz not null,
  client_key text unique,
  order_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index demo_holds_expiry_idx on demo_provider.holds (offer_ref, expires_at) where status = 'held';

create table demo_provider.orders (
  order_ref text primary key,
  hold_ref text not null unique references demo_provider.holds (hold_ref),
  offer_ref text not null references demo_provider.inventory (offer_ref),
  quantity integer not null check (quantity > 0),
  amount_minor bigint not null check (amount_minor >= 0),
  currency char(3) not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'refunded')),
  created_at timestamptz not null default now(),
  refunded_at timestamptz
);

create table demo_provider.tickets (
  ticket_ref text primary key,
  order_ref text references demo_provider.orders (order_ref),
  offer_ref text not null references demo_provider.inventory (offer_ref),
  holder_ref text,
  status text not null default 'valid_demo' check (status in ('valid_demo', 'void', 'refunded')),
  reissued_from text references demo_provider.tickets (ticket_ref),
  created_at timestamptz not null default now(),
  voided_at timestamptz
);

create index demo_tickets_order_idx on demo_provider.tickets (order_ref);

create or replace function demo_provider.new_ref(p_prefix text)
returns text
language sql
volatile
set search_path = ''
as $$
  select p_prefix || '-' || upper(encode(extensions.gen_random_bytes(8), 'hex'))
$$;
