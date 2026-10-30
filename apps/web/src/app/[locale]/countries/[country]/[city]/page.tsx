import { isCountryCode, parseSearchParams } from '@tamurt/core';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { FollowCityButton } from '@/components/account/follow-city-button';
import { SearchView } from '@/components/search/search-view';
import { PageHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { nameOf } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';
import { getSupabase, getViewer } from '@/lib/session';

const loadCity = cache(async (country: string, slug: string) => {
  const supabase = await getSupabase();
  const { data } = await supabase.from('cities').select('id, slug, names, country_code, timezone').eq('country_code', country).eq('slug', slug).maybeSingle();
  return data;
});

export async function generateMetadata({ params, searchParams }: PageProps<'/[locale]/countries/[country]/[city]'>): Promise<Metadata> {
  const { locale, country, city } = (await params) as { locale: AppLocale; country: string; city: string };
  const code = country.toUpperCase();
  if (!isCountryCode(code)) return {};
  const row = await loadCity(code, city);
  if (!row) return {};
  const t = await getTranslations({ locale });
  return pageMetadata({ locale, path: `/countries/${country}/${city}`, title: `${nameOf(row.names, locale)} — ${t(`countries.${code}`)}`, description: t('app.description'), noindex: Object.keys(await searchParams).length > 0 });
}

export default async function CityPage({ params, searchParams }: PageProps<'/[locale]/countries/[country]/[city]'>) {
  const { locale, country, city } = (await params) as { locale: AppLocale; country: string; city: string };
  const code = country.toUpperCase();
  if (!isCountryCode(code)) notFound();
  const row = await loadCity(code, city);
  if (!row) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  const viewer = await getViewer();
  let following = false;
  if (viewer) {
    const { count } = await (await getSupabase()).from('user_followed_cities').select('city_id', { count: 'exact', head: true }).eq('city_id', row.id);
    following = (count ?? 0) > 0;
  }
  const filters = { ...parseSearchParams(await searchParams), country: code, city: row.id };
  return (
    <div className="container-page py-8">
      <PageHeader
        eyebrow={<Link href={`/countries/${country}`} className="hover:underline">{t(`countries.${code}`)}</Link>}
        title={nameOf(row.names, locale)}
        subtitle={t('dates.localTimeCity', { timezone: row.timezone })}
        actions={<FollowCityButton cityId={row.id} initial={following} signedIn={Boolean(viewer)} returnTo={`/countries/${country}/${city}`} />}
      />
      <SearchView filters={filters} basePath={`/countries/${country}/${city}`} locale={locale} locks={{ country: true, city: true }} />
    </div>
  );
}
