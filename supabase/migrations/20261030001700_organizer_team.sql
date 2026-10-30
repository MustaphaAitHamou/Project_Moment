-- =============================================================================
-- Équipe d'une organisation : liste des membres avec leur nom affiché.
-- Les profils ne sont pas lisibles entre utilisateurs (RLS) ; cette fonction expose
-- uniquement le nom affiché et le rôle, aux seuls membres de l'organisation et à l'équipe Tamurt.
-- =============================================================================
create or replace function public.organizer_team(p_organizer_id uuid)
returns table (user_id uuid, display_name text, role public.organizer_member_role, created_at timestamptz, is_me boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_organizer_member(p_organizer_id) or public.is_staff()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select m.user_id, coalesce(p.display_name, 'Membre Tamurt'), m.role, m.created_at, m.user_id = (select auth.uid())
    from public.organizer_members m
    left join public.profiles p on p.id = m.user_id
    where m.organizer_id = p_organizer_id
    order by case m.role when 'owner' then 0 when 'admin' then 1 when 'editor' then 2 else 3 end, m.created_at;
end;
$$;

revoke all on function public.organizer_team(uuid) from public, anon;
grant execute on function public.organizer_team(uuid) to authenticated;

comment on function public.organizer_team(uuid) is 'Membres d''une organisation (nom affiché + rôle), visible des membres et de l''équipe Tamurt.';
