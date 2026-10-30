-- =============================================================================
-- Tamurt Events — 1000 : programme Tamurt Beta
-- Liste d'attente (e-mail vérifié) -> invitation individuelle (code unique, haché)
-- -> utilisation du code par un compte connecté -> rôle beta_tester (places limitées)
-- -> retours (bugs, suggestions, notes).
-- La protection d'une URL Vercel n'est PAS une autorisation : l'accès est contrôlé ici.
-- =============================================================================

create table public.beta_waitlist (
  id uuid primary key default gen_random_uuid(),
  email extensions.citext not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  country_code char(2) references public.countries (code),
  platforms text[] not null default '{}' check (platforms <@ array['ios', 'android', 'web']::text[]),
  social_handle text check (social_handle is null or char_length(social_handle) <= 80),
  motivation text check (motivation is null or char_length(motivation) <= 1000),
  locale text not null default 'fr' check (locale in ('fr', 'en', 'ar')),
  consent_at timestamptz not null,
  verification_token_hash text unique,
  verification_sent_at timestamptz,
  verified_at timestamptz,
  status public.beta_waitlist_status not null default 'pending_verification',
  user_id uuid references auth.users (id) on delete set null,
  source text check (source is null or char_length(source) <= 60),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index beta_waitlist_status_idx on public.beta_waitlist (status, created_at);

create trigger beta_waitlist_set_updated_at before update on public.beta_waitlist
  for each row execute function public.set_updated_at();

create table public.beta_invitations (
  id uuid primary key default gen_random_uuid(),
  waitlist_id uuid references public.beta_waitlist (id) on delete set null,
  email extensions.citext,
  code_hash text not null unique,
  code_hint text not null check (char_length(code_hint) between 2 and 8),
  note text check (note is null or char_length(note) <= 300),
  created_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '30 days',
  redeemed_by uuid references auth.users (id) on delete set null,
  redeemed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

comment on column public.beta_invitations.code_hash is
  'Empreinte HMAC du code d''invitation (le code en clair n''est affiché qu''une fois à sa création).';

create index beta_invitations_waitlist_idx on public.beta_invitations (waitlist_id);

create trigger audit_beta_invitations after insert or update on public.beta_invitations
  for each row execute function public.audit_row_change();

create table public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  kind public.feedback_kind not null,
  title text check (title is null or char_length(btrim(title)) between 3 and 140),
  message text check (message is null or char_length(btrim(message)) between 3 and 4000),
  rating smallint check (rating is null or rating between 1 and 5),
  platform text not null check (platform in ('web', 'ios', 'android')),
  app_version text check (app_version is null or char_length(app_version) <= 40),
  device_info jsonb not null default '{}'::jsonb check (jsonb_typeof(device_info) = 'object'),
  screen text check (screen is null or char_length(screen) <= 200),
  status public.feedback_status not null default 'new',
  admin_note text check (admin_note is null or char_length(admin_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beta_feedback_rating_required check (kind <> 'rating' or rating is not null),
  constraint beta_feedback_text_required check (kind = 'rating' or (title is not null and message is not null))
);

create index beta_feedback_status_idx on public.beta_feedback (status, created_at desc);
create index beta_feedback_user_idx on public.beta_feedback (user_id, created_at desc);

create trigger beta_feedback_set_updated_at before update on public.beta_feedback
  for each row execute function public.set_updated_at();

create or replace function public.beta_feedback_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_service_context() or public.is_staff() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.status := 'new';
    new.admin_note := null;
  end if;
  return new;
end;
$$;

create trigger beta_feedback_guard before insert or update on public.beta_feedback
  for each row execute function public.beta_feedback_guard();

-- Utilisation d'un code d'invitation (appelé par le serveur après hachage du code).
create or replace function public.beta_redeem_invitation(p_user_id uuid, p_code_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.beta_invitations;
  v_email text;
  v_settings jsonb;
  v_max integer;
  v_count integer;
begin
  select u.email into v_email from auth.users u where u.id = p_user_id and u.email_confirmed_at is not null;
  if v_email is null then
    raise exception 'email_not_verified' using errcode = '42501';
  end if;

  -- Verrou sur le paramètre « beta » : sérialise l'attribution des places.
  select s.value into v_settings from public.app_settings s where s.key = 'beta' for update;
  v_max := coalesce((v_settings ->> 'max_testers')::integer, 0);

  select * into v_inv from public.beta_invitations i where i.code_hash = p_code_hash for update;
  if not found then
    raise exception 'invalid_code' using errcode = 'P0002';
  end if;
  if v_inv.revoked_at is not null then
    raise exception 'invitation_revoked' using errcode = 'P0001';
  end if;
  if v_inv.redeemed_by is not null then
    if v_inv.redeemed_by = p_user_id then
      return jsonb_build_object('status', 'already_redeemed');
    end if;
    raise exception 'invitation_already_used' using errcode = 'P0001';
  end if;
  if v_inv.expires_at <= now() then
    raise exception 'invitation_expired' using errcode = 'P0001';
  end if;
  if v_inv.email is not null and v_inv.email <> v_email::extensions.citext then
    raise exception 'invitation_email_mismatch' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.user_roles ur where ur.user_id = p_user_id and ur.role = 'beta_tester') then
    update public.beta_invitations set redeemed_by = p_user_id, redeemed_at = now() where id = v_inv.id;
    return jsonb_build_object('status', 'already_tester');
  end if;
  select count(*) into v_count from public.user_roles ur where ur.role = 'beta_tester';
  if v_count >= v_max then
    raise exception 'beta_full' using errcode = 'P0001';
  end if;

  update public.beta_invitations set redeemed_by = p_user_id, redeemed_at = now() where id = v_inv.id;
  insert into public.user_roles (user_id, role) values (p_user_id, 'beta_tester') on conflict do nothing;
  update public.beta_waitlist
     set status = 'accepted', user_id = p_user_id
   where (id = v_inv.waitlist_id or email = v_email::extensions.citext) and status <> 'removed';
  perform public.notify_user(p_user_id, 'beta_access_granted', '{}'::jsonb, '/account/beta',
                             'beta_access_granted', false);
  return jsonb_build_object('status', 'redeemed', 'seats_used', v_count + 1, 'seats_total', v_max);
end;
$$;

create or replace function public.beta_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_staff();
  return jsonb_build_object(
    'waitlist_by_status', (
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
      from (select status, count(*) as n from public.beta_waitlist group by status) s
    ),
    'waitlist_by_country', (
      select coalesce(jsonb_object_agg(coalesce(country_code, '??'), n), '{}'::jsonb)
      from (select country_code, count(*) as n from public.beta_waitlist group by country_code) s
    ),
    'invitations_sent', (select count(*) from public.beta_invitations where revoked_at is null),
    'invitations_redeemed', (select count(*) from public.beta_invitations where redeemed_at is not null),
    'testers', (select count(*) from public.user_roles where role = 'beta_tester'),
    'max_testers', (select (value ->> 'max_testers')::integer from public.app_settings where key = 'beta'),
    'feedback_by_kind', (
      select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb)
      from (select kind, count(*) as n from public.beta_feedback group by kind) s
    ),
    'feedback_by_status', (
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
      from (select status, count(*) as n from public.beta_feedback group by status) s
    ),
    'average_rating', (select round(avg(rating)::numeric, 2) from public.beta_feedback where rating is not null),
    'active_testers_7d', (
      select count(distinct f.user_id) from public.beta_feedback f where f.created_at > now() - interval '7 days'
    )
  );
end;
$$;
