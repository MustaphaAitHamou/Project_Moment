import { getOrganizerBySlug, publicStorageUrl } from '@tamurt/api-client';
import { BadgeCheck, Globe, Mail, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { EventGrid } from '@/components/events/event-card';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/page-header';
import type { AppLocale } from '@/i18n/routing';
import { nameOf } from '@/lib/format';
import { safeSearch } from '@/lib/search';
import { pageMetadata } from '@/lib/seo';
import { getSupabase } from '@/lib/session';

const loadOrganizer = cache(async (slug: string) => getOrganizerBySlug(await getSupabase(), slug));

export async function generateMetadata({ params }: PageProps<'/[locale]/organizers/[slug]'>): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: AppLocale; slug: string };
  const organizer = await loadOrganizer(slug).catch(() => null);
  if (!organizer) return { robots: { index: false } };
  return pageMetadata({ locale, path: `/organizers/${slug}`, title: organizer.name, description: organizer.bio?.slice(0, 160) ?? undefined, noindex: organizer.is_demo });
}

export default async function OrganizerPage({ params }: PageProps<'/[locale]/organizers/[slug]'>) {
  const { locale, slug } = (await params) as { locale: AppLocale; slug: string };
  setRequestLocale(locale);
  const organizer = await loadOrganizer(slug);
  if (!organizer) notFound();
  const t = await getTranslations();
  const [upcoming, past] = await Promise.all([
    safeSearch({ categories: [], sort: 'date', page: 1 }, locale, { organizerId: organizer.id, pageSize: 12 }),
    safeSearch({ categories: [], sort: 'date', page: 1 }, locale, { organizerId: organizer.id, includePast: true, pageSize: 12 }),
  ]);
  const pastItems = past.items.filter((item) => new Date(item.endsAt ?? item.startsAt) < new Date());
  const logo = process.env.NEXT_PUBLIC_SUPABASE_URL ? publicStorageUrl(process.env.NEXT_PUBLIC_SUPABASE_URL, 'organizer-media', organizer.logo_path) : null;

  return (
    <div className="container-page space-y-10 py-8">
      {organizer.is_demo ? <Alert tone="demo">{t('event.demoBanner')}</Alert> : null}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-secondary text-3xl font-extrabold text-white">
          {logo ? <Image src={logo} alt="" fill sizes="96px" className="object-cover" /> : organizer.name.slice(0, 1)}
        </div>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge tone="secondary">{t(`organizer.kinds.${organizer.kind}`)}</Badge>
            {organizer.verification_status === 'verified' ? <Badge tone="info"><BadgeCheck className="h-3.5 w-3.5" aria-hidden />{t('organizer.verification.verified')}</Badge> : null}
            {organizer.is_demo ? <Badge tone="demo">{t('app.demoBadge')}</Badge> : null}
          </div>
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{organizer.name}</h1>
          {organizer.city ? <p className="text-muted">{nameOf(organizer.city.names, locale)} · {t(`countries.${organizer.country_code as 'FR'}`)}</p> : null}
        </div>
      </header>
      {organizer.bio ? <p className="prose-tm max-w-3xl whitespace-pre-line text-fg">{organizer.bio}</p> : null}
      {organizer.website_url || organizer.public_email || organizer.public_phone ? (
        <div className="flex flex-wrap gap-4 text-sm font-semibold">
          {organizer.website_url ? <a href={organizer.website_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 text-primary hover:underline"><Globe className="h-4 w-4" aria-hidden />{new URL(organizer.website_url).host}</a> : null}
          {organizer.public_email ? <a href={`mailto:${organizer.public_email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline"><Mail className="h-4 w-4" aria-hidden />{organizer.public_email}</a> : null}
          {organizer.public_phone ? <a href={`tel:${organizer.public_phone}`} className="inline-flex items-center gap-1.5 text-primary hover:underline"><Phone className="h-4 w-4" aria-hidden />{organizer.public_phone}</a> : null}
        </div>
      ) : null}
      <section>
        <SectionHeader title={t('organizer.upcomingEvents')} />
        {upcoming.items.length ? <EventGrid events={upcoming.items} /> : <EmptyState title={t('organizer.noUpcoming')} />}
      </section>
      {pastItems.length ? (
        <section>
          <SectionHeader title={t('organizer.pastEvents')} />
          <EventGrid events={pastItems} />
        </section>
      ) : null}
    </div>
  );
}
