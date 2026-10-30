-- =============================================================================
-- Tamurt Events — 0400 : organisateurs (particulier, association, professionnel),
-- membres et permissions, invitations, vérification, lieux, artistes
-- =============================================================================

create table public.organizer_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (public.is_valid_slug(slug)),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  kind public.organizer_kind not null,
  bio text check (bio is null or char_length(bio) <= 4000),
  logo_path text,
  cover_path text,
  website_url text check (website_url is null or website_url ~* '^https?://[^\s]+$'),
  public_email extensions.citext check (public_email is null or public_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  public_phone text check (public_phone is null or public_phone ~ '^\+[1-9][0-9]{6,14}$'),
  country_code char(2) not null references public.countries (code),
  city_id uuid references public.cities (id) on delete set null,
  verification_status public.verification_status not null default 'unverified',
  verified_at timestamptz,
  verified_by uuid references auth.users (id) on delete set null,
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on column public.organizer_profiles.is_demo is 'Organisateur fictif de démonstration (jamais présenté comme réel).';

create index organizer_profiles_country_idx on public.organizer_profiles (country_code) where deleted_at is null;
create index organizer_profiles_name_trgm_idx on public.organizer_profiles
  using gin (public.search_normalize(name) extensions.gin_trgm_ops);

create trigger organizer_profiles_set_updated_at before update on public.organizer_profiles
  for each row execute function public.set_updated_at();

create table public.organizer_members (
  organizer_id uuid not null references public.organizer_profiles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.organizer_member_role not null,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (organizer_id, user_id)
);

create index organizer_members_user_idx on public.organizer_members (user_id);

create table public.organizer_invitations (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizer_profiles (id) on delete cascade,
  email extensions.citext not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.organizer_member_role not null check (role <> 'owner'),
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index organizer_invitations_pending_uniq on public.organizer_invitations (organizer_id, email)
  where accepted_at is null and revoked_at is null;

-- Demandes de vérification (données privées : visibles uniquement par l'organisateur et la modération).
create table public.organizer_verification_requests (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizer_profiles (id) on delete cascade,
  submitted_by uuid references auth.users (id) on delete set null,
  legal_name text not null check (char_length(legal_name) between 2 and 200),
  registration_number text check (registration_number is null or char_length(registration_number) <= 64),
  message text check (message is null or char_length(message) <= 2000),
  document_paths text[] not null default '{}',
  status public.verification_status not null default 'pending'
    check (status in ('pending', 'verified', 'rejected')),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create unique index organizer_verification_pending_uniq on public.organizer_verification_requests (organizer_id)
  where status = 'pending';

-- -----------------------------------------------------------------------------
-- Permissions organisateur (miroir de packages/core/src/permissions.ts)
-- -----------------------------------------------------------------------------
create or replace function public.organizer_role_has_permission(
  p_role public.organizer_member_role,
  p_permission text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_permission
    when 'manage_organizer' then p_role in ('owner', 'admin')
    when 'manage_team' then p_role in ('owner', 'admin')
    when 'manage_events' then p_role in ('owner', 'admin', 'editor')
    when 'publish_events' then p_role in ('owner', 'admin')
    when 'manage_registrations' then p_role in ('owner', 'admin', 'editor')
    when 'post_announcements' then p_role in ('owner', 'admin', 'editor')
    when 'view_analytics' then p_role in ('owner', 'admin', 'editor', 'analyst')
    when 'view_sales' then p_role in ('owner', 'admin', 'analyst')
    else false
  end
$$;

create or replace function public.is_organizer_member(p_organizer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organizer_members m
    where m.organizer_id = p_organizer_id and m.user_id = (select auth.uid())
  )
$$;

create or replace function public.has_organizer_permission(p_organizer_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not public.is_suspended_user() and exists (
    select 1 from public.organizer_members m
    where m.organizer_id = p_organizer_id
      and m.user_id = (select auth.uid())
      and public.organizer_role_has_permission(m.role, p_permission)
  )
$$;

-- À la création d'un profil organisateur : le créateur devient propriétaire + rôle "organizer".
create or replace function public.organizer_profiles_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.organizer_members (organizer_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict do nothing;

    insert into public.user_roles (user_id, role) values (new.created_by, 'organizer')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger organizer_profiles_after_insert after insert on public.organizer_profiles
  for each row execute function public.organizer_profiles_after_insert();

create or replace function public.organizer_profiles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_service_context() or public.is_staff() then
    if tg_op = 'UPDATE' and new.verification_status = 'verified' and old.verification_status <> 'verified' then
      new.verified_at := now();
      new.verified_by := coalesce(new.verified_by, auth.uid());
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    if new.verification_status <> 'unverified' or new.is_demo or new.verified_at is not null then
      raise exception 'forbidden_column_change' using errcode = '42501';
    end if;
  else
    if new.verification_status is distinct from old.verification_status
       or new.verified_at is distinct from old.verified_at
       or new.verified_by is distinct from old.verified_by
       or new.is_demo is distinct from old.is_demo
       or new.created_by is distinct from old.created_by then
      raise exception 'forbidden_column_change' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger organizer_profiles_guard before insert or update on public.organizer_profiles
  for each row execute function public.organizer_profiles_guard();

-- Garantit qu'un organisateur conserve toujours au moins un propriétaire.
create or replace function public.organizer_members_keep_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (tg_op = 'DELETE' and old.role = 'owner')
     or (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner') then
    if not exists (
      select 1 from public.organizer_members m
      where m.organizer_id = old.organizer_id and m.role = 'owner' and m.user_id <> old.user_id
    ) and exists (select 1 from public.organizer_profiles o where o.id = old.organizer_id) then
      raise exception 'last_owner_cannot_be_removed' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger organizer_members_keep_owner before update or delete on public.organizer_members
  for each row execute function public.organizer_members_keep_owner();

-- Seuls les propriétaires peuvent nommer/retirer d'autres propriétaires.
create or replace function public.organizer_members_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role public.organizer_member_role;
begin
  if public.is_service_context() or public.is_staff() then
    return coalesce(new, old);
  end if;
  -- Premier propriétaire : le créateur de l'organisation (inséré par le trigger de création).
  if tg_op = 'INSERT' and new.role = 'owner'
     and not exists (select 1 from public.organizer_members m where m.organizer_id = new.organizer_id)
     and exists (select 1 from public.organizer_profiles o where o.id = new.organizer_id and o.created_by = new.user_id) then
    return new;
  end if;
  select m.role into v_actor_role from public.organizer_members m
  where m.organizer_id = coalesce(new.organizer_id, old.organizer_id) and m.user_id = auth.uid();

  if v_actor_role is distinct from 'owner'::public.organizer_member_role then
    if (tg_op in ('INSERT', 'UPDATE') and new.role = 'owner')
       or (tg_op in ('UPDATE', 'DELETE') and old.role = 'owner') then
      raise exception 'only_owner_can_manage_owners' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger organizer_members_guard before insert or update or delete on public.organizer_members
  for each row execute function public.organizer_members_guard();

-- -----------------------------------------------------------------------------
-- Lieux (salles, établissements)
-- -----------------------------------------------------------------------------
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (public.is_valid_slug(slug)),
  name text not null check (char_length(btrim(name)) between 2 and 160),
  description text check (description is null or char_length(description) <= 5000),
  address_line1 text not null check (char_length(address_line1) between 2 and 200),
  address_line2 text check (address_line2 is null or char_length(address_line2) <= 200),
  postal_code text check (postal_code is null or char_length(postal_code) <= 16),
  city_id uuid not null references public.cities (id),
  region_id uuid references public.regions (id) on delete set null,
  country_code char(2) not null references public.countries (code),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  location extensions.geography(Point, 4326) generated always as (public.make_geo_point(lat, lng)) stored,
  timezone text not null,
  capacity integer check (capacity is null or capacity > 0),
  accessibility jsonb not null default '{}'::jsonb check (jsonb_typeof(accessibility) = 'object'),
  practical_info text check (practical_info is null or char_length(practical_info) <= 3000),
  website_url text check (website_url is null or website_url ~* '^https?://[^\s]+$'),
  phone text check (phone is null or phone ~ '^\+[1-9][0-9]{6,14}$'),
  status text not null default 'active' check (status in ('active', 'pending', 'archived')),
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index venues_city_idx on public.venues (city_id) where deleted_at is null;
create index venues_location_idx on public.venues using gist (location);
create index venues_name_trgm_idx on public.venues using gin (public.search_normalize(name) extensions.gin_trgm_ops);

create trigger venues_set_updated_at before update on public.venues
  for each row execute function public.set_updated_at();

create or replace function public.venues_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_valid_timezone(new.timezone) then
    raise exception 'invalid_timezone' using errcode = '22023';
  end if;
  if not exists (select 1 from public.cities c where c.id = new.city_id and c.country_code = new.country_code) then
    raise exception 'city_country_mismatch' using errcode = '23514';
  end if;
  if public.is_service_context() or public.is_staff() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    if new.is_demo then
      raise exception 'forbidden_column_change' using errcode = '42501';
    end if;
  elsif new.is_demo is distinct from old.is_demo or new.created_by is distinct from old.created_by
        or new.status is distinct from old.status then
    raise exception 'forbidden_column_change' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger venues_guard before insert or update on public.venues
  for each row execute function public.venues_guard();

create table public.venue_media (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  storage_path text not null,
  alt_text text check (alt_text is null or char_length(alt_text) <= 300),
  credit text check (credit is null or char_length(credit) <= 200),
  license text check (license is null or char_length(license) <= 200),
  status public.media_status not null default 'pending',
  sort_order smallint not null default 0,
  uploaded_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index venue_media_venue_idx on public.venue_media (venue_id);

-- -----------------------------------------------------------------------------
-- Artistes / intervenants
-- -----------------------------------------------------------------------------
create table public.artists (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (public.is_valid_slug(slug)),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  bio text check (bio is null or char_length(bio) <= 4000),
  image_path text,
  country_code char(2) references public.countries (code),
  website_url text check (website_url is null or website_url ~* '^https?://[^\s]+$'),
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index artists_name_trgm_idx on public.artists using gin (public.search_normalize(name) extensions.gin_trgm_ops);

create trigger artists_set_updated_at before update on public.artists
  for each row execute function public.set_updated_at();

create or replace function public.artists_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_service_context() or public.is_staff() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    if new.is_demo then
      raise exception 'forbidden_column_change' using errcode = '42501';
    end if;
  elsif new.is_demo is distinct from old.is_demo or new.created_by is distinct from old.created_by then
    raise exception 'forbidden_column_change' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger artists_guard before insert or update on public.artists
  for each row execute function public.artists_guard();
