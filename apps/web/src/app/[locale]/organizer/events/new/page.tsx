import { listMyOrganizations } from '@tamurt/api-client';
import { isCountryCode, organizerRoleHasPermission } from '@tamurt/core';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EventForm } from '@/components/organizer/event-form';
import { emptyEventForm } from '@/components/organizer/event-form-state';
import { Alert } from '@/components/ui/alert';
import { buttonClasses } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { requireViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';
import { cn, firstParam } from '@/lib/utils';

export default async function NewEventPage({ params, searchParams }: PageProps<'/[locale]/organizer/events/new'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, '/organizer/events/new');
  const t = await getTranslations();
  if (!viewer.hasAppAccess) {
    return <Alert tone="info" title={t('common.requiresBeta')} action={<Link href="/beta" className={buttonClasses({ size: 'sm' })}>{t('nav.beta')}</Link>} />;
  }
  const memberships = (await listMyOrganizations(await getSupabase(), viewer.id)).filter(({ role }) => organizerRoleHasPermission(role, 'manage_events'));
  if (!memberships.length) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <PageHeader title={t('eventForm.createTitle')} />
        <Alert tone="info" title={t('eventForm.noOrganizer')} action={<Link href="/organizer/new" className={buttonClasses({ size: 'sm' })}>{t('organizer.createOrganization')}</Link>} />
      </div>
    );
  }
  const requested = firstParam((await searchParams).org);
  const selected = memberships.find(({ organizer }) => organizer.id === requested)?.organizer ?? memberships[0]!.organizer;
  const country = isCountryCode(selected.country_code) ? selected.country_code : 'FR';
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={t('eventForm.createTitle')} subtitle={t('eventForm.publishingFree')} />
      {memberships.length > 1 ? (
        <nav aria-label={t('eventForm.chooseOrganizer')} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{t('eventForm.chooseOrganizer')} :</span>
          {memberships.map(({ organizer }) => (
            <Link key={organizer.id} href={{ pathname: '/organizer/events/new', query: { org: organizer.id } }} className={cn('rounded-full border px-3 py-1', organizer.id === selected.id ? 'border-primary bg-primary-soft font-semibold text-primary' : 'border-line hover:bg-sunken')}>
              {organizer.name}
            </Link>
          ))}
        </nav>
      ) : (
        <p className="text-sm text-muted">{t('eventForm.chooseOrganizer')} : <strong>{selected.name}</strong></p>
      )}
      <EventForm key={selected.id} mode="create" organizerId={selected.id} initial={emptyEventForm(country)} verified={selected.verification_status === 'verified'} />
    </div>
  );
}
