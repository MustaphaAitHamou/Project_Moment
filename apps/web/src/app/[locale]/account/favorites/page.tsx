import { listFavorites } from '@tamurt/api-client';
import { Heart } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EventGrid } from '@/components/events/event-card';
import { coverUrlFor, type EventCardData } from '@/components/events/event-data';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { nameOf } from '@/lib/format';
import { requireViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';

export default async function FavoritesPage({ params }: PageProps<'/[locale]/account/favorites'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  await requireViewer(locale, '/account/favorites');
  const t = await getTranslations();
  const rows = await listFavorites(await getSupabase());
  const now = Date.now();
  const cards: EventCardData[] = rows.map(({ event }) => ({
    id: event.id,
    slug: event.slug,
    title: event.title,
    categorySlug: event.category_slug,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    timezone: event.timezone,
    countryCode: null,
    cityName: nameOf(event.city?.names, locale) || null,
    venueName: event.venue?.name ?? null,
    isFree: event.is_free,
    priceMinMinor: null,
    priceMaxMinor: null,
    currency: null,
    isDemo: event.is_demo,
    isSponsored: false,
    organizerName: null,
    organizerVerified: false,
    coverUrl: event.cover_status === 'approved' ? coverUrlFor(event.cover_path) : null,
    status: event.status,
    distanceKm: null,
  }));
  const upcoming = cards.filter((card) => new Date(card.endsAt ?? card.startsAt).getTime() >= now).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = cards.filter((card) => new Date(card.endsAt ?? card.startsAt).getTime() < now);
  return (
    <>
      <PageHeader title={t('favorites.title')} />
      {cards.length === 0 ? (
        <EmptyState icon={Heart} title={t('favorites.empty')} text={t('favorites.emptyHint')} action={<Link href="/search" className={buttonClasses()}>{t('nav.discover')}</Link>} />
      ) : (
        <>
          <section>
            <SectionHeader title={t('favorites.upcoming')} />
            {upcoming.length ? <EventGrid events={upcoming} /> : <p className="text-sm text-muted">{t('common.empty')}</p>}
          </section>
          {past.length ? (
            <section>
              <SectionHeader title={t('favorites.past')} />
              <EventGrid events={past} />
            </section>
          ) : null}
        </>
      )}
    </>
  );
}
