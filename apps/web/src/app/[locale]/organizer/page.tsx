import { listMyOrganizations } from '@tamurt/api-client';
import { BadgeCheck, Building2, Plus } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AcceptInvitationButton } from '@/components/organizer/team-manager';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { requireViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';

export default async function OrganizerHome({ params }: PageProps<'/[locale]/organizer'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, '/organizer');
  const t = await getTranslations();
  const supabase = await getSupabase();
  const [memberships, invitations] = await Promise.all([
    listMyOrganizations(supabase, viewer.id),
    supabase.from('organizer_invitations').select('id, role, organizer:organizer_profiles!inner(name)').eq('email', viewer.email).is('accepted_at', null).is('revoked_at', null),
  ]);
  return (
    <div className="space-y-8">
      <PageHeader
        title={t('organizer.dashboardTitle')}
        subtitle={t('organizer.dashboardSubtitle')}
        actions={
          <>
            <Link href="/organizer/new" className={buttonClasses({ variant: 'outline' })}><Building2 className="h-4 w-4" aria-hidden />{t('organizer.createOrganization')}</Link>
            {memberships.length ? <Link href="/organizer/events/new" className={buttonClasses()}><Plus className="h-4 w-4" aria-hidden />{t('organizer.newEvent')}</Link> : null}
          </>
        }
      />
      {invitations.data?.length ? (
        <Card>
          <SectionHeader title={t('organizer.myInvitations')} />
          <ul className="space-y-2">
            {invitations.data.map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3">
                <span className="font-semibold">{invitation.organizer.name} · <span className="font-normal text-muted">{t(`organizer.roles.${invitation.role}`)}</span></span>
                <AcceptInvitationButton invitationId={invitation.id} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <section>
        <SectionHeader title={t('organizer.myOrganizations')} />
        {memberships.length === 0 ? (
          <EmptyState icon={Building2} title={t('organizer.noOrganizations')} text={t('eventForm.publishingFree')} action={<Link href="/organizer/new" className={buttonClasses()}>{t('organizer.createOrganization')}</Link>} />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {memberships.map(({ organizer, role }) => (
              <li key={organizer.id}>
                <Link href={`/organizer/${organizer.id}`} className="flex h-full items-center gap-4 rounded-xl border border-line bg-surface p-5 hover:bg-sunken">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary text-lg font-extrabold text-white">{organizer.name.slice(0, 1)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-semibold">{organizer.name}{organizer.verification_status === 'verified' ? <BadgeCheck className="h-4 w-4 text-info" aria-label={t('app.verifiedOrganizer')} /> : null}</span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      <Badge tone="secondary">{t(`organizer.roles.${role}`)}</Badge>
                      <Badge>{t(`organizer.kinds.${organizer.kind}`)}</Badge>
                      {organizer.is_demo ? <Badge tone="demo">{t('app.demoBadge')}</Badge> : null}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
