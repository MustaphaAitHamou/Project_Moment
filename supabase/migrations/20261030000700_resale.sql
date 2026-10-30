-- =============================================================================
-- Tamurt Events — 0700 : revente de billets entre particuliers
-- Principe de sécurité : seuls des billets émis via Tamurt par un fournisseur capable
-- de vérifier la propriété et de transférer/réémettre le titre peuvent être revendus.
-- Un PDF ou un QR code fourni par un utilisateur n'est JAMAIS accepté.
-- La revente réelle reste désactivée (mode démonstration) tant que les conditions
-- légales et techniques ne sont pas réunies (voir resale_live_allowed).
-- =============================================================================

create table public.resale_rules (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) references public.countries (code) on delete cascade,
  organizer_id uuid references public.organizer_profiles (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  enabled boolean not null default true,
  max_price_bps integer not null default 10000 check (max_price_bps between 0 and 100000),
  min_price_bps integer not null default 0 check (min_price_bps >= 0),
  seller_fee_bps integer not null default 0 check (seller_fee_bps between 0 and 3000),
  buyer_fee_bps integer not null default 0 check (buyer_fee_bps between 0 and 3000),
  buyer_fee_fixed_minor bigint not null default 0 check (buyer_fee_fixed_minor >= 0),
  listing_cutoff_hours integer not null default 2 check (listing_cutoff_hours between 0 and 168),
  legal_status text not null default 'not_reviewed'
    check (legal_status in ('not_reviewed', 'allowed_with_conditions', 'prohibited')),
  notes text,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resale_rules_scope check (num_nonnulls(country_code, organizer_id, event_id) = 1),
  constraint resale_rules_min_max check (min_price_bps <= max_price_bps)
);

comment on table public.resale_rules is
  'Restrictions tarifaires paramétrables (pays > organisateur > événement). Valeurs par défaut prudentes, à valider juridiquement.';

create unique index resale_rules_country_uniq on public.resale_rules (country_code) where country_code is not null;
create unique index resale_rules_organizer_uniq on public.resale_rules (organizer_id) where organizer_id is not null;
create unique index resale_rules_event_uniq on public.resale_rules (event_id) where event_id is not null;

create trigger resale_rules_set_updated_at before update on public.resale_rules
  for each row execute function public.set_updated_at();

-- Par défaut : prix de revente plafonné au prix d'origine (aucune majoration),
-- frais acheteur de 5 % uniquement en simulation.
insert into public.resale_rules (country_code, enabled, max_price_bps, buyer_fee_bps, notes)
values
  ('FR', true, 10000, 500, 'Défaut prudent : revente au prix d''origine maximum. Cadre légal à valider (revente de billets).'),
  ('DZ', true, 10000, 500, 'Défaut prudent. Cadre légal algérien à valider.'),
  ('US', true, 10000, 500, 'Défaut prudent. Réglementations des États à valider.'),
  ('CA', true, 10000, 500, 'Défaut prudent. Réglementations provinciales (ex. Québec, Ontario) à valider.');

create table public.resale_listings (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id),
  seller_id uuid references auth.users (id) on delete set null,
  event_id uuid not null references public.events (id),
  offer_id uuid references public.ticket_offers (id) on delete set null,
  environment public.commerce_environment not null,
  currency char(3) not null,
  original_price_minor bigint not null check (original_price_minor >= 0),
  asking_price_minor bigint not null check (asking_price_minor > 0),
  max_allowed_price_minor bigint not null check (max_allowed_price_minor >= 0),
  buyer_fee_minor bigint not null default 0 check (buyer_fee_minor >= 0),
  seller_fee_minor bigint not null default 0 check (seller_fee_minor >= 0),
  status public.resale_listing_status not null default 'active',
  note text check (note is null or char_length(note) <= 500),
  reserved_until timestamptz,
  reserved_by uuid references auth.users (id) on delete set null,
  removed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sold_at timestamptz,
  cancelled_at timestamptz,
  constraint resale_listings_price_cap check (asking_price_minor <= max_allowed_price_minor),
  constraint resale_listings_fee_le_price check (seller_fee_minor <= asking_price_minor),
  constraint resale_listings_reserved check (status <> 'reserved' or reserved_until is not null)
);

-- Détection des doublons : un billet ne peut avoir qu'une seule annonce active.
create unique index resale_listings_ticket_active_uniq on public.resale_listings (ticket_id)
  where status in ('active', 'reserved');
create index resale_listings_event_status_idx on public.resale_listings (event_id, status);
create index resale_listings_seller_idx on public.resale_listings (seller_id, status);

create trigger resale_listings_set_updated_at before update on public.resale_listings
  for each row execute function public.set_updated_at();

create table public.resale_transactions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.resale_listings (id),
  buyer_id uuid references auth.users (id) on delete set null,
  seller_id uuid references auth.users (id) on delete set null,
  environment public.commerce_environment not null,
  status public.resale_tx_status not null default 'initiated',
  currency char(3) not null,
  price_minor bigint not null check (price_minor > 0),
  buyer_fee_minor bigint not null default 0 check (buyer_fee_minor >= 0),
  seller_fee_minor bigint not null default 0 check (seller_fee_minor >= 0),
  total_minor bigint not null check (total_minor > 0),
  seller_payout_minor bigint not null check (seller_payout_minor >= 0),
  original_ticket_id uuid not null references public.tickets (id),
  new_ticket_id uuid references public.tickets (id),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 128),
  expires_at timestamptz not null,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (buyer_id, idempotency_key),
  constraint resale_tx_total check (total_minor = price_minor + buyer_fee_minor),
  constraint resale_tx_payout check (seller_payout_minor = price_minor - seller_fee_minor),
  constraint resale_tx_parties check (buyer_id is null or seller_id is null or buyer_id <> seller_id)
);

create unique index resale_tx_active_per_listing on public.resale_transactions (listing_id)
  where status in ('initiated', 'payment_pending', 'paid', 'transfer_pending');
create index resale_tx_buyer_idx on public.resale_transactions (buyer_id, created_at desc);
create index resale_tx_seller_idx on public.resale_transactions (seller_id, created_at desc);

create trigger resale_transactions_set_updated_at before update on public.resale_transactions
  for each row execute function public.set_updated_at();

alter table public.payment_references
  add constraint payment_references_resale_fk foreign key (resale_transaction_id)
  references public.resale_transactions (id) on delete cascade;
alter table public.refunds
  add constraint refunds_resale_fk foreign key (resale_transaction_id)
  references public.resale_transactions (id) on delete cascade;
create index payment_references_resale_idx on public.payment_references (resale_transaction_id);

create table public.resale_transaction_events (
  id bigint generated always as identity primary key,
  transaction_id uuid not null references public.resale_transactions (id) on delete cascade,
  from_status public.resale_tx_status,
  to_status public.resale_tx_status not null,
  actor_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create index resale_tx_events_tx_idx on public.resale_transaction_events (transaction_id, id);

create table public.resale_disputes (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.resale_transactions (id) on delete cascade,
  opened_by uuid references auth.users (id) on delete set null,
  reason text not null check (reason in ('ticket_not_received', 'ticket_invalid', 'event_cancelled', 'not_as_described', 'payment_issue', 'other')),
  details text check (details is null or char_length(details) <= 2000),
  status public.dispute_status not null default 'open',
  resolution text check (resolution is null or char_length(resolution) <= 2000),
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index resale_disputes_open_uniq on public.resale_disputes (transaction_id)
  where status in ('open', 'investigating');

create trigger resale_disputes_set_updated_at before update on public.resale_disputes
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Machine d'état des transactions (miroir de packages/core/src/resale.ts)
-- -----------------------------------------------------------------------------
create or replace function public.resale_tx_transition_allowed(
  p_from public.resale_tx_status,
  p_to public.resale_tx_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_from
    when 'initiated' then p_to in ('payment_pending', 'cancelled', 'failed')
    when 'payment_pending' then p_to in ('paid', 'failed', 'cancelled')
    when 'paid' then p_to in ('transfer_pending', 'refunded', 'failed', 'disputed')
    when 'transfer_pending' then p_to in ('completed', 'failed', 'refunded', 'disputed')
    when 'completed' then p_to in ('disputed', 'refunded')
    when 'failed' then p_to in ('refunded', 'disputed')
    when 'disputed' then p_to in ('completed', 'refunded', 'failed')
    else false
  end
$$;

create or replace function public.resale_transactions_track()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if not public.resale_tx_transition_allowed(old.status, new.status) then
      raise exception 'invalid_status_transition' using errcode = '23514',
        detail = old.status::text || ' -> ' || new.status::text;
    end if;
    if new.status = 'completed' then
      new.completed_at := coalesce(new.completed_at, now());
    end if;
    insert into public.resale_transaction_events (transaction_id, from_status, to_status, actor_id, note)
    values (new.id, old.status, new.status, auth.uid(), new.failure_reason);
  end if;
  return new;
end;
$$;

create trigger resale_transactions_track before update on public.resale_transactions
  for each row execute function public.resale_transactions_track();

create or replace function public.resale_transactions_track_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.resale_transaction_events (transaction_id, from_status, to_status, actor_id)
  values (new.id, null, new.status, auth.uid());
  return null;
end;
$$;

create trigger resale_transactions_track_insert after insert on public.resale_transactions
  for each row execute function public.resale_transactions_track_insert();

-- -----------------------------------------------------------------------------
-- Règles applicables et autorisation du mode réel
-- -----------------------------------------------------------------------------
create or replace function public.resale_effective_rule(p_event_id uuid)
returns public.resale_rules
language sql
stable
security definer
set search_path = ''
as $$
  select r.*
  from public.resale_rules r
  join public.events e on e.id = p_event_id
  where r.event_id = e.id or r.organizer_id = e.organizer_id or r.country_code = e.country_code
  order by (r.event_id is not null) desc, (r.organizer_id is not null) desc
  limit 1
$$;

create or replace function public.resale_live_allowed(p_country_code char(2), p_provider_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (s.value ->> 'live_enabled')::boolean from public.app_settings s where s.key = 'resale'), false)
     and exists (
       select 1 from public.countries c
       where c.code = p_country_code and c.resale_live_enabled and c.resale_legal_status = 'allowed_with_conditions'
     )
     and exists (
       select 1 from public.ticket_providers p
       where p.id = p_provider_id and p.live_enabled and p.contract_status = 'signed'
         and coalesce((p.declared_capabilities ->> 'ticket.transfer')::boolean, false)
         and coalesce((p.declared_capabilities ->> 'ticket.ownership_verification')::boolean, false)
     )
$$;

-- Arrondi « demi vers le haut » sur entiers (montants positifs) : miroir de core/money.ts
create or replace function public.bps_of(p_amount bigint, p_bps integer)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select ((p_amount * p_bps) + 5000) / 10000
$$;

create or replace function public.resale_quote(p_ticket_id uuid, p_asking_price_minor bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ticket public.tickets;
  v_rule public.resale_rules;
  v_max bigint;
  v_min bigint;
begin
  select * into v_ticket from public.tickets t where t.id = p_ticket_id;
  if not found then
    raise exception 'ticket_not_found' using errcode = 'P0002';
  end if;
  v_rule := public.resale_effective_rule(v_ticket.event_id);
  if v_rule.id is null then
    raise exception 'resale_not_allowed' using errcode = 'P0001';
  end if;
  v_max := (v_ticket.original_price_minor * v_rule.max_price_bps) / 10000;
  v_min := ((v_ticket.original_price_minor * v_rule.min_price_bps) + 9999) / 10000;
  return jsonb_build_object(
    'rule_id', v_rule.id,
    'enabled', v_rule.enabled and v_rule.legal_status <> 'prohibited',
    'currency', v_ticket.currency,
    'original_price_minor', v_ticket.original_price_minor,
    'min_allowed_price_minor', v_min,
    'max_allowed_price_minor', v_max,
    'buyer_fee_minor', case when p_asking_price_minor is null then null
                            else public.bps_of(p_asking_price_minor, v_rule.buyer_fee_bps) + v_rule.buyer_fee_fixed_minor end,
    'seller_fee_minor', case when p_asking_price_minor is null then null
                             else public.bps_of(p_asking_price_minor, v_rule.seller_fee_bps) end,
    'buyer_fee_bps', v_rule.buyer_fee_bps,
    'buyer_fee_fixed_minor', v_rule.buyer_fee_fixed_minor,
    'seller_fee_bps', v_rule.seller_fee_bps,
    'listing_cutoff_hours', v_rule.listing_cutoff_hours,
    'legal_status', v_rule.legal_status
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Annonces
-- -----------------------------------------------------------------------------
create or replace function public.resale_create_listing(
  p_seller_id uuid,
  p_ticket_id uuid,
  p_asking_price_minor bigint,
  p_note text
)
returns public.resale_listings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.tickets;
  v_event public.events;
  v_offer public.ticket_offers;
  v_rule public.resale_rules;
  v_settings jsonb;
  v_quote jsonb;
  v_listing public.resale_listings;
  v_count integer;
begin
  if exists (select 1 from public.profiles p where p.id = p_seller_id and (p.is_suspended or p.deleted_at is not null)) then
    raise exception 'account_suspended' using errcode = '42501';
  end if;

  select * into v_ticket from public.tickets t where t.id = p_ticket_id for update;
  if not found or v_ticket.owner_id is distinct from p_seller_id then
    raise exception 'ticket_not_found' using errcode = 'P0002';
  end if;
  if v_ticket.status <> 'issued' then
    raise exception 'ticket_not_resellable' using errcode = 'P0001';
  end if;
  select * into v_event from public.events e where e.id = v_ticket.event_id;
  select * into v_offer from public.ticket_offers o where o.id = v_ticket.offer_id;
  if v_offer.id is null or not v_offer.resale_allowed then
    raise exception 'resale_not_allowed' using errcode = 'P0001';
  end if;
  if v_event.status <> 'published' or v_event.deleted_at is not null then
    raise exception 'event_not_on_sale' using errcode = 'P0001';
  end if;

  v_rule := public.resale_effective_rule(v_ticket.event_id);
  if v_rule.id is null or not v_rule.enabled or v_rule.legal_status = 'prohibited' then
    raise exception 'resale_not_allowed' using errcode = 'P0001';
  end if;
  if v_event.starts_at - make_interval(hours => v_rule.listing_cutoff_hours) <= now() then
    raise exception 'resale_window_closed' using errcode = 'P0001';
  end if;

  select s.value into v_settings from public.app_settings s where s.key = 'resale';
  if v_ticket.environment = 'live' then
    if not public.resale_live_allowed(v_event.country_code, v_ticket.provider_id) then
      raise exception 'resale_live_disabled' using errcode = 'P0001';
    end if;
  elsif not coalesce((v_settings ->> 'demo_enabled')::boolean, false) then
    raise exception 'resale_demo_disabled' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('resale-listings:' || p_seller_id::text, 0));
  select count(*) into v_count from public.resale_listings l
  where l.seller_id = p_seller_id and l.status in ('active', 'reserved');
  if v_count >= coalesce((v_settings ->> 'max_active_listings_per_user')::integer, 20) then
    raise exception 'too_many_active_listings' using errcode = 'P0001';
  end if;
  select count(*) into v_count from public.resale_listings l
  where l.seller_id = p_seller_id and l.event_id = v_ticket.event_id and l.status in ('active', 'reserved');
  if v_count >= coalesce((v_settings ->> 'max_active_listings_per_event')::integer, 8) then
    raise exception 'too_many_listings_for_event' using errcode = 'P0001';
  end if;

  v_quote := public.resale_quote(p_ticket_id, p_asking_price_minor);
  if p_asking_price_minor > (v_quote ->> 'max_allowed_price_minor')::bigint then
    raise exception 'resale_price_above_cap' using errcode = 'P0001', detail = v_quote::text;
  end if;
  if p_asking_price_minor < (v_quote ->> 'min_allowed_price_minor')::bigint or p_asking_price_minor <= 0 then
    raise exception 'resale_price_below_minimum' using errcode = 'P0001', detail = v_quote::text;
  end if;

  begin
    insert into public.resale_listings (
      ticket_id, seller_id, event_id, offer_id, environment, currency, original_price_minor, asking_price_minor,
      max_allowed_price_minor, buyer_fee_minor, seller_fee_minor, note
    ) values (
      v_ticket.id, p_seller_id, v_ticket.event_id, v_ticket.offer_id, v_ticket.environment, v_ticket.currency,
      v_ticket.original_price_minor, p_asking_price_minor, (v_quote ->> 'max_allowed_price_minor')::bigint,
      (v_quote ->> 'buyer_fee_minor')::bigint, (v_quote ->> 'seller_fee_minor')::bigint, nullif(btrim(p_note), '')
    )
    returning * into v_listing;
  exception when unique_violation then
    raise exception 'ticket_already_listed' using errcode = '23505';
  end;
  return v_listing;
end;
$$;

create or replace function public.resale_cancel_listing(p_seller_id uuid, p_listing_id uuid)
returns public.resale_listings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing public.resale_listings;
begin
  select * into v_listing from public.resale_listings l where l.id = p_listing_id for update;
  if not found or v_listing.seller_id is distinct from p_seller_id then
    raise exception 'listing_not_found' using errcode = 'P0002';
  end if;
  if v_listing.status = 'reserved' then
    raise exception 'listing_reserved' using errcode = 'P0001';
  end if;
  if v_listing.status <> 'active' then
    return v_listing;
  end if;
  update public.resale_listings set status = 'cancelled', cancelled_at = now()
  where id = p_listing_id returning * into v_listing;
  return v_listing;
end;
$$;

-- -----------------------------------------------------------------------------
-- Achat d'une annonce
-- -----------------------------------------------------------------------------
create or replace function public.resale_start_purchase(
  p_buyer_id uuid,
  p_listing_id uuid,
  p_idempotency_key text,
  p_ttl_seconds integer default 600
)
returns public.resale_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tx public.resale_transactions;
  v_listing public.resale_listings;
  v_event public.events;
  v_settings jsonb;
begin
  select * into v_tx from public.resale_transactions t
  where t.buyer_id = p_buyer_id and t.idempotency_key = p_idempotency_key;
  if found then
    return v_tx;
  end if;
  if exists (select 1 from public.profiles p where p.id = p_buyer_id and (p.is_suspended or p.deleted_at is not null)) then
    raise exception 'account_suspended' using errcode = '42501';
  end if;

  select * into v_listing from public.resale_listings l where l.id = p_listing_id for update;
  if not found then
    raise exception 'listing_not_found' using errcode = 'P0002';
  end if;
  if v_listing.seller_id = p_buyer_id then
    raise exception 'cannot_buy_own_listing' using errcode = 'P0001';
  end if;
  if v_listing.status <> 'active' then
    raise exception 'listing_not_available' using errcode = 'P0001';
  end if;
  select * into v_event from public.events e where e.id = v_listing.event_id;
  if v_event.status <> 'published' or v_event.starts_at <= now() then
    raise exception 'event_not_on_sale' using errcode = 'P0001';
  end if;
  select s.value into v_settings from public.app_settings s where s.key = 'resale';
  if v_listing.environment = 'live' then
    if not public.resale_live_allowed(v_event.country_code,
                                      (select t.provider_id from public.tickets t where t.id = v_listing.ticket_id)) then
      raise exception 'resale_live_disabled' using errcode = 'P0001';
    end if;
  elsif not coalesce((v_settings ->> 'demo_enabled')::boolean, false) then
    raise exception 'resale_demo_disabled' using errcode = 'P0001';
  end if;

  insert into public.resale_transactions (
    listing_id, buyer_id, seller_id, environment, status, currency, price_minor, buyer_fee_minor, seller_fee_minor,
    total_minor, seller_payout_minor, original_ticket_id, idempotency_key, expires_at
  ) values (
    v_listing.id, p_buyer_id, v_listing.seller_id, v_listing.environment, 'payment_pending', v_listing.currency,
    v_listing.asking_price_minor, v_listing.buyer_fee_minor, v_listing.seller_fee_minor,
    v_listing.asking_price_minor + v_listing.buyer_fee_minor,
    v_listing.asking_price_minor - v_listing.seller_fee_minor,
    v_listing.ticket_id, p_idempotency_key,
    now() + make_interval(secs => greatest(60, least(coalesce(p_ttl_seconds, 600), 1800)))
  )
  returning * into v_tx;

  update public.resale_listings
     set status = 'reserved', reserved_until = v_tx.expires_at, reserved_by = p_buyer_id
   where id = v_listing.id;
  return v_tx;
end;
$$;

create or replace function public.resale_record_payment(
  p_tx_id uuid,
  p_provider text,
  p_external_ref text,
  p_status public.payment_status,
  p_amount_minor bigint,
  p_currency char(3),
  p_failure_code text default null,
  p_raw jsonb default '{}'::jsonb
)
returns public.resale_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tx public.resale_transactions;
begin
  select * into v_tx from public.resale_transactions t where t.id = p_tx_id for update;
  if not found then
    raise exception 'transaction_not_found' using errcode = 'P0002';
  end if;
  if v_tx.environment = 'demo' and p_provider <> 'demo' then
    raise exception 'demo_requires_demo_payment' using errcode = 'P0001';
  end if;

  insert into public.payment_references (resale_transaction_id, provider, environment, external_ref, status, amount_minor,
                                         currency, failure_code, raw)
  values (p_tx_id, p_provider, v_tx.environment, p_external_ref, p_status, p_amount_minor, p_currency, p_failure_code,
          coalesce(p_raw, '{}'::jsonb))
  on conflict (provider, external_ref) do update
    set status = excluded.status, failure_code = excluded.failure_code, raw = excluded.raw, updated_at = now();

  if p_status = 'succeeded' then
    if v_tx.status in ('paid', 'transfer_pending', 'completed') then
      return v_tx;
    end if;
    if v_tx.status <> 'payment_pending' then
      raise exception 'transaction_not_payable' using errcode = 'P0001';
    end if;
    if v_tx.expires_at <= now() then
      raise exception 'transaction_expired' using errcode = 'P0001';
    end if;
    if p_amount_minor <> v_tx.total_minor or p_currency <> v_tx.currency then
      raise exception 'amount_mismatch' using errcode = 'P0001';
    end if;
    update public.resale_transactions set status = 'paid' where id = p_tx_id;
    update public.resale_transactions set status = 'transfer_pending' where id = p_tx_id returning * into v_tx;
  end if;
  return v_tx;
end;
$$;

create or replace function public.resale_complete_transfer(p_tx_id uuid, p_new_provider_ticket_ref text)
returns public.resale_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tx public.resale_transactions;
  v_old public.tickets;
  v_new_id uuid;
  v_buyer_name text;
begin
  select * into v_tx from public.resale_transactions t where t.id = p_tx_id for update;
  if not found then
    raise exception 'transaction_not_found' using errcode = 'P0002';
  end if;
  if v_tx.status = 'completed' then
    return v_tx;
  end if;
  if v_tx.status <> 'transfer_pending' then
    raise exception 'transaction_not_transferable' using errcode = 'P0001';
  end if;
  select * into v_old from public.tickets t where t.id = v_tx.original_ticket_id for update;
  if v_old.status <> 'issued' or v_old.owner_id is distinct from v_tx.seller_id then
    raise exception 'ticket_not_resellable' using errcode = 'P0001';
  end if;
  select p.display_name into v_buyer_name from public.profiles p where p.id = v_tx.buyer_id;

  insert into public.tickets (
    order_id, order_item_id, event_id, offer_id, owner_id, provider_id, provider_ticket_ref, environment, source,
    holder_name, seat_label, original_price_minor, currency, delivery_mode, offline_allowed, transferred_from_ticket_id
  ) values (
    null, null, v_old.event_id, v_old.offer_id, v_tx.buyer_id, v_old.provider_id, p_new_provider_ticket_ref,
    v_old.environment, 'resale', v_buyer_name, v_old.seat_label, v_old.original_price_minor, v_old.currency,
    v_old.delivery_mode, v_old.offline_allowed, v_old.id
  )
  returning id into v_new_id;

  update public.tickets set status = 'transferred', voided_at = now(), transferred_to_ticket_id = v_new_id
  where id = v_old.id;
  update public.resale_listings set status = 'sold', sold_at = now(), reserved_until = null where id = v_tx.listing_id;
  update public.resale_transactions set status = 'completed', new_ticket_id = v_new_id where id = p_tx_id
  returning * into v_tx;

  perform public.notify_user(v_tx.seller_id, 'resale_listing_sold',
    jsonb_build_object('transaction_id', v_tx.id, 'event_id', v_old.event_id, 'environment', v_tx.environment),
    '/account/resale', 'resale_sold:' || v_tx.id::text, v_tx.environment = 'demo');
  perform public.notify_user(v_tx.buyer_id, 'resale_purchase_completed',
    jsonb_build_object('transaction_id', v_tx.id, 'event_id', v_old.event_id, 'ticket_id', v_new_id,
                       'environment', v_tx.environment),
    '/account/tickets/' || v_new_id::text, 'resale_bought:' || v_tx.id::text, v_tx.environment = 'demo');
  return v_tx;
end;
$$;

create or replace function public.resale_fail_transaction(p_tx_id uuid, p_status public.resale_tx_status, p_reason text)
returns public.resale_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tx public.resale_transactions;
begin
  if p_status not in ('failed', 'cancelled', 'refunded') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  select * into v_tx from public.resale_transactions t where t.id = p_tx_id for update;
  if not found then
    raise exception 'transaction_not_found' using errcode = 'P0002';
  end if;
  if v_tx.status = p_status then
    return v_tx;
  end if;
  update public.resale_transactions set status = p_status, failure_reason = left(p_reason, 300)
  where id = p_tx_id returning * into v_tx;
  update public.resale_listings set status = 'active', reserved_until = null, reserved_by = null
  where id = v_tx.listing_id and status = 'reserved';
  return v_tx;
end;
$$;

create or replace function public.resale_open_dispute(
  p_user_id uuid,
  p_tx_id uuid,
  p_reason text,
  p_details text
)
returns public.resale_disputes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tx public.resale_transactions;
  v_dispute public.resale_disputes;
begin
  select * into v_tx from public.resale_transactions t where t.id = p_tx_id for update;
  if not found or p_user_id not in (v_tx.buyer_id, v_tx.seller_id) then
    raise exception 'transaction_not_found' using errcode = 'P0002';
  end if;
  if v_tx.status not in ('paid', 'transfer_pending', 'completed', 'failed') then
    raise exception 'dispute_not_allowed' using errcode = 'P0001';
  end if;
  begin
    insert into public.resale_disputes (transaction_id, opened_by, reason, details)
    values (p_tx_id, p_user_id, p_reason, nullif(btrim(p_details), ''))
    returning * into v_dispute;
  exception when unique_violation then
    raise exception 'dispute_already_open' using errcode = '23505';
  end;
  update public.resale_transactions set status = 'disputed', failure_reason = 'dispute:' || p_reason where id = p_tx_id;
  return v_dispute;
end;
$$;
