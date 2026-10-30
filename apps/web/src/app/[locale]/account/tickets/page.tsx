import { listMyTickets } from '@tamurt/api-client';
import { Ticket } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { eventDateTime, nameOf } from '@/lib/format';
import { serverNowMs } from '@/lib/clock';
import { requireViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';

export default async function TicketsPage({ params }: PageProps<'/[locale]/account/tickets'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  await requireViewer(locale, '/account/tickets');
  const t = await getTranslations();
  const tickets = await listMyTickets(await getSupabase());
  const now = serverNowMs();
  const upcoming = tickets.filter((ticket) => new Date(ticket.event.ends_at ?? ticket.event.starts_at).getTime() >= now);
  const past = tickets.filter((ticket) => new Date(ticket.event.ends_at ?? ticket.event.starts_at).getTime() < now);
  const statusTone = (status: string) => (status === 'issued' ? 'success' : status === 'transferred' ? 'info' : 'neutral') as 'success' | 'info' | 'neutral';

  const list = (items: typeof tickets) => (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((ticket) => (
        <li key={ticket.id}>
          <Link href={`/account/tickets/${ticket.id}`} className="flex h-full gap-4 rounded-xl border border-line bg-surface p-4 transition-colors hover:bg-sunken">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Ticket className="h-6 w-6" aria-hidden /></span>
            <span className="min-w-0 flex-1 space-y-1">
              <span className="block truncate font-semibold">{ticket.event.title}</span>
              <span className="block text-sm text-muted">{eventDateTime(ticket.event.starts_at, ticket.event.timezone, locale)}</span>
              <span className="block truncate text-sm text-subtle">{[ticket.event.venue?.name, nameOf(ticket.event.city?.names, locale)].filter(Boolean).join(' · ')}</span>
              <span className="flex flex-wrap gap-1.5 pt-1">
                <Badge tone={statusTone(ticket.status)}>{t(`tickets.status.${ticket.status}` as 'tickets.status.issued')}</Badge>
                {ticket.offer?.name ? <Badge>{ticket.offer.name}</Badge> : null}
                {ticket.environment === 'demo' ? <Badge tone="demo">{t('app.demoBadge')}</Badge> : null}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <PageHeader title={t('tickets.title')} />
      {tickets.length === 0 ? (
        <EmptyState icon={Ticket} title={t('tickets.empty')} text={t('tickets.emptyHint')} action={<Link href="/search" className={buttonClasses()}>{t('nav.discover')}</Link>} />
      ) : (
        <>
          <section>
            <SectionHeader title={t('tickets.upcoming')} />
            {upcoming.length ? list(upcoming) : <p className="text-sm text-muted">{t('common.empty')}</p>}
          </section>
          {past.length ? (
            <section>
              <SectionHeader title={t('tickets.past')} />
              {list(past)}
            </section>
          ) : null}
        </>
      )}
    </>
  );
}
