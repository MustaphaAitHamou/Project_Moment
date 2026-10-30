import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslations } from 'use-intl';
import { Banner, Button, EmptyState, Screen } from '@/components/ui';

export default function ConfirmationScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const t = useTranslations();
  const router = useRouter();
  const client = useQueryClient();
  useEffect(() => {
    void client.invalidateQueries({ queryKey: ['tickets'] });
  }, [client, orderId]);
  return (
    <Screen edges={['bottom']}>
      <EmptyState icon="checkmark-circle" title={t('checkout.confirmationTitle')} text={t('tickets.demoSpecimenText')} />
      <Banner tone="demo" text={t('orders.demoOrder')} />
      <Button title={t('checkout.viewTickets')} onPress={() => router.replace('/(tabs)/tickets')} />
    </Screen>
  );
}
