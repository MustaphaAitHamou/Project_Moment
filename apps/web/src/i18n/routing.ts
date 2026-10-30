import { DEFAULT_LOCALE, LOCALES } from '@tamurt/i18n';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
  localeCookie: { name: 'TAMURT_LOCALE', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' },
});

export type AppLocale = (typeof routing.locales)[number];
