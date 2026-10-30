import { BadgeCheck, MapPin } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { eventDateTime, money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { CategoryIcon, categoryColor } from './category-icon';
import type { EventCardData } from './event-data';
import { EventPoster } from './event-poster';

export function usePriceLabel() {
  const t = useTranslations('common');
  const locale = useLocale() as AppLocale;
  return (event: Pick<EventCardData, 'isFree' | 'priceMinMinor' | 'priceMaxMinor' | 'currency' | 'countryCode'>) => {
    if (event.isFree) return t('free');
    if (event.priceMinMinor === null || !event.currency) return null;
    const min = money(event.priceMinMinor, event.currency, locale, event.countryCode);
    if (event.priceMaxMinor !== null && event.priceMaxMinor !== event.priceMinMinor) {
      return t('fromPrice', { price: min });
    }
    return min;
  };
}

/** Carte d'événement (utilisable côté serveur et client). */
export function EventCard({ event, priority, className }: { event: EventCardData; priority?: boolean; className?: string }) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const priceLabel = usePriceLabel()(event);
  const cancelled = event.status === 'cancelled';
  return (
    <article className={cn('group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-sm transition-shadow hover:shadow-md', className)}>
      <EventPoster slug={event.slug} category={event.categorySlug} coverUrl={event.coverUrl} alt={event.title} className="aspect-[4/3]" priority={priority} />
      <div className="absolute start-3 top-3 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white shadow-sm" style={{ backgroundColor: categoryColor(event.categorySlug) }}>
          <CategoryIcon slug={event.categorySlug} className="h-3.5 w-3.5" />
          {t(`categories.${event.categorySlug}` as 'categories.other')}
        </span>
        {event.isDemo ? <Badge tone="demo" className="shadow-sm">{t('app.demoBadge')}</Badge> : null}
        {event.isSponsored ? <Badge tone="accent" className="shadow-sm">{t('app.sponsored')}</Badge> : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className={cn('text-sm font-semibold', cancelled ? 'text-danger' : 'text-primary')}>
          {cancelled ? t('event.cancelledBanner') : eventDateTime(event.startsAt, event.timezone, locale, event.countryCode, { weekday: 'short', month: 'short' })}
        </p>
        <h3 className="font-display text-lg font-bold leading-snug">
          <Link href={`/events/${event.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            <span className={cn(cancelled && 'line-through decoration-2')}>{event.title}</span>
          </Link>
        </h3>
        {event.venueName || event.cityName ? (
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{[event.venueName, event.cityName].filter(Boolean).join(' · ')}</span>
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-sm">
          {event.organizerName ? (
            <span className="flex min-w-0 items-center gap-1 text-subtle">
              <span className="truncate">{event.organizerName}</span>
              {event.organizerVerified ? <BadgeCheck className="h-4 w-4 shrink-0 text-info" aria-label={t('app.verifiedOrganizer')} /> : null}
            </span>
          ) : <span />}
          {priceLabel ? <span className={cn('shrink-0 font-bold', event.isFree ? 'text-success' : 'text-fg')}>{priceLabel}</span> : null}
        </div>
      </div>
    </article>
  );
}

export function EventGrid({ events, priorityCount = 0 }: { events: EventCardData[]; priorityCount?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event, index) => (
        <EventCard key={event.id} event={event} priority={index < priorityCount} />
      ))}
    </div>
  );
}
