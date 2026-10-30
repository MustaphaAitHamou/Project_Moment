import { listCities, listRegions } from '@tamurt/api-client';
import { isCountryCode, parseSearchParams } from '@tamurt/core';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { COUNTRY_FLAGS } from '@/components/search/country-chips';
import { RememberCountry } from '@/components/search/remember-country';
import { SearchView } from '@/components/search/search-view';
import { PageHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { nameOf } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';
import { getSupabase } from '@/lib/session';

export async function generateMetadata({ params, searchParams }: PageProps<'/[locale]/countries/[country]'>): Promise<Metadata> {
  const { locale, country } = (await params) as { locale: AppLocale; country: string };
  const code = country.toUpperCase();
  if (!isCountryCode(code)) return {};
  const t = await getTranslations({ locale });
  return pageMetadata({ locale, path: `/countries/${country}`, title: t(`countries.${code}`), description: t('app.description'), noindex: Object.keys(await searchParams).length > 0 });
}

export default async function CountryPage({ params, searchParams }: PageProps<'/[locale]/countries/[country]'>) {
  const { locale, country } = (await params) as { locale: AppLocale; country: string };
  const code = country.toUpperCase();
  if (!isCountryCode(code) || country !== country.toLowerCase()) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  const supabase = await getSupabase();
  const [cities, regions] = await Promise.all([listCities(supabase, code).catch(() => []), listRegions(supabase, code).catch(() => [])]);
  const filters = { ...parseSearchParams(await searchParams), country: code };
  return (
    <div className="container-page py-8">
      <RememberCountry country={code} />
      <PageHeader eyebrow={t('nav.countries')} title={<><span aria-hidden>{COUNTRY_FLAGS[code]} </span>{t(`countries.${code}`)}</>} />
      <nav aria-label={t('nav.cities')} className="mb-8 flex flex-wrap gap-2">
        {cities.map((city) => (
          <Link key={city.id} href={`/countries/${country}/${city.slug}`} className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-medium hover:bg-sunken">
            {nameOf(city.names, locale)}
          </Link>
        ))}
        {regions.length ? <span className="self-center ps-2 text-xs text-subtle">{regions.length} {t(`regionTypes.${regions[0]!.type as 'region'}`).toLowerCase()}</span> : null}
      </nav>
      <SearchView filters={filters} basePath={`/countries/${country}`} locale={locale} locks={{ country: true }} />
    </div>
  );
}
