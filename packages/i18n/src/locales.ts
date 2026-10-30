/**
 * Langues de l'interface.
 *
 * - fr : langue source (référence des clés).
 * - en : traduction vérifiée par l'équipe.
 * - ar : traduction COMPLÈTE mais au statut « brouillon non vérifié » : elle doit être relue
 *        par un traducteur natif avant la production (un bandeau l'indique dans l'interface).
 * - Tamazight : architecture prête (variantes et écritures listées), catalogues à créer
 *   par des locuteurs natifs. Aucune traduction n'a été inventée.
 */
export const LOCALES = ['fr', 'en', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'fr';

export type LocaleStatus = 'source' | 'verified' | 'draft_unverified' | 'planned';

export interface LocaleInfo {
  code: string;
  /** Nom de la langue dans la langue elle-même. */
  nativeName: string;
  direction: 'ltr' | 'rtl';
  script: 'Latn' | 'Arab' | 'Tfng';
  status: LocaleStatus;
  enabled: boolean;
}

export const LOCALE_INFO: Record<Locale, LocaleInfo> = {
  fr: { code: 'fr', nativeName: 'Français', direction: 'ltr', script: 'Latn', status: 'source', enabled: true },
  en: { code: 'en', nativeName: 'English', direction: 'ltr', script: 'Latn', status: 'verified', enabled: true },
  ar: { code: 'ar', nativeName: 'العربية', direction: 'rtl', script: 'Arab', status: 'draft_unverified', enabled: true },
};

/**
 * Langues prévues, désactivées tant qu'aucun catalogue relu par des locuteurs natifs n'existe.
 * Pour en activer une : créer src/messages/<code>.json (mêmes clés que fr.json), l'ajouter à LOCALES
 * et à LOCALE_INFO, puis lancer `pnpm --filter @tamurt/i18n test` (contrôle de parité des clés).
 */
export const PLANNED_LOCALES: readonly LocaleInfo[] = [
  { code: 'kab', nativeName: 'Taqbaylit', direction: 'ltr', script: 'Latn', status: 'planned', enabled: false },
  { code: 'zgh', nativeName: 'ⵜⴰⵎⴰⵣⵉⵖⵜ', direction: 'ltr', script: 'Tfng', status: 'planned', enabled: false },
];

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function localeDirection(locale: Locale): 'ltr' | 'rtl' {
  return LOCALE_INFO[locale].direction;
}

export function isRtl(locale: Locale): boolean {
  return LOCALE_INFO[locale].direction === 'rtl';
}

/** Choisit la meilleure langue à partir d'un en-tête Accept-Language ou de préférences système. */
export function negotiateLocale(preferences: readonly string[] | string | null | undefined): Locale {
  const list = typeof preferences === 'string'
    ? preferences
        .split(',')
        .map((part) => {
          const [tag = '', ...params] = part.trim().split(';');
          const q = params.find((p) => p.trim().startsWith('q='));
          return { tag: tag.toLowerCase(), q: q ? Number(q.trim().slice(2)) : 1 };
        })
        .filter((entry) => entry.tag && Number.isFinite(entry.q))
        .sort((a, b) => b.q - a.q)
        .map((entry) => entry.tag)
    : (preferences ?? []).map((tag) => tag.toLowerCase());
  for (const tag of list) {
    const base = tag.split('-')[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
