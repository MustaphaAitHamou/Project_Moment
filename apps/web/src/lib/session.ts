import 'server-only';
import { getPublicSettings } from '@tamurt/api-client';
import { hasAppAccess, isAdmin, isStaff, type BetaMode, type PlatformRole } from '@tamurt/core';
import { cache } from 'react';
import { createSupabaseServerClient } from './supabase/server';

export interface Viewer {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  locale: 'fr' | 'en' | 'ar';
  roles: PlatformRole[];
  suspended: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  /** Accès aux fonctionnalités interactives (compte actif + bêta si la bêta est fermée). */
  hasAppAccess: boolean;
}

/** Client Supabase de la requête (mémorisé pour le rendu en cours). */
export const getSupabase = cache(createSupabaseServerClient);

export const getPublicConfig = cache(async () => {
  const supabase = await getSupabase();
  try {
    return await getPublicSettings(supabase);
  } catch {
    return {};
  }
});

export const getBetaMode = cache(async (): Promise<BetaMode> => {
  const settings = await getPublicConfig();
  return settings.beta?.mode === 'open' ? 'open' : 'closed';
});

/**
 * Utilisateur courant, vérifié auprès de Supabase Auth (getUser), avec profil et rôles.
 * Retourne null si la session est absente ou invalide.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const user = data.user;
  const [profileResult, rolesResult, betaMode] = await Promise.all([
    supabase.from('profiles').select('display_name, locale, is_suspended, deleted_at').eq('id', user.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', user.id),
    getBetaMode(),
  ]);
  const profile = profileResult.data;
  const roles = (rolesResult.data ?? []).map((row) => row.role as PlatformRole);
  const suspended = Boolean(profile?.is_suspended || profile?.deleted_at);
  return {
    id: user.id,
    email: user.email ?? '',
    emailVerified: Boolean(user.email_confirmed_at),
    displayName: profile?.display_name ?? user.email?.split('@')[0] ?? '',
    locale: (profile?.locale as Viewer['locale']) ?? 'fr',
    roles,
    suspended,
    isStaff: !suspended && isStaff(roles),
    isAdmin: !suspended && isAdmin(roles),
    hasAppAccess: hasAppAccess({ authenticated: true, suspended, roles, betaMode }),
  };
});

/**
 * Utilisateur au format des services serveur (@tamurt/server), avec jeton d'accès vérifié.
 * À utiliser dans les pages qui appellent directement un service (paiement, revente…).
 */
export const getAuthUser = cache(async () => {
  const { authenticate } = await import('@tamurt/server');
  const { getServerContext } = await import('./server-context');
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  try {
    return await authenticate(getServerContext(), token);
  } catch {
    return null;
  }
});
