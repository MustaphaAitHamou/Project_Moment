import { getTranslations, setRequestLocale } from 'next-intl/server';
import { OrganizerForm } from '@/components/organizer/organizer-form';
import { Alert } from '@/components/ui/alert';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { requireViewer } from '@/lib/guards';

export default async function NewOrganizerPage({ params }: PageProps<'/[locale]/organizer/new'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, '/organizer/new');
  const t = await getTranslations();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t('organizer.createTitle')} subtitle={t('organizer.createHelp')} />
      {viewer.hasAppAccess ? (
        <Card><OrganizerForm initial={{ name: '', kind: 'individual', countryCode: 'FR', cityId: null }} /></Card>
      ) : (
        <Alert tone="info" title={t('common.requiresBeta')} action={<Link href="/beta" className={buttonClasses({ size: 'sm' })}>{t('nav.beta')}</Link>} />
      )}
    </div>
  );
}
