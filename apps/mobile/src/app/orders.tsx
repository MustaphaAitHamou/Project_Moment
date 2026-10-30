import { listMyOrders } from '@tamurt/api-client';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'use-intl';
import { AppText, Badge, Card, EmptyState, ErrorState, LoadingState, Row, Screen } from '@/components/ui';
import { money } from '@/lib/format';
import { supabase } from '@/lib/supabase';

export default function OrdersScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const query = useQuery({ queryKey: ['orders'], queryFn: () => listMyOrders(supabase) });
  if (query.isLoading) return <LoadingState />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;
  return (
    <Screen edges={[]}>
      {!query.data?.length ? <EmptyState icon="receipt-outline" title={t('orders.empty')} /> : query.data.map((order) => (
        <Card key={order.id}>
          <AppText variant="label">{order.event.title}</AppText>
          <AppText variant="caption">{t('orders.order', { number: order.order_number })}</AppText>
          <Row>
            <Badge label={t(`orders.status.${order.status}`)} tone={order.status === 'fulfilled' ? 'success' : 'neutral'} />
            {order.environment === 'demo' ? <Badge label={t('app.demoBadge')} tone="demo" /> : null}
            <AppText variant="label">{money(Number(order.total_minor), order.currency, locale)}</AppText>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
