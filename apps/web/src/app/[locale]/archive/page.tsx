import { parseSearchParams } from '@tamurt/core';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SearchView } from '@/components/search/search-view';
import { PageHeader } from '@/components/ui/page-header';
import type { AppLocale } from '@/i18n/routing';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]/archive'>): Promise<Metadata> {
  const locale = (await params).locale as AppLocale;
  const t = await getTranslations({ locale, namespace: 'search' });
  return pageMetadata({ locale, path: '/archive', title: t('pastEvents'), noindex: true });
}

/** Archives : événements passés (y compris archivés) consultables pour mémoire. */
export default async function ArchivePage({ params, searchParams }: PageProps<'/[locale]/archive'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations('search');
  const filters = parseSearchParams(await searchParams);
  return (
    <div className="container-page py-8">
      <PageHeader title={t('pastEvents')} />
      <SearchView filters={{ ...filters, date: undefined, from: undefined, to: undefined }} basePath="/archive" locale={locale} includePast />
    </div>
  );
}
