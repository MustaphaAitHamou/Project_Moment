'use server';
import { AppError, toAppError } from '@tamurt/core';
import { announcementSchema, flattenIssues, organizerProfileSchema, uuidSchema, verificationRequestSchema, type AnnouncementInput, type OrganizerProfileInput, type VerificationRequestInput } from '@tamurt/validation';
import { z } from 'zod';
import { getSupabase, getViewer } from '../session';
import { runAction } from './result';

async function requireSignedIn() {
  const viewer = await getViewer();
  if (!viewer) throw new AppError('unauthenticated');
  if (viewer.suspended) throw new AppError('account_suspended');
  return viewer;
}

function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new AppError('validation_failed', undefined, { issues: flattenIssues(parsed.error) });
  return parsed.data;
}

/** Annonce aux participants (RLS : permission « post_announcements » ; notifications créées par la base). */
export async function postAnnouncementAction(eventId: string, input: AnnouncementInput) {
  return runAction(async () => {
    const viewer = await requireSignedIn();
    const values = validate(announcementSchema, input);
    const { error } = await (await getSupabase()).from('event_announcements').insert({ event_id: validate(uuidSchema, eventId), author_id: viewer.id, title: values.title, body: values.body });
    if (error) throw toAppError(error);
    return null;
  });
}

export async function updateOrganizerAction(organizerId: string, input: OrganizerProfileInput) {
  return runAction(async () => {
    await requireSignedIn();
    const values = validate(organizerProfileSchema, input);
    const { error } = await (await getSupabase())
      .from('organizer_profiles')
      .update({
        name: values.name,
        kind: values.kind,
        bio: values.bio ?? null,
        website_url: values.websiteUrl ?? null,
        public_email: values.publicEmail ?? null,
        public_phone: values.publicPhone ?? null,
        country_code: values.countryCode,
        city_id: values.cityId ?? null,
      })
      .eq('id', validate(uuidSchema, organizerId));
    if (error) throw toAppError(error);
    return null;
  });
}

export async function requestVerificationAction(organizerId: string, input: VerificationRequestInput) {
  return runAction(async () => {
    const viewer = await requireSignedIn();
    const values = validate(verificationRequestSchema, input);
    const { error } = await (await getSupabase()).from('organizer_verification_requests').insert({
      organizer_id: validate(uuidSchema, organizerId),
      submitted_by: viewer.id,
      legal_name: values.legalName,
      registration_number: values.registrationNumber ?? null,
      message: values.message ?? null,
      status: 'pending',
    });
    if (error) throw toAppError(error);
    return null;
  });
}

export async function updateMemberRoleAction(organizerId: string, userId: string, role: string) {
  return runAction(async () => {
    await requireSignedIn();
    const value = validate(z.enum(['owner', 'admin', 'editor', 'analyst']), role);
    const { error } = await (await getSupabase()).from('organizer_members').update({ role: value }).eq('organizer_id', validate(uuidSchema, organizerId)).eq('user_id', validate(uuidSchema, userId));
    if (error) throw toAppError(error);
    return null;
  });
}

export async function removeMemberAction(organizerId: string, userId: string) {
  return runAction(async () => {
    await requireSignedIn();
    const { error } = await (await getSupabase()).from('organizer_members').delete().eq('organizer_id', validate(uuidSchema, organizerId)).eq('user_id', validate(uuidSchema, userId));
    if (error) throw toAppError(error);
    return null;
  });
}

export async function revokeInvitationAction(invitationId: string) {
  return runAction(async () => {
    await requireSignedIn();
    const { error } = await (await getSupabase()).from('organizer_invitations').update({ revoked_at: new Date().toISOString() }).eq('id', validate(uuidSchema, invitationId));
    if (error) throw toAppError(error);
    return null;
  });
}

export async function acceptInvitationAction(invitationId: string) {
  return runAction(async () => {
    await requireSignedIn();
    const { error } = await (await getSupabase()).rpc('accept_organizer_invitation', { p_invitation_id: validate(uuidSchema, invitationId) });
    if (error) throw toAppError(error);
    return null;
  });
}
