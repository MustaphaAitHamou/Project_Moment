import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { LEGAL_DOCS, LEGAL_UPDATED_AT, legalContent, type LegalDoc } from '@/content/legal';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { shortDate } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';
import { cn } from '@/lib/utils';

const TITLE_KEYS: Record<LegalDoc, 'terms' | 'privacy' | 'cookies' | 'legalNotice'> = { terms: 'terms', privacy: 'privacy', cookies: 'cookies', notice: 'legalNotice' };

export async function generateMetadata({ params }: PageProps<'/[locale]/legal/[doc]'>): Promise<Metadata> {
  const { locale, doc } = (await params) as { locale: AppLocale; doc: string };
  if (!LEGAL_DOCS.includes(doc as LegalDoc)) return {};
  const t = await getTranslations({ locale, namespace: 'legal' });
  return pageMetadata({ locale, path: `/legal/${doc}`, title: t(TITLE_KEYS[doc as LegalDoc]), noindex: true });
}

export default async function LegalPage({ params }: PageProps<'/[locale]/legal/[doc]'>) {
  const { locale, doc } = (await params) as { locale: AppLocale; doc: string };
  if (!LEGAL_DOCS.includes(doc as LegalDoc)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('legal');
  const content = legalContent(locale, doc as LegalDoc);
  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <nav aria-label={t('terms')} className="lg:sticky lg:top-24 lg:self-start">
        <ul className="flex flex-wrap gap-1 lg:flex-col">
          {LEGAL_DOCS.map((item) => (
            <li key={item}>
              <Link href={`/legal/${item}`} aria-current={item === doc ? 'page' : undefined} className={cn('block rounded-lg px-3.5 py-2 text-sm font-semibold', item === doc ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-sunken')}>{t(TITLE_KEYS[item])}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <article className="min-w-0 max-w-3xl space-y-6">
        <PageHeader title={t(TITLE_KEYS[doc as LegalDoc])} subtitle={t('lastUpdated', { date: shortDate(`${LEGAL_UPDATED_AT}T12:00:00Z`, locale) })} />
        <Alert tone="warning">{t('draftWarning')}</Alert>
        <div lang={content.lang} dir="ltr" className="prose-tm space-y-6">
          {content.sections.map((section) => (
            <section key={section.title} className="space-y-2">
              <h2 className="font-display text-xl font-bold">{section.title}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph.slice(0, 40)} className="text-fg">{paragraph}</p>)}
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
