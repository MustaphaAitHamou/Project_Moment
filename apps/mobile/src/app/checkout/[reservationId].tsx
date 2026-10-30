import { formatCountdown, generateIdempotencyKey, secondsRemaining } from '@tamurt/core';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocale, useTranslations } from 'use-intl';
import { AppText, Banner, Button, Card, Chip, ErrorState, LoadingState, Row, Screen } from '@/components/ui';
import { money } from '@/lib/format';
import { useApi } from '@/providers/api';

/** Réservation temporaire + paiement SIMULÉ (aucune donnée bancaire n'est demandée). */
export default function CheckoutScreen() {
  const { reservationId } = useLocalSearchParams<{ reservationId: string }>();
  const t = useTranslations();
  const locale = useLocale();
  const api = useApi();
  const router = useRouter();
  const query = useQuery({ queryKey: ['reservation', reservationId], queryFn: () => api.checkout.getReservation(reservationId) });
  const [now, setNow] = useState(() => Date.now());
  const [orderId, setOrderId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<'success' | 'declined' | 'error'>('success');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const orderKey = useMemo(() => generateIdempotencyKey(), []);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const reservation = query.data;
  const pricing = reservation.pricing;
  const remaining = secondsRemaining(reservation.expiresAt, new Date(now));
  const format = (amount: number) => money(amount, pricing.currency, locale);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const order = orderId ? { id: orderId } : await api.checkout.createOrder(reservation.id, orderKey);
      setOrderId(order.id);
      const result = await api.checkout.pay(order.id, { scenario });
      if (result.status === 'fulfilled' || result.status === 'paid') router.replace({ pathname: '/checkout/confirmation/[orderId]', params: { orderId: order.id } });
    } catch (caught) {
      const code = (caught as { code?: string }).code;
      setError(code === 'payment_declined' ? t('checkout.paymentDeclined') : code === 'payment_failed' ? t('checkout.paymentError') : (caught as Error).message);
    }
    setBusy(false);
  }

  return (
    <Screen edges={[]}>
      {remaining <= 0 ? <Banner tone="warning" title={t('checkout.holdExpired')} /> : <Banner tone="info" title={t('checkout.holdTitle')} text={t('checkout.holdTimer', { time: formatCountdown(remaining) })} />}
      <Card>
        <AppText variant="heading">{reservation.event.title}</AppText>
        <AppText variant="muted">{reservation.offer.name} × {reservation.quantity}</AppText>
        <View style={{ gap: 6, marginTop: 8 }}>
          <Row style={{ justifyContent: 'space-between' }}><AppText variant="muted">{t('checkout.faceValue', { count: pricing.quantity, price: format(pricing.unitFaceValueMinor) })}</AppText><AppText>{format(pricing.subtotalMinor)}</AppText></Row>
          {pricing.providerFeesMinor > 0 ? <Row style={{ justifyContent: 'space-between' }}><AppText variant="muted">{t('checkout.providerFees')}</AppText><AppText>{format(pricing.providerFeesMinor)}</AppText></Row> : null}
          {pricing.serviceFeesMinor > 0 ? <Row style={{ justifyContent: 'space-between' }}><AppText variant="muted">{t('checkout.serviceFees')}</AppText><AppText>{format(pricing.serviceFeesMinor)}</AppText></Row> : null}
          {pricing.discountMinor > 0 && pricing.promotion ? <Row style={{ justifyContent: 'space-between' }}><AppText variant="muted">{t('checkout.discount', { code: pricing.promotion.code })}</AppText><AppText>−{format(pricing.discountMinor)}</AppText></Row> : null}
          <Row style={{ justifyContent: 'space-between' }}><AppText variant="heading">{t('checkout.total')}</AppText><AppText variant="heading">{format(pricing.totalMinor)}</AppText></Row>
          {pricing.isSimulation ? <AppText variant="caption">{t('checkout.simulationNotice')}</AppText> : null}
        </View>
      </Card>
      {reservation.environment === 'demo' ? <Banner tone="demo" title={t('checkout.paymentTitle')} text={t('checkout.paymentDisclaimer')} /> : null}
      {remaining > 0 ? (
        <>
          <AppText variant="label">{t('checkout.scenarioIntro')}</AppText>
          <Row>
            <Chip label={t('checkout.scenarioSuccess')} selected={scenario === 'success'} onPress={() => setScenario('success')} />
            <Chip label={t('checkout.scenarioDeclined')} selected={scenario === 'declined'} onPress={() => setScenario('declined')} />
            <Chip label={t('checkout.scenarioError')} selected={scenario === 'error'} onPress={() => setScenario('error')} />
          </Row>
          {error ? <Banner tone="danger" text={error} /> : null}
          <Button title={busy ? t('checkout.processing') : t('checkout.payNow', { amount: format(pricing.totalMinor) })} loading={busy} onPress={() => void pay()} />
          <Button title={t('checkout.releaseHold')} variant="ghost" onPress={() => void api.checkout.releaseReservation(reservation.id).finally(() => router.back())} />
        </>
      ) : (
        <Button title={t('checkout.backToEvent')} onPress={() => router.back()} />
      )}
    </Screen>
  );
}
