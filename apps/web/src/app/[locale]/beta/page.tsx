import { beta } from '@tamurt/server';
import { CircleCheck, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { WaitlistForm } from '@/components/beta/waitlist-form';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { pageMetadata } from '@/lib/seo';
import { getServerContext } from '@/lib/server-context';
import { getViewer } from '@/lib/session';

export async function generateMetadata({ params }: PageProps<'/[locale]/beta'>): Promise<Metadata> {
  const locale = (await params).locale as AppLocale;
  const t = await getTranslations({ locale, namespace: 'beta' });
  return pageMetadata({ locale, path: '/beta', title: t('title'), description: t('subtitle') });
}

export default async function BetaPage({ params }: PageProps<'/[locale]/beta'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations();
  const [info, viewer] = await Promise.all([beta.publicBetaInfo(getServerContext()).catch(() => null), getViewer()]);
  const isTester = Boolean(viewer?.roles.includes('beta_tester'));
  return (
    <div className="container-page space-y-10 py-10">
      <section className="grid items-center gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-warning"><Sparkles className="h-4 w-4" aria-hidden />{t('app.betaBadge')}</p>
          <h1 className="font-display text-4xl font-extrabold sm:text-5xl">{t('beta.title')}</h1>
          <p className="text-lg text-muted">{t('beta.subtitle')}</p>
          {info && info.seatsTotal > 0 ? <p className="font-semibold">{t('beta.seats', { used: info.seatsUsed, total: info.seatsTotal })}</p> : null}
          {info?.mode === 'closed' ? <p className="text-sm text-muted">{t('beta.closedBetaNotice')}</p> : null}
          <div className="flex flex-wrap gap-2">
            {isTester ? <Link href="/account/beta" className={buttonClasses()}>{t('beta.testerArea')}</Link> : <Link href="/beta/redeem" className={buttonClasses({ variant: 'outline' })}>{t('beta.redeemTitle')}</Link>}
          </div>
        </div>
        <Card>
          <h2 className="mb-4 font-display text-xl font-bold">{t('beta.howItWorks')}</h2>
          <ol className="space-y-3">
            {(['join', 'verify', 'invite', 'test'] as const).map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-on-primary">{index + 1}</span>
                <span className="pt-1">{t(`beta.steps.${step}`)}</span>
              </li>
            ))}
          </ol>
        </Card>
      </section>
      {isTester ? (
        <Card className="flex items-center gap-3"><CircleCheck className="h-6 w-6 text-success" aria-hidden />{t('beta.testerWelcome')}</Card>
      ) : (
        <Card className="mx-auto max-w-3xl">
          <h2 className="mb-5 font-display text-2xl font-bold">{t('beta.joinTitle')}</h2>
          <WaitlistForm />
        </Card>
      )}
    </div>
  );
}
