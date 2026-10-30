-- =============================================================================
-- Tamurt Events — 0900 : signalements, modération, journal d'audit, fonctions
-- d'administration (toutes contrôlées côté serveur par rôle)
-- =============================================================================

create table public.event_reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  reporter_id uuid references auth.users (id) on delete set null,
  reason public.report_reason not null,
  details text check (details is null or char_length(details) <= 2000),
  status public.report_status not null default 'open',
  handled_by uuid references auth.users (id) on delete set null,
  handled_at timestamptz,
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 2000),
  created_at timestamptz not null default now()
);

create unique index event_reports_open_uniq on public.event_reports (event_id, reporter_id)
  where status in ('open', 'reviewing');
create index event_reports_status_idx on public.event_reports (status, created_at);

create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reported_user_id uuid not null references auth.users (id) on delete cascade,
  reporter_id uuid references auth.users (id) on delete set null,
  context_type text not null default 'other'
    check (context_type in ('resale_listing', 'resale_transaction', 'organizer', 'event', 'other')),
  context_id uuid,
  reason public.report_reason not null,
  details text check (details is null or char_length(details) <= 2000),
  status public.report_status not null default 'open',
  handled_by uuid references auth.users (id) on delete set null,
  handled_at timestamptz,
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 2000),
  created_at timestamptz not null default now(),
  constraint user_reports_not_self check (reporter_id is null or reporter_id <> reported_user_id)
);

create unique index user_reports_open_uniq on public.user_reports (reported_user_id, reporter_id, context_type, context_id)
  where status in ('open', 'reviewing');
create index user_reports_status_idx on public.user_reports (status, created_at);
create index user_reports_reported_idx on public.user_reports (reported_user_id, status);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  target_type public.moderation_target not null,
  target_id uuid not null,
  action text not null check (action in (
    'approve', 'reject', 'request_changes', 'suspend', 'unsuspend', 'verify', 'unverify', 'hide', 'restore',
    'remove', 'warn', 'resolve', 'dismiss', 'grant_role', 'revoke_role', 'sponsor', 'unsponsor'
  )),
  reason text check (reason is null or char_length(reason) <= 2000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index moderation_actions_target_idx on public.moderation_actions (target_type, target_id, created_at desc);
create index moderation_actions_actor_idx on public.moderation_actions (actor_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Journal d'audit append-only
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  changes jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

create or replace function public.audit_logs_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log_immutable' using errcode = '42501';
end;
$$;

create trigger audit_logs_immutable before update or delete on public.audit_logs
  for each row execute function public.audit_logs_immutable();

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_changes jsonb;
  v_ref jsonb;
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new) - 'search_document' - 'search_vector';
    v_changes := v_new;
    v_ref := v_new;
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old) - 'search_document' - 'search_vector';
    v_new := to_jsonb(new) - 'search_document' - 'search_vector';
    select jsonb_object_agg(n.key, jsonb_build_object('old', v_old -> n.key, 'new', n.value))
      into v_changes
    from jsonb_each(v_new) n
    where (v_old -> n.key) is distinct from n.value and n.key not in ('updated_at');
    if v_changes is null then
      return null;
    end if;
    v_ref := v_new;
  else
    v_old := to_jsonb(old) - 'search_document' - 'search_vector';
    v_changes := v_old;
    v_ref := v_old;
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, changes)
  values (
    auth.uid(),
    coalesce(auth.role(), session_user::text),
    lower(tg_op),
    tg_table_name,
    coalesce(v_ref ->> 'id', v_ref ->> 'key', v_ref ->> 'user_id'),
    v_changes
  );
  return null;
end;
$$;

-- Tables sensibles auditées
create trigger audit_user_roles after insert or update or delete on public.user_roles
  for each row execute function public.audit_row_change();
create trigger audit_profiles_moderation after update on public.profiles
  for each row when (old.is_suspended is distinct from new.is_suspended or old.deleted_at is distinct from new.deleted_at)
  execute function public.audit_row_change();
create trigger audit_organizer_profiles after update on public.organizer_profiles
  for each row when (old.verification_status is distinct from new.verification_status or old.deleted_at is distinct from new.deleted_at)
  execute function public.audit_row_change();
create trigger audit_organizer_members after insert or update or delete on public.organizer_members
  for each row execute function public.audit_row_change();
create trigger audit_events_lifecycle after update on public.events
  for each row when (old.status is distinct from new.status or old.deleted_at is distinct from new.deleted_at
                     or old.is_sponsored is distinct from new.is_sponsored or old.cover_status is distinct from new.cover_status)
  execute function public.audit_row_change();
create trigger audit_orders after insert or update on public.orders
  for each row execute function public.audit_row_change();
create trigger audit_refunds after insert or update on public.refunds
  for each row execute function public.audit_row_change();
create trigger audit_resale_listings after update on public.resale_listings
  for each row when (old.status is distinct from new.status)
  execute function public.audit_row_change();
create trigger audit_app_settings after insert or update or delete on public.app_settings
  for each row execute function public.audit_row_change();
create trigger audit_commercial_agreements after insert or update or delete on public.commercial_agreements
  for each row execute function public.audit_row_change();
create trigger audit_ticket_providers after insert or update or delete on public.ticket_providers
  for each row execute function public.audit_row_change();
create trigger audit_countries after update on public.countries
  for each row execute function public.audit_row_change();
create trigger audit_resale_rules after insert or update or delete on public.resale_rules
  for each row execute function public.audit_row_change();
create trigger audit_promotions after insert or update or delete on public.promotions
  for each row execute function public.audit_row_change();

create or replace function public.log_moderation(
  p_target_type public.moderation_target,
  p_target_id uuid,
  p_action text,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.moderation_actions (actor_id, target_type, target_id, action, reason, metadata)
  values (auth.uid(), p_target_type, p_target_id, p_action, p_reason, coalesce(p_metadata, '{}'::jsonb))
$$;

-- -----------------------------------------------------------------------------
-- Signalements (utilisateurs authentifiés)
-- -----------------------------------------------------------------------------
create or replace function public.report_resale_listing(p_listing_id uuid, p_reason public.report_reason, p_details text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seller uuid;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  select l.seller_id into v_seller from public.resale_listings l where l.id = p_listing_id;
  if v_seller is null then
    raise exception 'listing_not_found' using errcode = 'P0002';
  end if;
  if v_seller = auth.uid() then
    raise exception 'cannot_report_self' using errcode = 'P0001';
  end if;
  insert into public.user_reports (reported_user_id, reporter_id, context_type, context_id, reason, details)
  values (v_seller, auth.uid(), 'resale_listing', p_listing_id, p_reason, nullif(btrim(p_details), ''))
  on conflict do nothing
  returning id into v_id;
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Fonctions d'administration
-- -----------------------------------------------------------------------------
create or replace function public.assert_staff()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() or public.is_suspended_user() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() or public.is_suspended_user() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.admin_set_role(p_user_id uuid, p_role public.app_role, p_grant boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  if p_user_id = auth.uid() and p_role = 'admin' and not p_grant then
    raise exception 'cannot_revoke_own_admin' using errcode = 'P0001';
  end if;
  if p_grant then
    insert into public.user_roles (user_id, role, granted_by) values (p_user_id, p_role, auth.uid())
    on conflict do nothing;
  else
    delete from public.user_roles where user_id = p_user_id and role = p_role;
  end if;
  perform public.log_moderation('user', p_user_id, case when p_grant then 'grant_role' else 'revoke_role' end,
                                null, jsonb_build_object('role', p_role));
end;
$$;

create or replace function public.admin_set_user_suspension(p_user_id uuid, p_suspended boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_staff();
  if p_user_id = auth.uid() then
    raise exception 'cannot_suspend_self' using errcode = 'P0001';
  end if;
  if not public.is_admin() and exists (
    select 1 from public.user_roles ur where ur.user_id = p_user_id and ur.role in ('admin', 'moderator')
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.profiles
     set is_suspended = p_suspended,
         suspended_at = case when p_suspended then now() else null end,
         suspended_reason = case when p_suspended then left(p_reason, 500) else null end
   where id = p_user_id;
  if p_suspended then
    update public.resale_listings set status = 'removed', removed_reason = 'seller_suspended'
    where seller_id = p_user_id and status = 'active';
    perform public.notify_user(p_user_id, 'account_suspended', jsonb_build_object('reason', p_reason), null,
                               'suspended:' || to_char(now(), 'YYYYMMDDHH24MISS'), false);
  end if;
  perform public.log_moderation('user', p_user_id, case when p_suspended then 'suspend' else 'unsuspend' end, p_reason);
end;
$$;

create or replace function public.admin_review_event(p_event_id uuid, p_decision text, p_note text)
returns public.events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events;
begin
  perform public.assert_staff();
  if p_decision not in ('approve', 'reject', 'unpublish') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
  if p_decision = 'reject' and coalesce(btrim(p_note), '') = '' then
    raise exception 'note_required' using errcode = '22023';
  end if;
  update public.events
     set status = case p_decision when 'approve' then 'published'::public.event_status
                                  when 'reject' then 'rejected'::public.event_status
                                  else 'pending_review'::public.event_status end,
         moderation_note = nullif(btrim(p_note), '')
   where id = p_event_id
  returning * into v_event;
  if not found then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;
  perform public.log_moderation('event', p_event_id,
    case p_decision when 'approve' then 'approve' when 'reject' then 'reject' else 'hide' end, p_note);
  return v_event;
end;
$$;

create or replace function public.admin_set_event_sponsored(p_event_id uuid, p_sponsored boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.events set is_sponsored = p_sponsored where id = p_event_id;
  perform public.log_moderation('event', p_event_id, case when p_sponsored then 'sponsor' else 'unsponsor' end, null);
end;
$$;

create or replace function public.admin_review_organizer(p_organizer_id uuid, p_decision text, p_note text)
returns public.organizer_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org public.organizer_profiles;
begin
  perform public.assert_staff();
  if p_decision not in ('verify', 'reject', 'unverify') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
  update public.organizer_profiles
     set verification_status = case p_decision when 'verify' then 'verified'::public.verification_status
                                               when 'reject' then 'rejected'::public.verification_status
                                               else 'unverified'::public.verification_status end,
         verified_at = case when p_decision = 'verify' then now() else null end,
         verified_by = case when p_decision = 'verify' then auth.uid() else null end
   where id = p_organizer_id
  returning * into v_org;
  if not found then
    raise exception 'organizer_not_found' using errcode = 'P0002';
  end if;
  update public.organizer_verification_requests
     set status = case when p_decision = 'verify' then 'verified'::public.verification_status else 'rejected'::public.verification_status end,
         reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note
   where organizer_id = p_organizer_id and status = 'pending';
  perform public.log_moderation('organizer', p_organizer_id, p_decision, p_note);
  return v_org;
end;
$$;

create or replace function public.admin_review_media(p_kind text, p_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.media_status := case when p_approve then 'approved'::public.media_status else 'rejected'::public.media_status end;
begin
  perform public.assert_staff();
  if p_kind = 'event_cover' then
    update public.events set cover_status = v_status where id = p_id;
  elsif p_kind = 'event_media' then
    update public.event_media set status = v_status, reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
  elsif p_kind = 'venue_media' then
    update public.venue_media set status = v_status, reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
  else
    raise exception 'invalid_media_kind' using errcode = '22023';
  end if;
  perform public.log_moderation('media', p_id, case when p_approve then 'approve' else 'reject' end, p_note,
                                jsonb_build_object('kind', p_kind));
end;
$$;

create or replace function public.admin_remove_resale_listing(p_listing_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_staff();
  update public.resale_listings set status = 'removed', removed_reason = left(p_reason, 300)
  where id = p_listing_id and status in ('active', 'reserved');
  if not found then
    raise exception 'listing_not_removable' using errcode = 'P0001';
  end if;
  perform public.log_moderation('resale_listing', p_listing_id, 'remove', p_reason);
end;
$$;

create or replace function public.admin_handle_report(p_kind text, p_report_id uuid, p_status public.report_status, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_staff();
  if p_kind = 'event' then
    update public.event_reports set status = p_status, handled_by = auth.uid(), handled_at = now(), resolution_note = p_note
    where id = p_report_id;
  elsif p_kind = 'user' then
    update public.user_reports set status = p_status, handled_by = auth.uid(), handled_at = now(), resolution_note = p_note
    where id = p_report_id;
  else
    raise exception 'invalid_report_kind' using errcode = '22023';
  end if;
  if not found then
    raise exception 'report_not_found' using errcode = 'P0002';
  end if;
  perform public.log_moderation('report', p_report_id,
    case when p_status in ('resolved') then 'resolve' when p_status = 'dismissed' then 'dismiss' else 'warn' end, p_note,
    jsonb_build_object('kind', p_kind, 'status', p_status));
end;
$$;

create or replace function public.admin_update_setting(p_key text, p_value jsonb)
returns public.app_settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.app_settings;
begin
  perform public.assert_admin();
  if p_key not in ('beta', 'commerce', 'resale') then
    raise exception 'unknown_setting' using errcode = '22023';
  end if;
  if jsonb_typeof(p_value) <> 'object' then
    raise exception 'invalid_setting_value' using errcode = '22023';
  end if;
  update public.app_settings set value = value || p_value, updated_by = auth.uid()
  where key = p_key returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.admin_list_users(p_query text default null, p_limit integer default 50, p_offset integer default 0)
returns table (
  id uuid,
  email text,
  display_name text,
  roles public.app_role[],
  is_suspended boolean,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_staff();
  return query
  select u.id, u.email::text, p.display_name,
         coalesce(array_agg(ur.role order by ur.role) filter (where ur.role is not null), '{}'::public.app_role[]),
         coalesce(p.is_suspended, false), u.email_confirmed_at, u.last_sign_in_at, u.created_at,
         count(*) over ()
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.user_roles ur on ur.user_id = u.id
  where p_query is null or p_query = ''
     or u.email ilike '%' || p_query || '%'
     or p.display_name ilike '%' || p_query || '%'
  group by u.id, p.display_name, p.is_suspended
  order by u.created_at desc
  limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0);
end;
$$;

create or replace function public.admin_platform_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_staff();
  return jsonb_build_object(
    'users_total', (select count(*) from auth.users),
    'users_last_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'organizers_total', (select count(*) from public.organizer_profiles where deleted_at is null),
    'organizers_pending_verification', (select count(*) from public.organizer_verification_requests where status = 'pending'),
    'events_published', (select count(*) from public.events where status = 'published' and deleted_at is null),
    'events_pending_review', (select count(*) from public.events where status = 'pending_review' and deleted_at is null),
    'events_demo', (select count(*) from public.events where is_demo and deleted_at is null),
    'reports_open', (select count(*) from public.event_reports where status in ('open', 'reviewing'))
                  + (select count(*) from public.user_reports where status in ('open', 'reviewing')),
    'media_pending', (select count(*) from public.events where cover_path is not null and cover_status = 'pending')
                   + (select count(*) from public.event_media where status = 'pending'),
    'orders_demo', (select count(*) from public.orders where environment = 'demo'),
    'orders_demo_fulfilled', (select count(*) from public.orders where environment = 'demo' and status = 'fulfilled'),
    'orders_live', (select count(*) from public.orders where environment = 'live'),
    'revenue_demo_minor_by_currency', (
      select coalesce(jsonb_object_agg(currency, total), '{}'::jsonb)
      from (select currency, sum(total_minor) as total from public.orders
            where environment = 'demo' and status = 'fulfilled' group by currency) s
    ),
    'resale_listings_active', (select count(*) from public.resale_listings where status = 'active'),
    'resale_disputes_open', (select count(*) from public.resale_disputes where status in ('open', 'investigating')),
    'beta_waitlist', (select count(*) from public.beta_waitlist),
    'beta_testers', (select count(*) from public.user_roles where role = 'beta_tester'),
    'beta_feedback_new', (select count(*) from public.beta_feedback where status = 'new')
  );
end;
$$;
