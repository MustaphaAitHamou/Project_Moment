-- =============================================================================
-- Tamurt Events — 0800 : notifications (in-app, push, e-mail via outbox)
-- Le texte est rendu côté client / serveur à partir de (type, data) dans la langue
-- de l'utilisateur. Les canaux push / e-mail ne sont alimentés que si l'utilisateur
-- y a consenti, et jamais pour des contenus de démonstration.
-- =============================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type ~ '^[a-z][a-z_]{2,60}$'),
  data jsonb not null default '{}'::jsonb,
  title text check (title is null or char_length(title) <= 160),
  body text check (body is null or char_length(body) <= 2000),
  link text check (link is null or (link ~ '^/' and char_length(link) <= 300)),
  is_demo boolean not null default false,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index notifications_dedupe_uniq on public.notifications (user_id, dedupe_key) where dedupe_key is not null;
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  channel text not null check (channel in ('push', 'email')),
  status public.outbox_status not null default 'pending',
  attempts smallint not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (notification_id, channel)
);

create index notification_outbox_pending_idx on public.notification_outbox (created_at) where status = 'pending';

create table public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique check (char_length(token) between 10 and 400),
  platform text not null check (platform in ('ios', 'android', 'web')),
  device_name text check (device_name is null or char_length(device_name) <= 120),
  app_version text check (app_version is null or char_length(app_version) <= 40),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index device_push_tokens_user_idx on public.device_push_tokens (user_id) where revoked_at is null;

-- Types considérés comme essentiels (transactionnels) : e-mail envoyé même sans consentement marketing.
create or replace function public.notification_is_essential(p_type text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_type in (
    'order_confirmed', 'ticket_available', 'event_cancelled', 'event_rescheduled', 'account_suspended',
    'beta_access_granted', 'resale_listing_sold', 'resale_purchase_completed', 'resale_dispute_update'
  )
$$;

-- Crée une notification in-app et, si autorisé, les entrées d'outbox push/e-mail.
create or replace function public.notify_user(
  p_user_id uuid,
  p_type text,
  p_data jsonb,
  p_link text,
  p_dedupe_key text,
  p_is_demo boolean default false,
  p_title text default null,
  p_body text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_prefs public.notification_preferences;
  v_category_enabled boolean;
begin
  if p_user_id is null then
    return null;
  end if;
  insert into public.notifications (user_id, type, data, link, dedupe_key, is_demo, title, body)
  values (p_user_id, p_type, coalesce(p_data, '{}'::jsonb), p_link, p_dedupe_key, coalesce(p_is_demo, false),
          left(p_title, 160), left(p_body, 2000))
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing
  returning id into v_id;

  if v_id is null or coalesce(p_is_demo, false) then
    return v_id;
  end if;

  select * into v_prefs from public.notification_preferences np where np.user_id = p_user_id;
  v_category_enabled := case
    when p_type = 'event_reminder' then coalesce(v_prefs.reminders_enabled, true)
    when p_type = 'city_new_event' then coalesce(v_prefs.followed_city_events_enabled, true)
    when p_type in ('event_announcement', 'organizer_new_registration') then coalesce(v_prefs.organizer_updates_enabled, true)
    else true
  end;
  if not v_category_enabled then
    return v_id;
  end if;

  if coalesce(v_prefs.push_enabled, false)
     and exists (select 1 from public.device_push_tokens t where t.user_id = p_user_id and t.revoked_at is null) then
    insert into public.notification_outbox (notification_id, channel) values (v_id, 'push')
    on conflict do nothing;
  end if;
  if coalesce(v_prefs.email_enabled, true) and public.notification_is_essential(p_type) then
    insert into public.notification_outbox (notification_id, channel) values (v_id, 'email')
    on conflict do nothing;
  end if;
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Notifications liées aux événements : annulation, changement de date, publication
-- -----------------------------------------------------------------------------
create or replace function public.event_audience(p_event_id uuid)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select f.user_id from public.favorites f where f.event_id = p_event_id
  union
  select r.user_id from public.event_registrations r where r.event_id = p_event_id and r.status = 'registered'
  union
  select t.owner_id from public.tickets t where t.event_id = p_event_id and t.status = 'issued' and t.owner_id is not null
$$;

create or replace function public.events_notify_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_version text := to_char(now(), 'YYYYMMDDHH24MISS');
begin
  -- Annulation
  if new.status = 'cancelled' and old.status = 'published' then
    for r in select a.user_id from public.event_audience(new.id) a loop
      perform public.notify_user(r.user_id, 'event_cancelled',
        jsonb_build_object('event_id', new.id, 'slug', new.slug, 'title', new.title, 'reason', new.cancellation_reason),
        '/events/' || new.slug, 'event_cancelled:' || new.id::text, new.is_demo);
    end loop;
  end if;

  -- Changement de date / heure d'un événement publié
  if new.status = 'published' and old.status = 'published'
     and (new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at) then
    for r in select a.user_id from public.event_audience(new.id) a loop
      perform public.notify_user(r.user_id, 'event_rescheduled',
        jsonb_build_object('event_id', new.id, 'slug', new.slug, 'title', new.title,
                           'previous_starts_at', old.starts_at, 'starts_at', new.starts_at, 'timezone', new.timezone),
        '/events/' || new.slug, 'event_rescheduled:' || new.id::text || ':' || v_version, new.is_demo);
    end loop;
  end if;

  -- Nouvelle publication : abonnés de la ville (jamais pour un événement de démonstration)
  if new.status = 'published' and old.status is distinct from 'published' and not new.is_demo
     and new.visibility = 'public' then
    for r in
      select fc.user_id from public.user_followed_cities fc
      where fc.city_id = new.city_id and fc.user_id is distinct from new.created_by
    loop
      perform public.notify_user(r.user_id, 'city_new_event',
        jsonb_build_object('event_id', new.id, 'slug', new.slug, 'title', new.title, 'city_id', new.city_id,
                           'starts_at', new.starts_at, 'timezone', new.timezone),
        '/events/' || new.slug, 'city_new_event:' || new.id::text, false);
    end loop;
  end if;

  -- Décision de modération : informer l'équipe organisatrice
  if new.status is distinct from old.status and new.status in ('published', 'rejected')
     and old.status = 'pending_review' then
    for r in select m.user_id from public.organizer_members m where m.organizer_id = new.organizer_id loop
      perform public.notify_user(r.user_id,
        case when new.status = 'published' then 'organizer_event_approved' else 'organizer_event_rejected' end,
        jsonb_build_object('event_id', new.id, 'slug', new.slug, 'title', new.title, 'note', new.moderation_note),
        '/organizer/' || new.organizer_id::text || '/events/' || new.id::text,
        'moderation:' || new.id::text || ':' || v_version, new.is_demo);
    end loop;
  end if;
  return null;
end;
$$;

create trigger events_notify_changes after update on public.events
  for each row execute function public.events_notify_changes();

-- Annonces organisateur -> participants
create or replace function public.event_announcements_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_event public.events;
begin
  select * into v_event from public.events e where e.id = new.event_id;
  for r in
    select x.user_id from (
      select reg.user_id from public.event_registrations reg where reg.event_id = new.event_id and reg.status = 'registered'
      union
      select t.owner_id from public.tickets t where t.event_id = new.event_id and t.status = 'issued' and t.owner_id is not null
    ) x
  loop
    perform public.notify_user(r.user_id, 'event_announcement',
      jsonb_build_object('event_id', v_event.id, 'slug', v_event.slug, 'event_title', v_event.title, 'announcement_id', new.id),
      '/events/' || v_event.slug, 'announcement:' || new.id::text, v_event.is_demo, new.title, new.body);
  end loop;
  return null;
end;
$$;

create trigger event_announcements_notify after insert on public.event_announcements
  for each row execute function public.event_announcements_notify();

-- Rappels avant l'événement (appelé par pg_cron) : favoris, inscrits, détenteurs de billets.
create or replace function public.maintenance_queue_reminders()
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
    select a.user_id, e.id as event_id, e.slug, e.title, e.starts_at, e.timezone, e.is_demo, np.reminder_lead_hours
    from public.events e
    cross join lateral public.event_audience(e.id) a
    join public.notification_preferences np on np.user_id = a.user_id
    where e.status = 'published'
      and e.deleted_at is null
      and np.reminders_enabled
      and e.starts_at > now()
      and e.starts_at <= now() + make_interval(hours => np.reminder_lead_hours)
  loop
    if public.notify_user(r.user_id, 'event_reminder',
         jsonb_build_object('event_id', r.event_id, 'slug', r.slug, 'title', r.title, 'starts_at', r.starts_at,
                            'timezone', r.timezone, 'lead_hours', r.reminder_lead_hours),
         '/events/' || r.slug, 'reminder:' || r.event_id::text || ':' || r.reminder_lead_hours::text, r.is_demo) is not null then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

-- Inscriptions gratuites (RSVP) : capacité contrôlée sous verrou de ligne.
create or replace function public.register_for_event(p_event_id uuid, p_quantity integer default 1)
returns public.event_registrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.events;
  v_reg public.event_registrations;
  v_used integer;
  v_existing boolean;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  if public.is_suspended_user() then
    raise exception 'account_suspended' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity not between 1 and 10 then
    raise exception 'invalid_quantity' using errcode = '22023';
  end if;
  select * into v_event from public.events e where e.id = p_event_id for update;
  if not found or v_event.deleted_at is not null or v_event.status <> 'published'
     or v_event.visibility = 'private' then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;
  if v_event.registration_mode <> 'free_registration' then
    raise exception 'registration_not_available' using errcode = 'P0001';
  end if;
  if v_event.starts_at <= now() then
    raise exception 'event_started' using errcode = 'P0001';
  end if;

  select * into v_reg from public.event_registrations r
  where r.event_id = p_event_id and r.user_id = v_uid and r.status = 'registered';
  v_existing := found;

  select coalesce(sum(r.quantity), 0) into v_used from public.event_registrations r
  where r.event_id = p_event_id and r.status = 'registered' and r.user_id <> v_uid;
  if v_event.capacity is not null and v_used + p_quantity > v_event.capacity then
    raise exception 'event_full' using errcode = 'P0001';
  end if;

  if v_existing then
    update public.event_registrations set quantity = p_quantity where id = v_reg.id returning * into v_reg;
  else
    insert into public.event_registrations (event_id, user_id, quantity)
    values (p_event_id, v_uid, p_quantity) returning * into v_reg;
    perform set_config('tamurt.internal_counters', 'on', true);
    update public.events set registrations_count = registrations_count + 1 where id = p_event_id;
    perform set_config('tamurt.internal_counters', 'off', true);
    insert into public.event_daily_stats (event_id, day, registrations)
    values (p_event_id, (now() at time zone 'utc')::date, 1)
    on conflict (event_id, day) do update set registrations = public.event_daily_stats.registrations + 1;
    perform public.notify_user(m.user_id, 'organizer_new_registration',
      jsonb_build_object('event_id', v_event.id, 'title', v_event.title),
      '/organizer/' || v_event.organizer_id::text || '/events/' || v_event.id::text,
      'registration:' || v_event.id::text || ':' || to_char(now(), 'YYYYMMDDHH24'), v_event.is_demo)
    from public.organizer_members m
    where m.organizer_id = v_event.organizer_id and m.role in ('owner', 'admin');
  end if;
  return v_reg;
end;
$$;

create or replace function public.cancel_event_registration(p_event_id uuid)
returns public.event_registrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reg public.event_registrations;
begin
  update public.event_registrations
     set status = 'cancelled', cancelled_at = now()
   where event_id = p_event_id and user_id = auth.uid() and status = 'registered'
  returning * into v_reg;
  if not found then
    raise exception 'registration_not_found' using errcode = 'P0002';
  end if;
  perform set_config('tamurt.internal_counters', 'on', true);
  update public.events set registrations_count = greatest(registrations_count - 1, 0) where id = p_event_id;
  perform set_config('tamurt.internal_counters', 'off', true);
  return v_reg;
end;
$$;
