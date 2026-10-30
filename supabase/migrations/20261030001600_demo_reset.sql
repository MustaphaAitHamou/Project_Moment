-- =============================================================================
-- Tamurt Events — 1600 : réinitialisation des données de DÉMONSTRATION
-- Supprime, en une transaction, tout ce qui est marqué is_demo / environment = 'demo'
-- (événements, organisateurs, lieux, artistes, commandes, billets, revente, stock fictif).
-- Les comptes de démonstration (domaine réservé .example) sont supprimés par le script
-- via l'API d'administration Auth. Réservé au rôle service.
-- =============================================================================

create or replace function public.demo_reset_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_events integer;
  v_orders integer;
begin
  delete from public.resale_disputes d using public.resale_transactions t
  where d.transaction_id = t.id and t.environment = 'demo';
  delete from public.payment_references where environment = 'demo';
  delete from public.refunds where environment = 'demo';
  delete from public.resale_transactions where environment = 'demo';
  delete from public.resale_listings where environment = 'demo';
  update public.tickets set transferred_to_ticket_id = null, transferred_from_ticket_id = null where environment = 'demo';
  delete from public.tickets where environment = 'demo';
  delete from public.orders where environment = 'demo';
  get diagnostics v_orders = row_count;
  delete from public.reservations where environment = 'demo';
  delete from public.ticket_offers where environment = 'demo';
  delete from public.notifications where is_demo;

  delete from public.events where is_demo;
  get diagnostics v_events = row_count;
  delete from public.venues where is_demo and not exists (select 1 from public.events e where e.venue_id = venues.id);
  delete from public.artists where is_demo and not exists (select 1 from public.event_artists ea where ea.artist_id = artists.id);
  delete from public.organizer_profiles o
  where o.is_demo and not exists (select 1 from public.events e where e.organizer_id = o.id);

  delete from demo_provider.tickets where true;
  delete from demo_provider.orders where true;
  delete from demo_provider.holds where true;
  delete from demo_provider.inventory where true;

  delete from public.beta_feedback where user_id is null or user_id in (select id from auth.users where email like '%@tamurt-demo.example');
  delete from public.beta_invitations where email::text like '%@tamurt-demo.example';
  delete from public.beta_waitlist where email::text like '%@tamurt-demo.example';

  return jsonb_build_object('events', v_events, 'orders', v_orders);
end;
$$;

revoke execute on function public.demo_reset_data() from public, anon, authenticated;
grant execute on function public.demo_reset_data() to service_role;
