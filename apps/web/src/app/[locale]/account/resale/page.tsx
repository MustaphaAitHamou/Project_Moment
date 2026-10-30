import { listMyResaleListings, listMyResaleTransactions, listMyTickets } from '@tamurt/api-client';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CancelListingButton } from '@/components/resale/cancel-listing-button';
import { CreateListingForm } from '@/components/resale/create-listing-form';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { dateTimeShort, eventDateTime, money } from '@/lib/format';
import { requireViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';
import { resaleTone } from '@/lib/status';
import { firstParam } from '@/lib/utils';

export default async function MyResalePage({ params, searchParams }: PageProps<'/[locale]/account/resale'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, '/account/resale');
  const t = await getTranslations();
  const supabase = await getSupabase();
  const [tickets, listings, transactions, activeListings] = await Promise.all([
    listMyTickets(supabase),
    listMyResaleListings(supabase),
    listMyResaleTransactions(supabase),
    supabase.from('resale_listings').select('ticket_id').eq('seller_id', viewer.id).in('status', ['active', 'reserved']),
  ]);
  const listed = new Set((activeListings.data ?? []).map((row) => row.ticket_id));
  const now = Date.now();
  const eligible = tickets
    .filter((ticket) => ticket.status === 'issued' && ticket.offer?.resale_allowed && ticket.event.status === 'published' && new Date(ticket.event.starts_at).getTime() > now && !listed.has(ticket.id))
    .map((ticket) => ({ id: ticket.id, label: `${ticket.event.title} — ${eventDateTime(ticket.event.starts_at, ticket.event.timezone, locale)} — ${ticket.offer?.name ?? ''}` }));

  return (
    <>
      <PageHeader title={t('nav.resale')} subtitle={t('resale.subtitle')} actions={<Link href="/resale" className={buttonClasses({ variant: 'outline' })}>{t('resale.listings')}</Link>} />
      <Alert tone="demo">{t('resale.demoNotice')}</Alert>
      <Card>
        <SectionHeader title={t('resale.createListing')} />
        <CreateListingForm tickets={eligible} preselected={firstParam((await searchParams).ticket)} />
      </Card>
      <section>
        <SectionHeader title={t('resale.myListings')} />
        {listings.length ? (
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {listings.map((listing) => (
              <li key={listing.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <Link href={`/events/${listing.event.slug}`} className="font-semibold hover:underline">{listing.event.title}</Link>
                  <p className="text-sm text-muted">{money(Number(listing.asking_price_minor), listing.currency, locale)} · {dateTimeShort(listing.created_at, locale)}</p>
                </div>
                <Badge tone={resaleTone(listing.status)}>{t(`resale.listingStatus.${listing.status}` as 'resale.listingStatus.active')}</Badge>
                {listing.status === 'active' ? <CancelListingButton listingId={listing.id} /> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t('common.empty')}</p>
        )}
      </section>
      <section>
        <SectionHeader title={t('resale.history')} />
        {transactions.length ? (
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {transactions.map((tx) => (
              <li key={tx.id}>
                <Link href={`/resale/transactions/${tx.id}`} className="flex flex-col gap-2 p-4 hover:bg-sunken sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{tx.listing.event.title}</p>
                    <p className="text-sm text-muted">{tx.buyer_id === viewer.id ? t('resale.myPurchases') : t('resale.myListings')} · {dateTimeShort(tx.created_at, locale)}</p>
                  </div>
                  <Badge tone={resaleTone(tx.status)}>{t(`resale.txStatus.${tx.status}` as 'resale.txStatus.completed')}</Badge>
                  <span className="font-semibold tabular-nums">{money(Number(tx.total_minor), tx.currency, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t('common.empty')}</p>
        )}
      </section>
    </>
  );
}
