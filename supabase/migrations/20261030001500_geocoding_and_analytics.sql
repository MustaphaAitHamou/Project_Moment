-- =============================================================================
-- Tamurt Events — 1500 : cache de géocodage et statistiques d'interactions
-- Le géocodage utilise Nominatim (OpenStreetMap) dans le respect de sa politique :
-- 1 requête/seconde maximum, User-Agent identifiant l'application, mise en cache.
-- =============================================================================

create table public.geocode_cache (
  query_hash text not null,
  country_code char(2) not null references public.countries (code),
  query text not null,
  results jsonb not null,
  provider text not null default 'nominatim',
  created_at timestamptz not null default now(),
  primary key (query_hash, country_code)
);

alter table public.geocode_cache enable row level security;
revoke all on public.geocode_cache from anon, authenticated;

-- Compteurs d'interactions (appelé uniquement par le serveur, avec limitation de débit en amont).
create or replace function public.track_event_interaction(p_event_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
begin
  if p_kind not in ('view', 'share', 'calendar_add') then
    raise exception 'invalid_kind' using errcode = '22023';
  end if;
  if not exists (select 1 from public.events e where e.id = p_event_id and e.deleted_at is null) then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;
  if p_kind = 'view' then
    update public.events set views_count = views_count + 1 where id = p_event_id;
    insert into public.event_daily_stats (event_id, day, views) values (p_event_id, v_day, 1)
    on conflict (event_id, day) do update set views = public.event_daily_stats.views + 1;
  elsif p_kind = 'share' then
    insert into public.event_daily_stats (event_id, day, shares) values (p_event_id, v_day, 1)
    on conflict (event_id, day) do update set shares = public.event_daily_stats.shares + 1;
  else
    insert into public.event_daily_stats (event_id, day, calendar_adds) values (p_event_id, v_day, 1)
    on conflict (event_id, day) do update set calendar_adds = public.event_daily_stats.calendar_adds + 1;
  end if;
end;
$$;

revoke execute on function public.track_event_interaction(uuid, text) from public, anon, authenticated;
grant execute on function public.track_event_interaction(uuid, text) to service_role;

-- Sessions de l'utilisateur connecté (historique de connexion minimal : appareil et dates).
create or replace function public.my_sessions()
returns table (id uuid, created_at timestamptz, updated_at timestamptz, user_agent text, is_current boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.created_at, s.updated_at, s.user_agent,
         s.id::text = coalesce(auth.jwt() ->> 'session_id', '')
  from auth.sessions s
  where s.user_id = auth.uid()
  order by s.updated_at desc nulls last
  limit 20
$$;

revoke execute on function public.my_sessions() from public, anon;
grant execute on function public.my_sessions() to authenticated;
