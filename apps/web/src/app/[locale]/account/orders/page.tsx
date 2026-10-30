import { listMyOrders } from '@tamurt/api-client';
import { Receipt } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { dateTimeShort, money } from '@/lib/format';
import { requireViewer } from '@/lib/guards';
import { orderTone } from '@/lib/status';
import { getSupabase } from '@/lib/session';

export default async function OrdersPage({ params }: PageProps<'/[locale]/account/orders'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  await requireViewer(locale, '/account/orders');
  const t = await getTranslations();
  const orders = await listMyOrders(await getSupabase());
  return (
    <>
      <PageHeader title={t('orders.title')} />
      {orders.length === 0 ? (
        <EmptyState icon={Receipt} title={t('orders.empty')} />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/account/orders/${order.id}`} className="flex flex-col gap-2 p-4 hover:bg-sunken sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{order.event.title}</p>
                  <p className="text-sm text-muted">{t('orders.order', { number: order.order_number })} · {t('orders.placedAt', { date: dateTimeShort(order.created_at, locale) })}</p>
                </div>
                <div className="flex items-center gap-2">
                  {order.environment === 'demo' ? <Badge tone="demo">{t('app.demoBadge')}</Badge> : null}
                  <Badge tone={orderTone(order.status)}>{t(`orders.status.${order.status}` as 'orders.status.paid')}</Badge>
                  <span className="font-bold tabular-nums">{money(Number(order.total_minor), order.currency, locale)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
