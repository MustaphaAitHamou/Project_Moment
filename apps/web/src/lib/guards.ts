import 'server-only';
import { notFound } from 'next/navigation';
import { redirect } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { getViewer, type Viewer } from './session';

/** Page réservée aux utilisateurs connectés : redirige vers la connexion (retour à la page ensuite). */
export async function requireViewer(locale: AppLocale, returnTo: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    redirect({ href: { pathname: '/auth/login', query: { next: returnTo } }, locale });
  }
  return viewer as Viewer;
}

/**
 * Administration : un utilisateur non autorisé obtient une 404 (l'existence des outils n'est pas
 * révélée). L'autorisation est vérifiée à nouveau par la base (fonctions admin_* et RLS).
 */
export async function requireStaffViewer(locale: AppLocale, returnTo: string): Promise<Viewer> {
  const viewer = await requireViewer(locale, returnTo);
  if (!viewer.isStaff) notFound();
  return viewer;
}

export async function requireAdminViewer(locale: AppLocale, returnTo: string): Promise<Viewer> {
  const viewer = await requireViewer(locale, returnTo);
  if (!viewer.isAdmin) notFound();
  return viewer;
}
