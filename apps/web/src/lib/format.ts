import {
  formatEventDateTime,
  formatEventDay,
  formatEventRange,
  formatEventTime,
  formatMoney,
  intlLocaleFor,
  isCountryCode,
  isCurrencyCode,
  type FormatEventDateOptions,
} from '@tamurt/core';
import { localizedName } from '@tamurt/i18n';
import type { AppLocale } from '@/i18n/routing';

/** Locale Intl tenant compte de la langue de l'interface et du pays de l'événement (ex. fr-DZ). */
export function intlLocale(locale: AppLocale, country?: string | null): string {
  return intlLocaleFor(country && isCountryCode(country) ? country : null, locale);
}

export function money(amountMinor: number, currency: string | null | undefined, locale: AppLocale, country?: string | null): string {
  if (!currency || !isCurrencyCode(currency)) return '';
  return formatMoney(amountMinor, currency, intlLocale(locale, country));
}

export function eventDateTime(iso: string, timeZone: string, locale: AppLocale, country?: string | null, options?: FormatEventDateOptions) {
  return formatEventDateTime(iso, timeZone, intlLocale(locale, country), options);
}

export function eventRange(startIso: string, endIso: string | null | undefined, timeZone: string, locale: AppLocale, country?: string | null) {
  return formatEventRange(startIso, endIso, timeZone, intlLocale(locale, country), { weekday: 'long', month: 'long' });
}

export function eventDay(iso: string, timeZone: string, locale: AppLocale, country?: string | null) {
  return formatEventDay(iso, timeZone, intlLocale(locale, country));
}

export function eventTime(iso: string, timeZone: string, locale: AppLocale, country?: string | null) {
  return formatEventTime(iso, timeZone, intlLocale(locale, country));
}

export function shortDate(iso: string, locale: AppLocale, timeZone = 'UTC') {
  return new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'short', year: 'numeric', timeZone }).format(new Date(iso));
}

export function dateTimeShort(iso: string, locale: AppLocale, timeZone = 'UTC') {
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(iso));
}

export function nameOf(names: unknown, locale: AppLocale, fallback = ''): string {
  return localizedName(names as Record<string, string> | null, locale, fallback);
}
