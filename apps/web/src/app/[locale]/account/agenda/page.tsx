import { getMyAgenda } from '@tamurt/api-client';
import { groupByLocalDay } from '@tamurt/core';
import { CalendarDays, Heart, Ticket, UserCheck } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { eventDay, eventTime, nameOf } from '@/lib/format';
import { requireViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';

/** Agenda personnel : favoris, inscriptions et billets des 6 prochains mois, à l'heure locale de chaque événement. */
export default async function MyAgendaPage({ params }: PageProps<'/[locale]/account/agenda'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  await requireViewer(locale, '/account/agenda');
  const t = await getTranslations();
  const from = new Date(Date.now() - 6 * 3600_000);
  const to = new Date(Date.now() + 183 * 86_400_000);
  const entries = await getMyAgenda(await getSupabase(), from.toISOString(), to.toISOString());
  const days = [...groupByLocalDay(entries).entries()].sort(([a], [b]) => a.localeCompare(b));
  return (
    <>
      <PageHeader title={t('nav.myAgenda')} subtitle={t('agenda.subtitle')} actions={<Link href="/agenda" className={buttonClasses({ variant: 'outline' })}>{t('agenda.publicAgenda')}</Link>} />
      {days.length === 0 ? (
        <EmptyState icon={CalendarDays} title={t('agenda.personalEmpty')} action={<Link href="/search" className={buttonClasses()}>{t('nav.discover')}</Link>} />
      ) : (
        <ol className="space-y-6">
          {days.map(([key, items]) => (
            <li key={key}>
              <h2 className="mb-2 font-display text-lg font-bold capitalize">{eventDay(items[0]!.starts_at, items[0]!.timezone, locale)}</h2>
              <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                {items.map((entry) => (
                  <li key={`${entry.event_id}-${entry.starts_at}`} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                    <span className="w-16 shrink-0 font-semibold tabular-nums text-primary">{eventTime(entry.starts_at, entry.timezone, locale)}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/events/${entry.slug}`} className="font-semibold hover:underline">{entry.title}</Link>
                      <p className="text-sm text-muted">{[entry.venue_name, nameOf(entry.city_names, locale)].filter(Boolean).join(' · ')} · {entry.timezone}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.is_demo ? <Badge tone="demo">{t('app.demoBadge')}</Badge> : null}
                      {entry.status === 'cancelled' ? <Badge tone="danger">{t('event.cancelledBanner')}</Badge> : null}
                      {entry.tickets_count > 0 ? <Badge tone="primary"><Ticket className="h-3 w-3" aria-hidden />{t('agenda.relationTickets', { count: entry.tickets_count })}</Badge> : null}
                      {entry.is_registered ? <Badge tone="success"><UserCheck className="h-3 w-3" aria-hidden />{t('agenda.relationRegistered')}</Badge> : null}
                      {entry.is_favorite ? <Badge tone="neutral"><Heart className="h-3 w-3" aria-hidden />{t('agenda.relationFavorite')}</Badge> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
