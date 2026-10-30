-- =============================================================================
-- Tamurt Events — 0500 : événements, sessions, médias, artistes, inscriptions,
-- annonces, statistiques, favoris
-- =============================================================================

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (public.is_valid_slug(slug)),
  organizer_id uuid not null references public.organizer_profiles (id) on delete restrict,
  venue_id uuid references public.venues (id) on delete set null,
  category_slug text not null references public.event_categories (slug),
  title text not null check (char_length(btrim(title)) between 3 and 140),
  summary text check (summary is null or char_length(summary) <= 300),
  description text check (description is null or char_length(description) <= 10000),
  tags text[] not null default '{}' check (cardinality(tags) <= 10),
  status public.event_status not null default 'draft',
  visibility public.event_visibility not null default 'public',

  -- Localisation
  country_code char(2) not null references public.countries (code),
  region_id uuid references public.regions (id) on delete set null,
  city_id uuid not null references public.cities (id),
  location_name text check (location_name is null or char_length(location_name) <= 160),
  address_line text check (address_line is null or char_length(address_line) <= 200),
  postal_code text check (postal_code is null or char_length(postal_code) <= 16),
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  location extensions.geography(Point, 4326) generated always as (public.make_geo_point(lat, lng)) stored,
  is_online boolean not null default false,
  online_url text check (online_url is null or online_url ~* '^https://[^\s]+$'),

  -- Dates : instants UTC + fuseau IANA de l'événement (affichage en heure locale)
  timezone text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,

  -- Tarifs indicatifs (affichage) ; la vente passe par ticket_offers
  is_free boolean not null default false,
  price_min_minor bigint check (price_min_minor is null or price_min_minor >= 0),
  price_max_minor bigint check (price_max_minor is null or price_max_minor >= 0),
  currency char(3) check (currency is null or currency ~ '^[A-Z]{3}$'),
  capacity integer check (capacity is null or capacity between 1 and 1000000),
  registration_mode public.registration_mode not null default 'none',

  -- Informations pratiques
  accessibility jsonb not null default '{}'::jsonb check (jsonb_typeof(accessibility) = 'object'),
  entry_conditions text check (entry_conditions is null or char_length(entry_conditions) <= 2000),
  age_min smallint check (age_min is null or age_min between 0 and 21),
  contact_email extensions.citext check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_phone text check (contact_phone is null or contact_phone ~ '^\+[1-9][0-9]{6,14}$'),
  official_links jsonb not null default '[]'::jsonb
    check (jsonb_typeof(official_links) = 'array' and jsonb_array_length(official_links) <= 10),
  cancellation_policy text check (cancellation_policy is null or char_length(cancellation_policy) <= 3000),

  -- Médias (couverture modérée)
  cover_path text,
  cover_status public.media_status not null default 'pending',

  -- Drapeaux
  is_demo boolean not null default false,
  is_sponsored boolean not null default false,

  -- Modération / cycle de vie
  submitted_at timestamptz,
  published_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  moderation_note text check (moderation_note is null or char_length(moderation_note) <= 2000),
  cancelled_at timestamptz,
  cancellation_reason text check (cancellation_reason is null or char_length(cancellation_reason) <= 1000),

  -- Compteurs (maintenus par triggers / fonctions serveur)
  favorites_count integer not null default 0 check (favorites_count >= 0),
  registrations_count integer not null default 0 check (registrations_count >= 0),
  views_count bigint not null default 0 check (views_count >= 0),

  -- Recherche
  search_document text,
  search_vector tsvector,

  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint events_dates_check check (ends_at is null or ends_at > starts_at),
  constraint events_duration_check check (ends_at is null or ends_at - starts_at <= interval '62 days'),
  constraint events_price_range_check check (
    price_min_minor is null or price_max_minor is null or price_max_minor >= price_min_minor
  ),
  constraint events_price_currency_check check (
    (price_min_minor is null and price_max_minor is null) or currency is not null
  ),
  constraint events_free_check check (not is_free or registration_mode <> 'tickets'),
  constraint events_cancel_reason_check check (status <> 'cancelled' or cancelled_at is not null)
);

comment on table public.events is 'Événements. Les événements de démonstration (is_demo) sont fictifs et non indexés.';
comment on column public.events.is_sponsored is 'Mise en avant payante : toujours affichée avec la mention « Sponsorisé ».';

create index events_listing_idx on public.events (starts_at, id)
  where status = 'published' and visibility = 'public' and deleted_at is null;
create index events_city_starts_idx on public.events (city_id, starts_at) where deleted_at is null;
create index events_country_starts_idx on public.events (country_code, starts_at) where deleted_at is null;
create index events_category_starts_idx on public.events (category_slug, starts_at) where deleted_at is null;
create index events_organizer_idx on public.events (organizer_id);
create index events_venue_idx on public.events (venue_id);
create index events_status_idx on public.events (status);
create index events_search_vector_idx on public.events using gin (search_vector);
create index events_search_trgm_idx on public.events using gin (search_document extensions.gin_trgm_ops);
create index events_location_idx on public.events using gist (location);

create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- Artistes / intervenants liés (créé avant la fonction de recherche qui l'utilise)
create table public.event_artists (
  event_id uuid not null references public.events (id) on delete cascade,
  artist_id uuid not null references public.artists (id) on delete cascade,
  billing_order smallint not null default 0,
  role text not null default 'performer' check (role in ('headliner', 'performer', 'support', 'speaker', 'host', 'guest')),
  primary key (event_id, artist_id)
);

create index event_artists_artist_idx on public.event_artists (artist_id);

-- -----------------------------------------------------------------------------
-- Document de recherche : titre, résumé, tags, catégorie, ville, lieu, organisateur, artistes
-- -----------------------------------------------------------------------------
create or replace function public.event_search_document(p_event public.events)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.search_normalize(concat_ws(' ',
    p_event.title,
    p_event.summary,
    array_to_string(p_event.tags, ' '),
    p_event.location_name,
    p_event.address_line,
    (select concat_ws(' ', c.names ->> 'fr', c.names ->> 'en', c.names ->> 'ar') from public.event_categories c where c.slug = p_event.category_slug),
    (select concat_ws(' ', ci.names ->> 'fr', ci.names ->> 'en', ci.names ->> 'ar') from public.cities ci where ci.id = p_event.city_id),
    (select concat_ws(' ', v.name, v.address_line1) from public.venues v where v.id = p_event.venue_id),
    (select o.name from public.organizer_profiles o where o.id = p_event.organizer_id),
    (select string_agg(a.name, ' ') from public.event_artists ea join public.artists a on a.id = ea.artist_id where ea.event_id = p_event.id)
  ))
$$;

-- -----------------------------------------------------------------------------
-- Règles de cycle de vie (miroir de packages/core/src/event-status.ts)
-- -----------------------------------------------------------------------------
create or replace function public.events_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trusted boolean := public.is_service_context() or public.is_staff();
  v_org_verified boolean;
  v_can_publish boolean;
begin
  if not public.is_valid_timezone(new.timezone) then
    raise exception 'invalid_timezone' using errcode = '22023';
  end if;
  if not exists (select 1 from public.cities c where c.id = new.city_id and c.country_code = new.country_code) then
    raise exception 'city_country_mismatch' using errcode = '23514';
  end if;
  if new.region_id is not null and not exists (
    select 1 from public.regions r where r.id = new.region_id and r.country_code = new.country_code
  ) then
    raise exception 'region_country_mismatch' using errcode = '23514';
  end if;
  if new.venue_id is not null and not exists (
    select 1 from public.venues v where v.id = new.venue_id and v.country_code = new.country_code
  ) then
    raise exception 'venue_country_mismatch' using errcode = '23514';
  end if;
  new.title := btrim(new.title);

  -- Coordonnées : à défaut, celles du lieu puis du centre-ville.
  if new.lat is null or new.lng is null then
    select v.lat, v.lng into new.lat, new.lng from public.venues v where v.id = new.venue_id;
  end if;
  if new.lat is null or new.lng is null then
    select c.lat, c.lng into new.lat, new.lng from public.cities c where c.id = new.city_id;
  end if;

  select o.verification_status = 'verified' into v_org_verified
  from public.organizer_profiles o where o.id = new.organizer_id;
  v_can_publish := v_trusted or (
    coalesce(v_org_verified, false) and public.has_organizer_permission(new.organizer_id, 'publish_events')
  );

  if tg_op = 'INSERT' then
    if not v_trusted then
      new.created_by := auth.uid();
      if new.is_demo or new.is_sponsored or new.reviewed_by is not null or new.moderation_note is not null
         or new.favorites_count <> 0 or new.registrations_count <> 0 or new.views_count <> 0 then
        raise exception 'forbidden_column_change' using errcode = '42501';
      end if;
      if new.status not in ('draft', 'pending_review', 'published') then
        raise exception 'invalid_status_transition' using errcode = '23514';
      end if;
      if new.status = 'published' and not v_can_publish then
        new.status := 'pending_review';
      end if;
      new.cover_status := case when coalesce(v_org_verified, false) then 'approved' else 'pending' end;
    end if;
  else
    if new.organizer_id is distinct from old.organizer_id and not v_trusted then
      raise exception 'forbidden_column_change' using errcode = '42501';
    end if;
    if not v_trusted then
      if new.is_demo is distinct from old.is_demo
         or new.is_sponsored is distinct from old.is_sponsored
         or new.reviewed_by is distinct from old.reviewed_by
         or new.reviewed_at is distinct from old.reviewed_at
         or new.moderation_note is distinct from old.moderation_note
         or new.favorites_count is distinct from old.favorites_count
         or new.registrations_count is distinct from old.registrations_count
         or new.views_count is distinct from old.views_count
         or new.created_by is distinct from old.created_by
         or new.deleted_at is distinct from old.deleted_at and new.deleted_at is null then
        raise exception 'forbidden_column_change' using errcode = '42501';
      end if;
      if new.cover_path is distinct from old.cover_path then
        new.cover_status := case when coalesce(v_org_verified, false) then 'approved' else 'pending' end;
      elsif new.cover_status is distinct from old.cover_status then
        raise exception 'forbidden_column_change' using errcode = '42501';
      end if;

      if new.status is distinct from old.status then
        if not (
          (old.status = 'draft' and new.status in ('pending_review', 'published'))
          or (old.status = 'pending_review' and new.status in ('draft', 'published'))
          or (old.status = 'rejected' and new.status in ('draft', 'pending_review', 'published'))
          or (old.status = 'published' and new.status = 'cancelled')
          or (old.status = 'draft' and new.status = 'cancelled')
        ) then
          raise exception 'invalid_status_transition' using errcode = '23514';
        end if;
        if new.status = 'published' and not v_can_publish then
          new.status := 'pending_review';
        end if;
      end if;
    else
      -- Personnel / serveur : transitions plus larges mais jamais depuis l'archive vers publié.
      if new.status is distinct from old.status and old.status = 'archived' and new.status = 'published' then
        raise exception 'invalid_status_transition' using errcode = '23514';
      end if;
    end if;
  end if;

  -- Horodatages de cycle de vie
  if new.status = 'pending_review' and (tg_op = 'INSERT' or old.status <> 'pending_review') then
    new.submitted_at := now();
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at := coalesce(new.published_at, now());
    if v_trusted and auth.uid() is not null then
      new.reviewed_at := now();
      new.reviewed_by := auth.uid();
    end if;
  end if;
  if new.status = 'rejected' and (tg_op = 'INSERT' or old.status <> 'rejected') then
    new.reviewed_at := now();
    new.reviewed_by := coalesce(auth.uid(), new.reviewed_by);
  end if;
  if new.status = 'cancelled' and (tg_op = 'INSERT' or old.status <> 'cancelled') then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  end if;

  new.search_document := public.event_search_document(new);
  new.search_vector := to_tsvector('simple', coalesce(new.search_document, ''));
  return new;
end;
$$;

create trigger events_guard before insert or update on public.events
  for each row execute function public.events_guard();

-- -----------------------------------------------------------------------------
-- Sessions supplémentaires (événements sur plusieurs dates)
-- -----------------------------------------------------------------------------
create table public.event_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  capacity integer check (capacity is null or capacity > 0),
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create index event_sessions_event_idx on public.event_sessions (event_id, starts_at);

create table public.event_media (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  storage_path text not null,
  alt_text text check (alt_text is null or char_length(alt_text) <= 300),
  sort_order smallint not null default 0,
  status public.media_status not null default 'pending',
  uploaded_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index event_media_event_idx on public.event_media (event_id, sort_order);
create index event_media_pending_idx on public.event_media (created_at) where status = 'pending';

create or replace function public.event_media_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_verified boolean;
begin
  if public.is_service_context() or public.is_staff() then
    return new;
  end if;
  select o.verification_status = 'verified' into v_verified
  from public.events e join public.organizer_profiles o on o.id = e.organizer_id
  where e.id = new.event_id;
  if tg_op = 'INSERT' then
    new.uploaded_by := auth.uid();
    new.status := case when coalesce(v_verified, false) then 'approved' else 'pending' end;
    new.reviewed_by := null;
    new.reviewed_at := null;
  elsif new.status is distinct from old.status or new.reviewed_by is distinct from old.reviewed_by then
    raise exception 'forbidden_column_change' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger event_media_guard before insert or update on public.event_media
  for each row execute function public.event_media_guard();



-- Rafraîchit le document de recherche quand la liste d'artistes change.
create or replace function public.event_artists_touch_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.events e set updated_at = now()
  where e.id = coalesce(new.event_id, old.event_id);
  return null;
end;
$$;

create trigger event_artists_touch_event after insert or update or delete on public.event_artists
  for each row execute function public.event_artists_touch_event();

-- Renommage d'un organisateur / lieu / artiste : rafraîchit les événements liés.
create or replace function public.refresh_related_event_search()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'organizer_profiles' and new.name is distinct from old.name then
    update public.events e set updated_at = now() where e.organizer_id = new.id;
  elsif tg_table_name = 'venues' and (new.name is distinct from old.name or new.address_line1 is distinct from old.address_line1) then
    update public.events e set updated_at = now() where e.venue_id = new.id;
  elsif tg_table_name = 'artists' and new.name is distinct from old.name then
    update public.events e set updated_at = now()
    where e.id in (select ea.event_id from public.event_artists ea where ea.artist_id = new.id);
  end if;
  return null;
end;
$$;

create trigger organizer_profiles_refresh_search after update on public.organizer_profiles
  for each row execute function public.refresh_related_event_search();
create trigger venues_refresh_search after update on public.venues
  for each row execute function public.refresh_related_event_search();
create trigger artists_refresh_search after update on public.artists
  for each row execute function public.refresh_related_event_search();

-- -----------------------------------------------------------------------------
-- Favoris
-- -----------------------------------------------------------------------------
create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index favorites_event_idx on public.favorites (event_id);

create or replace function public.favorites_count_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.events set favorites_count = favorites_count + 1 where id = new.event_id;
    insert into public.event_daily_stats (event_id, day, favorites)
    values (new.event_id, (now() at time zone 'utc')::date, 1)
    on conflict (event_id, day) do update set favorites = public.event_daily_stats.favorites + 1;
  elsif tg_op = 'DELETE' then
    update public.events set favorites_count = greatest(favorites_count - 1, 0) where id = old.event_id;
  end if;
  return null;
end;
$$;

-- -----------------------------------------------------------------------------
-- Inscriptions gratuites (RSVP) avec contrôle de capacité transactionnel
-- -----------------------------------------------------------------------------
create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'cancelled', 'attended')),
  quantity smallint not null default 1 check (quantity between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create unique index event_registrations_active_uniq on public.event_registrations (event_id, user_id)
  where status in ('registered', 'attended');
create index event_registrations_user_idx on public.event_registrations (user_id);

create trigger event_registrations_set_updated_at before update on public.event_registrations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Annonces de l'organisateur aux participants
-- -----------------------------------------------------------------------------
create table public.event_announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  body text not null check (char_length(btrim(body)) between 3 and 2000),
  created_at timestamptz not null default now()
);

create index event_announcements_event_idx on public.event_announcements (event_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Statistiques quotidiennes (vues, partages, favoris, inscriptions, ajouts agenda)
-- -----------------------------------------------------------------------------
create table public.event_daily_stats (
  event_id uuid not null references public.events (id) on delete cascade,
  day date not null,
  views integer not null default 0 check (views >= 0),
  shares integer not null default 0 check (shares >= 0),
  favorites integer not null default 0 check (favorites >= 0),
  registrations integer not null default 0 check (registrations >= 0),
  calendar_adds integer not null default 0 check (calendar_adds >= 0),
  primary key (event_id, day)
);

create trigger favorites_count after insert or delete on public.favorites
  for each row execute function public.favorites_count_trigger();
