-- =============================================================================
-- Tamurt Events — 1300 : stockage (Supabase Storage) — buckets et politiques
-- Arborescence imposée par les politiques :
--   event-media/{event_id}/...            (équipe organisatrice de l'événement)
--   organizer-media/{organizer_id}/...    (gestionnaires de l'organisateur)
--   venue-media/{venue_id}/...            (créateur du lieu, modération)
--   avatars/{user_id}/...                 (propriétaire du compte)
--   private-documents/organizers/{organizer_id}/...  (vérification, privé)
--   private-documents/beta/{user_id}/...              (captures de retours bêta, privé)
-- =============================================================================

create or replace function public.try_uuid(p_value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p_value::uuid;
exception when others then
  return null;
end;
$$;

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    raise notice 'storage schema absent : buckets non créés';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
    ('event-media', 'event-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
    ('organizer-media', 'organizer-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
    ('venue-media', 'venue-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
    ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
    ('private-documents', 'private-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

  -- Lecture des buckets publics (les fichiers sont aussi servis par URL publique).
  execute $p$
    create policy tamurt_public_media_read on storage.objects for select to anon, authenticated
    using (bucket_id in ('event-media', 'organizer-media', 'venue-media', 'avatars'))
  $p$;

  -- Médias d'événements
  execute $p$
    create policy tamurt_event_media_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'event-media'
                and public.can_manage_event(public.try_uuid((storage.foldername(name))[1])))
  $p$;
  execute $p$
    create policy tamurt_event_media_update on storage.objects for update to authenticated
    using (bucket_id = 'event-media' and public.can_manage_event(public.try_uuid((storage.foldername(name))[1])))
    with check (bucket_id = 'event-media' and public.can_manage_event(public.try_uuid((storage.foldername(name))[1])))
  $p$;
  execute $p$
    create policy tamurt_event_media_delete on storage.objects for delete to authenticated
    using (bucket_id = 'event-media' and public.can_manage_event(public.try_uuid((storage.foldername(name))[1])))
  $p$;

  -- Médias d'organisateurs
  execute $p$
    create policy tamurt_organizer_media_write on storage.objects for insert to authenticated
    with check (bucket_id = 'organizer-media'
                and public.has_organizer_permission(public.try_uuid((storage.foldername(name))[1]), 'manage_organizer'))
  $p$;
  execute $p$
    create policy tamurt_organizer_media_delete on storage.objects for delete to authenticated
    using (bucket_id = 'organizer-media'
           and public.has_organizer_permission(public.try_uuid((storage.foldername(name))[1]), 'manage_organizer'))
  $p$;

  -- Médias de lieux
  execute $p$
    create policy tamurt_venue_media_write on storage.objects for insert to authenticated
    with check (bucket_id = 'venue-media' and (
      public.is_staff() or exists (
        select 1 from public.venues v
        where v.id = public.try_uuid((storage.foldername(name))[1]) and v.created_by = (select auth.uid()))))
  $p$;

  -- Avatars
  execute $p$
    create policy tamurt_avatars_write on storage.objects for insert to authenticated
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  $p$;
  execute $p$
    create policy tamurt_avatars_update on storage.objects for update to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  $p$;
  execute $p$
    create policy tamurt_avatars_delete on storage.objects for delete to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  $p$;

  -- Documents privés
  execute $p$
    create policy tamurt_private_docs_read on storage.objects for select to authenticated
    using (bucket_id = 'private-documents' and (
      public.is_staff()
      or ((storage.foldername(name))[1] = 'organizers'
          and public.has_organizer_permission(public.try_uuid((storage.foldername(name))[2]), 'manage_organizer'))
      or ((storage.foldername(name))[1] = 'beta' and (storage.foldername(name))[2] = (select auth.uid())::text)))
  $p$;
  execute $p$
    create policy tamurt_private_docs_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'private-documents' and (
      ((storage.foldername(name))[1] = 'organizers'
       and public.has_organizer_permission(public.try_uuid((storage.foldername(name))[2]), 'manage_organizer'))
      or ((storage.foldername(name))[1] = 'beta' and (storage.foldername(name))[2] = (select auth.uid())::text)))
  $p$;
end;
$$;
