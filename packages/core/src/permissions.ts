/**
 * Rôles et permissions. Miroir EXACT des fonctions SQL
 * public.organizer_role_has_permission() et public.has_app_access() (testé en intégration).
 * Le contrôle effectif est toujours réalisé côté serveur (RLS + fonctions) ; ces helpers
 * servent à adapter l'interface.
 */

export const ORGANIZER_MEMBER_ROLES = ['owner', 'admin', 'editor', 'analyst'] as const;
export type OrganizerMemberRole = (typeof ORGANIZER_MEMBER_ROLES)[number];

export const ORGANIZER_PERMISSIONS = [
  'manage_organizer',
  'manage_team',
  'manage_events',
  'publish_events',
  'manage_registrations',
  'post_announcements',
  'view_analytics',
  'view_sales',
] as const;
export type OrganizerPermission = (typeof ORGANIZER_PERMISSIONS)[number];

export const ORGANIZER_PERMISSION_MATRIX: Record<OrganizerMemberRole, readonly OrganizerPermission[]> = {
  owner: ORGANIZER_PERMISSIONS,
  admin: ORGANIZER_PERMISSIONS,
  editor: ['manage_events', 'manage_registrations', 'post_announcements', 'view_analytics'],
  analyst: ['view_analytics', 'view_sales'],
};

export function organizerRoleHasPermission(role: OrganizerMemberRole, permission: OrganizerPermission): boolean {
  return ORGANIZER_PERMISSION_MATRIX[role].includes(permission);
}

export const PLATFORM_ROLES = ['organizer', 'moderator', 'admin', 'beta_tester'] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export type BetaMode = 'open' | 'closed';

export function isStaff(roles: readonly PlatformRole[]): boolean {
  return roles.includes('admin') || roles.includes('moderator');
}

export function isAdmin(roles: readonly PlatformRole[]): boolean {
  return roles.includes('admin');
}

export interface AppAccessInput {
  authenticated: boolean;
  suspended: boolean;
  roles: readonly PlatformRole[];
  betaMode: BetaMode;
}

/** Accès aux fonctionnalités interactives (création, billetterie, revente) pendant la bêta. */
export function hasAppAccess({ authenticated, suspended, roles, betaMode }: AppAccessInput): boolean {
  if (!authenticated || suspended) return false;
  if (betaMode === 'open') return true;
  return roles.includes('beta_tester') || isStaff(roles);
}

/** Libellé de « profil » public d'un organisateur (Particulier / Association / Professionnel). */
export const ORGANIZER_KINDS = ['individual', 'association', 'professional'] as const;
export type OrganizerKind = (typeof ORGANIZER_KINDS)[number];
