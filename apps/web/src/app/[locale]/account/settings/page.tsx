import { getMyProfile, getNotificationPreferences, listCities } from '@tamurt/api-client';
import type { NotificationPreferencesInput } from '@tamurt/validation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NotificationPrefsForm } from '@/components/account/notification-prefs-form';
import { ProfileForm } from '@/components/account/profile-form';
import { DeleteAccountForm, SignOutOthersButton } from '@/components/account/security-cards';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import type { AppLocale } from '@/i18n/routing';
import { dateTimeShort, nameOf } from '@/lib/format';
import { requireViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';
import { firstParam } from '@/lib/utils';

export default async function SettingsPage({ params, searchParams }: PageProps<'/[locale]/account/settings'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, '/account/settings');
  const t = await getTranslations();
  const supabase = await getSupabase();
  const [profile, prefs, cities, sessions] = await Promise.all([
    getMyProfile(supabase, viewer.id),
    getNotificationPreferences(supabase, viewer.id),
    listCities(supabase).catch(() => []),
    supabase.rpc('my_sessions').then((result) => result.data ?? []),
  ]);
  const confirmed = firstParam((await searchParams).confirmed) === '1';
  return (
    <>
      <PageHeader title={t('settings.title')} />
      {confirmed ? <Alert tone="success">{t('auth.emailConfirmed')}</Alert> : null}
      <Card>
        <SectionHeader title={t('account.profile')} />
        <ProfileForm
          initial={{ displayName: profile.display_name, locale: profile.locale as AppLocale, countryCode: (profile.country_code as 'FR' | null) ?? null, timezone: profile.timezone ?? null, homeCityId: profile.home_city_id ?? null }}
          cities={cities.map((city) => ({ id: city.id, name: nameOf(city.names, locale), countryCode: city.country_code }))}
        />
      </Card>
      <Card>
        <SectionHeader title={t('account.notificationsTitle')} />
        <NotificationPrefsForm initial={prefs as unknown as NotificationPreferencesInput} />
      </Card>
      <Card className="space-y-3">
        <SectionHeader title={t('account.privacy')} />
        <p className="text-sm text-muted">{t('account.privacyText')}</p>
      </Card>
      <Card className="space-y-4">
        <SectionHeader title={t('account.sessions')} />
        <p className="text-sm text-muted">{t('account.sessionsText')}</p>
        <ul className="divide-y divide-line rounded-lg border border-line text-sm">
          {sessions.map((session) => (
            <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <span className="truncate">{session.user_agent || '—'}</span>
              <span className="text-xs text-subtle">{dateTimeShort(session.updated_at ?? session.created_at, locale)}{session.is_current ? ' · ✓' : ''}</span>
            </li>
          ))}
        </ul>
        <SignOutOthersButton />
      </Card>
      <Card className="border-danger/30">
        <SectionHeader title={t('account.deleteAccount')} />
        <DeleteAccountForm />
      </Card>
    </>
  );
}
