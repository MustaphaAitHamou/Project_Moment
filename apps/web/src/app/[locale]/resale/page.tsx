import { listPublicResaleListings } from '@tamurt/api-client';
import { Repeat2, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BuyListingButton } from '@/components/resale/buy-listing-button';
import { ReportListing } from '@/components/resale/report-listing';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { eventDateTime, money, nameOf } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';
import { getSupabase, getViewer } from '@/lib/session';
import { firstParam } from '@/lib/utils';

export async function generateMetadata({ params }: PageProps<'/[locale]/resale'>): Promise<Metadata> {
  const locale = (await params).locale as AppLocale;
  const t = await getTranslations({ locale, namespace: 'resale' });
  return pageMetadata({ locale, path: '/resale', title: t('title'), description: t('subtitle'), noindex: true });
}

const PAGE = 20;

export default async function ResalePage({ params, searchParams }: PageProps<'/[locale]/resale'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const query = await searchParams;
  const eventId = firstParam(query.event);
  const page = Math.max(1, Number(firstParam(query.page) ?? 1) || 1);
  const t = await getTranslations();
  const [viewer, listings] = await Promise.all([
    getViewer(),
    listPublicResaleListings(await getSupabase(), eventId && /^[0-9a-f-]{36}$/i.test(eventId) ? eventId : undefined, PAGE, (page - 1) * PAGE).catch(() => ({ items: [], total: 0 })),
  ]);
  const total = Number(listings.total);
  return (
    <div className="container-page space-y-6 py-8">
      <PageHeader title={t('resale.title')} subtitle={t('resale.subtitle')} actions={viewer ? <Link href="/account/resale" className={buttonClasses({ variant: 'outline' })}>{t('resale.myListings')}</Link> : null} />
      <Alert tone="demo">{t('resale.demoNotice')}</Alert>
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-bold"><ShieldCheck className="h-5 w-5 text-success" aria-hidden />{t('resale.rulesTitle')}</h2>
        <ul className="grid gap-2 text-sm text-muted md:grid-cols-2">
          {(['ownership', 'priceCap', 'transfer', 'fraud'] as const).map((key) => <li key={key} className="flex gap-2"><span aria-hidden>•</span>{t(`resale.rules.${key}`)}</li>)}
        </ul>
      </Card>
      {eventId ? <Link href="/resale" className="text-sm font-semibold text-primary hover:underline">{t('common.seeAll')}</Link> : null}
      {listings.items.length === 0 ? (
        <EmptyState icon={Repeat2} title={t('resale.noListings')} />
      ) : (
        <ul className="space-y-3">
          {listings.items.map((listing) => {
            const format = (amount: number) => money(Number(amount), listing.currency, locale);
            return (
              <li key={listing.id} className="grid gap-4 rounded-xl border border-line bg-surface p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {listing.environment === 'demo' ? <Badge tone="demo">{t('app.demoBadge')}</Badge> : null}
                    {listing.offer_name ? <Badge>{listing.offer_name}</Badge> : null}
                  </div>
                  <Link href={`/events/${listing.event_slug}`} className="block truncate font-semibold hover:underline">{listing.event_title}</Link>
                  <p className="text-sm text-muted">{eventDateTime(listing.event_starts_at, listing.event_timezone, locale)} · {nameOf(listing.city_names, locale)}</p>
                  <p className="text-xs text-subtle">{t('resale.seller')} {listing.seller_alias} · {t('resale.sellerSales', { count: Number(listing.seller_completed_sales) })}</p>
                  {listing.note ? <p className="text-sm italic text-muted">« {listing.note} »</p> : null}
                  <ReportListing listingId={listing.id} />
                </div>
                <div className="flex items-end justify-between gap-6 md:flex-col md:items-end">
                  <dl className="space-y-0.5 text-sm md:text-end">
                    <div className="text-subtle"><dt className="inline">{t('resale.originalPrice')} : </dt><dd className="inline tabular-nums">{format(listing.original_price_minor)}</dd></div>
                    <div><dt className="inline">{t('resale.askingPrice')} : </dt><dd className="inline font-semibold tabular-nums">{format(listing.asking_price_minor)}</dd></div>
                    <div className="text-subtle"><dt className="inline">{t('resale.buyerFee')} : </dt><dd className="inline tabular-nums">{format(listing.buyer_fee_minor)}</dd></div>
                    <div className="font-display text-lg font-bold"><dt className="sr-only">{t('resale.buyerTotal')}</dt><dd className="tabular-nums">{format(Number(listing.asking_price_minor) + Number(listing.buyer_fee_minor))}</dd></div>
                  </dl>
                  <BuyListingButton listingId={listing.id} signedIn={Boolean(viewer)} hasAccess={Boolean(viewer?.hasAppAccess)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {total > PAGE ? (
        <nav className="flex justify-center gap-2">
          {page > 1 ? <Link href={{ pathname: '/resale', query: { ...(eventId ? { event: eventId } : {}), page: String(page - 1) } }} className={buttonClasses({ variant: 'outline', size: 'sm' })}>{t('common.previous')}</Link> : null}
          {page * PAGE < total ? <Link href={{ pathname: '/resale', query: { ...(eventId ? { event: eventId } : {}), page: String(page + 1) } }} className={buttonClasses({ variant: 'outline', size: 'sm' })}>{t('common.next')}</Link> : null}
        </nav>
      ) : null}
    </div>
  );
}
