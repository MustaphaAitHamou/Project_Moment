import { getMyOrder } from '@tamurt/api-client';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { RefundDemoButton } from '@/components/account/refund-demo-button';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { dateTimeShort, eventDateTime, money } from '@/lib/format';
import { requireViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';
import { orderTone } from '@/lib/status';

export default async function OrderPage({ params }: PageProps<'/[locale]/account/orders/[id]'>) {
  const { locale, id } = (await params) as { locale: AppLocale; id: string };
  setRequestLocale(locale);
  await requireViewer(locale, `/account/orders/${id}`);
  const order = /^[0-9a-f-]{36}$/i.test(id) ? await getMyOrder(await getSupabase(), id) : null;
  if (!order) notFound();
  const t = await getTranslations();
  const format = (amount: number) => money(Number(amount), order.currency, locale);
  const upcoming = new Date(order.event.starts_at) > new Date();
  return (
    <>
      <PageHeader
        eyebrow={<Link href="/account/orders" className="hover:underline">← {t('orders.title')}</Link>}
        title={t('orders.order', { number: order.order_number })}
        subtitle={t('orders.placedAt', { date: dateTimeShort(order.created_at, locale) })}
        actions={<Badge tone={orderTone(order.status)}>{t(`orders.status.${order.status}` as 'orders.status.paid')}</Badge>}
      />
      {order.environment === 'demo' ? <Alert tone="demo">{t('orders.demoOrder')}</Alert> : null}
      <Card className="space-y-3">
        <Link href={`/events/${order.event.slug}`} className="font-display text-lg font-bold hover:underline">{order.event.title}</Link>
        <p className="text-sm text-muted">{eventDateTime(order.event.starts_at, order.event.timezone, locale, null, { withTimeZoneName: true })}</p>
        <ul className="divide-y divide-line text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-2">
              <span>{item.offer_name} × {item.quantity}</span>
              <span className="tabular-nums">{format(item.unit_face_value_minor * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t border-line pt-3 text-sm">
          {order.provider_fees_minor > 0 ? <div className="flex justify-between"><dt className="text-muted">{t('checkout.providerFees')}</dt><dd className="tabular-nums">{format(order.provider_fees_minor)}</dd></div> : null}
          {order.service_fees_minor > 0 ? <div className="flex justify-between"><dt className="text-muted">{t('checkout.serviceFees')}</dt><dd className="tabular-nums">{format(order.service_fees_minor)}</dd></div> : null}
          {order.discount_minor > 0 ? <div className="flex justify-between text-success"><dt>{t('checkout.discount', { code: (order.pricing as { promotion?: { code?: string } } | null)?.promotion?.code ?? '' })}</dt><dd className="tabular-nums">−{format(order.discount_minor)}</dd></div> : null}
          <div className="flex justify-between font-display text-lg font-bold"><dt>{t('common.total')}</dt><dd className="tabular-nums">{format(order.total_minor)}</dd></div>
        </dl>
      </Card>
      <div className="flex flex-wrap items-start gap-3">
        {order.tickets.length ? <Link href="/account/tickets" className={buttonClasses()}>{t('orders.viewTickets')}</Link> : null}
        {order.environment === 'demo' && order.status === 'fulfilled' && upcoming ? <RefundDemoButton orderId={order.id} /> : null}
      </div>
    </>
  );
}
