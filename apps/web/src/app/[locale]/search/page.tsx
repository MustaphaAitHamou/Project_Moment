import { parseSearchParams } from '@tamurt/core';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SearchView } from '@/components/search/search-view';
import { PageHeader } from '@/components/ui/page-header';
import type { AppLocale } from '@/i18n/routing';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params, searchParams }: PageProps<'/[locale]/search'>): Promise<Metadata> {
  const locale = (await params).locale as AppLocale;
  const t = await getTranslations({ locale, namespace: 'search' });
  const hasFilters = Object.keys(await searchParams).length > 0;
  // Les combinaisons de filtres ne sont pas indexées (contenu dupliqué) ; la page nue l'est.
  return pageMetadata({ locale, path: '/search', title: t('title'), noindex: hasFilters });
}

export default async function SearchPage({ params, searchParams }: PageProps<'/[locale]/search'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations('search');
  const filters = parseSearchParams(await searchParams);
  return (
    <div className="container-page py-8">
      <PageHeader title={filters.q ? `« ${filters.q} »` : t('title')} />
      <SearchView filters={filters} basePath="/search" locale={locale} />
    </div>
  );
}
