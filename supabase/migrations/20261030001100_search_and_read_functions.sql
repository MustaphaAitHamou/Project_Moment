-- =============================================================================
-- Tamurt Events — 1100 : recherche, agenda, carte, tableaux de bord (lecture)
-- Les fonctions publiques sont SECURITY INVOKER : la RLS s'applique.
-- =============================================================================

-- Construit une requête plein texte « préfixe » tolérante (ex. "conc par" -> conc:* & par:*)
create or replace function public.build_prefix_tsquery(p_text text)
returns tsquery
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_terms text;
begin
  select string_agg(quote_literal(w) || ':*', ' & ')
    into v_terms
  from regexp_split_to_table(public.search_normalize(p_text), '[^[:alnum:]]+') as w
  where w <> '';
  if v_terms is null then
    return null;
  end if;
  return to_tsquery('simple', v_terms);
end;
$$;

create or replace function public.search_events(
  p_query text default null,
  p_country char(2) default null,
  p_city_id uuid default null,
  p_categories text[] default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_free boolean default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default null,
  p_organizer_id uuid default null,
  p_venue_id uuid default null,
  p_artist_id uuid default null,
  p_include_past boolean default false,
  p_sort text default 'date',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  slug text,
  title text,
  summary text,
  category_slug text,
  status public.event_status,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text,
  country_code char(2),
  city_id uuid,
  city_slug text,
  city_names jsonb,
  venue_id uuid,
  venue_name text,
  venue_slug text,
  location_name text,
  organizer_id uuid,
  organizer_name text,
  organizer_slug text,
  organizer_verified boolean,
  lat double precision,
  lng double precision,
  is_free boolean,
  price_min_minor bigint,
  price_max_minor bigint,
  currency char(3),
  cover_path text,
  is_demo boolean,
  is_sponsored boolean,
  registration_mode public.registration_mode,
  favorites_count integer,
  distance_km double precision,
  rank real,
  total_count bigint
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_query text := nullif(btrim(coalesce(p_query, '')), '');
  v_norm text := public.search_normalize(v_query);
  v_tsquery tsquery := public.build_prefix_tsquery(v_query);
  v_point extensions.geography := public.make_geo_point(p_lat, p_lng);
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_from timestamptz := case when coalesce(p_include_past, false) then p_from else coalesce(p_from, now()) end;
begin
  return query
  select
    e.id, e.slug, e.title, e.summary, e.category_slug, e.status, e.starts_at, e.ends_at, e.timezone,
    e.country_code, e.city_id, c.slug, c.names, e.venue_id, v.name, v.slug, e.location_name,
    e.organizer_id, o.name, o.slug, (o.verification_status = 'verified'),
    e.lat, e.lng, e.is_free, e.price_min_minor, e.price_max_minor, e.currency,
    case when e.cover_status = 'approved' then e.cover_path end,
    e.is_demo, e.is_sponsored, e.registration_mode, e.favorites_count,
    case when v_point is not null and e.location is not null
         then extensions.st_distance(e.location, v_point) / 1000.0 end,
    case when v_query is null then 0::real
         else (coalesce(ts_rank(e.search_vector, v_tsquery), 0)
               + extensions.word_similarity(v_norm, coalesce(e.search_document, '')))::real end,
    count(*) over ()
  from public.events e
  join public.cities c on c.id = e.city_id
  join public.organizer_profiles o on o.id = e.organizer_id
  left join public.venues v on v.id = e.venue_id
  where e.deleted_at is null
    and e.visibility = 'public'
    and (e.status = 'published' or (coalesce(p_include_past, false) and e.status = 'archived'))
    and (v_from is null or coalesce(e.ends_at, e.starts_at + interval '3 hours') >= v_from)
    and (p_to is null or e.starts_at < p_to)
    and (p_country is null or e.country_code = p_country)
    and (p_city_id is null or e.city_id = p_city_id)
    and (p_categories is null or cardinality(p_categories) = 0 or e.category_slug = any (p_categories))
    and (p_free is null or e.is_free = p_free)
    and (p_organizer_id is null or e.organizer_id = p_organizer_id)
    and (p_venue_id is null or e.venue_id = p_venue_id)
    and (p_artist_id is null or exists (
      select 1 from public.event_artists ea where ea.event_id = e.id and ea.artist_id = p_artist_id))
    and (v_point is null or p_radius_km is null
         or extensions.st_dwithin(e.location, v_point, p_radius_km * 1000.0))
    and (v_query is null
         or e.search_vector @@ v_tsquery
         or extensions.word_similarity(v_norm, coalesce(e.search_document, '')) >= 0.6)
  order by
    case when p_sort = 'relevance' and v_query is not null
         then -(coalesce(ts_rank(e.search_vector, v_tsquery), 0)
                + extensions.word_similarity(v_norm, coalesce(e.search_document, ''))) end nulls last,
    case when p_sort = 'popularity' then -(e.favorites_count * 3 + e.registrations_count * 5 + e.views_count / 10) end nulls last,
    case when p_sort = 'distance' and v_point is not null then extensions.st_distance(e.location, v_point) end nulls last,
    case when coalesce(p_include_past, false) and p_from is null then extract(epoch from e.starts_at) * -1 end nulls last,
    e.starts_at asc,
    e.id asc
  limit v_limit offset v_offset;
end;
$$;

-- Agenda : occurrences (événement principal + sessions supplémentaires) dans une période.
create or replace function public.agenda_events(
  p_from timestamptz,
  p_to timestamptz,
  p_country char(2) default null,
  p_city_id uuid default null,
  p_categories text[] default null,
  p_free boolean default null,
  p_query text default null,
  p_limit integer default 500
)
returns table (
  event_id uuid,
  session_id uuid,
  slug text,
  title text,
  category_slug text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text,
  country_code char(2),
  city_id uuid,
  city_names jsonb,
  venue_name text,
  is_free boolean,
  is_demo boolean,
  status public.event_status
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_query text := nullif(btrim(coalesce(p_query, '')), '');
  v_tsquery tsquery := public.build_prefix_tsquery(v_query);
begin
  if p_to <= p_from or p_to - p_from > interval '93 days' then
    raise exception 'invalid_range' using errcode = '22023';
  end if;
  return query
  with occurrences as (
    select e.id as eid, null::uuid as sid, e.starts_at as s, e.ends_at as en from public.events e
    union all
    select s.event_id, s.id, s.starts_at, s.ends_at from public.event_sessions s where s.status = 'scheduled'
  )
  select e.id, occ.sid, e.slug, e.title, e.category_slug, occ.s, occ.en, e.timezone, e.country_code, e.city_id,
         c.names, v.name, e.is_free, e.is_demo, e.status
  from occurrences occ
  join public.events e on e.id = occ.eid
  join public.cities c on c.id = e.city_id
  left join public.venues v on v.id = e.venue_id
  where e.deleted_at is null
    and e.visibility = 'public'
    and e.status in ('published', 'archived')
    and occ.s < p_to
    and coalesce(occ.en, occ.s + interval '3 hours') >= p_from
    and (p_country is null or e.country_code = p_country)
    and (p_city_id is null or e.city_id = p_city_id)
    and (p_categories is null or cardinality(p_categories) = 0 or e.category_slug = any (p_categories))
    and (p_free is null or e.is_free = p_free)
    and (v_query is null or e.search_vector @@ v_tsquery)
  order by occ.s, e.id
  limit least(greatest(coalesce(p_limit, 500), 1), 1000);
end;
$$;

-- Carte : points légers dans une emprise (bbox) pour regroupement côté client.
create or replace function public.map_events(
  p_min_lat double precision,
  p_min_lng double precision,
  p_max_lat double precision,
  p_max_lng double precision,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_categories text[] default null,
  p_free boolean default null,
  p_limit integer default 1000
)
returns table (
  id uuid,
  slug text,
  title text,
  category_slug text,
  starts_at timestamptz,
  timezone text,
  lat double precision,
  lng double precision,
  is_free boolean,
  is_demo boolean
)
language sql
stable
set search_path = ''
as $$
  select e.id, e.slug, e.title, e.category_slug, e.starts_at, e.timezone, e.lat, e.lng, e.is_free, e.is_demo
  from public.events e
  where e.deleted_at is null
    and e.visibility = 'public'
    and e.status = 'published'
    and e.lat between least(p_min_lat, p_max_lat) and greatest(p_min_lat, p_max_lat)
    and e.lng between least(p_min_lng, p_max_lng) and greatest(p_min_lng, p_max_lng)
    and coalesce(e.ends_at, e.starts_at + interval '3 hours') >= coalesce(p_from, now())
    and (p_to is null or e.starts_at < p_to)
    and (p_categories is null or cardinality(p_categories) = 0 or e.category_slug = any (p_categories))
    and (p_free is null or e.is_free = p_free)
  order by e.starts_at
  limit least(greatest(coalesce(p_limit, 1000), 1), 3000)
$$;

-- Agenda personnel : favoris, inscriptions, billets.
create or replace function public.my_agenda(p_from timestamptz, p_to timestamptz)
returns table (
  event_id uuid,
  slug text,
  title text,
  category_slug text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text,
  city_names jsonb,
  venue_name text,
  status public.event_status,
  is_demo boolean,
  is_favorite boolean,
  is_registered boolean,
  tickets_count integer
)
language sql
stable
set search_path = ''
as $$
  with mine as (
    select f.event_id from public.favorites f where f.user_id = (select auth.uid())
    union
    select r.event_id from public.event_registrations r where r.user_id = (select auth.uid()) and r.status = 'registered'
    union
    select t.event_id from public.tickets t where t.owner_id = (select auth.uid()) and t.status = 'issued'
  )
  select e.id, e.slug, e.title, e.category_slug, e.starts_at, e.ends_at, e.timezone, c.names, v.name, e.status, e.is_demo,
         exists (select 1 from public.favorites f where f.event_id = e.id and f.user_id = (select auth.uid())),
         exists (select 1 from public.event_registrations r where r.event_id = e.id and r.user_id = (select auth.uid())
                 and r.status = 'registered'),
         (select count(*)::integer from public.tickets t where t.event_id = e.id and t.owner_id = (select auth.uid())
          and t.status = 'issued')
  from mine m
  join public.events e on e.id = m.event_id
  join public.cities c on c.id = e.city_id
  left join public.venues v on v.id = e.venue_id
  where (select auth.uid()) is not null
    and e.deleted_at is null
    and e.starts_at < p_to
    and coalesce(e.ends_at, e.starts_at + interval '3 hours') >= p_from
  order by e.starts_at
$$;

create or replace function public.nearby_cities(p_lat double precision, p_lng double precision, p_limit integer default 5)
returns table (id uuid, slug text, country_code char(2), names jsonb, timezone text, distance_km double precision)
language sql
stable
set search_path = ''
as $$
  select c.id, c.slug, c.country_code, c.names, c.timezone,
         extensions.st_distance(c.location, public.make_geo_point(p_lat, p_lng)) / 1000.0
  from public.cities c
  where c.is_active
  order by extensions.st_distance(c.location, public.make_geo_point(p_lat, p_lng))
  limit least(greatest(coalesce(p_limit, 5), 1), 50)
$$;

-- -----------------------------------------------------------------------------
-- Tableaux de bord organisateur
-- -----------------------------------------------------------------------------
create or replace function public.event_organizer_id(p_event_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.organizer_id from public.events e where e.id = p_event_id
$$;

create or replace function public.can_manage_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_staff() or public.has_organizer_permission(public.event_organizer_id(p_event_id), 'manage_events')
$$;

create or replace function public.organizer_dashboard(p_organizer_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_can_sales boolean;
begin
  if not (public.is_staff() or public.has_organizer_permission(p_organizer_id, 'view_analytics')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_can_sales := public.is_staff() or public.has_organizer_permission(p_organizer_id, 'view_sales');
  return jsonb_build_object(
    'events_by_status', (
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
      from (select status, count(*) as n from public.events where organizer_id = p_organizer_id and deleted_at is null
            group by status) s
    ),
    'upcoming_events', (
      select count(*) from public.events
      where organizer_id = p_organizer_id and deleted_at is null and status = 'published' and starts_at > now()
    ),
    'views_total', (select coalesce(sum(views_count), 0) from public.events where organizer_id = p_organizer_id),
    'favorites_total', (select coalesce(sum(favorites_count), 0) from public.events where organizer_id = p_organizer_id),
    'registrations_total', (
      select coalesce(sum(r.quantity), 0) from public.event_registrations r
      join public.events e on e.id = r.event_id
      where e.organizer_id = p_organizer_id and r.status = 'registered'
    ),
    'views_last_30d', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'views', d.views, 'favorites', d.favorites,
                                                   'registrations', d.registrations) order by d.day), '[]'::jsonb)
      from (
        select s.day, sum(s.views)::integer as views, sum(s.favorites)::integer as favorites,
               sum(s.registrations)::integer as registrations
        from public.event_daily_stats s join public.events e on e.id = s.event_id
        where e.organizer_id = p_organizer_id and s.day > (now() at time zone 'utc')::date - 30
        group by s.day
      ) d
    ),
    'sales', case when v_can_sales then (
      select coalesce(jsonb_object_agg(x.env, jsonb_build_object(
               'orders', x.orders, 'tickets', x.tickets, 'revenue_minor_by_currency', x.revenue)), '{}'::jsonb)
      from (
        select o.environment::text as env,
               count(distinct o.id) as orders,
               coalesce(sum(i.quantity), 0) as tickets,
               (select jsonb_object_agg(c.currency, c.total)
                from (select o2.currency, sum(o2.total_minor) as total
                      from public.orders o2 join public.events e2 on e2.id = o2.event_id
                      where e2.organizer_id = p_organizer_id and o2.status = 'fulfilled'
                        and o2.environment = o.environment
                      group by o2.currency) c) as revenue
        from public.orders o
        join public.events e on e.id = o.event_id
        join public.order_items i on i.order_id = o.id
        where e.organizer_id = p_organizer_id and o.status = 'fulfilled'
        group by o.environment
      ) x
    ) else null end
  );
end;
$$;

create or replace function public.organizer_event_stats(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.event_organizer_id(p_event_id);
  v_can_sales boolean;
  v_can_attendees boolean;
begin
  if v_org is null or not (public.is_staff() or public.has_organizer_permission(v_org, 'view_analytics')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_can_sales := public.is_staff() or public.has_organizer_permission(v_org, 'view_sales');
  v_can_attendees := public.is_staff() or public.has_organizer_permission(v_org, 'manage_registrations');
  return jsonb_build_object(
    'totals', (
      select jsonb_build_object('views', e.views_count, 'favorites', e.favorites_count,
                                'registrations', e.registrations_count, 'capacity', e.capacity)
      from public.events e where e.id = p_event_id
    ),
    'daily', (
      select coalesce(jsonb_agg(to_jsonb(s) - 'event_id' order by s.day), '[]'::jsonb)
      from public.event_daily_stats s where s.event_id = p_event_id and s.day > (now() at time zone 'utc')::date - 30
    ),
    'registrations', case when v_can_attendees then (
      select coalesce(jsonb_agg(jsonb_build_object('display_name', p.display_name, 'quantity', r.quantity,
                                                   'created_at', r.created_at) order by r.created_at desc), '[]'::jsonb)
      from public.event_registrations r join public.profiles p on p.id = r.user_id
      where r.event_id = p_event_id and r.status = 'registered'
    ) else null end,
    'sales_by_offer', case when v_can_sales then (
      select coalesce(jsonb_agg(jsonb_build_object(
               'offer_id', x.offer_id, 'offer_name', x.offer_name, 'environment', x.environment,
               'tickets', x.quantity, 'revenue_minor', x.revenue, 'currency', x.currency)), '[]'::jsonb)
      from (
        select i.offer_id, i.offer_name, o.environment, o.currency,
               sum(i.quantity)::integer as quantity, sum(i.line_total_minor)::bigint as revenue
        from public.order_items i join public.orders o on o.id = i.order_id
        where o.event_id = p_event_id and o.status = 'fulfilled'
        group by i.offer_id, i.offer_name, o.environment, o.currency
      ) x
    ) else null end
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Marketplace de revente (vue publique, vendeurs masqués)
-- -----------------------------------------------------------------------------
create or replace function public.public_resale_listings(
  p_event_id uuid default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  event_id uuid,
  event_slug text,
  event_title text,
  event_starts_at timestamptz,
  event_timezone text,
  city_names jsonb,
  offer_name text,
  environment public.commerce_environment,
  currency char(3),
  original_price_minor bigint,
  asking_price_minor bigint,
  buyer_fee_minor bigint,
  note text,
  seller_alias text,
  seller_completed_sales integer,
  created_at timestamptz,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, e.id, e.slug, e.title, e.starts_at, e.timezone, c.names, o.name, l.environment, l.currency,
         l.original_price_minor, l.asking_price_minor, l.buyer_fee_minor, l.note,
         'V-' || upper(substr(md5(l.seller_id::text), 1, 6)),
         (select count(*)::integer from public.resale_transactions t where t.seller_id = l.seller_id and t.status = 'completed'),
         l.created_at,
         count(*) over ()
  from public.resale_listings l
  join public.events e on e.id = l.event_id
  join public.cities c on c.id = e.city_id
  left join public.ticket_offers o on o.id = l.offer_id
  where l.status = 'active'
    and e.status = 'published'
    and e.deleted_at is null
    and e.starts_at > now()
    and (p_event_id is null or l.event_id = p_event_id)
    and (l.seller_id = (select auth.uid()) or (
      select count(*) from public.user_reports ur
      where ur.reported_user_id = l.seller_id and ur.status in ('open', 'reviewing')
    ) < 3)
    and not exists (select 1 from public.profiles p where p.id = l.seller_id and p.is_suspended)
  order by e.starts_at, l.asking_price_minor, l.created_at
  limit least(greatest(coalesce(p_limit, 20), 1), 100) offset greatest(coalesce(p_offset, 0), 0)
$$;

create or replace function public.get_public_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(s.key, s.value), '{}'::jsonb) from public.app_settings s where s.is_public
$$;
