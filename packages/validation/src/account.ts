import { z } from 'zod';
import { countryCodeSchema, emailSchema, localeSchema, requiredText, timezoneSchema, uuidSchema } from './common';

/**
 * Politique de mot de passe alignée sur Supabase Auth (config.toml) :
 * 10 caractères minimum, au moins une minuscule, une majuscule et un chiffre.
 * 72 caractères maximum (limite de bcrypt).
 */
export const passwordSchema = z
  .string({ error: 'validation.required' })
  .min(10, { error: 'validation.password_too_short' })
  .max(72, { error: 'validation.too_long' })
  .refine((value) => /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value), {
    error: 'validation.password_weak',
  });

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: requiredText(2, 80),
  locale: localeSchema,
  countryCode: countryCodeSchema.optional(),
  acceptTerms: z.literal(true, { error: 'validation.terms_required' }),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string({ error: 'validation.required' }).min(1, { error: 'validation.required' }).max(72),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const updatePasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, {
    error: 'validation.passwords_mismatch',
    path: ['confirmPassword'],
  });
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

export const profileUpdateSchema = z.object({
  displayName: requiredText(2, 80),
  locale: localeSchema,
  countryCode: countryCodeSchema.nullable(),
  timezone: timezoneSchema.nullable(),
  homeCityId: uuidSchema.nullable(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const notificationPreferencesSchema = z.object({
  push_enabled: z.boolean(),
  email_enabled: z.boolean(),
  reminders_enabled: z.boolean(),
  reminder_lead_hours: z.union([z.literal(1), z.literal(3), z.literal(24), z.literal(48), z.literal(168)]),
  followed_city_events_enabled: z.boolean(),
  organizer_updates_enabled: z.boolean(),
  marketing_enabled: z.boolean(),
});
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;

/** Suppression du compte : confirmation explicite + ré-authentification par mot de passe. */
export const deleteAccountSchema = z.object({
  password: z.string({ error: 'validation.required' }).min(1, { error: 'validation.required' }).max(72),
  confirm: z.literal(true, { error: 'validation.confirmation_required' }),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

export const pushTokenSchema = z.object({
  token: z.string().min(10).max(400),
  platform: z.enum(['ios', 'android', 'web']),
  deviceName: z.string().max(120).optional(),
  appVersion: z.string().max(40).optional(),
});
export type PushTokenInput = z.infer<typeof pushTokenSchema>;
