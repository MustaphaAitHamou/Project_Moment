import { z } from 'zod';
import { COUNTRY_CODES, isDateKey, isValidTimeZone } from '@tamurt/core';

/**
 * Briques communes. Les messages d'erreur sont des CLÉS de traduction (`validation.*`)
 * rendues par les clients dans la langue de l'utilisateur.
 */

export const LOCALES = ['fr', 'en', 'ar'] as const;

// z.guid() : format 8-4-4-4-12 hexadécimal (les identifiants proviennent de gen_random_uuid()).
export const uuidSchema = z.guid({ error: 'validation.invalid_id' });

export const countryCodeSchema = z.enum(COUNTRY_CODES, { error: 'validation.invalid_country' });

export const currencySchema = z.enum(['EUR', 'USD', 'CAD', 'DZD'], { error: 'validation.invalid_currency' });

export const localeSchema = z.enum(LOCALES, { error: 'validation.invalid_locale' });

export const timezoneSchema = z
  .string({ error: 'validation.required' })
  .refine((value) => isValidTimeZone(value), { error: 'validation.invalid_timezone' });

export const dateKeySchema = z
  .string({ error: 'validation.required' })
  .refine((value) => isDateKey(value), { error: 'validation.invalid_date' });

export const timeSchema = z
  .string({ error: 'validation.required' })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'validation.invalid_time' });

export const emailSchema = z
  .string({ error: 'validation.required' })
  .trim()
  .toLowerCase()
  .min(1, { error: 'validation.required' })
  .max(254, { error: 'validation.too_long' })
  .pipe(z.email({ error: 'validation.invalid_email' }));

/** Champ texte optionnel : la chaîne vide est convertie en undefined. */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, { error: 'validation.too_long' })
    .optional()
    .transform((value) => (value ? value : undefined));
}

export function requiredText(min: number, max: number) {
  return z
    .string({ error: 'validation.required' })
    .trim()
    .min(min, { error: min <= 1 ? 'validation.required' : 'validation.too_short' })
    .max(max, { error: 'validation.too_long' });
}

function isHttpUrl(value: string, httpsOnly: boolean): boolean {
  try {
    const url = new URL(value);
    if (httpsOnly) return url.protocol === 'https:';
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export const httpsUrlSchema = z
  .string({ error: 'validation.required' })
  .trim()
  .max(500, { error: 'validation.too_long' })
  .refine((value) => isHttpUrl(value, true), { error: 'validation.invalid_url_https' });

export const webUrlSchema = z
  .string({ error: 'validation.required' })
  .trim()
  .max(500, { error: 'validation.too_long' })
  .refine((value) => isHttpUrl(value, false), { error: 'validation.invalid_url' });

export const optionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, { error: 'validation.too_long' })
  .optional()
  .transform((value) => (value ? value : undefined))
  .pipe(z.email({ error: 'validation.invalid_email' }).optional());

export const minorAmountSchema = z
  .number({ error: 'validation.invalid_amount' })
  .int({ error: 'validation.invalid_amount' })
  .min(0, { error: 'validation.invalid_amount' })
  .max(100_000_000, { error: 'validation.invalid_amount' });

export const positiveMinorAmountSchema = minorAmountSchema.refine((value) => value > 0, {
  error: 'validation.invalid_amount',
});

/** Clé d'idempotence fournie par le client (en-tête Idempotency-Key). */
export const idempotencyKeySchema = z
  .string({ error: 'validation.required' })
  .min(8, { error: 'validation.invalid_idempotency_key' })
  .max(128, { error: 'validation.invalid_idempotency_key' })
  .regex(/^[A-Za-z0-9_-]+$/, { error: 'validation.invalid_idempotency_key' });

export type ValidationIssue = { path: string; message: string };

type UndefinedKeys<T> = { [K in keyof T]-?: undefined extends T[K] ? K : never }[keyof T];
/** Rend réellement optionnelles les clés dont la valeur peut être undefined (sortie des transforms). */
export type Clean<T> = T extends object ? Omit<T, UndefinedKeys<T>> & Partial<Pick<T, UndefinedKeys<T>>> : T;

/** Aplatit les erreurs Zod en { chemin, clé de message } pour les réponses API. */
export function flattenIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message.startsWith('validation.') ? issue.message : 'validation.invalid',
  }));
}
