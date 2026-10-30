import { beta } from '@tamurt/server';
import { Globe, Smartphone } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FeedbackForm } from '@/components/beta/feedback-form';
import { RedeemForm } from '@/components/beta/redeem-form';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import type { AppLocale } from '@/i18n/routing';
import { dateTimeShort } from '@/lib/format';
import { requireViewer } from '@/lib/guards';
import { getServerContext } from '@/lib/server-context';
import { getSupabase } from '@/lib/session';

export default async function TesterAreaPage({ params }: PageProps<'/[locale]/account/beta'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, '/account/beta');
  const t = await getTranslations();
  const isTester = viewer.roles.includes('beta_tester') || viewer.isStaff;
  if (!isTester) {
    return (
      <>
        <PageHeader title={t('beta.testerArea')} subtitle={t('beta.notTester')} />
        <Card><RedeemForm /></Card>
      </>
    );
  }
  const [info, feedback] = await Promise.all([
    beta.publicBetaInfo(getServerContext()).catch(() => null),
    (await getSupabase()).from('beta_feedback').select('id, kind, title, rating, status, created_at').eq('user_id', viewer.id).order('created_at', { ascending: false }).limit(50),
  ]);
  const download = (label: string, url: string | null | undefined) => (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-line p-3">
      <span className="flex items-center gap-2 font-semibold"><Smartphone className="h-5 w-5 text-primary" aria-hidden />{label}</span>
      {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline">{t('common.continue')}</a> : <span className="text-sm text-subtle">{t('beta.linkNotAvailable')}</span>}
    </li>
  );
  return (
    <>
      <PageHeader title={t('beta.testerArea')} subtitle={t('beta.testerWelcome')} />
      <Card>
        <SectionHeader title={t('beta.downloads')} />
        <ul className="space-y-2">
          {download(t('beta.testflight'), info?.testflightUrl)}
          {download(t('beta.playTesting'), info?.playTestingUrl)}
          <li className="flex items-center gap-2 rounded-lg border border-line p-3 font-semibold"><Globe className="h-5 w-5 text-primary" aria-hidden />{t('beta.webAccess')}</li>
        </ul>
      </Card>
      <Card>
        <SectionHeader title={t('beta.feedbackTitle')} />
        <FeedbackForm />
      </Card>
      <section>
        <SectionHeader title={t('beta.myFeedback')} />
        {feedback.data?.length ? (
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {feedback.data.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2 p-4 text-sm">
                <Badge tone="secondary">{t(`beta.feedbackKinds.${item.kind}` as 'beta.feedbackKinds.bug')}</Badge>
                <span className="min-w-0 flex-1 truncate font-semibold">{item.title ?? (item.rating ? '★'.repeat(item.rating) : '—')}</span>
                <Badge>{t(`beta.feedbackStatus.${item.status}` as 'beta.feedbackStatus.new')}</Badge>
                <span className="text-xs text-subtle">{dateTimeShort(item.created_at, locale)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t('common.empty')}</p>
        )}
      </section>
    </>
  );
}
