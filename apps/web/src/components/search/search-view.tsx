import { listCities } from '@tamurt/api-client';
import { COUNTRY_CODES, DATE_PRESETS, EVENT_CATEGORY_SLUGS, SEARCH_RADII_KM, countActiveFilters, serializeSearchParams, type EventSearchFilters } from '@tamurt/core';
import { ChevronLeft, ChevronRight, SearchX, SlidersHorizontal } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EventGrid } from '@/components/events/event-card';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert } from '@/components/ui/alert';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { nameOf } from '@/lib/format';
import { PAGE_SIZE, safeSearch } from '@/lib/search';
import { getSupabase } from '@/lib/session';
import { NearMeButton } from './near-me-button';

interface Locks {
  country?: boolean;
  category?: boolean;
  city?: boolean;
}

/** Résultats + filtres (formulaire GET : fonctionne sans JavaScript, URL partageable). */
export async function SearchView({ filters, basePath, locale, locks = {}, includePast = false }: { filters: EventSearchFilters; basePath: string; locale: AppLocale; locks?: Locks; includePast?: boolean }) {
  const t = await getTranslations();
  const supabase = await getSupabase();
  const [result, cities] = await Promise.all([
    safeSearch(filters, locale, { includePast, pageSize: PAGE_SIZE }),
    listCities(supabase, filters.country).catch(() => []),
  ]);
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const activeCount = countActiveFilters(filters) - (locks.country && filters.country ? 1 : 0) - (locks.category ? filters.categories.length : 0) - (locks.city && filters.city ? 1 : 0);
  const pageHref = (page: number) => ({ pathname: basePath, query: Object.fromEntries(serializeSearchParams({ ...filters, ...(locks.country ? { country: undefined } : {}), ...(locks.category ? { categories: [] } : {}), ...(locks.city ? { city: undefined } : {}), page })) });
  const baseQuery = Object.fromEntries(serializeSearchParams({ ...filters, page: 1 }));
  const sortOptions = ['date', 'popularity', ...(filters.q ? ['relevance'] : []), ...(filters.lat !== undefined ? ['distance'] : [])] as const;
  const sortLabel: Record<string, string> = { date: t('search.sortDate'), popularity: t('search.sortPopularity'), relevance: t('search.sortRelevance'), distance: t('search.sortDistance') };

  const form = (
    <form action={`/${locale}${basePath}`} method="get" className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="f-q" className="text-sm font-semibold">{t('common.search')}</label>
        <input id="f-q" name="q" type="search" defaultValue={filters.q} maxLength={120} placeholder={t('search.placeholder')} className="block w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25" />
      </div>
      {locks.country ? null : (
        <div className="space-y-1.5">
          <label htmlFor="f-country" className="text-sm font-semibold">{t('common.country')}</label>
          <select id="f-country" name="country" defaultValue={filters.country ?? ''} className="block w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm">
            <option value="">{t('common.allCountries')}</option>
            {COUNTRY_CODES.map((code) => <option key={code} value={code}>{t(`countries.${code}`)}</option>)}
          </select>
        </div>
      )}
      {locks.city ? null : (
        <div className="space-y-1.5">
          <label htmlFor="f-city" className="text-sm font-semibold">{t('common.city')}</label>
          <select id="f-city" name="city" defaultValue={filters.city ?? ''} className="block w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm">
            <option value="">{t('common.allCities')}</option>
            {cities.map((city) => <option key={city.id} value={city.id}>{nameOf(city.names, locale)}{filters.country ? '' : ` (${city.country_code})`}</option>)}
          </select>
        </div>
      )}
      {locks.category ? null : (
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">{t('search.category')}</legend>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 lg:grid-cols-1">
            {EVENT_CATEGORY_SLUGS.map((slug) => (
              <label key={slug} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="category" value={slug} defaultChecked={filters.categories.includes(slug)} className="h-4 w-4 accent-[var(--tm-primary)]" />
                {t(`categories.${slug}`)}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {includePast ? null : (
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">{t('search.dates')}</legend>
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="date" value="" defaultChecked={!filters.date} className="accent-[var(--tm-primary)]" />{t('dates.anyDate')}</label>
            {DATE_PRESETS.map((preset) => (
              <label key={preset} className="flex items-center gap-2 text-sm">
                <input type="radio" name="date" value={preset} defaultChecked={filters.date === preset} className="accent-[var(--tm-primary)]" />
                {t(`dates.${preset}`)}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <label className="space-y-1 text-xs text-muted">{t('dates.from')}<input type="date" name="from" defaultValue={filters.from} className="block w-full rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-fg" /></label>
            <label className="space-y-1 text-xs text-muted">{t('dates.to')}<input type="date" name="to" defaultValue={filters.to} className="block w-full rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-fg" /></label>
          </div>
        </fieldset>
      )}
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="free" value="1" defaultChecked={filters.free} className="h-4 w-4 accent-[var(--tm-primary)]" />
        {t('search.onlyFree')}
      </label>
      {filters.lat !== undefined && filters.lng !== undefined ? (
        <div className="space-y-1.5">
          <input type="hidden" name="lat" value={filters.lat.toFixed(2)} />
          <input type="hidden" name="lng" value={filters.lng.toFixed(2)} />
          <label htmlFor="f-radius" className="text-sm font-semibold">{t('search.distance')}</label>
          <select id="f-radius" name="radius" defaultValue={String(filters.radiusKm ?? 25)} className="block w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm">
            {SEARCH_RADII_KM.map((radius) => <option key={radius} value={radius}>{t('search.radius', { radius: t('common.km', { value: radius }) })}</option>)}
          </select>
        </div>
      ) : null}
      <div className="space-y-1.5">
        <label htmlFor="f-sort" className="text-sm font-semibold">{t('search.sort')}</label>
        <select id="f-sort" name="sort" defaultValue={filters.sort} className="block w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm">
          {sortOptions.map((value) => <option key={value} value={value}>{sortLabel[value]}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" className={buttonClasses({ className: 'flex-1' })}>{t('common.apply')}</button>
        <Link href={basePath} className={buttonClasses({ variant: 'ghost' })}>{t('common.reset')}</Link>
      </div>
      <NearMeButton query={baseQuery} />
    </form>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <details className="rounded-xl border border-line bg-surface p-4 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            {t('common.filters')}
            {activeCount > 0 ? <span className="rounded-full bg-primary px-2 text-xs text-on-primary">{activeCount}</span> : null}
          </summary>
          <div className="pt-4">{form}</div>
        </details>
        <div className="hidden rounded-xl border border-line bg-surface p-5 lg:block">{form}</div>
      </aside>
      <section aria-live="polite" className="min-w-0 space-y-5">
        <p className="text-sm font-semibold text-muted">{t('search.results', { count: result.total })}</p>
        {'failed' in result ? <Alert tone="danger">{t('common.unknownError')}</Alert> : null}
        {result.items.length ? (
          <EventGrid events={result.items} priorityCount={3} />
        ) : (
          <EmptyState icon={SearchX} title={t('search.noResults')} text={t('search.noResultsHint')} action={<Link href={basePath} className={buttonClasses({ variant: 'outline' })}>{t('search.clearFilters')}</Link>} />
        )}
        {totalPages > 1 ? (
          <nav aria-label={t('common.page', { page: filters.page })} className="flex items-center justify-center gap-2 pt-4">
            {filters.page > 1 ? (
              <Link href={pageHref(filters.page - 1)} className={buttonClasses({ variant: 'outline', size: 'sm' })} rel="prev">
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />{t('common.previous')}
              </Link>
            ) : null}
            <span className="px-3 text-sm text-muted">{filters.page} / {totalPages}</span>
            {filters.page < totalPages ? (
              <Link href={pageHref(filters.page + 1)} className={buttonClasses({ variant: 'outline', size: 'sm' })} rel="next">
                {t('common.next')}<ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
