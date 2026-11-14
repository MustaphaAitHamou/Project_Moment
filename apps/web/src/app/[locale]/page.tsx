import { listCities } from '@tamurt/api-client';
import { EVENT_CATEGORY_SLUGS, type COUNTRIES, type EventSearchFilters } from '@tamurt/core';
import { ArrowRight, CalendarDays, Map as MapIcon, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CategoryIcon, categoryColor } from '@/components/events/category-icon';
import { EventGrid } from '@/components/events/event-card';
import { CountryChips } from '@/components/search/country-chips';
import { RememberCountry } from '@/components/search/remember-country';
import { SearchBox } from '@/components/search/search-box';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { nameOf } from '@/lib/format';
import { preferredCountry, safeSearch } from '@/lib/search';
import { pageMetadata } from '@/lib/seo';
import { getSupabase } from '@/lib/session';
import { firstParam } from '@/lib/utils';

export async function generateMetadata({ params }: PageProps<'/[locale]'>): Promise<Metadata> {
  const locale = (await params).locale as AppLocale;
  const t = await getTranslations({ locale, namespace: 'app' });
  return pageMetadata({ locale, path: '/', title: `${t('name')} — ${t('tagline')}`, description: t('description') });
}

export default async function HomePage({ params, searchParams }: PageProps<'/[locale]'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const query = await searchParams;
  const t = await getTranslations();
  const country = await preferredCountry(firstParam(query.country));
  const base: EventSearchFilters = { categories: [], sort: 'date', page: 1, ...(country ? { country } : {}) };

  const supabase = await getSupabase();
  const [weekend, popular, free, upcoming, cities] = await Promise.all([
    safeSearch({ ...base, date: 'weekend' }, locale, { pageSize: 6 }),
    safeSearch({ ...base, sort: 'popularity' }, locale, { pageSize: 6 }),
    safeSearch({ ...base, free: true }, locale, { pageSize: 3 }),
    safeSearch(base, locale, { pageSize: 9 }),
    listCities(supabase, country ?? undefined).catch(() => []),
  ]);
  const countryQuery: Record<string, string> = country ? { country } : {};

  const section = (title: string, data: { items: Parameters<typeof EventGrid>[0]['events'] }, href: { pathname: string; query: Record<string, string> }, priority = 0) => (
    <section className="container-page py-8">
      <SectionHeader
        title={title}
        action={
          <Link href={href} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
            {t('common.seeAll')} <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </Link>
        }
      />
      {data.items.length ? <EventGrid events={data.items} priorityCount={priority} /> : <EmptyState title={t('home.emptySection')} />}
    </section>
  );

  return (
    <>
      <RememberCountry country={country} />
      <section className="relative overflow-hidden bg-gradient-to-b from-secondary-soft via-bg to-bg">
        <div aria-hidden className="pointer-events-none absolute -end-24 -top-24 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -start-16 top-32 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="container-page relative space-y-6 py-12 sm:py-16">
          <h1 className="titre-neon max-w-3xl text-4xl leading-[1.15] sm:text-5xl lg:text-6xl">{t('home.heroTitle')}</h1>
          <p className="max-w-2xl text-lg text-muted">{t('home.heroSubtitle')}</p>
          <SearchBox size="lg" className="max-w-2xl" hidden={countryQuery} />
          <CountryChips active={country} />
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href={{ pathname: '/search', query: { ...countryQuery, date: 'today' } }} className={buttonClasses({ variant: 'outline', size: 'sm' })}>{t('home.today')}</Link>
            <Link href={{ pathname: '/search', query: { ...countryQuery, date: 'weekend' } }} className={buttonClasses({ variant: 'outline', size: 'sm' })}>{t('home.thisWeekend')}</Link>
            <Link href={{ pathname: '/search', query: { ...countryQuery, free: '1' } }} className={buttonClasses({ variant: 'outline', size: 'sm' })}>{t('home.free')}</Link>
            <Link href={{ pathname: '/search', query: { ...countryQuery, sort: 'popularity' } }} className={buttonClasses({ variant: 'outline', size: 'sm' })}>{t('home.popular')}</Link>
            <Link href="/agenda" className={buttonClasses({ variant: 'ghost', size: 'sm' })}><CalendarDays className="h-4 w-4" aria-hidden />{t('nav.agenda')}</Link>
            <Link href="/map" className={buttonClasses({ variant: 'ghost', size: 'sm' })}><MapIcon className="h-4 w-4" aria-hidden />{t('nav.map')}</Link>
          </div>
        </div>
        {/* Frise Events « égaliseur » sous le bandeau d'accueil (une par écran). */}
        <div className="frise" aria-hidden />
      </section>

      {section(t('home.thisWeekend'), weekend, { pathname: '/search', query: { ...countryQuery, date: 'weekend' } }, 3)}
      {section(t('home.popular'), popular, { pathname: '/search', query: { ...countryQuery, sort: 'popularity' } })}

      <section className="container-page py-8">
        <SectionHeader title={t('home.browseCategories')} />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {EVENT_CATEGORY_SLUGS.map((slug) => (
            <li key={slug}>
              <Link href={{ pathname: `/categories/${slug}`, query: countryQuery }} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3 font-semibold transition-colors hover:border-line-strong hover:bg-sunken">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-white" style={{ backgroundColor: categoryColor(slug) }}>
                  <CategoryIcon slug={slug} className="h-5 w-5" />
                </span>
                <span className="text-sm">{t(`categories.${slug}`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {section(t('home.free'), free, { pathname: '/search', query: { ...countryQuery, free: '1' } })}
      {section(t('home.upcoming'), upcoming, { pathname: '/search', query: countryQuery })}

      {cities.length ? (
        <section className="container-page py-8">
          <SectionHeader title={t('home.browseCities')} />
          <ul className="flex flex-wrap gap-2">
            {cities.map((city) => (
              <li key={city.id}>
                <Link href={`/countries/${city.country_code.toLowerCase()}/${city.slug}`} className="inline-flex rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-sunken">
                  {nameOf(city.names, locale)}
                  {country ? null : <span className="ms-1.5 text-subtle">· {t(`countries.${city.country_code as keyof typeof COUNTRIES}`)}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="container-page grid gap-5 py-8 md:grid-cols-2">
        {/* Bandeau de marque : du violet de nuit au magenta, texte blanc ≥ 5:1 (le rose vif reste aux grands titres). */}
        <div className="rounded-2xl bg-[linear-gradient(57deg,#5B21D6_0%,#C026A8_100%)] p-8 text-white">
          <h2 className="font-display text-2xl">{t('home.createCta')}</h2>
          <p className="mt-2 text-white">{t('home.createCtaText')}</p>
          <Link href="/organizer/events/new" className={buttonClasses({ className: 'mt-5' })}>{t('nav.create')}</Link>
        </div>
        <div className="rounded-2xl border border-line bg-accent-soft p-8">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><Sparkles className="h-6 w-6 text-primary" aria-hidden />{t('home.betaCta')}</h2>
          <p className="mt-2 text-muted">{t('home.betaCtaText')}</p>
          <Link href="/beta" className={buttonClasses({ variant: 'outline', className: 'mt-5' })}>{t('nav.beta')}</Link>
        </div>
      </section>
    </>
  );
}
