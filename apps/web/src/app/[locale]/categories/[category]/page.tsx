import { EVENT_CATEGORY_SLUGS, parseSearchParams, type EventCategorySlug } from '@tamurt/core';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { CategoryIcon, categoryColor } from '@/components/events/category-icon';
import { SearchView } from '@/components/search/search-view';
import { PageHeader } from '@/components/ui/page-header';
import type { AppLocale } from '@/i18n/routing';
import { pageMetadata } from '@/lib/seo';

function isCategory(value: string): value is EventCategorySlug {
  return (EVENT_CATEGORY_SLUGS as readonly string[]).includes(value);
}

export async function generateMetadata({ params, searchParams }: PageProps<'/[locale]/categories/[category]'>): Promise<Metadata> {
  const { locale, category } = (await params) as { locale: AppLocale; category: string };
  if (!isCategory(category)) return {};
  const t = await getTranslations({ locale });
  return pageMetadata({ locale, path: `/categories/${category}`, title: t(`categories.${category}`), description: t('app.description'), noindex: Object.keys(await searchParams).length > 0 });
}

export default async function CategoryPage({ params, searchParams }: PageProps<'/[locale]/categories/[category]'>) {
  const { locale, category } = (await params) as { locale: AppLocale; category: string };
  if (!isCategory(category)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  const filters = { ...parseSearchParams(await searchParams), categories: [category] };
  return (
    <div className="container-page py-8">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-md text-white" style={{ backgroundColor: categoryColor(category) }}><CategoryIcon slug={category} className="h-4 w-4" /></span>{t('nav.categories')}</span>}
        title={t(`categories.${category}`)}
      />
      <SearchView filters={filters} basePath={`/categories/${category}`} locale={locale} locks={{ category: true }} />
    </div>
  );
}
