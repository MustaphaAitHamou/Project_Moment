import { z } from 'zod';
import { normalizePhone, ORGANIZER_KINDS } from '@tamurt/core';
import { countryCodeSchema, emailSchema, optionalEmailSchema, optionalText, requiredText, uuidSchema, webUrlSchema } from './common';

export const organizerProfileSchema = z
  .object({
    name: requiredText(2, 120),
    kind: z.enum(ORGANIZER_KINDS, { error: 'validation.required' }),
    bio: optionalText(4000),
    websiteUrl: webUrlSchema.optional().or(z.literal('').transform(() => undefined)),
    publicEmail: optionalEmailSchema,
    publicPhone: optionalText(32),
    countryCode: countryCodeSchema,
    cityId: uuidSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.publicPhone && !normalizePhone(value.publicPhone, value.countryCode)) {
      ctx.addIssue({ code: 'custom', path: ['publicPhone'], message: 'validation.invalid_phone' });
    }
  });
export type OrganizerProfileInput = z.infer<typeof organizerProfileSchema>;

export const organizerInvitationSchema = z.object({
  email: emailSchema,
  role: z.enum(['admin', 'editor', 'analyst'], { error: 'validation.required' }),
});
export type OrganizerInvitationInput = z.infer<typeof organizerInvitationSchema>;

export const verificationRequestSchema = z.object({
  legalName: requiredText(2, 200),
  registrationNumber: optionalText(64),
  message: optionalText(2000),
});
export type VerificationRequestInput = z.infer<typeof verificationRequestSchema>;

export const venueSchema = z
  .object({
    name: requiredText(2, 160),
    description: optionalText(5000),
    addressLine1: requiredText(2, 200),
    addressLine2: optionalText(200),
    postalCode: optionalText(16),
    countryCode: countryCodeSchema,
    cityId: uuidSchema,
    regionId: uuidSchema.nullable().optional(),
    lat: z.number({ error: 'validation.location_required' }).min(-90).max(90),
    lng: z.number({ error: 'validation.location_required' }).min(-180).max(180),
    capacity: z.number().int().min(1).max(1_000_000).nullable().optional(),
    websiteUrl: webUrlSchema.optional().or(z.literal('').transform(() => undefined)),
    phone: optionalText(32),
    practicalInfo: optionalText(3000),
    accessibility: z
      .object({
        wheelchair: z.boolean().optional(),
        accessibleToilets: z.boolean().optional(),
        hearingLoop: z.boolean().optional(),
        reservedParking: z.boolean().optional(),
        notes: z.string().max(500).optional(),
      })
      .default({}),
  })
  .superRefine((value, ctx) => {
    if (value.phone && !normalizePhone(value.phone, value.countryCode)) {
      ctx.addIssue({ code: 'custom', path: ['phone'], message: 'validation.invalid_phone' });
    }
  });
export type VenueInput = z.infer<typeof venueSchema>;
