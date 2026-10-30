'use server';
import { AppError, toAppError } from '@tamurt/core';
import { uuidSchema } from '@tamurt/validation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSupabase, getViewer } from '../session';
import { runAction } from './result';

/**
 * Actions d'administration. Double contrôle : rôle vérifié ici ET dans chaque fonction SQL
 * (assert_staff / assert_admin). Toutes les décisions sont journalisées (audit_logs, moderation_actions).
 */
async function requireStaff(adminOnly = false) {
  const viewer = await getViewer();
  if (!viewer || viewer.suspended) throw new AppError('unauthenticated');
  if (adminOnly ? !viewer.isAdmin : !viewer.isStaff) throw new AppError('forbidden');
  return viewer;
}

const id = (value: string) => uuidSchema.parse(value);
const note = (value: string | undefined) => (value ?? '').trim().slice(0, 1000);

async function rpc(name: string, args: Record<string, unknown>) {
  const supabase = await getSupabase();
  const { error } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ error: unknown }>)(name, args);
  if (error) throw toAppError(error);
  revalidatePath('/[locale]/admin', 'layout');
  return null;
}

export async function reviewEventAction(eventId: string, decision: 'approve' | 'reject' | 'unpublish', text?: string) {
  return runAction(async () => {
    await requireStaff();
    if (decision !== 'approve' && !note(text)) throw new AppError('validation_failed', 'note_required');
    return rpc('admin_review_event', { p_event_id: id(eventId), p_decision: decision, p_note: note(text) });
  });
}

export async function setSponsoredAction(eventId: string, sponsored: boolean) {
  return runAction(async () => {
    await requireStaff();
    return rpc('admin_set_event_sponsored', { p_event_id: id(eventId), p_sponsored: sponsored });
  });
}

export async function reviewOrganizerAction(organizerId: string, decision: 'verify' | 'reject' | 'unverify', text?: string) {
  return runAction(async () => {
    await requireStaff();
    return rpc('admin_review_organizer', { p_organizer_id: id(organizerId), p_decision: decision, p_note: note(text) });
  });
}

export async function reviewMediaAction(kind: 'event_cover' | 'event_media' | 'venue_media', mediaId: string, approve: boolean, text?: string) {
  return runAction(async () => {
    await requireStaff();
    return rpc('admin_review_media', { p_kind: z.enum(['event_cover', 'event_media', 'venue_media']).parse(kind), p_id: id(mediaId), p_approve: approve, p_note: note(text) });
  });
}

export async function removeListingAction(listingId: string, text?: string) {
  return runAction(async () => {
    await requireStaff();
    if (!note(text)) throw new AppError('validation_failed', 'note_required');
    return rpc('admin_remove_resale_listing', { p_listing_id: id(listingId), p_reason: note(text) });
  });
}

export async function handleReportAction(kind: 'event' | 'user', reportId: string, status: 'reviewing' | 'resolved' | 'dismissed', text?: string) {
  return runAction(async () => {
    await requireStaff();
    return rpc('admin_handle_report', { p_kind: kind, p_report_id: id(reportId), p_status: status, p_note: note(text) });
  });
}

export async function setRoleAction(userId: string, role: 'organizer' | 'moderator' | 'admin' | 'beta_tester', grant: boolean) {
  return runAction(async () => {
    const viewer = await requireStaff(true);
    if (viewer.id === userId && role === 'admin' && !grant) throw new AppError('forbidden', 'cannot_revoke_own_admin');
    return rpc('admin_set_role', { p_user_id: id(userId), p_role: z.enum(['organizer', 'moderator', 'admin', 'beta_tester']).parse(role), p_grant: grant });
  });
}

export async function setSuspensionAction(userId: string, suspended: boolean, text?: string) {
  return runAction(async () => {
    const viewer = await requireStaff(true);
    if (viewer.id === userId) throw new AppError('forbidden', 'cannot_suspend_self');
    if (suspended && !note(text)) throw new AppError('validation_failed', 'note_required');
    return rpc('admin_set_user_suspension', { p_user_id: id(userId), p_suspended: suspended, p_reason: note(text) });
  });
}

const betaSettingsSchema = z.object({
  mode: z.enum(['open', 'closed']),
  max_testers: z.number().int().min(0).max(100_000),
  testflight_url: z.url().startsWith('https://').nullable(),
  play_testing_url: z.url().startsWith('https://').nullable(),
});

export async function updateBetaSettingsAction(input: z.input<typeof betaSettingsSchema>) {
  return runAction(async () => {
    await requireStaff(true);
    const parsed = betaSettingsSchema.safeParse(input);
    if (!parsed.success) throw new AppError('validation_failed');
    return rpc('admin_update_setting', { p_key: 'beta', p_value: parsed.data });
  });
}

export async function updateFeedbackStatusAction(feedbackId: string, status: 'new' | 'triaged' | 'planned' | 'done' | 'wont_fix') {
  return runAction(async () => {
    await requireStaff();
    const { error } = await (await getSupabase()).from('beta_feedback').update({ status: z.enum(['new', 'triaged', 'planned', 'done', 'wont_fix']).parse(status) }).eq('id', id(feedbackId));
    if (error) throw toAppError(error);
    revalidatePath('/[locale]/admin', 'layout');
    return null;
  });
}
