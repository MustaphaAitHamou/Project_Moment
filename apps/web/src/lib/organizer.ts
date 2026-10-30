import 'server-only';
import { organizerRoleHasPermission, type OrganizerMemberRole, type OrganizerPermission } from '@tamurt/core';
import { cache } from 'react';
import { getSupabase, getViewer } from './session';

/** Organisation + rôle de l'utilisateur courant (null si non membre ; l'équipe Tamurt a tous les droits de lecture). */
export const getMembership = cache(async (organizerId: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(organizerId)) return null;
  const viewer = await getViewer();
  if (!viewer) return null;
  const supabase = await getSupabase();
  const [{ data: organizer }, { data: member }] = await Promise.all([
    supabase.from('organizer_profiles').select('*').eq('id', organizerId).is('deleted_at', null).maybeSingle(),
    supabase.from('organizer_members').select('role').eq('organizer_id', organizerId).eq('user_id', viewer.id).maybeSingle(),
  ]);
  if (!organizer || (!member && !viewer.isStaff)) return null;
  const role = (member?.role ?? 'analyst') as OrganizerMemberRole;
  return {
    organizer,
    role,
    isMember: Boolean(member),
    can: (permission: OrganizerPermission) => organizerRoleHasPermission(role, permission),
  };
});
