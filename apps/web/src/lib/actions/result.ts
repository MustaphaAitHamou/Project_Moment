import 'server-only';
import { toAppError } from '@tamurt/core';
import { getMessages, isLocale } from '@tamurt/i18n';
import type { ValidationIssue } from '@tamurt/validation';
import { getLocale } from 'next-intl/server';

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; issues?: ValidationIssue[] };

/** Exécute une action serveur et convertit les erreurs en message traduit (jamais de détail interne). */
export async function runAction<T>(operation: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await operation() };
  } catch (error) {
    // Les redirections/404 de Next.js doivent se propager.
    if (error && typeof error === 'object' && 'digest' in error && typeof (error as { digest: unknown }).digest === 'string' && /^NEXT_/.test((error as { digest: string }).digest)) {
      throw error;
    }
    const appError = toAppError(error);
    if (appError.code === 'internal_error') console.error(JSON.stringify({ level: 'error', message: 'action_failed', error: (error as Error)?.message }));
    const locale = await getLocale().catch(() => 'fr');
    const messages = getMessages(isLocale(locale) ? locale : 'fr').errors as Record<string, string>;
    const issues = appError.details?.issues as ValidationIssue[] | undefined;
    return { ok: false, code: appError.code, message: messages[appError.code] ?? messages.internal_error ?? appError.code, ...(issues ? { issues } : {}) };
  }
}
