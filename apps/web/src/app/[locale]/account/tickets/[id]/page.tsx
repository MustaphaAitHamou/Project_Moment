import { getMyTicket } from '@tamurt/api-client';
import { Ban, Repeat2 } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { dateTimeShort, eventDateTime, money, nameOf } from '@/lib/format';
import { requireViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';

/**
 * Détail d'un billet. Un billet de DÉMONSTRATION est un spécimen : aucun code d'accès, aucun
 * QR code n'est jamais affiché. Pour un billet réel, seul le partenaire de billetterie délivre
 * le titre d'accès (un PDF ou un QR fourni par un tiers ne garantit pas son authenticité).
 */
export default async function TicketPage({ params }: PageProps<'/[locale]/account/tickets/[id]'>) {
  const { locale, id } = (await params) as { locale: AppLocale; id: string };
  setRequestLocale(locale);
  await requireViewer(locale, `/account/tickets/${id}`);
  const ticket = /^[0-9a-f-]{36}$/i.test(id) ? await getMyTicket(await getSupabase(), id) : null;
  if (!ticket) notFound();
  const t = await getTranslations();
  const demo = ticket.environment === 'demo';
  const upcoming = new Date(ticket.event.ends_at ?? ticket.event.starts_at) > new Date();
  const canResell = ticket.status === 'issued' && upcoming && ticket.offer?.resale_allowed && ticket.event.status === 'published';
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/account/tickets" className="text-sm font-semibold text-primary hover:underline">← {t('tickets.title')}</Link>
      <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-line-strong bg-surface">
        {demo ? (
          <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="-rotate-12 select-none whitespace-nowrap font-display text-4xl font-extrabold uppercase tracking-widest text-demo/15 sm:text-6xl">{t('app.demoBadge')} · {t('app.demoBadge')}</span>
          </div>
        ) : null}
        <div className="relative space-y-4 p-6 sm:p-8">
          {demo ? <p className="rounded-lg bg-demo-soft px-3 py-2 text-center text-sm font-extrabold tracking-wide text-demo">{t('tickets.demoSpecimenTitle')}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Badge tone={ticket.status === 'issued' ? 'success' : 'neutral'}>{t(`tickets.status.${ticket.status}` as 'tickets.status.issued')}</Badge>
            <Badge>{t(`tickets.source.${ticket.source}` as 'tickets.source.purchase')}</Badge>
          </div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{ticket.event.title}</h1>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-subtle">{t('event.dateTime')}</dt><dd className="font-semibold">{eventDateTime(ticket.event.starts_at, ticket.event.timezone, locale, null, { withTimeZoneName: true })}</dd></div>
            <div><dt className="text-subtle">{t('event.location')}</dt><dd className="font-semibold">{[ticket.event.venue?.name, nameOf(ticket.event.city?.names, locale)].filter(Boolean).join(', ')}</dd></div>
            <div><dt className="text-subtle">{t('tickets.holder')}</dt><dd className="font-semibold">{ticket.holder_name ?? '—'}</dd></div>
            <div><dt className="text-subtle">{t('tickets.offer')}</dt><dd className="font-semibold">{ticket.offer?.name ?? '—'}{ticket.seat_label ? ` · ${ticket.seat_label}` : ''}</dd></div>
            <div><dt className="text-subtle">{t('common.price')}</dt><dd className="font-semibold">{money(Number(ticket.original_price_minor), ticket.currency, locale)}</dd></div>
            <div><dt className="text-subtle">{t('tickets.orderNumber', { number: ticket.order?.order_number ?? '—' })}</dt><dd className="font-semibold">{t('tickets.issuedAt', { date: dateTimeShort(ticket.issued_at, locale) })}</dd></div>
          </dl>
          <div className="flex items-center gap-3 rounded-lg bg-sunken p-4 text-sm">
            <Ban className="h-5 w-5 shrink-0 text-muted" aria-hidden />
            <p>{demo ? t('tickets.noAccessCode') : t('tickets.providerDelivery')}</p>
          </div>
        </div>
      </div>
      {demo ? <Alert tone="demo">{t('tickets.demoSpecimenText')}</Alert> : null}
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/events/${ticket.event.slug}`} className={buttonClasses({ variant: 'outline' })}>{t('checkout.backToEvent')}</Link>
        {canResell ? (
          <Link href={{ pathname: '/account/resale', query: { ticket: ticket.id } }} className={buttonClasses()}>
            <Repeat2 className="h-4 w-4" aria-hidden />{t('tickets.resell')}
          </Link>
        ) : null}
      </Card>
    </div>
  );
}
