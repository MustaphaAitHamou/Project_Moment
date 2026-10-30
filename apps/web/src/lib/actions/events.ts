'use server';
import { setFavorite } from '@tamurt/api-client';
import { AppError, toAppError } from '@tamurt/core';
import { eventReportSchema, registrationSchema, uuidSchema } from '@tamurt/validation';
import { getSupabase, getViewer } from '../session';
import { runAction } from './result';

async function requireSignedIn() {
  const viewer = await getViewer();
  if (!viewer) throw new AppError('unauthenticated');
  if (viewer.suspended) throw new AppError('account_suspended');
  return viewer;
}

export async function toggleFavoriteAction(eventId: string, favorite: boolean) {
  return runAction(async () => {
    const viewer = await requireSignedIn();
    const id = uuidSchema.parse(eventId);
    await setFavorite(await getSupabase(), viewer.id, id, favorite);
    return { favorite };
  });
}

export async function registerForEventAction(eventId: string, quantity: number) {
  return runAction(async () => {
    await requireSignedIn();
    const input = registrationSchema.parse({ eventId, quantity });
    const { error } = await (await getSupabase()).rpc('register_for_event', { p_event_id: input.eventId, p_quantity: input.quantity });
    if (error) throw toAppError(error);
    return { registered: true };
  });
}

export async function cancelRegistrationAction(eventId: string) {
  return runAction(async () => {
    await requireSignedIn();
    const { error } = await (await getSupabase()).rpc('cancel_event_registration', { p_event_id: uuidSchema.parse(eventId) });
    if (error) throw toAppError(error);
    return { registered: false };
  });
}

export async function reportEventAction(input: { eventId: string; reason: string; details?: string }) {
  return runAction(async () => {
    const viewer = await requireSignedIn();
    const parsed = eventReportSchema.safeParse(input);
    if (!parsed.success) throw new AppError('validation_failed');
    const { error } = await (await getSupabase()).from('event_reports').insert({
      event_id: parsed.data.eventId,
      reporter_id: viewer.id,
      reason: parsed.data.reason,
      details: parsed.data.details ?? null,
    });
    if (error) throw toAppError(error);
    return null;
  });
}
