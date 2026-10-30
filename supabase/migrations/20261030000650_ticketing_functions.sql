-- =============================================================================
-- Tamurt Events — 0650 : fonctions transactionnelles de billetterie
--   * demo_provider_* : primitives atomiques du fournisseur fictif (stock, blocage,
--     confirmation, remboursement, transfert/réémission)
--   * checkout_*      : cycle réservation -> commande -> paiement -> billets
--   * idempotency_* / rate_limit_hit : fiabilité des routes API
-- Toutes ces fonctions sont réservées au rôle service (voir 1200_rls.sql).
-- Convention d'erreur : le message de l'exception est un code machine (ex. sold_out).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- DemoTicketProvider — primitives atomiques
-- -----------------------------------------------------------------------------
create or replace function demo_provider.hold_json(p_hold demo_provider.holds, p_replayed boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'hold_ref', p_hold.hold_ref,
    'offer_ref', p_hold.offer_ref,
    'quantity', p_hold.quantity,
    'status', p_hold.status,
    'expires_at', p_hold.expires_at,
    'order_ref', p_hold.order_ref,
    'replayed', p_replayed
  )
$$;

create or replace function demo_provider.order_json(p_order_ref text, p_replayed boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'order_ref', o.order_ref,
    'hold_ref', o.hold_ref,
    'offer_ref', o.offer_ref,
    'quantity', o.quantity,
    'amount_minor', o.amount_minor,
    'currency', o.currency,
    'status', o.status,
    'created_at', o.created_at,
    'replayed', p_replayed,
    'tickets', coalesce((
      select jsonb_agg(jsonb_build_object('ticket_ref', t.ticket_ref, 'status', t.status, 'holder_ref', t.holder_ref)
                       order by t.created_at, t.ticket_ref)
      from demo_provider.tickets t where t.order_ref = o.order_ref
    ), '[]'::jsonb)
  )
  from demo_provider.orders o where o.order_ref = p_order_ref
$$;

create or replace function public.demo_provider_release_expired(p_offer_ref text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  r record;
begin
  for r in
    select h.hold_ref, h.offer_ref, h.quantity
    from demo_provider.holds h
    where h.status = 'held'
      and h.expires_at <= now()
      and (p_offer_ref is null or h.offer_ref = p_offer_ref)
    order by h.expires_at
    for update skip locked
  loop
    update demo_provider.holds set status = 'expired', updated_at = now() where hold_ref = r.hold_ref;
    update demo_provider.inventory set held = held - r.quantity, updated_at = now() where offer_ref = r.offer_ref;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.demo_provider_upsert_inventory(
  p_offer_ref text,
  p_event_ref text,
  p_label text,
  p_currency char(3),
  p_face_value_minor bigint,
  p_booking_fee_minor bigint,
  p_capacity integer,
  p_max_per_order smallint default 10,
  p_transferable boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv demo_provider.inventory;
begin
  insert into demo_provider.inventory as i
    (offer_ref, event_ref, label, currency, face_value_minor, booking_fee_minor, capacity, max_per_order, transferable)
  values
    (p_offer_ref, p_event_ref, p_label, p_currency, p_face_value_minor, p_booking_fee_minor, p_capacity, p_max_per_order, p_transferable)
  on conflict (offer_ref) do update set
    event_ref = excluded.event_ref,
    label = excluded.label,
    currency = excluded.currency,
    face_value_minor = excluded.face_value_minor,
    booking_fee_minor = excluded.booking_fee_minor,
    capacity = excluded.capacity,
    max_per_order = excluded.max_per_order,
    transferable = excluded.transferable,
    updated_at = now()
  returning * into v_inv;
  return to_jsonb(v_inv);
end;
$$;

create or replace function public.demo_provider_list_offers(p_event_ref text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(i) || jsonb_build_object('available', i.capacity - i.sold - i.held) order by i.offer_ref), '[]'::jsonb)
  from demo_provider.inventory i
  where i.event_ref = p_event_ref
$$;

create or replace function public.demo_provider_availability(p_offer_ref text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv demo_provider.inventory;
begin
  perform public.demo_provider_release_expired(p_offer_ref);
  select * into v_inv from demo_provider.inventory i where i.offer_ref = p_offer_ref;
  if not found then
    raise exception 'offer_not_found' using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'offer_ref', v_inv.offer_ref,
    'capacity', v_inv.capacity,
    'sold', v_inv.sold,
    'held', v_inv.held,
    'available', v_inv.capacity - v_inv.sold - v_inv.held,
    'max_per_order', v_inv.max_per_order
  );
end;
$$;

create or replace function public.demo_provider_create_hold(
  p_offer_ref text,
  p_quantity integer,
  p_ttl_seconds integer,
  p_client_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv demo_provider.inventory;
  v_hold demo_provider.holds;
begin
  if p_quantity is null or p_quantity < 1 then
    raise exception 'invalid_quantity' using errcode = '22023';
  end if;
  if p_ttl_seconds is null or p_ttl_seconds not between 30 and 3600 then
    raise exception 'invalid_ttl' using errcode = '22023';
  end if;

  if p_client_key is not null then
    select * into v_hold from demo_provider.holds h where h.client_key = p_client_key;
    if found then
      return demo_provider.hold_json(v_hold, true);
    end if;
  end if;

  perform public.demo_provider_release_expired(p_offer_ref);

  select * into v_inv from demo_provider.inventory i where i.offer_ref = p_offer_ref;
  if not found then
    raise exception 'offer_not_found' using errcode = 'P0002';
  end if;
  if p_quantity > v_inv.max_per_order then
    raise exception 'quantity_above_limit' using errcode = '22023',
      detail = jsonb_build_object('max_per_order', v_inv.max_per_order)::text;
  end if;

  -- Décrément atomique : la clause WHERE est réévaluée après verrouillage de la ligne,
  -- deux transactions concurrentes ne peuvent donc pas survendre le stock.
  update demo_provider.inventory i
     set held = i.held + p_quantity, updated_at = now()
   where i.offer_ref = p_offer_ref
     and i.capacity - i.sold - i.held >= p_quantity
  returning * into v_inv;
  if not found then
    raise exception 'sold_out' using errcode = 'P0001';
  end if;

  begin
    insert into demo_provider.holds (hold_ref, offer_ref, quantity, status, expires_at, client_key)
    values (demo_provider.new_ref('DH'), p_offer_ref, p_quantity, 'held',
            now() + make_interval(secs => p_ttl_seconds), p_client_key)
    returning * into v_hold;
  exception when unique_violation then
    update demo_provider.inventory i set held = i.held - p_quantity, updated_at = now()
    where i.offer_ref = p_offer_ref;
    select * into v_hold from demo_provider.holds h where h.client_key = p_client_key;
    return demo_provider.hold_json(v_hold, true);
  end;

  return demo_provider.hold_json(v_hold, false);
end;
$$;

create or replace function public.demo_provider_release_hold(p_hold_ref text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hold demo_provider.holds;
begin
  select * into v_hold from demo_provider.holds h where h.hold_ref = p_hold_ref for update;
  if not found then
    raise exception 'hold_not_found' using errcode = 'P0002';
  end if;
  if v_hold.status = 'confirmed' then
    raise exception 'hold_already_confirmed' using errcode = 'P0001';
  end if;
  if v_hold.status = 'held' then
    update demo_provider.holds set status = 'released', updated_at = now() where hold_ref = p_hold_ref
    returning * into v_hold;
    update demo_provider.inventory set held = held - v_hold.quantity, updated_at = now()
    where offer_ref = v_hold.offer_ref;
  end if;
  return demo_provider.hold_json(v_hold, false);
end;
$$;

create or replace function public.demo_provider_confirm_hold(p_hold_ref text, p_holder_ref text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hold demo_provider.holds;
  v_inv demo_provider.inventory;
  v_order_ref text;
begin
  select * into v_hold from demo_provider.holds h where h.hold_ref = p_hold_ref for update;
  if not found then
    raise exception 'hold_not_found' using errcode = 'P0002';
  end if;
  if v_hold.status = 'confirmed' then
    return demo_provider.order_json(v_hold.order_ref, true);
  end if;
  if v_hold.status <> 'held' then
    raise exception 'hold_not_active' using errcode = 'P0001';
  end if;
  if v_hold.expires_at <= now() then
    raise exception 'hold_expired' using errcode = 'P0001';
  end if;

  update demo_provider.inventory inv
     set held = inv.held - v_hold.quantity, sold = inv.sold + v_hold.quantity, updated_at = now()
   where inv.offer_ref = v_hold.offer_ref
  returning * into v_inv;

  v_order_ref := demo_provider.new_ref('DO');
  insert into demo_provider.orders (order_ref, hold_ref, offer_ref, quantity, amount_minor, currency)
  values (v_order_ref, v_hold.hold_ref, v_hold.offer_ref, v_hold.quantity,
          v_hold.quantity * (v_inv.face_value_minor + v_inv.booking_fee_minor), v_inv.currency);

  insert into demo_provider.tickets (ticket_ref, order_ref, offer_ref, holder_ref)
  select demo_provider.new_ref('DT'), v_order_ref, v_hold.offer_ref, p_holder_ref
  from generate_series(1, v_hold.quantity);

  update demo_provider.holds set status = 'confirmed', order_ref = v_order_ref, updated_at = now()
  where hold_ref = v_hold.hold_ref;

  return demo_provider.order_json(v_order_ref, false);
end;
$$;

create or replace function public.demo_provider_get_order(p_order_ref text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_json jsonb;
begin
  v_json := demo_provider.order_json(p_order_ref, false);
  if v_json is null then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  return v_json;
end;
$$;

create or replace function public.demo_provider_refund_order(p_order_ref text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order demo_provider.orders;
  v_count integer;
begin
  select * into v_order from demo_provider.orders o where o.order_ref = p_order_ref for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if v_order.status = 'refunded' then
    return demo_provider.order_json(p_order_ref, true);
  end if;
  update demo_provider.tickets set status = 'refunded', voided_at = now()
  where order_ref = p_order_ref and status = 'valid_demo';
  get diagnostics v_count = row_count;
  update demo_provider.inventory set sold = greatest(sold - v_count, 0), updated_at = now()
  where offer_ref = v_order.offer_ref;
  update demo_provider.orders set status = 'refunded', refunded_at = now() where order_ref = p_order_ref;
  return demo_provider.order_json(p_order_ref, false);
end;
$$;

-- Transfert sécurisé par RÉÉMISSION : l'ancien billet est invalidé, un nouveau est émis.
create or replace function public.demo_provider_transfer_ticket(p_ticket_ref text, p_new_holder_ref text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket demo_provider.tickets;
  v_transferable boolean;
  v_new_ref text;
begin
  select * into v_ticket from demo_provider.tickets t where t.ticket_ref = p_ticket_ref for update;
  if not found then
    raise exception 'ticket_not_found' using errcode = 'P0002';
  end if;
  if v_ticket.status <> 'valid_demo' then
    raise exception 'ticket_not_transferable' using errcode = 'P0001';
  end if;
  select i.transferable into v_transferable from demo_provider.inventory i where i.offer_ref = v_ticket.offer_ref;
  if not coalesce(v_transferable, false) then
    raise exception 'ticket_not_transferable' using errcode = 'P0001';
  end if;
  update demo_provider.tickets set status = 'void', voided_at = now() where ticket_ref = p_ticket_ref;
  v_new_ref := demo_provider.new_ref('DT');
  insert into demo_provider.tickets (ticket_ref, order_ref, offer_ref, holder_ref, reissued_from)
  values (v_new_ref, v_ticket.order_ref, v_ticket.offer_ref, p_new_holder_ref, p_ticket_ref);
  return jsonb_build_object('previous_ticket_ref', p_ticket_ref, 'ticket_ref', v_new_ref, 'holder_ref', p_new_holder_ref);
end;
$$;

create or replace function public.demo_provider_verify_ownership(p_ticket_ref text, p_holder_ref text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from demo_provider.tickets t
    where t.ticket_ref = p_ticket_ref and t.holder_ref = p_holder_ref and t.status = 'valid_demo'
  )
$$;

-- -----------------------------------------------------------------------------
-- Résolution de l'accord commercial applicable (le plus spécifique gagne)
-- -----------------------------------------------------------------------------
create or replace function public.resolve_commercial_agreement(p_provider_id text, p_event_id uuid)
returns public.commercial_agreements
language sql
stable
security definer
set search_path = ''
as $$
  select a.*
  from public.commercial_agreements a
  join public.ticket_providers p on p.id = a.provider_id
  join public.events e on e.id = p_event_id
  where a.provider_id = p_provider_id
    and (a.status = 'active' or (a.status = 'simulation' and p.is_demo))
    and (a.valid_from is null or a.valid_from <= now())
    and (a.valid_to is null or a.valid_to > now())
    and (a.event_id is null or a.event_id = e.id)
    and (a.organizer_id is null or a.organizer_id = e.organizer_id)
    and (a.country_code is null or a.country_code = e.country_code)
  order by (a.event_id is not null) desc, (a.organizer_id is not null) desc, (a.country_code is not null) desc,
           (a.status = 'active') desc, a.created_at desc
  limit 1
$$;

create or replace function public.find_promotion(p_code text, p_agreement_id uuid)
returns public.promotions
language sql
stable
security definer
set search_path = ''
as $$
  select pr.*
  from public.promotions pr
  where pr.code = p_code::extensions.citext
    and pr.agreement_id = p_agreement_id
    and pr.is_active
    and (pr.starts_at is null or pr.starts_at <= now())
    and (pr.ends_at is null or pr.ends_at > now())
    and (pr.max_redemptions is null or pr.redemptions_count < pr.max_redemptions)
  limit 1
$$;

-- -----------------------------------------------------------------------------
-- Checkout Tamurt
-- -----------------------------------------------------------------------------
create or replace function public.assert_offer_sellable(p_offer public.ticket_offers, p_quantity integer)
returns public.events
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_event public.events;
  v_settings jsonb;
begin
  select * into v_event from public.events e where e.id = p_offer.event_id;
  if not found or v_event.deleted_at is not null or v_event.status <> 'published'
     or v_event.visibility not in ('public', 'unlisted') then
    raise exception 'event_not_on_sale' using errcode = 'P0001';
  end if;
  if v_event.registration_mode <> 'tickets' then
    raise exception 'event_not_ticketed' using errcode = 'P0001';
  end if;
  if p_offer.status <> 'on_sale' then
    raise exception 'offer_not_on_sale' using errcode = 'P0001';
  end if;
  if p_offer.sales_start_at is not null and p_offer.sales_start_at > now() then
    raise exception 'sales_not_started' using errcode = 'P0001';
  end if;
  if coalesce(p_offer.sales_end_at, v_event.starts_at) <= now() then
    raise exception 'sales_ended' using errcode = 'P0001';
  end if;
  if p_quantity is null or p_quantity < p_offer.min_per_order or p_quantity > p_offer.max_per_order then
    raise exception 'invalid_quantity' using errcode = '22023';
  end if;
  select s.value into v_settings from public.app_settings s where s.key = 'commerce';
  if p_quantity > coalesce((v_settings ->> 'max_tickets_per_order')::integer, 10) then
    raise exception 'invalid_quantity' using errcode = '22023';
  end if;
  if p_offer.environment = 'live' and not public.commerce_live_allowed(p_offer.provider_id, v_event.country_code) then
    raise exception 'live_mode_disabled' using errcode = 'P0001';
  end if;
  if p_offer.environment = 'demo' and not coalesce((v_settings ->> 'demo_enabled')::boolean, false) then
    raise exception 'demo_mode_disabled' using errcode = 'P0001';
  end if;
  return v_event;
end;
$$;

create or replace function public.pricing_is_consistent(
  p_pricing jsonb,
  p_offer public.ticket_offers,
  p_quantity integer
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_subtotal bigint := (p_pricing ->> 'subtotal_minor')::bigint;
  v_provider_fees bigint := (p_pricing ->> 'provider_fees_minor')::bigint;
  v_service bigint := (p_pricing ->> 'service_fees_minor')::bigint;
  v_discount bigint := (p_pricing ->> 'discount_minor')::bigint;
  v_tax_added bigint := (p_pricing ->> 'tax_added_minor')::bigint;
  v_total bigint := (p_pricing ->> 'total_minor')::bigint;
begin
  return p_pricing ->> 'currency' = p_offer.currency
     and v_subtotal = p_offer.face_value_minor * p_quantity
     and v_provider_fees = p_offer.provider_fee_minor * p_quantity
     and v_service >= 0 and v_discount >= 0 and v_tax_added >= 0
     and v_discount <= v_subtotal + v_provider_fees + v_service
     and v_total = v_subtotal + v_provider_fees + v_service - v_discount + v_tax_added
     and v_total >= 0;
exception when others then
  return false;
end;
$$;

create or replace function public.checkout_create_reservation(
  p_user_id uuid,
  p_offer_id uuid,
  p_quantity integer,
  p_provider_hold_ref text,
  p_expires_at timestamptz,
  p_pricing jsonb,
  p_promotion_id uuid,
  p_idempotency_key text
)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_offer public.ticket_offers;
  v_event public.events;
  v_res public.reservations;
  v_settings jsonb;
  v_active integer;
begin
  select * into v_res from public.reservations r
  where r.user_id = p_user_id and r.idempotency_key = p_idempotency_key;
  if found then
    return v_res;
  end if;

  if exists (select 1 from public.profiles p where p.id = p_user_id and (p.is_suspended or p.deleted_at is not null)) then
    raise exception 'account_suspended' using errcode = '42501';
  end if;

  select * into v_offer from public.ticket_offers o where o.id = p_offer_id;
  if not found then
    raise exception 'offer_not_found' using errcode = 'P0002';
  end if;
  v_event := public.assert_offer_sellable(v_offer, p_quantity);

  if not public.pricing_is_consistent(p_pricing, v_offer, p_quantity) then
    raise exception 'pricing_mismatch' using errcode = 'P0001';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '1 hour' then
    raise exception 'invalid_expiry' using errcode = '22023';
  end if;

  -- Sérialise les réservations d'un même utilisateur pour appliquer le plafond.
  perform pg_advisory_xact_lock(hashtextextended('reservations:' || p_user_id::text, 0));
  select s.value into v_settings from public.app_settings s where s.key = 'commerce';
  select count(*) into v_active from public.reservations r
  where r.user_id = p_user_id and r.status = 'active' and r.expires_at > now();
  if v_active >= coalesce((v_settings ->> 'max_active_reservations_per_user')::integer, 3) then
    raise exception 'too_many_active_reservations' using errcode = 'P0001';
  end if;

  begin
    insert into public.reservations (
      user_id, event_id, offer_id, provider_id, environment, quantity, currency, unit_face_value_minor,
      total_minor, pricing, promotion_id, provider_hold_ref, expires_at, idempotency_key
    ) values (
      p_user_id, v_event.id, v_offer.id, v_offer.provider_id, v_offer.environment, p_quantity, v_offer.currency,
      v_offer.face_value_minor, (p_pricing ->> 'total_minor')::bigint, p_pricing, p_promotion_id,
      p_provider_hold_ref, p_expires_at, p_idempotency_key
    )
    returning * into v_res;
  exception when unique_violation then
    select * into v_res from public.reservations r
    where r.user_id = p_user_id and r.idempotency_key = p_idempotency_key;
    if not found then
      raise exception 'duplicate_hold' using errcode = '23505';
    end if;
  end;
  return v_res;
end;
$$;

create or replace function public.checkout_release_reservation(p_user_id uuid, p_reservation_id uuid)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res public.reservations;
begin
  select * into v_res from public.reservations r where r.id = p_reservation_id for update;
  if not found or v_res.user_id <> p_user_id then
    raise exception 'reservation_not_found' using errcode = 'P0002';
  end if;
  if v_res.status = 'active' then
    if exists (select 1 from public.orders o where o.reservation_id = v_res.id and o.status in ('paid', 'fulfilled')) then
      raise exception 'reservation_already_paid' using errcode = 'P0001';
    end if;
    update public.reservations set status = 'released' where id = v_res.id returning * into v_res;
    update public.orders set status = 'cancelled', cancelled_at = now(), failure_reason = 'reservation_released'
    where reservation_id = v_res.id and status = 'pending_payment';
  end if;
  return v_res;
end;
$$;

create or replace function public.generate_order_number(p_environment public.commerce_environment)
returns text
language sql
volatile
set search_path = ''
as $$
  select case when p_environment = 'demo' then 'TD-' else 'TL-' end
         || to_char(now() at time zone 'utc', 'YYMMDD') || '-'
         || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8))
$$;

create or replace function public.checkout_create_order(
  p_user_id uuid,
  p_reservation_id uuid,
  p_idempotency_key text,
  p_payment_provider text,
  p_buyer_email text,
  p_buyer_name text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res public.reservations;
  v_offer public.ticket_offers;
  v_order public.orders;
  v_attempt integer := 0;
  v_unit_service bigint;
begin
  select * into v_order from public.orders o where o.reservation_id = p_reservation_id;
  if found then
    if v_order.user_id is distinct from p_user_id then
      raise exception 'reservation_not_found' using errcode = 'P0002';
    end if;
    return v_order;
  end if;

  select * into v_res from public.reservations r where r.id = p_reservation_id for update;
  if not found or v_res.user_id <> p_user_id then
    raise exception 'reservation_not_found' using errcode = 'P0002';
  end if;
  if v_res.status <> 'active' then
    raise exception 'reservation_not_active' using errcode = 'P0001';
  end if;
  if v_res.expires_at <= now() then
    raise exception 'reservation_expired' using errcode = 'P0001';
  end if;
  select * into v_offer from public.ticket_offers o where o.id = v_res.offer_id;
  if v_res.environment = 'live' then
    if not exists (select 1 from public.events e where e.id = v_res.event_id
                   and public.commerce_live_allowed(v_res.provider_id, e.country_code)) then
      raise exception 'live_mode_disabled' using errcode = 'P0001';
    end if;
  elsif p_payment_provider <> 'demo' then
    raise exception 'demo_requires_demo_payment' using errcode = 'P0001';
  end if;

  v_unit_service := coalesce((v_res.pricing ->> 'service_fee_per_ticket_minor')::bigint, 0);

  loop
    begin
      insert into public.orders (
        order_number, user_id, reservation_id, event_id, provider_id, environment, currency,
        subtotal_minor, provider_fees_minor, service_fees_minor, discount_minor, tax_added_minor,
        tax_included_minor, total_minor, pricing, promotion_id, payment_provider, idempotency_key,
        buyer_email, buyer_name, expires_at
      ) values (
        public.generate_order_number(v_res.environment), p_user_id, v_res.id, v_res.event_id, v_res.provider_id,
        v_res.environment, v_res.currency,
        (v_res.pricing ->> 'subtotal_minor')::bigint,
        (v_res.pricing ->> 'provider_fees_minor')::bigint,
        (v_res.pricing ->> 'service_fees_minor')::bigint,
        (v_res.pricing ->> 'discount_minor')::bigint,
        (v_res.pricing ->> 'tax_added_minor')::bigint,
        coalesce((v_res.pricing ->> 'tax_included_minor')::bigint, 0),
        v_res.total_minor, v_res.pricing, v_res.promotion_id, p_payment_provider, p_idempotency_key,
        p_buyer_email, left(p_buyer_name, 120), v_res.expires_at
      )
      returning * into v_order;
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      select * into v_order from public.orders o where o.reservation_id = p_reservation_id;
      if found then
        return v_order;
      end if;
      if v_attempt >= 5 then
        raise;
      end if;
    end;
  end loop;

  insert into public.order_items (
    order_id, offer_id, offer_name, quantity, unit_face_value_minor, unit_provider_fee_minor,
    unit_service_fee_minor, line_total_minor
  ) values (
    v_order.id, v_offer.id, v_offer.name, v_res.quantity, v_offer.face_value_minor, v_offer.provider_fee_minor,
    v_unit_service, v_res.quantity * (v_offer.face_value_minor + v_offer.provider_fee_minor + v_unit_service)
  );

  return v_order;
end;
$$;

create or replace function public.checkout_record_payment(
  p_order_id uuid,
  p_provider text,
  p_external_ref text,
  p_status public.payment_status,
  p_amount_minor bigint,
  p_currency char(3),
  p_failure_code text default null,
  p_raw jsonb default '{}'::jsonb
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  insert into public.payment_references (order_id, provider, environment, external_ref, status, amount_minor, currency, failure_code, raw)
  values (p_order_id, p_provider, v_order.environment, p_external_ref, p_status, p_amount_minor, p_currency, p_failure_code,
          coalesce(p_raw, '{}'::jsonb))
  on conflict (provider, external_ref) do update
    set status = excluded.status, failure_code = excluded.failure_code, raw = excluded.raw, updated_at = now();

  if p_status = 'succeeded' then
    if v_order.status in ('paid', 'fulfilled') then
      return v_order;
    end if;
    if v_order.status <> 'pending_payment' then
      raise exception 'order_not_payable' using errcode = 'P0001';
    end if;
    if v_order.expires_at <= now() then
      raise exception 'order_expired' using errcode = 'P0001';
    end if;
    if p_amount_minor <> v_order.total_minor or p_currency <> v_order.currency then
      raise exception 'amount_mismatch' using errcode = 'P0001';
    end if;
    update public.orders set status = 'paid', paid_at = now() where id = p_order_id returning * into v_order;
  end if;
  return v_order;
end;
$$;

create or replace function public.checkout_fulfill_order(
  p_order_id uuid,
  p_provider_order_ref text,
  p_tickets jsonb
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_item public.order_items;
  v_holder text;
begin
  select * into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if v_order.status = 'fulfilled' then
    return v_order;
  end if;
  if v_order.status <> 'paid' then
    raise exception 'order_not_paid' using errcode = 'P0001';
  end if;
  select * into v_item from public.order_items i where i.order_id = p_order_id order by i.id limit 1;
  if jsonb_typeof(p_tickets) <> 'array' or jsonb_array_length(p_tickets) <> v_item.quantity then
    raise exception 'ticket_count_mismatch' using errcode = 'P0001';
  end if;
  select p.display_name into v_holder from public.profiles p where p.id = v_order.user_id;

  insert into public.tickets (
    order_id, order_item_id, event_id, offer_id, owner_id, provider_id, provider_ticket_ref, environment,
    holder_name, seat_label, original_price_minor, currency, delivery_mode, offline_allowed
  )
  select v_order.id, v_item.id, v_order.event_id, v_item.offer_id, v_order.user_id, v_order.provider_id,
         t ->> 'provider_ticket_ref', v_order.environment, coalesce(t ->> 'holder_name', v_holder), t ->> 'seat_label',
         v_item.unit_face_value_minor, v_order.currency,
         case when v_order.environment = 'demo' then 'demo_specimen' else coalesce(t ->> 'delivery_mode', 'provider_app') end,
         coalesce((t ->> 'offline_allowed')::boolean, false) and v_order.environment = 'live'
  from jsonb_array_elements(p_tickets) as t;

  update public.orders
     set status = 'fulfilled', fulfilled_at = now(), provider_order_ref = p_provider_order_ref
   where id = p_order_id
  returning * into v_order;
  update public.reservations set status = 'converted' where id = v_order.reservation_id;
  if v_order.promotion_id is not null then
    update public.promotions set redemptions_count = redemptions_count + 1 where id = v_order.promotion_id;
  end if;

  perform public.notify_user(
    v_order.user_id, 'order_confirmed',
    jsonb_build_object('order_id', v_order.id, 'order_number', v_order.order_number, 'event_id', v_order.event_id,
                       'environment', v_order.environment),
    '/account/orders/' || v_order.id::text,
    'order_confirmed:' || v_order.id::text,
    v_order.environment = 'demo'
  );
  return v_order;
end;
$$;

create or replace function public.checkout_fail_order(
  p_order_id uuid,
  p_status public.order_status,
  p_reason text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  if p_status not in ('payment_failed', 'cancelled', 'expired') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  select * into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if v_order.status in ('fulfilled', 'refunded') then
    raise exception 'order_already_final' using errcode = 'P0001';
  end if;
  update public.orders
     set status = p_status, failure_reason = left(p_reason, 300),
         cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end
   where id = p_order_id
  returning * into v_order;
  update public.reservations set status = 'failed' where id = v_order.reservation_id and status = 'active';
  return v_order;
end;
$$;

create or replace function public.checkout_record_refund(
  p_order_id uuid,
  p_amount_minor bigint,
  p_reason text,
  p_status public.refund_status,
  p_provider_refund_ref text,
  p_requested_by uuid
)
returns public.refunds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_refund public.refunds;
  v_payment uuid;
begin
  select * into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if p_amount_minor <= 0 or p_amount_minor > v_order.total_minor then
    raise exception 'invalid_refund_amount' using errcode = '22023';
  end if;
  select pr.id into v_payment from public.payment_references pr
  where pr.order_id = p_order_id and pr.status = 'succeeded' order by pr.created_at desc limit 1;

  insert into public.refunds (order_id, payment_reference_id, environment, amount_minor, currency, reason, status,
                              requested_by, provider_refund_ref, processed_at)
  values (p_order_id, v_payment, v_order.environment, p_amount_minor, v_order.currency, p_reason, p_status,
          p_requested_by, p_provider_refund_ref, case when p_status = 'succeeded' then now() end)
  returning * into v_refund;

  if p_status = 'succeeded' then
    update public.payment_references
       set status = case when p_amount_minor = v_order.total_minor then 'refunded'::public.payment_status
                         else 'partially_refunded'::public.payment_status end
     where id = v_payment;
    if p_amount_minor = v_order.total_minor then
      update public.orders set status = 'refunded', refunded_at = now() where id = p_order_id;
      update public.tickets set status = 'refunded', voided_at = now()
      where order_id = p_order_id and status = 'issued';
    end if;
  end if;
  return v_refund;
end;
$$;

-- -----------------------------------------------------------------------------
-- Idempotence des requêtes API
-- -----------------------------------------------------------------------------
create or replace function public.idempotency_begin(
  p_user_id uuid,
  p_scope text,
  p_key text,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.idempotency_keys;
begin
  insert into public.idempotency_keys (user_id, scope, key, request_hash)
  values (p_user_id, p_scope, p_key, p_request_hash)
  on conflict (user_id, scope, key) do nothing
  returning * into v_row;
  if found then
    return jsonb_build_object('state', 'started');
  end if;

  select * into v_row from public.idempotency_keys k
  where k.user_id = p_user_id and k.scope = p_scope and k.key = p_key
  for update;
  if v_row.request_hash <> p_request_hash then
    return jsonb_build_object('state', 'mismatch');
  end if;
  if v_row.status = 'completed' then
    return jsonb_build_object('state', 'replay', 'status', v_row.response_status, 'body', v_row.response_body);
  end if;
  -- Requête identique toujours en cours : on la considère abandonnée après 60 s.
  if v_row.updated_at < now() - interval '60 seconds' then
    update public.idempotency_keys set updated_at = now()
    where user_id = p_user_id and scope = p_scope and key = p_key;
    return jsonb_build_object('state', 'started');
  end if;
  return jsonb_build_object('state', 'in_progress');
end;
$$;

create or replace function public.idempotency_complete(
  p_user_id uuid,
  p_scope text,
  p_key text,
  p_status integer,
  p_body jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.idempotency_keys
     set status = 'completed', response_status = p_status, response_body = p_body, updated_at = now()
   where user_id = p_user_id and scope = p_scope and key = p_key
$$;

create or replace function public.idempotency_abort(p_user_id uuid, p_scope text, p_key text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.idempotency_keys
  where user_id = p_user_id and scope = p_scope and key = p_key and status = 'in_progress'
$$;

-- -----------------------------------------------------------------------------
-- Limitation de débit (fenêtre fixe)
-- -----------------------------------------------------------------------------
create or replace function public.rate_limit_hit(p_bucket text, p_limit integer, p_window_seconds integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_hits integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid_rate_limit' using errcode = '22023';
  end if;
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits as rl (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set hits = rl.hits + 1
  returning hits into v_hits;
  return jsonb_build_object(
    'allowed', v_hits <= p_limit,
    'remaining', greatest(p_limit - v_hits, 0),
    'reset_at', v_window + make_interval(secs => p_window_seconds)
  );
end;
$$;
