import { COUNTRIES, minorToMajorString, parseMajorToMinor, type CountryCode, type CurrencyCode } from '@tamurt/core';
import type { EventFormInput } from '@tamurt/validation';

/** Valeurs du formulaire (les montants sont saisis en unités principales, ex. « 12,50 »). */
export interface EventFormState {
  title: string;
  summary: string;
  description: string;
  categorySlug: string;
  tags: string;
  artistNames: string;
  countryCode: CountryCode;
  regionId: string;
  cityId: string;
  venueId: string;
  locationName: string;
  addressLine: string;
  postalCode: string;
  lat: string;
  lng: string;
  isOnline: boolean;
  onlineUrl: string;
  timezone: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  isFree: boolean;
  priceMin: string;
  priceMax: string;
  currency: CurrencyCode;
  capacity: string;
  registrationMode: 'none' | 'free_registration' | 'tickets';
  accessibility: { wheelchair: boolean; accessibleToilets: boolean; hearingLoop: boolean; signLanguage: boolean; quietSpace: boolean; notes: string };
  entryConditions: string;
  ageMin: string;
  contactEmail: string;
  contactPhone: string;
  officialLinks: { label: string; url: string }[];
  cancellationPolicy: string;
  visibility: 'public' | 'unlisted' | 'private';
}

export function emptyEventForm(country: CountryCode = 'FR'): EventFormState {
  const config = COUNTRIES[country];
  return {
    title: '', summary: '', description: '', categorySlug: 'concerts', tags: '', artistNames: '',
    countryCode: country, regionId: '', cityId: '', venueId: '', locationName: '', addressLine: '', postalCode: '', lat: '', lng: '',
    isOnline: false, onlineUrl: '', timezone: config.defaultTimeZone, startDate: '', startTime: '20:00', endDate: '', endTime: '',
    isFree: true, priceMin: '', priceMax: '', currency: config.currency, capacity: '', registrationMode: 'none',
    accessibility: { wheelchair: false, accessibleToilets: false, hearingLoop: false, signLanguage: false, quietSpace: false, notes: '' },
    entryConditions: '', ageMin: '', contactEmail: '', contactPhone: '', officialLinks: [], cancellationPolicy: '', visibility: 'public',
  };
}

const optional = (value: string) => (value.trim() ? value.trim() : undefined);

export function toSchemaInput(state: EventFormState): EventFormInput {
  const money = (value: string) => {
    if (!value.trim()) return null;
    try {
      return parseMajorToMinor(value.replace(',', '.').trim(), state.currency);
    } catch {
      return -1; // rejeté par la validation (montant invalide)
    }
  };
  return {
    title: state.title,
    summary: optional(state.summary),
    description: optional(state.description),
    categorySlug: state.categorySlug as EventFormInput['categorySlug'],
    tags: state.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    artistNames: state.artistNames.split('\n').map((name) => name.trim()).filter(Boolean),
    countryCode: state.countryCode,
    regionId: state.regionId || null,
    cityId: state.cityId,
    venueId: state.venueId || null,
    locationName: optional(state.locationName),
    addressLine: optional(state.addressLine),
    postalCode: optional(state.postalCode),
    lat: state.lat.trim() ? Number(state.lat) : null,
    lng: state.lng.trim() ? Number(state.lng) : null,
    isOnline: state.isOnline,
    onlineUrl: state.isOnline ? state.onlineUrl.trim() : '',
    timezone: state.timezone,
    startDate: state.startDate,
    startTime: state.startTime,
    endDate: state.endDate,
    endTime: state.endTime,
    isFree: state.isFree,
    priceMinMinor: state.isFree ? null : money(state.priceMin),
    priceMaxMinor: state.isFree ? null : money(state.priceMax),
    currency: state.isFree ? null : state.currency,
    capacity: state.capacity.trim() ? Number(state.capacity) : null,
    registrationMode: state.registrationMode,
    accessibility: { ...state.accessibility, notes: optional(state.accessibility.notes) },
    entryConditions: optional(state.entryConditions),
    ageMin: state.ageMin.trim() ? Number(state.ageMin) : null,
    contactEmail: optional(state.contactEmail),
    contactPhone: optional(state.contactPhone),
    officialLinks: state.officialLinks.filter((link) => link.label.trim() || link.url.trim()),
    cancellationPolicy: optional(state.cancellationPolicy),
    visibility: state.visibility,
  } as EventFormInput;
}

export function majorString(minor: number | null | undefined, currency: CurrencyCode): string {
  return minor === null || minor === undefined ? '' : minorToMajorString(minor, currency);
}
