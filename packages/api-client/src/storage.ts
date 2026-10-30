/**
 * URLs publiques des fichiers Supabase Storage (buckets publics). Les buckets privés passent
 * par des URL signées générées côté serveur.
 */
export type PublicBucket = 'event-media' | 'organizer-media' | 'venue-media' | 'avatars';

export function publicStorageUrl(supabaseUrl: string, bucket: PublicBucket, path: string | null | undefined): string | null {
  if (!path) return null;
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
}
