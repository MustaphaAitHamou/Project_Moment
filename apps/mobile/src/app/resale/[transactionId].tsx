import { formatCountdown, secondsRemaining } from '@tamurt/core';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import { AppText, Badge, Banner, Button, Card, Chip, ErrorState, LoadingState, Row, Screen } from '@/components/ui';
import { money } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useApi } from '@/providers/api';

export default function ResaleTransactionScreen() {
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();
  const t = useTranslations();
  const locale = useLocale();
  const api = useApi();
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [scenario, setScenario] = useState<'success' | 'declined' | 'error'>('success');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['resale-tx', transactionId],
    queryFn: async () => (await supabase.from('resale_transactions').select('id, status, total_minor, currency, expires_at, new_ticket_id').eq('id', transactionId).single()).data,
  });
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (query.isLoading) return <LoadingState />;
  if (!query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const tx = query.data;
  const remaining = secondsRemaining(tx.expires_at, new Date(now));
  return (
    <Screen edges={[]}>
      <Banner tone="demo" text={t('resale.demoNotice')} />
      <Card>
        <Badge label={t(`resale.txStatus.${tx.status}` as 'resale.txStatus.completed')} tone={tx.status === 'completed' ? 'success' : 'warning'} />
        <AppText variant="heading">{t('resale.buyerTotal')} : {money(Number(tx.total_minor), tx.currency, locale)}</AppText>
      </Card>
      {tx.status === 'completed' ? (
        <>
          <Banner tone="success" text={t('resale.purchaseCompleted')} />
          {tx.new_ticket_id ? <Button title={t('checkout.viewTickets')} onPress={() => router.replace({ pathname: '/tickets/[id]', params: { id: tx.new_ticket_id! } })} /> : null}
        </>
      ) : ['initiated', 'payment_pending'].includes(tx.status) && remaining > 0 ? (
        <>
          <AppText variant="label">{t('resale.reservedFor', { time: formatCountdown(remaining) })}</AppText>
          <Banner tone="demo" text={t('checkout.paymentDisclaimer')} />
          <Row>
            <Chip label={t('checkout.scenarioSuccess')} selected={scenario === 'success'} onPress={() => setScenario('success')} />
            <Chip label={t('checkout.scenarioDeclined')} selected={scenario === 'declined'} onPress={() => setScenario('declined')} />
            <Chip label={t('checkout.scenarioError')} selected={scenario === 'error'} onPress={() => setScenario('error')} />
          </Row>
          {error ? <Banner tone="danger" text={error} /> : null}
          <Button
            title={t('checkout.payNow', { amount: money(Number(tx.total_minor), tx.currency, locale) })}
            loading={busy}
            onPress={async () => {
              setBusy(true);
              setError(null);
              try {
                await api.resale.pay(tx.id, { scenario });
                await query.refetch();
              } catch (caught) {
                setError((caught as { code?: string }).code === 'payment_declined' ? t('checkout.paymentDeclined') : (caught as Error).message);
              }
              setBusy(false);
            }}
          />
        </>
      ) : (
        <Banner tone="warning" text={t('checkout.holdExpired')} />
      )}
    </Screen>
  );
}
