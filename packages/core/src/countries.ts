import type { CurrencyCode } from './money';
import type { WeekConvention } from './calendar';

/**
 * Conventions de formatage des quatre marchés de lancement. Les données administrables
 * (noms, divisions, activation de la vente) vivent en base (table countries) ; ce fichier
 * ne contient que les règles de présentation nécessaires hors connexion.
 */

export const COUNTRY_CODES = ['FR', 'DZ', 'US', 'CA'] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export type DistanceUnit = 'km' | 'mi';

export interface CountryConfig {
  code: CountryCode;
  currency: CurrencyCode;
  defaultTimeZone: string;
  defaultLocale: 'fr' | 'en' | 'ar';
  /** Locale Intl utilisée pour formater montants et dates dans ce pays. */
  intlLocales: { fr: string; en: string; ar: string };
  distanceUnit: DistanceUnit;
  phonePrefix: string;
  regionType: 'department' | 'wilaya' | 'state' | 'province';
  week: WeekConvention;
  taxDisplay: 'inclusive' | 'exclusive';
  addressFormat: 'postal_city' | 'city_state_postal' | 'city_province_postal';
  center: { lat: number; lng: number; zoom: number };
}

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  FR: {
    code: 'FR',
    currency: 'EUR',
    defaultTimeZone: 'Europe/Paris',
    defaultLocale: 'fr',
    intlLocales: { fr: 'fr-FR', en: 'en-GB', ar: 'ar-FR' },
    distanceUnit: 'km',
    phonePrefix: '+33',
    regionType: 'department',
    week: { firstDayOfWeek: 1, weekendDays: [6, 0] },
    taxDisplay: 'inclusive',
    addressFormat: 'postal_city',
    center: { lat: 46.6, lng: 2.4, zoom: 5 },
  },
  DZ: {
    code: 'DZ',
    currency: 'DZD',
    defaultTimeZone: 'Africa/Algiers',
    defaultLocale: 'fr',
    intlLocales: { fr: 'fr-DZ', en: 'en-DZ', ar: 'ar-DZ' },
    distanceUnit: 'km',
    phonePrefix: '+213',
    regionType: 'wilaya',
    week: { firstDayOfWeek: 6, weekendDays: [5, 6] },
    taxDisplay: 'inclusive',
    addressFormat: 'postal_city',
    center: { lat: 35.5, lng: 3.5, zoom: 5 },
  },
  US: {
    code: 'US',
    currency: 'USD',
    defaultTimeZone: 'America/New_York',
    defaultLocale: 'en',
    intlLocales: { fr: 'fr-US', en: 'en-US', ar: 'ar-US' },
    distanceUnit: 'mi',
    phonePrefix: '+1',
    regionType: 'state',
    week: { firstDayOfWeek: 0, weekendDays: [6, 0] },
    taxDisplay: 'exclusive',
    addressFormat: 'city_state_postal',
    center: { lat: 39.8, lng: -98.6, zoom: 3 },
  },
  CA: {
    code: 'CA',
    currency: 'CAD',
    defaultTimeZone: 'America/Toronto',
    defaultLocale: 'en',
    intlLocales: { fr: 'fr-CA', en: 'en-CA', ar: 'ar-CA' },
    distanceUnit: 'km',
    phonePrefix: '+1',
    regionType: 'province',
    week: { firstDayOfWeek: 0, weekendDays: [6, 0] },
    taxDisplay: 'exclusive',
    addressFormat: 'city_province_postal',
    center: { lat: 45.5, lng: -75.5, zoom: 5 },
  },
};

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === 'string' && (COUNTRY_CODES as readonly string[]).includes(value);
}

export function getCountry(code: CountryCode): CountryConfig {
  return COUNTRIES[code];
}

/** Locale Intl pour formater une valeur d'un pays donné dans la langue de l'utilisateur. */
export function intlLocaleFor(country: CountryCode | null | undefined, language: 'fr' | 'en' | 'ar'): string {
  if (!country) return language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar' : 'en-US';
  return COUNTRIES[country].intlLocales[language];
}

export interface AddressParts {
  line1?: string | null;
  line2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  region?: string | null;
  regionCode?: string | null;
  country?: string | null;
}

/** Mise en forme d'une adresse selon les usages du pays. */
export function formatAddress(parts: AddressParts, country: CountryCode, includeCountry = false): string[] {
  const lines: string[] = [];
  if (parts.line1) lines.push(parts.line1);
  if (parts.line2) lines.push(parts.line2);
  const format = COUNTRIES[country].addressFormat;
  let cityLine = '';
  if (format === 'postal_city') {
    cityLine = [parts.postalCode, parts.city].filter(Boolean).join(' ');
  } else if (format === 'city_state_postal') {
    const state = parts.regionCode ?? parts.region;
    cityLine = [[parts.city, state].filter(Boolean).join(', '), parts.postalCode].filter(Boolean).join(' ');
  } else {
    const province = parts.region ? `(${parts.region})` : parts.regionCode ?? '';
    cityLine = [parts.city, province, parts.postalCode].filter(Boolean).join(' ');
  }
  if (cityLine) lines.push(cityLine);
  if (includeCountry && parts.country) lines.push(parts.country);
  return lines;
}
