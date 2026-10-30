import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { OrganizerForm } from '@/components/organizer/organizer-form';
import { VerificationForm } from '@/components/organizer/verification-form';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/page-header';
import type { AppLocale } from '@/i18n/routing';
import { requireViewer } from '@/lib/guards';
import { getMembership } from '@/lib/organizer';
import { getSupabase } from '@/lib/session';

export default async function OrganizationSettings({ params }: PageProps<'/[locale]/organizer/[orgId]/settings'>) {
  const { locale, orgId } = (await params) as { locale: AppLocale; orgId: string };
  setRequestLocale(locale);
  await requireViewer(locale, `/organizer/${orgId}/settings`);
  const membership = await getMembership(orgId);
  if (!membership) notFound();
  const t = await getTranslations();
  const { organizer } = membership;
  if (!membership.can('manage_organizer')) return <Alert tone="info">{t('common.accessDeniedText')}</Alert>;
  const { data: requests } = await (await getSupabase()).from('organizer_verification_requests').select('status, review_note, created_at').eq('organizer_id', orgId).order('created_at', { ascending: false }).limit(1);
  const lastRequest = requests?.[0];
  return (
    <div className="space-y-6">
      <Card>
        <SectionHeader title={t('organizer.settings')} />
        <OrganizerForm
          organizerId={orgId}
          initial={{
            name: organizer.name,
            kind: organizer.kind,
            bio: organizer.bio ?? undefined,
            websiteUrl: organizer.website_url ?? undefined,
            publicEmail: organizer.public_email ?? undefined,
            publicPhone: organizer.public_phone ?? undefined,
            countryCode: organizer.country_code as 'FR',
            cityId: organizer.city_id,
          }}
        />
      </Card>
      <Card>
        <SectionHeader title={t('organizer.verificationTitle')} />
        {organizer.verification_status === 'verified' ? (
          <Alert tone="success">{t('organizer.verification.verified')}</Alert>
        ) : lastRequest?.status === 'pending' ? (
          <Alert tone="info">{t('organizer.verificationRequested')}</Alert>
        ) : (
          <>
            {lastRequest?.status === 'rejected' ? <Alert tone="danger" className="mb-4">{t('organizer.verification.rejected')}{lastRequest.review_note ? ` — ${lastRequest.review_note}` : ''}</Alert> : null}
            <VerificationForm organizerId={orgId} />
          </>
        )}
      </Card>
    </div>
  );
}
