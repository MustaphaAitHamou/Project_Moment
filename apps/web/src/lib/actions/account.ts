'use server';
import { markNotificationsRead, setFollowedCity } from '@tamurt/api-client';
import { AppError, EVENT_CATEGORY_SLUGS, toAppError } from '@tamurt/core';
import { flattenIssues, notificationPreferencesSchema, profileUpdateSchema, uuidSchema, type NotificationPreferencesInput, type ProfileUpdateInput } from '@tamurt/validation';
import { cookies } from 'next/headers';
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

export async function followCityAction(cityId: string, follow: boolean) {
  return runAction(async () => {
    const viewer = await requireSignedIn();
    await setFollowedCity(await getSupabase(), viewer.id, validate(uuidSchema, cityId), follow);
    return { follow };
  });
}

export async function updateProfileAction(input: ProfileUpdateInput) {
  return runAction(async () => {
    const viewer = await requireSignedIn();
    const values = validate(profileUpdateSchema, input);
    const { error } = await (await getSupabase())
      .from('profiles')
      .update({ display_name: values.displayName, locale: values.locale, country_code: values.countryCode, timezone: values.timezone, home_city_id: values.homeCityId })
      .eq('id', viewer.id);
    if (error) throw toAppError(error);
    if (values.countryCode) (await cookies()).set('TAMURT_COUNTRY', values.countryCode, { path: '/', maxAge: 31536000, sameSite: 'lax' });
    return null;
  });
}

export async function updateNotificationPreferencesAction(input: NotificationPreferencesInput) {
  return runAction(async () => {
    const viewer = await requireSignedIn();
    const values = validate(notificationPreferencesSchema, input);
    const { error } = await (await getSupabase()).from('notification_preferences').update(values).eq('user_id', viewer.id);
    if (error) throw toAppError(error);
    return null;
  });
}

async function saveInterests(userId: string, categories: string[]) {
  const values = validate(z.array(z.enum(EVENT_CATEGORY_SLUGS)).max(13), categories);
  const supabase = await getSupabase();
  const removed = await supabase.from('user_category_interests').delete().eq('user_id', userId);
  if (removed.error) throw toAppError(removed.error);
  if (values.length) {
    const { error } = await supabase.from('user_category_interests').insert(values.map((slug) => ({ user_id: userId, category_slug: slug })));
    if (error) throw toAppError(error);
  }
}

export async function setInterestsAction(categories: string[]) {
  return runAction(async () => {
    const viewer = await requireSignedIn();
    await saveInterests(viewer.id, categories);
    return null;
  });
}

export async function completeOnboardingAction(input: { countryCode: string | null; cityIds: string[]; categories: string[] }) {
  return runAction(async () => {
    const viewer = await requireSignedIn();
    const supabase = await getSupabase();
    const values = validate(
      z.object({ countryCode: z.enum(['FR', 'DZ', 'US', 'CA']).nullable(), cityIds: z.array(uuidSchema).max(10), categories: z.array(z.enum(EVENT_CATEGORY_SLUGS)).max(13) }),
      input,
    );
    for (const cityId of values.cityIds) await setFollowedCity(supabase, viewer.id, cityId, true);
    await saveInterests(viewer.id, values.categories);
    const { error } = await supabase.from('profiles').update({ country_code: values.countryCode, onboarding_completed_at: new Date().toISOString() }).eq('id', viewer.id);
    if (error) throw toAppError(error);
    if (values.countryCode) (await cookies()).set('TAMURT_COUNTRY', values.countryCode, { path: '/', maxAge: 31536000, sameSite: 'lax' });
    return null;
  });
}

export async function markNotificationsReadAction(ids?: string[]) {
  return runAction(async () => {
    await requireSignedIn();
    await markNotificationsRead(await getSupabase(), ids?.length ? validate(z.array(uuidSchema).max(100), ids) : undefined);
    return null;
  });
}

/** Déconnexion des autres appareils (révocation des autres sessions Supabase). */
export async function signOutOthersAction() {
  return runAction(async () => {
    await requireSignedIn();
    const { error } = await (await getSupabase()).auth.signOut({ scope: 'others' });
    if (error) throw toAppError(error);
    return null;
  });
}
