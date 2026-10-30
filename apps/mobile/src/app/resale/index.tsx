import { generateIdempotencyKey } from '@tamurt/core';
import { listPublicResaleListings } from '@tamurt/api-client';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useLocale, useTranslations } from 'use-intl';
import { AppText, Badge, Banner, Button, Card, EmptyState, ErrorState, LoadingState, Row, Screen } from '@/components/ui';
import { eventDate, money } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useApi } from '@/providers/api';
import { useAuth } from '@/providers/auth';

export default function ResaleScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const api = useApi();
  const router = useRouter();
  const { viewer } = useAuth();
  const params = useLocalSearchParams<{ event?: string }>();
  const query = useQuery({ queryKey: ['resale', params.event], queryFn: () => listPublicResaleListings(supabase, params.event, 30) });
  const key = useMemo(() => generateIdempotencyKey(), []);
  const [busy, setBusy] = useState<string | null>(null);

  async function buy(listingId: string) {
    if (!viewer) return router.push('/auth/login');
    setBusy(listingId);
    try {
      const tx = await api.resale.purchase(listingId, `${key}-${listingId}`);
      router.push({ pathname: '/resale/[transactionId]', params: { transactionId: tx.id } });
    } catch (error) {
      Alert.alert(t('common.error'), (error as Error).message);
    }
    setBusy(null);
  }

  return (
    <Screen edges={[]}>
      <Banner tone="demo" text={t('resale.demoNotice')} />
      <Card>
        <AppText variant="heading">{t('resale.rulesTitle')}</AppText>
        {(['ownership', 'priceCap', 'transfer', 'fraud'] as const).map((rule) => <AppText key={rule} variant="muted">• {t(`resale.rules.${rule}`)}</AppText>)}
      </Card>
      {viewer ? <Link href="/resale/sell" asChild><Button title={t('resale.createListing')} variant="outline" icon="pricetag-outline" /></Link> : null}
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : !query.data?.items.length ? <EmptyState icon="repeat-outline" title={t('resale.noListings')} /> : (
        query.data.items.map((listing) => (
          <Card key={listing.id}>
            <Row>{listing.environment === 'demo' ? <Badge label={t('app.demoBadge')} tone="demo" /> : null}{listing.offer_name ? <Badge label={listing.offer_name} /> : null}</Row>
            <AppText variant="label">{listing.event_title}</AppText>
            <AppText variant="caption">{eventDate(listing.event_starts_at, listing.event_timezone, locale)}</AppText>
            <AppText variant="caption">{t('resale.seller')} {listing.seller_alias} · {t('resale.sellerSales', { count: Number(listing.seller_completed_sales) })}</AppText>
            <AppText variant="muted">{t('resale.originalPrice')} : {money(Number(listing.original_price_minor), listing.currency, locale)}</AppText>
            <AppText variant="heading">{money(Number(listing.asking_price_minor) + Number(listing.buyer_fee_minor), listing.currency, locale)}</AppText>
            <Button title={busy === listing.id ? t('resale.buying') : t('resale.buy')} loading={busy === listing.id} disabled={Boolean(viewer && !viewer.hasAppAccess)} onPress={() => void buy(listing.id)} />
          </Card>
        ))
      )}
    </Screen>
  );
}
