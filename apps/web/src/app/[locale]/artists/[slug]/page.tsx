import { getArtistBySlug } from '@tamurt/api-client';
import { Globe } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { EventGrid } from '@/components/events/event-card';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import type { AppLocale } from '@/i18n/routing';
import { safeSearch } from '@/lib/search';
import { pageMetadata } from '@/lib/seo';
import { getSupabase } from '@/lib/session';

const loadArtist = cache(async (slug: string) => getArtistBySlug(await getSupabase(), slug));

export async function generateMetadata({ params }: PageProps<'/[locale]/artists/[slug]'>): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: AppLocale; slug: string };
  const artist = await loadArtist(slug).catch(() => null);
  if (!artist) return { robots: { index: false } };
  return pageMetadata({ locale, path: `/artists/${slug}`, title: artist.name, description: artist.bio?.slice(0, 160) ?? undefined, noindex: artist.is_demo });
}

export default async function ArtistPage({ params }: PageProps<'/[locale]/artists/[slug]'>) {
  const { locale, slug } = (await params) as { locale: AppLocale; slug: string };
  setRequestLocale(locale);
  const artist = await loadArtist(slug);
  if (!artist) notFound();
  const t = await getTranslations();
  const [upcoming, history] = await Promise.all([
    safeSearch({ categories: [], sort: 'date', page: 1 }, locale, { artistId: artist.id, pageSize: 12 }),
    safeSearch({ categories: [], sort: 'date', page: 1 }, locale, { artistId: artist.id, includePast: true, pageSize: 12 }),
  ]);
  const past = history.items.filter((item) => new Date(item.endsAt ?? item.startsAt) < new Date());
  return (
    <div className="container-page space-y-10 py-8">
      {artist.is_demo ? <Alert tone="demo">{t('event.demoBanner')}</Alert> : null}
      <PageHeader eyebrow={t('artist.title')} title={artist.name} subtitle={artist.bio ?? undefined} />
      {artist.website_url ? (
        <a href={artist.website_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <Globe className="h-4 w-4" aria-hidden />{new URL(artist.website_url).host}
        </a>
      ) : null}
      <section>
        <SectionHeader title={t('artist.upcomingEvents')} />
        {upcoming.items.length ? <EventGrid events={upcoming.items} /> : <EmptyState title={t('organizer.noUpcoming')} />}
      </section>
      {past.length ? (
        <section>
          <SectionHeader title={t('artist.pastEvents')} />
          <EventGrid events={past} />
        </section>
      ) : null}
    </div>
  );
}
