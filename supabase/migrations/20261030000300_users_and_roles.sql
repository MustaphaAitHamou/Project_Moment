-- =============================================================================
-- Tamurt Events — 0300 : profils, rôles, préférences, fonctions d'autorisation
-- Rôles : visiteur (anon), utilisateur (authenticated), organisateur, modérateur,
-- administrateur, bêta-testeur. Les rôles applicatifs sont stockés en base et ne
-- proviennent JAMAIS des métadonnées modifiables par l'utilisateur.
-- =============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 512),
  locale text not null default 'fr' check (locale in ('fr', 'en', 'ar')),
  country_code char(2) references public.countries (code),
  timezone text,
  home_city_id uuid references public.cities (id) on delete set null,
  onboarding_completed_at timestamptz,
  is_suspended boolean not null default false,
  suspended_at timestamptz,
  suspended_reason text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Profil privé de chaque compte (1-1 avec auth.users). Jamais exposé publiquement.';

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create index user_roles_role_idx on public.user_roles (role);

create table public.user_followed_cities (
  user_id uuid not null references auth.users (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, city_id)
);

create index user_followed_cities_city_idx on public.user_followed_cities (city_id);

create table public.user_category_interests (
  user_id uuid not null references auth.users (id) on delete cascade,
  category_slug text not null references public.event_categories (slug) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, category_slug)
);

create table public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  push_enabled boolean not null default false,
  email_enabled boolean not null default true,
  reminders_enabled boolean not null default true,
  reminder_lead_hours smallint not null default 24 check (reminder_lead_hours in (1, 3, 24, 48, 168)),
  followed_city_events_enabled boolean not null default true,
  organizer_updates_enabled boolean not null default true,
  marketing_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

comment on column public.notification_preferences.marketing_enabled is
  'Consentement explicite aux communications non essentielles (désactivé par défaut).';

create trigger notification_preferences_set_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Fonctions d'autorisation (SECURITY DEFINER : lisent user_roles sans RLS)
-- -----------------------------------------------------------------------------
create or replace function public.has_role(p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = p_role
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('admin')
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role in ('admin', 'moderator')
  )
$$;

create or replace function public.is_suspended_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_suspended or p.deleted_at is not null from public.profiles p where p.id = (select auth.uid())),
    false
  )
$$;

-- Vrai si l'appel provient du rôle service (serveur de confiance via l'API) ou d'une
-- connexion directe d'administration (migrations, seed, pg_cron). On utilise session_user
-- (rôle de connexion) et non current_user, qui vaut le propriétaire dans une fonction
-- SECURITY DEFINER et permettrait sinon une élévation de privilèges.
create or replace function public.is_service_context()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.role(), '') = 'service_role'
      or (
        auth.uid() is null
        and coalesce(auth.role(), '') = ''
        and session_user in ('postgres', 'supabase_admin')
      )
$$;

-- Accès aux fonctionnalités interactives pendant la bêta fermée.
create or replace function public.has_app_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
     and not public.is_suspended_user()
     and (
       coalesce((select s.value ->> 'mode' from public.app_settings s where s.key = 'beta'), 'closed') = 'open'
       or exists (
         select 1 from public.user_roles ur
         where ur.user_id = (select auth.uid()) and ur.role in ('beta_tester', 'admin', 'moderator')
       )
     )
$$;

-- -----------------------------------------------------------------------------
-- Création automatique du profil à l'inscription
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name text;
  v_locale text;
  v_country char(2);
begin
  v_name := nullif(btrim(v_meta ->> 'display_name'), '');
  if v_name is null then
    v_name := nullif(split_part(coalesce(new.email, ''), '@', 1), '');
  end if;
  v_name := left(coalesce(v_name, 'Membre Tamurt'), 80);

  v_locale := case when v_meta ->> 'locale' in ('fr', 'en', 'ar') then v_meta ->> 'locale' else 'fr' end;

  select c.code into v_country from public.countries c where c.code = upper(v_meta ->> 'country_code');

  insert into public.profiles (id, display_name, locale, country_code, timezone)
  values (
    new.id, v_name, v_locale, v_country,
    case when public.is_valid_timezone(v_meta ->> 'timezone') then v_meta ->> 'timezone' else null end
  )
  on conflict (id) do nothing;

  insert into public.notification_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.profiles_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.timezone is not null and not public.is_valid_timezone(new.timezone) then
    raise exception 'invalid_timezone' using errcode = '22023';
  end if;
  new.display_name := btrim(new.display_name);
  -- Les champs de modération ne peuvent être modifiés que par le personnel ou le serveur.
  if tg_op = 'UPDATE' and not (public.is_staff() or public.is_service_context()) then
    if new.is_suspended is distinct from old.is_suspended
       or new.suspended_at is distinct from old.suspended_at
       or new.suspended_reason is distinct from old.suspended_reason
       or new.deleted_at is distinct from old.deleted_at then
      raise exception 'forbidden_column_change' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_validate before insert or update on public.profiles
  for each row execute function public.profiles_validate();
