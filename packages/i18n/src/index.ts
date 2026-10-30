import fr from './messages/fr.json';
import en from './messages/en.json';
import ar from './messages/ar.json';
import type { Locale } from './locales';

export * from './locales';

/** Structure de référence des messages (catalogue source français). */
export type Messages = typeof fr;

export const MESSAGES: Record<Locale, Messages> = {
  fr,
  en: en as Messages,
  ar: ar as Messages,
};

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}

/** Nom localisé d'un objet multilingue stocké en base ({ fr, en, ar }) avec repli. */
export function localizedName(
  names: Record<string, string | null | undefined> | null | undefined,
  locale: Locale,
  fallback = '',
): string {
  if (!names) return fallback;
  return names[locale] || names.fr || names.en || Object.values(names).find(Boolean) || fallback;
}
