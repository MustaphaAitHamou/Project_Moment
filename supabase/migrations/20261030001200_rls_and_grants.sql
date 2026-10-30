-- =============================================================================
-- Tamurt Events — 1200 : Row Level Security, privilèges de tables/colonnes et
-- d'exécution des fonctions.
-- Principes :
--   * RLS activée sur TOUTES les tables du schéma public.
--   * Un utilisateur ne lit / modifie que ses données privées.
--   * Un organisateur ne gère que les objets de ses organisations (selon permissions).
--   * Les opérations financières, de revente, de bêta et d'administration passent par
--     des fonctions contrôlées (rôle service ou vérification de rôle interne).
--   * Défense en profondeur : les privilèges d'écriture sont retirés aux rôles clients
--     lorsque l'écriture directe n'est jamais légitime.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Activation de la RLS
-- -----------------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Référentiels : lecture publique, écriture administrateur
-- -----------------------------------------------------------------------------
revoke insert, update, delete, truncate on public.countries, public.regions, public.cities, public.event_categories from anon;

create policy countries_read on public.countries for select to anon, authenticated using (true);
create policy countries_admin_write on public.countries for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy regions_read on public.regions for select to anon, authenticated using (true);
create policy regions_admin_insert on public.regions for insert to authenticated with check (public.is_admin());
create policy regions_admin_update on public.regions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy regions_admin_delete on public.regions for delete to authenticated using (public.is_admin());

create policy cities_read on public.cities for select to anon, authenticated using (is_active or public.is_staff());
create policy cities_admin_insert on public.cities for insert to authenticated with check (public.is_admin());
create policy cities_admin_update on public.cities for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy categories_read on public.event_categories for select to anon, authenticated using (is_active or public.is_staff());
create policy categories_admin_insert on public.event_categories for insert to authenticated with check (public.is_admin());
create policy categories_admin_update on public.event_categories for update to authenticated using (public.is_admin()) with check (public.is_admin());

revoke insert, update, delete, truncate on public.countries, public.event_categories from authenticated;
grant update (is_active, ticket_sales_live_enabled, resale_live_enabled, resale_legal_status, sort_order, names)
  on public.countries to authenticated;
grant insert, update on public.event_categories to authenticated;
revoke delete on public.cities from authenticated;

revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to anon, authenticated;
create policy app_settings_read on public.app_settings for select to anon, authenticated using (is_public or public.is_staff());

-- -----------------------------------------------------------------------------
-- Profils, rôles, préférences
-- -----------------------------------------------------------------------------
revoke all on public.profiles from anon;
revoke insert, update, delete, truncate on public.profiles from authenticated;
grant update (display_name, avatar_path, locale, country_code, timezone, home_city_id, onboarding_completed_at)
  on public.profiles to authenticated;

create policy profiles_read_own on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_staff());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

revoke all on public.user_roles from anon;
revoke insert, update, delete, truncate on public.user_roles from authenticated;
create policy user_roles_read on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());

revoke all on public.user_followed_cities, public.user_category_interests from anon;
revoke update on public.user_followed_cities, public.user_category_interests from authenticated;
create policy followed_cities_own_read on public.user_followed_cities for select to authenticated
  using (user_id = (select auth.uid()));
create policy followed_cities_own_insert on public.user_followed_cities for insert to authenticated
  with check (user_id = (select auth.uid()) and not public.is_suspended_user());
create policy followed_cities_own_delete on public.user_followed_cities for delete to authenticated
  using (user_id = (select auth.uid()));
create policy category_interests_own_read on public.user_category_interests for select to authenticated
  using (user_id = (select auth.uid()));
create policy category_interests_own_insert on public.user_category_interests for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy category_interests_own_delete on public.user_category_interests for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.notification_preferences from anon;
revoke insert, delete, truncate, update on public.notification_preferences from authenticated;
grant update (push_enabled, email_enabled, reminders_enabled, reminder_lead_hours, followed_city_events_enabled,
              organizer_updates_enabled, marketing_enabled)
  on public.notification_preferences to authenticated;
create policy notification_preferences_own_read on public.notification_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy notification_preferences_own_update on public.notification_preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Organisateurs
-- -----------------------------------------------------------------------------
revoke insert, update, delete, truncate on public.organizer_profiles from anon;
revoke delete on public.organizer_profiles from authenticated;
create policy organizer_profiles_read on public.organizer_profiles for select to anon, authenticated
  using (deleted_at is null or public.is_organizer_member(id) or public.is_staff());
create policy organizer_profiles_insert on public.organizer_profiles for insert to authenticated
  with check (public.has_app_access());
create policy organizer_profiles_update on public.organizer_profiles for update to authenticated
  using (public.has_organizer_permission(id, 'manage_organizer') or public.is_staff())
  with check (public.has_organizer_permission(id, 'manage_organizer') or public.is_staff());

revoke all on public.organizer_members from anon;
revoke insert, truncate on public.organizer_members from authenticated;
create policy organizer_members_read on public.organizer_members for select to authenticated
  using (public.is_organizer_member(organizer_id) or public.is_staff());
create policy organizer_members_update on public.organizer_members for update to authenticated
  using (public.has_organizer_permission(organizer_id, 'manage_team') or public.is_staff())
  with check (public.has_organizer_permission(organizer_id, 'manage_team') or public.is_staff());
create policy organizer_members_delete on public.organizer_members for delete to authenticated
  using (user_id = (select auth.uid()) or public.has_organizer_permission(organizer_id, 'manage_team') or public.is_staff());

revoke all on public.organizer_invitations from anon;
revoke delete, truncate on public.organizer_invitations from authenticated;
create policy organizer_invitations_read on public.organizer_invitations for select to authenticated
  using (
    public.has_organizer_permission(organizer_id, 'manage_team')
    or public.is_staff()
    or (email = (select auth.jwt() ->> 'email')::extensions.citext and accepted_at is null and revoked_at is null)
  );
create policy organizer_invitations_insert on public.organizer_invitations for insert to authenticated
  with check (public.has_organizer_permission(organizer_id, 'manage_team') and invited_by = (select auth.uid())
              and accepted_at is null and revoked_at is null);
create policy organizer_invitations_update on public.organizer_invitations for update to authenticated
  using (public.has_organizer_permission(organizer_id, 'manage_team'))
  with check (public.has_organizer_permission(organizer_id, 'manage_team') and accepted_at is null);

-- Acceptation d'une invitation (adresse e-mail vérifiée du compte connecté).
create or replace function public.accept_organizer_invitation(p_invitation_id uuid)
returns public.organizer_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.organizer_invitations;
  v_member public.organizer_members;
  v_email text;
begin
  select u.email into v_email from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null;
  if v_email is null then
    raise exception 'email_not_verified' using errcode = '42501';
  end if;
  if public.is_suspended_user() then
    raise exception 'account_suspended' using errcode = '42501';
  end if;
  select * into v_inv from public.organizer_invitations i where i.id = p_invitation_id for update;
  if not found or v_inv.email <> v_email::extensions.citext then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;
  if v_inv.accepted_at is not null or v_inv.revoked_at is not null or v_inv.expires_at <= now() then
    raise exception 'invitation_not_active' using errcode = 'P0001';
  end if;
  update public.organizer_invitations set accepted_at = now(), accepted_by = auth.uid() where id = v_inv.id;
  insert into public.organizer_members (organizer_id, user_id, role, invited_by)
  values (v_inv.organizer_id, auth.uid(), v_inv.role, v_inv.invited_by)
  on conflict (organizer_id, user_id) do update set role = excluded.role
  returning * into v_member;
  insert into public.user_roles (user_id, role) values (auth.uid(), 'organizer') on conflict do nothing;
  return v_member;
end;
$$;

revoke all on public.organizer_verification_requests from anon;
revoke update, delete, truncate on public.organizer_verification_requests from authenticated;
create policy verification_requests_read on public.organizer_verification_requests for select to authenticated
  using (public.has_organizer_permission(organizer_id, 'manage_organizer') or public.is_staff());
create policy verification_requests_insert on public.organizer_verification_requests for insert to authenticated
  with check (public.has_organizer_permission(organizer_id, 'manage_organizer') and status = 'pending'
              and submitted_by = (select auth.uid()) and reviewed_by is null);

-- -----------------------------------------------------------------------------
-- Lieux, médias de lieux, artistes
-- -----------------------------------------------------------------------------
revoke insert, update, delete, truncate on public.venues, public.venue_media, public.artists from anon;
revoke delete on public.venues, public.artists from authenticated;

create policy venues_read on public.venues for select to anon, authenticated
  using ((deleted_at is null and status = 'active') or created_by = (select auth.uid()) or public.is_staff());
create policy venues_insert on public.venues for insert to authenticated with check (public.has_app_access());
create policy venues_update on public.venues for update to authenticated
  using (created_by = (select auth.uid()) or public.is_staff())
  with check (created_by = (select auth.uid()) or public.is_staff());

create policy venue_media_read on public.venue_media for select to anon, authenticated
  using (status = 'approved' or uploaded_by = (select auth.uid()) or public.is_staff());
create policy venue_media_insert on public.venue_media for insert to authenticated
  with check (exists (select 1 from public.venues v where v.id = venue_id and v.created_by = (select auth.uid()))
              or public.is_staff());
create policy venue_media_delete on public.venue_media for delete to authenticated
  using (uploaded_by = (select auth.uid()) or public.is_staff());

create policy artists_read on public.artists for select to anon, authenticated
  using (deleted_at is null or created_by = (select auth.uid()) or public.is_staff());
create policy artists_insert on public.artists for insert to authenticated with check (public.has_app_access());
create policy artists_update on public.artists for update to authenticated
  using (created_by = (select auth.uid()) or public.is_staff())
  with check (created_by = (select auth.uid()) or public.is_staff());

-- -----------------------------------------------------------------------------
-- Événements et objets liés
-- -----------------------------------------------------------------------------
revoke insert, update, delete, truncate on public.events from anon;
revoke delete, truncate on public.events from authenticated;

create policy events_read on public.events for select to anon, authenticated
  using (
    (deleted_at is null and status in ('published', 'cancelled', 'archived') and visibility in ('public', 'unlisted'))
    or public.is_organizer_member(organizer_id)
    or public.is_staff()
  );
create policy events_insert on public.events for insert to authenticated
  with check (public.has_app_access() and public.has_organizer_permission(organizer_id, 'manage_events'));
create policy events_update on public.events for update to authenticated
  using (public.has_organizer_permission(organizer_id, 'manage_events') or public.is_staff())
  with check (public.has_organizer_permission(organizer_id, 'manage_events') or public.is_staff());

revoke insert, update, delete, truncate on public.event_sessions, public.event_media, public.event_artists from anon;
create policy event_sessions_read on public.event_sessions for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id));
create policy event_sessions_write on public.event_sessions for all to authenticated
  using (public.can_manage_event(event_id)) with check (public.can_manage_event(event_id));

create policy event_media_read on public.event_media for select to anon, authenticated
  using ((status = 'approved' and exists (select 1 from public.events e where e.id = event_id))
         or public.can_manage_event(event_id));
create policy event_media_insert on public.event_media for insert to authenticated
  with check (public.can_manage_event(event_id));
create policy event_media_update on public.event_media for update to authenticated
  using (public.can_manage_event(event_id)) with check (public.can_manage_event(event_id));
create policy event_media_delete on public.event_media for delete to authenticated
  using (public.can_manage_event(event_id));

create policy event_artists_read on public.event_artists for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id));
create policy event_artists_write on public.event_artists for all to authenticated
  using (public.can_manage_event(event_id)) with check (public.can_manage_event(event_id));

revoke all on public.favorites from anon;
revoke update, truncate on public.favorites from authenticated;
create policy favorites_own_read on public.favorites for select to authenticated using (user_id = (select auth.uid()));
create policy favorites_own_insert on public.favorites for insert to authenticated
  with check (user_id = (select auth.uid()) and not public.is_suspended_user()
              and exists (select 1 from public.events e where e.id = event_id));
create policy favorites_own_delete on public.favorites for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.event_registrations from anon;
revoke insert, update, delete, truncate on public.event_registrations from authenticated;
create policy event_registrations_read on public.event_registrations for select to authenticated
  using (user_id = (select auth.uid())
         or public.has_organizer_permission(public.event_organizer_id(event_id), 'manage_registrations')
         or public.is_staff());

revoke all on public.event_announcements from anon;
revoke update, delete, truncate on public.event_announcements from authenticated;
create policy event_announcements_read on public.event_announcements for select to authenticated
  using (
    public.can_manage_event(event_id)
    or exists (select 1 from public.event_registrations r where r.event_id = event_announcements.event_id
               and r.user_id = (select auth.uid()) and r.status = 'registered')
    or exists (select 1 from public.tickets t where t.event_id = event_announcements.event_id
               and t.owner_id = (select auth.uid()) and t.status = 'issued')
  );
create policy event_announcements_insert on public.event_announcements for insert to authenticated
  with check (author_id = (select auth.uid())
              and public.has_organizer_permission(public.event_organizer_id(event_id), 'post_announcements'));

revoke all on public.event_daily_stats from anon;
revoke insert, update, delete, truncate on public.event_daily_stats from authenticated;
create policy event_daily_stats_read on public.event_daily_stats for select to authenticated
  using (public.has_organizer_permission(public.event_organizer_id(event_id), 'view_analytics') or public.is_staff());

-- -----------------------------------------------------------------------------
-- Signalements, modération, audit
-- -----------------------------------------------------------------------------
revoke all on public.event_reports, public.user_reports from anon;
revoke update, delete, truncate on public.event_reports, public.user_reports from authenticated;
create policy event_reports_insert on public.event_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open' and handled_by is null and not public.is_suspended_user());
create policy event_reports_read on public.event_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_staff());
create policy user_reports_insert on public.user_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open' and handled_by is null and not public.is_suspended_user());
create policy user_reports_read on public.user_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_staff());

revoke all on public.moderation_actions, public.audit_logs from anon;
revoke insert, update, delete, truncate on public.moderation_actions, public.audit_logs from authenticated;
create policy moderation_actions_read on public.moderation_actions for select to authenticated using (public.is_staff());
create policy audit_logs_read on public.audit_logs for select to authenticated using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Billetterie
-- -----------------------------------------------------------------------------
revoke insert, update, delete, truncate on public.ticket_providers from anon;
revoke insert, delete, truncate on public.ticket_providers from authenticated;
revoke update on public.ticket_providers from authenticated;
grant update (status, contract_status, live_enabled, integration_notes, supported_countries)
  on public.ticket_providers to authenticated;
create policy ticket_providers_read on public.ticket_providers for select to anon, authenticated
  using (status <> 'disabled' or public.is_staff());
create policy ticket_providers_admin_update on public.ticket_providers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.provider_events from anon;
revoke insert, update, delete, truncate on public.provider_events from authenticated;
create policy provider_events_read on public.provider_events for select to authenticated using (public.is_staff());

revoke insert, update, delete, truncate on public.ticket_offers from anon, authenticated;
create policy ticket_offers_read on public.ticket_offers for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id));

revoke all on public.commercial_agreements, public.promotions from anon;
revoke truncate, delete on public.commercial_agreements, public.promotions from authenticated;
create policy commercial_agreements_admin on public.commercial_agreements for select to authenticated using (public.is_admin());
create policy commercial_agreements_admin_insert on public.commercial_agreements for insert to authenticated with check (public.is_admin());
create policy commercial_agreements_admin_update on public.commercial_agreements for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy promotions_admin on public.promotions for select to authenticated using (public.is_admin());
create policy promotions_admin_insert on public.promotions for insert to authenticated with check (public.is_admin());
create policy promotions_admin_update on public.promotions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.reservations, public.orders, public.order_items, public.tickets, public.payment_references, public.refunds from anon;
revoke insert, update, delete, truncate on public.reservations, public.orders, public.order_items, public.tickets,
  public.payment_references, public.refunds from authenticated;

create policy reservations_own_read on public.reservations for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());
create policy orders_own_read on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());
create policy order_items_own_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = (select auth.uid()) or public.is_staff())));
create policy tickets_own_read on public.tickets for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_staff());
create policy payment_references_own_read on public.payment_references for select to authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
    or exists (select 1 from public.resale_transactions t where t.id = resale_transaction_id
               and (t.buyer_id = (select auth.uid()) or t.seller_id = (select auth.uid())))
  );
create policy refunds_own_read on public.refunds for select to authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
  );

revoke all on public.idempotency_keys, public.rate_limits, public.webhook_events from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Revente
-- -----------------------------------------------------------------------------
revoke insert, update, delete, truncate on public.resale_rules from anon, authenticated;
grant insert, update on public.resale_rules to authenticated;
create policy resale_rules_read on public.resale_rules for select to anon, authenticated using (true);
create policy resale_rules_admin_insert on public.resale_rules for insert to authenticated with check (public.is_admin());
create policy resale_rules_admin_update on public.resale_rules for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.resale_listings, public.resale_transactions, public.resale_transaction_events, public.resale_disputes from anon;
revoke insert, update, delete, truncate on public.resale_listings, public.resale_transactions,
  public.resale_transaction_events, public.resale_disputes from authenticated;
grant update (status, resolution) on public.resale_disputes to authenticated;

create policy resale_listings_read on public.resale_listings for select to authenticated
  using (seller_id = (select auth.uid()) or public.is_staff());
create policy resale_transactions_read on public.resale_transactions for select to authenticated
  using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()) or public.is_staff());
create policy resale_tx_events_read on public.resale_transaction_events for select to authenticated
  using (exists (select 1 from public.resale_transactions t where t.id = transaction_id
                 and (t.buyer_id = (select auth.uid()) or t.seller_id = (select auth.uid()) or public.is_staff())));
create policy resale_disputes_read on public.resale_disputes for select to authenticated
  using (public.is_staff() or exists (
    select 1 from public.resale_transactions t where t.id = transaction_id
    and (t.buyer_id = (select auth.uid()) or t.seller_id = (select auth.uid()))));
create policy resale_disputes_staff_update on public.resale_disputes for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- -----------------------------------------------------------------------------
-- Notifications
-- -----------------------------------------------------------------------------
revoke all on public.notifications, public.notification_outbox, public.device_push_tokens from anon;
revoke insert, update, truncate on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy notifications_own_read on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_own_delete on public.notifications for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.notification_outbox from authenticated;

revoke update, truncate on public.device_push_tokens from authenticated;
grant update (last_seen_at, revoked_at, app_version, device_name) on public.device_push_tokens to authenticated;
create policy push_tokens_own_read on public.device_push_tokens for select to authenticated using (user_id = (select auth.uid()));
create policy push_tokens_own_insert on public.device_push_tokens for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy push_tokens_own_update on public.device_push_tokens for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy push_tokens_own_delete on public.device_push_tokens for delete to authenticated using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Bêta
-- -----------------------------------------------------------------------------
revoke all on public.beta_waitlist, public.beta_invitations, public.beta_feedback from anon;
revoke insert, delete, truncate on public.beta_waitlist from authenticated;
revoke update on public.beta_waitlist from authenticated;
grant update (status, admin_note) on public.beta_waitlist to authenticated;
create policy beta_waitlist_read on public.beta_waitlist for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());
create policy beta_waitlist_staff_update on public.beta_waitlist for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

revoke insert, update, delete, truncate on public.beta_invitations from authenticated;
create policy beta_invitations_read on public.beta_invitations for select to authenticated using (public.is_staff());

revoke delete, truncate on public.beta_feedback from authenticated;
revoke update on public.beta_feedback from authenticated;
grant update (status, admin_note) on public.beta_feedback to authenticated;
create policy beta_feedback_insert on public.beta_feedback for insert to authenticated
  with check (not public.is_suspended_user()
              and (public.has_role('beta_tester') or public.is_staff()));
create policy beta_feedback_read on public.beta_feedback for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());
create policy beta_feedback_staff_update on public.beta_feedback for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- -----------------------------------------------------------------------------
-- Schéma interne du fournisseur fictif : aucun accès client
-- -----------------------------------------------------------------------------
revoke all on all tables in schema demo_provider from public, anon, authenticated;
revoke all on all functions in schema demo_provider from public, anon, authenticated;
alter table demo_provider.inventory enable row level security;
alter table demo_provider.holds enable row level security;
alter table demo_provider.orders enable row level security;
alter table demo_provider.tickets enable row level security;

-- -----------------------------------------------------------------------------
-- Droits d'exécution des fonctions
-- Par défaut Supabase accorde EXECUTE à anon/authenticated : on restreint les
-- fonctions sensibles au rôle service.
-- -----------------------------------------------------------------------------
do $$
declare
  f record;
  v_service_only text[] := array[
    'demo_provider_release_expired', 'demo_provider_upsert_inventory', 'demo_provider_list_offers',
    'demo_provider_availability', 'demo_provider_create_hold', 'demo_provider_release_hold',
    'demo_provider_confirm_hold', 'demo_provider_get_order', 'demo_provider_refund_order',
    'demo_provider_transfer_ticket', 'demo_provider_verify_ownership',
    'resolve_commercial_agreement', 'find_promotion', 'commerce_live_allowed', 'assert_offer_sellable',
    'pricing_is_consistent', 'checkout_create_reservation', 'checkout_release_reservation', 'generate_order_number',
    'checkout_create_order', 'checkout_record_payment', 'checkout_fulfill_order', 'checkout_fail_order',
    'checkout_record_refund', 'idempotency_begin', 'idempotency_complete', 'idempotency_abort', 'rate_limit_hit',
    'resale_live_allowed', 'resale_quote', 'resale_create_listing', 'resale_cancel_listing', 'resale_start_purchase',
    'resale_record_payment', 'resale_complete_transfer', 'resale_fail_transaction', 'resale_open_dispute',
    'resale_effective_rule', 'notify_user', 'event_audience', 'maintenance_queue_reminders',
    'beta_redeem_invitation', 'log_moderation', 'handle_new_user', 'event_search_document'
  ];
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any (v_service_only)
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end;
$$;

-- Fonctions réservées aux utilisateurs authentifiés (vérifications internes de rôle).
do $$
declare
  f record;
  v_auth_only text[] := array[
    'register_for_event', 'cancel_event_registration', 'report_resale_listing', 'accept_organizer_invitation',
    'my_agenda', 'organizer_dashboard', 'organizer_event_stats', 'assert_staff', 'assert_admin',
    'admin_set_role', 'admin_set_user_suspension', 'admin_review_event', 'admin_set_event_sponsored',
    'admin_review_organizer', 'admin_review_media', 'admin_remove_resale_listing', 'admin_handle_report',
    'admin_update_setting', 'admin_list_users', 'admin_platform_stats', 'beta_stats'
  ];
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any (v_auth_only)
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated, service_role', f.sig);
  end loop;
end;
$$;
