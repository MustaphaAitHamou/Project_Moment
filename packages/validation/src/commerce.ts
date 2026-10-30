import { z } from 'zod';
import { normalizeInvitationCode, isInvitationCodeFormat } from '@tamurt/core';
import { countryCodeSchema, emailSchema, localeSchema, optionalText, positiveMinorAmountSchema, requiredText, uuidSchema } from './common';

// -----------------------------------------------------------------------------
// Billetterie
// -----------------------------------------------------------------------------
export const createReservationSchema = z.object({
  offerId: uuidSchema,
  quantity: z
    .number({ error: 'validation.invalid_quantity' })
    .int({ error: 'validation.invalid_quantity' })
    .min(1, { error: 'validation.invalid_quantity' })
    .max(10, { error: 'validation.invalid_quantity' }),
  promoCode: z
    .string()
    .trim()
    .max(32)
    .regex(/^[A-Za-z0-9_-]*$/, { error: 'validation.invalid_promo_code' })
    .optional()
    .transform((value) => (value ? value.toUpperCase() : undefined)),
});
export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const createOrderSchema = z.object({ reservationId: uuidSchema });
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * Paiement SIMULÉ : aucun moyen de paiement n'est collecté. Le scénario permet de démontrer
 * les cas de succès, de refus et d'erreur technique du prestataire.
 */
export const demoPaymentSchema = z.object({
  scenario: z.enum(['success', 'declined', 'error']).default('success'),
});
export type DemoPaymentInput = z.infer<typeof demoPaymentSchema>;

// -----------------------------------------------------------------------------
// Revente
// -----------------------------------------------------------------------------
export const createListingSchema = z.object({
  ticketId: uuidSchema,
  askingPriceMinor: positiveMinorAmountSchema,
  note: optionalText(500),
});
export type CreateListingInput = z.infer<typeof createListingSchema>;

export const purchaseListingSchema = z.object({ listingId: uuidSchema });

export const disputeSchema = z.object({
  transactionId: uuidSchema,
  reason: z.enum(['ticket_not_received', 'ticket_invalid', 'event_cancelled', 'not_as_described', 'payment_issue', 'other'], {
    error: 'validation.required',
  }),
  details: optionalText(2000),
});
export type DisputeInput = z.infer<typeof disputeSchema>;

export const reportListingSchema = z.object({
  listingId: uuidSchema,
  reason: z.enum(['counterfeit_ticket', 'price_abuse', 'scam', 'spam', 'other'], { error: 'validation.required' }),
  details: optionalText(2000),
});
export type ReportListingInput = z.infer<typeof reportListingSchema>;

// -----------------------------------------------------------------------------
// Programme Tamurt Beta
// -----------------------------------------------------------------------------
export const betaWaitlistSchema = z.object({
  email: emailSchema,
  fullName: requiredText(2, 120),
  countryCode: countryCodeSchema,
  platforms: z
    .array(z.enum(['ios', 'android', 'web']))
    .min(1, { error: 'validation.platform_required' })
    .max(3),
  socialHandle: optionalText(80),
  motivation: optionalText(1000),
  locale: localeSchema,
  consent: z.literal(true, { error: 'validation.consent_required' }),
});
export type BetaWaitlistInput = z.infer<typeof betaWaitlistSchema>;

export const betaRedeemSchema = z.object({
  code: z
    .string({ error: 'validation.required' })
    .trim()
    .min(1, { error: 'validation.required' })
    .max(40)
    .transform((value) => normalizeInvitationCode(value))
    .refine((value) => isInvitationCodeFormat(value), { error: 'validation.invalid_code' }),
});
export type BetaRedeemInput = z.infer<typeof betaRedeemSchema>;

export const betaFeedbackSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('bug'),
    title: requiredText(3, 140),
    message: requiredText(3, 4000),
    rating: z.number().int().min(1).max(5).optional(),
    platform: z.enum(['web', 'ios', 'android']),
    appVersion: optionalText(40),
    screen: optionalText(200),
    deviceInfo: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  }),
  z.object({
    kind: z.literal('suggestion'),
    title: requiredText(3, 140),
    message: requiredText(3, 4000),
    rating: z.number().int().min(1).max(5).optional(),
    platform: z.enum(['web', 'ios', 'android']),
    appVersion: optionalText(40),
    screen: optionalText(200),
    deviceInfo: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  }),
  z.object({
    kind: z.literal('rating'),
    title: optionalText(140),
    message: optionalText(4000),
    rating: z.number({ error: 'validation.rating_required' }).int().min(1).max(5),
    platform: z.enum(['web', 'ios', 'android']),
    appVersion: optionalText(40),
    screen: optionalText(200),
    deviceInfo: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  }),
]);
export type BetaFeedbackInput = z.infer<typeof betaFeedbackSchema>;

export const betaInvitationCreateSchema = z
  .object({
    waitlistId: uuidSchema.optional(),
    email: emailSchema.optional(),
    note: optionalText(300),
    expiresInDays: z.number().int().min(1).max(90).default(30),
  })
  .refine((value) => value.waitlistId || value.email, { error: 'validation.invitation_target_required', path: ['email'] });
export type BetaInvitationCreateInput = z.infer<typeof betaInvitationCreateSchema>;

// -----------------------------------------------------------------------------
// Géocodage
// -----------------------------------------------------------------------------
export const geocodeQuerySchema = z.object({
  q: requiredText(3, 200),
  country: countryCodeSchema,
});
export type GeocodeQueryInput = z.infer<typeof geocodeQuerySchema>;
