import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DataTable, Td } from '@/components/admin/data-table';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import type { AppLocale } from '@/i18n/routing';
import { dateTimeShort, money } from '@/lib/format';
import { requireStaffViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';
import { orderTone } from '@/lib/status';

export default async function AdminOrdersPage({ params }: PageProps<'/[locale]/admin/orders'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  await requireStaffViewer(locale, '/admin/orders');
  const t = await getTranslations();
  const supabase = await getSupabase();
  const select = 'id, order_number, status, total_minor, currency, created_at, environment, event:events!inner(title)';
  const [demo, live] = await Promise.all([
    supabase.from('orders').select(select).eq('environment', 'demo').order('created_at', { ascending: false }).limit(100),
    supabase.from('orders').select(select).eq('environment', 'live').order('created_at', { ascending: false }).limit(100),
  ]);
  const table = (rows: NonNullable<typeof demo.data>) => (
    <DataTable head={['#', t('eventForm.title'), t('common.status'), t('common.total'), t('common.date')]} empty={rows.length ? undefined : t('common.empty')}>
      {rows.map((order) => (
        <tr key={order.id}>
          <Td className="font-mono text-xs">{order.order_number}</Td>
          <Td>{order.event.title}</Td>
          <Td><Badge tone={orderTone(order.status)}>{t(`orders.status.${order.status}`)}</Badge></Td>
          <Td className="tabular-nums">{money(Number(order.total_minor), order.currency, locale)}</Td>
          <Td className="text-muted">{dateTimeShort(order.created_at, locale)}</Td>
        </tr>
      ))}
    </DataTable>
  );
  return (
    <>
      <PageHeader title={t('admin.orders')} />
      <section>
        <SectionHeader title={t('admin.demoOrders')} />
        {table(demo.data ?? [])}
      </section>
      <section>
        <SectionHeader title={t('admin.liveOrders')} />
        {live.data?.length ? table(live.data) : <Alert tone="info">{t('admin.liveOrdersEmpty')}</Alert>}
      </section>
    </>
  );
}
