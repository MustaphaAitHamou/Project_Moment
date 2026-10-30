import type { Locale, Messages } from '@tamurt/i18n';

declare module 'use-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
