import { z } from 'zod';
import { EVENT_CATEGORY_SLUGS, localInputToIso, normalizePhone, type CountryCode } from '@tamurt/core';
import {
  countryCodeSchema,
  currencySchema,
  dateKeySchema,
  httpsUrlSchema,
  minorAmountSchema,
  optionalEmailSchema,
  optionalText,
  requiredText,
  timeSchema,
  timezoneSchema,
  uuidSchema,
} from './common';

export const accessibilitySchema = z
  .object({
    wheelchair: z.boolean().optional(),
    accessibleToilets: z.boolean().optional(),
    hearingLoop: z.boolean().optional(),
    signLanguage: z.boolean().optional(),
    quietSpace: z.boolean().optional(),
    notes: z.string().trim().max(500, { error: 'validation.too_long' }).optional(),
  })
  .default({});

export const officialLinkSchema = z.object({
  label: requiredText(1, 60),
  url: httpsUrlSchema,
});

/**
 * Formulaire de création / modification d'un événement. Les dates sont saisies en heure LOCALE
 * de l'événement (date + heure + fuseau) puis converties en instants UTC côté serveur.
 */
export const eventFormSchema = z
  .object({
    title: requiredText(3, 140),
    summary: optionalText(300),
    description: optionalText(10000),
    categorySlug: z.enum(EVENT_CATEGORY_SLUGS, { error: 'validation.required' }),
    tags: z.array(z.string().trim().min(1).max(30)).max(10, { error: 'validation.too_many_items' }).default([]),
    countryCode: countryCodeSchema,
    regionId: uuidSchema.nullable().optional(),
    cityId: uuidSchema,
    venueId: uuidSchema.nullable().optional(),
    locationName: optionalText(160),
    addressLine: optionalText(200),
    postalCode: optionalText(16),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
    isOnline: z.boolean().default(false),
    onlineUrl: httpsUrlSchema.optional().or(z.literal('').transform(() => undefined)),
    timezone: timezoneSchema,
    startDate: dateKeySchema,
    startTime: timeSchema,
    endDate: dateKeySchema.optional().or(z.literal('').transform(() => undefined)),
    endTime: timeSchema.optional().or(z.literal('').transform(() => undefined)),
    isFree: z.boolean(),
    priceMinMinor: minorAmountSchema.nullable().optional(),
    priceMaxMinor: minorAmountSchema.nullable().optional(),
    currency: currencySchema.nullable().optional(),
    capacity: z.number().int().min(1, { error: 'validation.invalid_capacity' }).max(1_000_000).nullable().optional(),
    registrationMode: z.enum(['none', 'free_registration', 'tickets']),
    accessibility: accessibilitySchema,
    entryConditions: optionalText(2000),
    ageMin: z.number().int().min(0).max(21).nullable().optional(),
    contactEmail: optionalEmailSchema,
    contactPhone: optionalText(32),
    officialLinks: z.array(officialLinkSchema).max(10, { error: 'validation.too_many_items' }).default([]),
    cancellationPolicy: optionalText(3000),
    visibility: z.enum(['public', 'unlisted', 'private']).default('public'),
    artistNames: z.array(requiredText(1, 120)).max(20, { error: 'validation.too_many_items' }).default([]),
  })
  .superRefine((value, ctx) => {
    let startIso: string | null = null;
    try {
      startIso = localInputToIso(value.startDate, value.startTime, value.timezone);
    } catch {
      ctx.addIssue({ code: 'custom', path: ['startTime'], message: 'validation.invalid_time' });
    }
    if (value.endDate || value.endTime) {
      if (!value.endDate || !value.endTime) {
        ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'validation.end_incomplete' });
      } else if (startIso) {
        try {
          const endIso = localInputToIso(value.endDate, value.endTime, value.timezone);
          if (endIso <= startIso) {
            ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'validation.end_before_start' });
          } else if (new Date(endIso).getTime() - new Date(startIso).getTime() > 62 * 86_400_000) {
            ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'validation.event_too_long' });
          }
        } catch {
          ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'validation.invalid_time' });
        }
      }
    }
    if (value.isFree && value.registrationMode === 'tickets') {
      ctx.addIssue({ code: 'custom', path: ['registrationMode'], message: 'validation.free_event_no_tickets' });
    }
    if (
      value.priceMinMinor != null &&
      value.priceMaxMinor != null &&
      value.priceMaxMinor < value.priceMinMinor
    ) {
      ctx.addIssue({ code: 'custom', path: ['priceMaxMinor'], message: 'validation.price_range' });
    }
    if ((value.priceMinMinor != null || value.priceMaxMinor != null) && !value.currency) {
      ctx.addIssue({ code: 'custom', path: ['currency'], message: 'validation.required' });
    }
    if (value.contactPhone && !normalizePhone(value.contactPhone, value.countryCode)) {
      ctx.addIssue({ code: 'custom', path: ['contactPhone'], message: 'validation.invalid_phone' });
    }
    if (value.isOnline && !value.onlineUrl) {
      ctx.addIssue({ code: 'custom', path: ['onlineUrl'], message: 'validation.required' });
    }
    if (value.registrationMode === 'free_registration' && !value.capacity) {
      ctx.addIssue({ code: 'custom', path: ['capacity'], message: 'validation.capacity_required' });
    }
  });

export type EventFormInput = z.input<typeof eventFormSchema>;
export type EventFormValues = z.output<typeof eventFormSchema>;

/** Colonnes de la table events (snake_case) dérivées d'un formulaire validé. */
export interface EventRowInput {
  title: string;
  summary: string | null;
  description: string | null;
  category_slug: string;
  tags: string[];
  country_code: CountryCode;
  region_id: string | null;
  city_id: string;
  venue_id: string | null;
  location_name: string | null;
  address_line: string | null;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
  is_online: boolean;
  online_url: string | null;
  timezone: string;
  starts_at: string;
  ends_at: string | null;
  is_free: boolean;
  price_min_minor: number | null;
  price_max_minor: number | null;
  currency: string | null;
  capacity: number | null;
  registration_mode: 'none' | 'free_registration' | 'tickets';
  accessibility: Record<string, unknown>;
  entry_conditions: string | null;
  age_min: number | null;
  contact_email: string | null;
  contact_phone: string | null;
  official_links: { label: string; url: string }[];
  cancellation_policy: string | null;
  visibility: 'public' | 'unlisted' | 'private';
}

export function eventFormToRow(values: EventFormValues): EventRowInput {
  const startsAt = localInputToIso(values.startDate, values.startTime, values.timezone);
  const endsAt =
    values.endDate && values.endTime ? localInputToIso(values.endDate, values.endTime, values.timezone) : null;
  return {
    title: values.title,
    summary: values.summary ?? null,
    description: values.description ?? null,
    category_slug: values.categorySlug,
    tags: Array.from(new Set(values.tags.map((t) => t.toLowerCase()))),
    country_code: values.countryCode,
    region_id: values.regionId ?? null,
    city_id: values.cityId,
    venue_id: values.venueId ?? null,
    location_name: values.locationName ?? null,
    address_line: values.addressLine ?? null,
    postal_code: values.postalCode ?? null,
    lat: values.lat ?? null,
    lng: values.lng ?? null,
    is_online: values.isOnline,
    online_url: values.onlineUrl ?? null,
    timezone: values.timezone,
    starts_at: startsAt,
    ends_at: endsAt,
    is_free: values.isFree,
    price_min_minor: values.isFree ? null : (values.priceMinMinor ?? null),
    price_max_minor: values.isFree ? null : (values.priceMaxMinor ?? null),
    currency: values.isFree ? null : (values.currency ?? null),
    capacity: values.capacity ?? null,
    registration_mode: values.registrationMode,
    accessibility: values.accessibility,
    entry_conditions: values.entryConditions ?? null,
    age_min: values.ageMin ?? null,
    contact_email: values.contactEmail ?? null,
    contact_phone: values.contactPhone ? normalizePhone(values.contactPhone, values.countryCode) : null,
    official_links: values.officialLinks,
    cancellation_policy: values.cancellationPolicy ?? null,
    visibility: values.visibility,
  };
}

export const eventStatusActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save_draft') }),
  z.object({ action: z.literal('submit') }),
  z.object({ action: z.literal('publish') }),
  z.object({ action: z.literal('withdraw') }),
  z.object({ action: z.literal('cancel'), reason: requiredText(5, 1000) }),
]);
export type EventStatusAction = z.infer<typeof eventStatusActionSchema>;

export const announcementSchema = z.object({
  title: requiredText(3, 120),
  body: requiredText(3, 2000),
});
export type AnnouncementInput = z.infer<typeof announcementSchema>;

export const eventReportSchema = z.object({
  eventId: uuidSchema,
  reason: z.enum(
    ['fake_event', 'scam', 'inappropriate', 'wrong_information', 'duplicate', 'cancelled_not_updated', 'other'],
    { error: 'validation.required' },
  ),
  details: optionalText(2000),
});
export type EventReportInput = z.infer<typeof eventReportSchema>;

export const registrationSchema = z.object({
  eventId: uuidSchema,
  quantity: z.number().int().min(1, { error: 'validation.invalid_quantity' }).max(10, { error: 'validation.invalid_quantity' }),
});
