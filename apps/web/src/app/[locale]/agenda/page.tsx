import { listAgenda } from '@tamurt/api-client';
import {
  COUNTRIES,
  EVENT_CATEGORY_SLUGS,
  addDaysToKey,
  addMonthsToKey,
  getMonthBounds,
  getMonthGrid,
  getWeekKeys,
  getWeekdayLabels,
  groupByLocalDay,
  isCountryCode,
  isDateKey,
  localDaysRange,
  parseDateKey,
  toLocalDateKey,
  type CountryCode,
} from '@tamurt/core';
import type { AgendaOccurrence } from '@tamurt/types';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { categoryColor } from '@/components/events/category-icon';
import { CountryChips } from '@/components/search/country-chips';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { eventTime, intlLocale, nameOf } from '@/lib/format';
import { preferredCountry } from '@/lib/search';
import { pageMetadata } from '@/lib/seo';
import { getSupabase, getViewer } from '@/lib/session';
import { cn, firstParam } from '@/lib/utils';

type View = 'month' | 'week' | 'day' | 'list';
const VIEWS: View[] = ['month', 'week', 'day', 'list'];

export async function generateMetadata({ params, searchParams }: PageProps<'/[locale]/agenda'>): Promise<Metadata> {
  const locale = (await params).locale as AppLocale;
  const t = await getTranslations({ locale, namespace: 'agenda' });
  return pageMetadata({ locale, path: '/agenda', title: t('title'), description: t('subtitle'), noindex: Object.keys(await searchParams).length > 0 });
}

/**
 * Agenda public : mois / semaine / jour / liste. Les événements sont rangés par jour LOCAL de
 * chaque événement et affichés à son heure locale ; la semaine suit la convention du pays
 * (ex. Algérie : semaine du samedi, week-end vendredi-samedi).
 */
export default async function AgendaPage({ params, searchParams }: PageProps<'/[locale]/agenda'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const query = await searchParams;
  const t = await getTranslations();
  const country = await preferredCountry(firstParam(query.country));
  const config = COUNTRIES[(country ?? 'FR') as CountryCode];
  const requestedView = firstParam(query.view) as View | undefined;
  const view: View = requestedView && VIEWS.includes(requestedView) ? requestedView : 'month';
  const todayKey = toLocalDateKey(new Date(), config.defaultTimeZone);
  const anchorParam = firstParam(query.date);
  const anchor = anchorParam && isDateKey(anchorParam) ? anchorParam : todayKey;
  const category = firstParam(query.category);
  const categories = category && (EVENT_CATEGORY_SLUGS as readonly string[]).includes(category) ? [category] : undefined;
  const free = firstParam(query.free) === '1';
  const { year, month } = parseDateKey(anchor);
  const grid = getMonthGrid(year, month, config.week, todayKey);
  const weekKeys = getWeekKeys(anchor, config.week.firstDayOfWeek);

  const [firstKey, lastKey] =
    view === 'month' ? [grid[0]![0]!.key, grid[5]![6]!.key] : view === 'week' ? [weekKeys[0]!, weekKeys[6]!] : view === 'day' ? [anchor, anchor] : [getMonthBounds(year, month).firstKey, getMonthBounds(year, month).lastKey];
  const range = localDaysRange(firstKey, lastKey, config.defaultTimeZone);
  // Marge d'un jour de chaque côté : les fuseaux des événements peuvent différer de celui de référence.
  const occurrences = await listAgenda(await getSupabase(), {
    p_from: new Date(range.start.getTime() - 86_400_000).toISOString(),
    p_to: new Date(range.end.getTime() + 86_400_000).toISOString(),
    ...(country ? { p_country: country } : {}),
    ...(categories ? { p_categories: categories } : {}),
    ...(free ? { p_free: true } : {}),
    p_limit: 1000,
  }).catch(() => [] as AgendaOccurrence[]);
  const byDay = groupByLocalDay(occurrences);
  const viewer = await getViewer();

  const shift = (direction: -1 | 1) =>
    view === 'month' ? addMonthsToKey(anchor, direction) : view === 'week' ? addDaysToKey(anchor, 7 * direction) : view === 'day' ? addDaysToKey(anchor, direction) : addMonthsToKey(anchor, direction);
  const baseQuery: Record<string, string> = { view, ...(country ? { country } : { country: 'all' }), ...(categories ? { category: categories[0]! } : {}), ...(free ? { free: '1' } : {}) };
  const href = (extra: Record<string, string>) => ({ pathname: '/agenda', query: { ...baseQuery, ...extra } });
  const dayLabel = (key: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(intlLocale(locale, country), { ...options, timeZone: 'UTC' }).format(new Date(`${key}T12:00:00Z`));
  const periodLabel =
    view === 'month' || view === 'list'
      ? dayLabel(anchor, { month: 'long', year: 'numeric' })
      : view === 'week'
        ? `${dayLabel(weekKeys[0]!, { day: 'numeric', month: 'short' })} – ${dayLabel(weekKeys[6]!, { day: 'numeric', month: 'short', year: 'numeric' })}`
        : dayLabel(anchor, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const eventLine = (item: AgendaOccurrence, compact = false) => (
    <Link key={`${item.event_id}-${item.starts_at}`} href={`/events/${item.slug}`} className={cn('group flex items-start gap-1.5 rounded-md hover:bg-sunken', compact ? 'px-1 py-0.5 text-xs' : 'p-3 text-sm')}>
      <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(item.category_slug) }} aria-hidden />
      <span className="min-w-0">
        <span className="font-semibold tabular-nums text-primary">{eventTime(item.starts_at, item.timezone, locale, item.country_code)}</span>{' '}
        <span className={cn('font-medium', compact && 'line-clamp-2', item.status === 'cancelled' && 'line-through')}>{item.title}</span>
        {compact ? null : (
          <span className="block text-xs text-muted">
            {[item.venue_name, nameOf(item.city_names, locale)].filter(Boolean).join(' · ')} · {item.timezone}
            {item.is_demo ? <Badge tone="demo" className="ms-2">{t('app.demoBadge')}</Badge> : null}
            {item.is_free ? <Badge tone="success" className="ms-1">{t('common.free')}</Badge> : null}
          </span>
        )}
      </span>
    </Link>
  );

  return (
    <div className="container-page space-y-6 py-8">
      <PageHeader title={t('agenda.title')} subtitle={t('agenda.subtitle')} actions={viewer ? <Link href="/account/agenda" className={buttonClasses({ variant: 'outline' })}><CalendarDays className="h-4 w-4" aria-hidden />{t('agenda.myAgenda')}</Link> : null} />
      <CountryChips active={country} pathname="/agenda" extraQuery={{ view, date: anchor }} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={href({ date: shift(-1) })} className={buttonClasses({ variant: 'outline', size: 'icon' })} aria-label={t('agenda.previousPeriod')}><ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden /></Link>
          <Link href={href({ date: todayKey })} className={buttonClasses({ variant: 'outline', size: 'sm' })}>{t('agenda.today')}</Link>
          <Link href={href({ date: shift(1) })} className={buttonClasses({ variant: 'outline', size: 'icon' })} aria-label={t('agenda.nextPeriod')}><ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden /></Link>
          <h2 className="ms-2 font-display text-xl font-bold capitalize">{periodLabel}</h2>
        </div>
        <nav aria-label={t('agenda.title')} className="inline-flex rounded-full border border-line bg-surface p-1">
          {VIEWS.map((value) => (
            <Link key={value} href={{ pathname: '/agenda', query: { ...baseQuery, view: value, date: anchor } }} aria-current={value === view ? 'page' : undefined} className={cn('rounded-full px-3.5 py-1.5 text-sm font-semibold', value === view ? 'bg-fg text-bg' : 'text-muted hover:text-fg')}>
              {t(`agenda.${value}`)}
            </Link>
          ))}
        </nav>
      </div>
      <form method="get" action={`/${locale}/agenda`} className="flex flex-wrap items-center gap-2 text-sm">
        {Object.entries({ view, date: anchor, country: country ?? 'all' }).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
        <select name="category" defaultValue={categories?.[0] ?? ''} aria-label={t('search.category')} className="rounded-md border border-line-strong bg-surface px-3 py-1.5">
          <option value="">{t('common.all')}</option>
          {EVENT_CATEGORY_SLUGS.map((slug) => <option key={slug} value={slug}>{t(`categories.${slug}`)}</option>)}
        </select>
        <label className="flex items-center gap-1.5"><input type="checkbox" name="free" value="1" defaultChecked={free} className="accent-[var(--tm-primary)]" />{t('search.onlyFree')}</label>
        <button type="submit" className={buttonClasses({ size: 'sm', variant: 'soft' })}>{t('common.apply')}</button>
        <span className="text-xs text-subtle">{t('dates.localTimeCity', { timezone: country ? config.defaultTimeZone : '—' })}</span>
      </form>

      {view === 'month' ? (
        <div className="overflow-x-auto">
          <div className="grid min-w-[44rem] grid-cols-7 overflow-hidden rounded-xl border border-line bg-line [gap:1px]">
            {getWeekdayLabels(intlLocale(locale, country), config.week.firstDayOfWeek).map((label) => (
              <div key={label} className="bg-sunken px-2 py-2 text-center text-xs font-bold uppercase tracking-wide text-subtle">{label}</div>
            ))}
            {grid.flat().map((day) => {
              const items = byDay.get(day.key) ?? [];
              return (
                <div key={day.key} className={cn('min-h-28 bg-surface p-1.5', !day.inMonth && 'bg-surface/50 text-subtle', day.isWeekend && day.inMonth && 'bg-primary-soft/30')}>
                  <Link href={href({ view: 'day', date: day.key })} className={cn('mb-1 inline-grid h-7 w-7 place-items-center rounded-full text-sm font-semibold hover:bg-sunken', day.isToday && 'bg-primary text-on-primary hover:bg-primary-hover')}>{day.day}</Link>
                  <div className="space-y-0.5">{items.slice(0, 3).map((item) => eventLine(item, true))}</div>
                  {items.length > 3 ? <Link href={href({ view: 'day', date: day.key })} className="block px-1 text-xs font-semibold text-primary hover:underline">{t('agenda.moreEvents', { count: items.length - 3 })}</Link> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : view === 'week' ? (
        <div className="grid gap-3 md:grid-cols-7">
          {weekKeys.map((key) => {
            const items = byDay.get(key) ?? [];
            return (
              <section key={key} className={cn('rounded-xl border border-line bg-surface p-2', key === todayKey && 'border-primary')}>
                <h3 className="mb-2 px-1 text-sm font-bold capitalize"><Link href={href({ view: 'day', date: key })} className="hover:underline">{dayLabel(key, { weekday: 'short', day: 'numeric' })}</Link></h3>
                {items.length ? <div className="space-y-1">{items.map((item) => eventLine(item, true))}</div> : <p className="px-1 text-xs text-subtle">—</p>}
              </section>
            );
          })}
        </div>
      ) : (
        (() => {
          const keys = view === 'day' ? [anchor] : [...byDay.keys()].filter((key) => key >= firstKey && key <= lastKey).sort();
          const days = keys.filter((key) => (byDay.get(key) ?? []).length > 0);
          if (!days.length) return <EmptyState icon={CalendarDays} title={view === 'day' ? t('agenda.noEventsDay') : t('agenda.noEventsPeriod')} />;
          return (
            <ol className="space-y-6">
              {days.map((key) => (
                <li key={key}>
                  <h3 className="mb-2 font-display text-lg font-bold capitalize">{dayLabel(key, { weekday: 'long', day: 'numeric', month: 'long' })} <span className="text-sm font-normal text-muted">· {t('agenda.eventsCount', { count: byDay.get(key)!.length })}</span></h3>
                  <div className="divide-y divide-line rounded-xl border border-line bg-surface">{byDay.get(key)!.map((item) => eventLine(item))}</div>
                </li>
              ))}
            </ol>
          );
        })()
      )}
    </div>
  );
}
