import { formatEventDateTime, formatEventRange, formatEventTime, formatMoney, intlLocaleFor, isCountryCode, isCurrencyCode } from '@tamurt/core';
import { localizedName, type Locale } from '@tamurt/i18n';

export function intlLocale(locale: Locale, country?: string | null): string {
  return intlLocaleFor(country && isCountryCode(country) ? country : null, locale);
}

export function money(amountMinor: number, currency: string | null | undefined, locale: Locale, country?: string | null): string {
  return currency && isCurrencyCode(currency) ? formatMoney(amountMinor, currency, intlLocale(locale, country)) : '';
}

export function eventDate(iso: string, timeZone: string, locale: Locale, country?: string | null): string {
  return formatEventDateTime(iso, timeZone, intlLocale(locale, country), { weekday: 'short', month: 'short' });
}

export function eventRange(start: string, end: string | null, timeZone: string, locale: Locale, country?: string | null): string {
  return formatEventRange(start, end, timeZone, intlLocale(locale, country), { weekday: 'long', month: 'long' });
}

export function eventTime(iso: string, timeZone: string, locale: Locale, country?: string | null): string {
  return formatEventTime(iso, timeZone, intlLocale(locale, country));
}

export function nameOf(names: unknown, locale: Locale): string {
  return localizedName(names as Record<string, string> | null, locale);
}
