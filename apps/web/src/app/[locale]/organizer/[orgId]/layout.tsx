import { BadgeCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { OrganizerTabs } from '@/components/organizer/organizer-tabs';
import { Badge } from '@/components/ui/badge';
import { getMembership } from '@/lib/organizer';
import { getViewer } from '@/lib/session';

export default async function OrganizationLayout({ children, params }: LayoutProps<'/[locale]/organizer/[orgId]'>) {
  const { orgId } = await params;
  if (!(await getViewer())) return children;
  const membership = await getMembership(orgId);
  if (!membership) notFound();
  const t = await getTranslations();
  const { organizer, role } = membership;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="me-2 font-display text-2xl font-extrabold sm:text-3xl">{organizer.name}</h1>
        {organizer.verification_status === 'verified' ? <Badge tone="info"><BadgeCheck className="h-3.5 w-3.5" aria-hidden />{t('organizer.verification.verified')}</Badge> : <Badge>{t(`organizer.verification.${organizer.verification_status}`)}</Badge>}
        <Badge tone="secondary">{t(`organizer.roles.${role}`)}</Badge>
        {organizer.is_demo ? <Badge tone="demo">{t('app.demoBadge')}</Badge> : null}
      </div>
      <OrganizerTabs organizerId={organizer.id} />
      {children}
    </>
  );
}
