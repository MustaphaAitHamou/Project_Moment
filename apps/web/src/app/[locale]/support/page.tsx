import { LifeBuoy, Mail, MessageSquare } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { supportEmail } from '@/lib/env';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]/support'>): Promise<Metadata> {
  const locale = (await params).locale as AppLocale;
  const t = await getTranslations({ locale, namespace: 'support' });
  return pageMetadata({ locale, path: '/support', title: t('title'), description: t('subtitle') });
}

export default async function SupportPage({ params }: PageProps<'/[locale]/support'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations();
  const faq = [1, 2, 3, 4, 5] as const;
  return (
    <div className="container-page max-w-4xl space-y-8 py-8">
      <PageHeader eyebrow={<span className="inline-flex items-center gap-1.5"><LifeBuoy className="h-4 w-4" aria-hidden />{t('nav.support')}</span>} title={t('support.title')} subtitle={t('support.subtitle')} />
      <section>
        <SectionHeader title={t('support.faqTitle')} />
        <div className="divide-y divide-line rounded-xl border border-line bg-surface">
          {faq.map((n) => (
            <details key={n} className="group p-4">
              <summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">
                <span className="me-2 inline-block text-primary transition-transform group-open:rotate-90 rtl:group-open:-rotate-90" aria-hidden>›</span>
                {t(`support.faq.q${n}`)}
              </summary>
              <p className="mt-2 text-muted">{t(`support.faq.a${n}`)}</p>
            </details>
          ))}
        </div>
      </section>
      <Card className="space-y-3">
        <h2 className="font-display text-xl font-bold">{t('support.contactTitle')}</h2>
        <p className="text-muted">{t('support.contactText')}</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/account/beta" className={buttonClasses({ variant: 'outline' })}><MessageSquare className="h-4 w-4" aria-hidden />{t('beta.feedbackTitle')}</Link>
          {supportEmail ? <a href={`mailto:${supportEmail}`} className={buttonClasses({ variant: 'ghost' })}><Mail className="h-4 w-4" aria-hidden />{t('support.contactEmail', { email: supportEmail })}</a> : null}
        </div>
      </Card>
    </div>
  );
}
