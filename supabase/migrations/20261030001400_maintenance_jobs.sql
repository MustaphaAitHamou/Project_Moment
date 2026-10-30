-- =============================================================================
-- Tamurt Events — 1400 : tâches de maintenance (pg_cron)
--   * expiration des réservations / blocages / transactions de revente (chaque minute)
--   * archivage des événements passés (toutes les 15 min)
--   * rappels avant événement (toutes les 10 min)
--   * nettoyage technique (horaire)
-- L'envoi effectif des push / e-mails (outbox) est fait par la route API cron (Vercel).
-- =============================================================================

create or replace function public.maintenance_expire_commerce()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_holds integer;
  v_reservations integer;
  v_orders integer;
  v_resale integer := 0;
  v_listings integer;
  r record;
begin
  v_holds := public.demo_provider_release_expired(null);

  update public.reservations set status = 'expired' where status = 'active' and expires_at <= now();
  get diagnostics v_reservations = row_count;

  update public.orders set status = 'expired', failure_reason = coalesce(failure_reason, 'payment_window_expired')
  where status = 'pending_payment' and expires_at <= now();
  get diagnostics v_orders = row_count;

  for r in
    select t.id from public.resale_transactions t
    where t.status in ('initiated', 'payment_pending') and t.expires_at <= now()
  loop
    perform public.resale_fail_transaction(r.id, 'cancelled', 'payment_window_expired');
    v_resale := v_resale + 1;
  end loop;

  update public.resale_listings l set status = 'expired'
  from public.events e
  where e.id = l.event_id and l.status = 'active' and e.starts_at <= now();
  get diagnostics v_listings = row_count;

  return jsonb_build_object('holds', v_holds, 'reservations', v_reservations, 'orders', v_orders,
                            'resale_transactions', v_resale, 'resale_listings', v_listings);
end;
$$;

create or replace function public.maintenance_archive_events()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.events
     set status = 'archived'
   where status = 'published'
     and deleted_at is null
     and coalesce(ends_at, starts_at + interval '6 hours') < now() - interval '1 day';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.maintenance_cleanup()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rate integer;
  v_idem integer;
begin
  delete from public.rate_limits where window_start < now() - interval '2 days';
  get diagnostics v_rate = row_count;
  delete from public.idempotency_keys where expires_at < now();
  get diagnostics v_idem = row_count;
  return jsonb_build_object('rate_limits', v_rate, 'idempotency_keys', v_idem);
end;
$$;

revoke execute on function public.maintenance_expire_commerce() from public, anon, authenticated;
revoke execute on function public.maintenance_archive_events() from public, anon, authenticated;
revoke execute on function public.maintenance_cleanup() from public, anon, authenticated;
revoke execute on function public.maintenance_queue_reminders() from public, anon, authenticated;
grant execute on function public.maintenance_expire_commerce() to service_role;
grant execute on function public.maintenance_archive_events() to service_role;
grant execute on function public.maintenance_cleanup() to service_role;
grant execute on function public.maintenance_queue_reminders() to service_role;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('tamurt-expire-commerce', '* * * * *', 'select public.maintenance_expire_commerce()');
    perform cron.schedule('tamurt-archive-events', '*/15 * * * *', 'select public.maintenance_archive_events()');
    perform cron.schedule('tamurt-event-reminders', '*/10 * * * *', 'select public.maintenance_queue_reminders()');
    perform cron.schedule('tamurt-cleanup', '17 * * * *', 'select public.maintenance_cleanup()');
  else
    raise notice 'pg_cron indisponible : utiliser la route /api/cron/maintenance (Vercel Cron).';
  end if;
end;
$$;
