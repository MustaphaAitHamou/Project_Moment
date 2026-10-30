import { CircleCheck } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { DisputeForm } from '@/components/resale/dispute-form';
import { ResalePayment } from '@/components/resale/resale-payment';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { eventDateTime, money } from '@/lib/format';
import { requireViewer } from '@/lib/guards';
import { PRIVATE_METADATA } from '@/lib/seo';
import { getSupabase } from '@/lib/session';
import { resaleTone } from '@/lib/status';

export const metadata: Metadata = PRIVATE_METADATA;

export default async function ResaleTransactionPage({ params }: PageProps<'/[locale]/resale/transactions/[id]'>) {
  const { locale, id } = (await params) as { locale: AppLocale; id: string };
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, `/resale/transactions/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: tx } = await (await getSupabase())
    .from('resale_transactions')
    .select('id, status, environment, currency, price_minor, buyer_fee_minor, total_minor, seller_payout_minor, expires_at, new_ticket_id, buyer_id, seller_id, created_at, listing:resale_listings!inner(event:events!inner(slug, title, starts_at, timezone))')
    .eq('id', id)
    .maybeSingle();
  if (!tx) notFound();
  const t = await getTranslations();
  const isBuyer = tx.buyer_id === viewer.id;
  const format = (amount: number) => money(Number(amount), tx.currency, locale);
  const event = tx.listing.event;
  return (
    <div className="container-page max-w-3xl space-y-6 py-8">
      <PageHeader title={t('resale.purchaseTitle')} subtitle={event.title} actions={<Badge tone={resaleTone(tx.status)}>{t(`resale.txStatus.${tx.status}` as 'resale.txStatus.completed')}</Badge>} />
      {tx.environment === 'demo' ? <Alert tone="demo">{t('resale.demoNotice')}</Alert> : null}
      <Card className="space-y-2 text-sm">
        <Link href={`/events/${event.slug}`} className="font-semibold hover:underline">{event.title}</Link>
        <p className="text-muted">{eventDateTime(event.starts_at, event.timezone, locale, null, { withTimeZoneName: true })}</p>
        <dl className="space-y-1 border-t border-line pt-3">
          <div className="flex justify-between"><dt className="text-muted">{t('resale.askingPrice')}</dt><dd className="tabular-nums">{format(tx.price_minor)}</dd></div>
          {isBuyer ? <div className="flex justify-between"><dt className="text-muted">{t('resale.buyerFee')}</dt><dd className="tabular-nums">{format(tx.buyer_fee_minor)}</dd></div> : null}
          {isBuyer ? (
            <div className="flex justify-between font-display text-lg font-bold"><dt>{t('resale.buyerTotal')}</dt><dd className="tabular-nums">{format(tx.total_minor)}</dd></div>
          ) : (
            <div className="flex justify-between font-display text-lg font-bold"><dt>{t('resale.sellerPayout')}</dt><dd className="tabular-nums">{format(tx.seller_payout_minor)}</dd></div>
          )}
        </dl>
      </Card>
      {isBuyer && ['initiated', 'payment_pending'].includes(tx.status) ? (
        <Card><ResalePayment transactionId={tx.id} expiresAt={tx.expires_at} totalMinor={Number(tx.total_minor)} currency={tx.currency} /></Card>
      ) : null}
      {tx.status === 'completed' && isBuyer ? (
        <Alert tone="success" title={t('resale.purchaseCompleted')} action={tx.new_ticket_id ? <Link href={`/account/tickets/${tx.new_ticket_id}`} className={buttonClasses({ size: 'sm' })}><CircleCheck className="h-4 w-4" aria-hidden />{t('checkout.viewTickets')}</Link> : null} />
      ) : null}
      {isBuyer && ['paid', 'transfer_pending', 'completed'].includes(tx.status) ? <DisputeForm transactionId={tx.id} /> : null}
    </div>
  );
}
