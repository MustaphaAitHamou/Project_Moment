import Ionicons from '@expo/vector-icons/Ionicons';
import { getMyTicket } from '@tamurt/api-client';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useLocale, useTranslations } from 'use-intl';
import { AppText, Badge, Banner, Button, Card, ErrorState, LoadingState, Row, Screen } from '@/components/ui';
import { eventDate, money, nameOf } from '@/lib/format';
import { readCache } from '@/lib/offline';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/providers/theme';

/**
 * Billet. En démonstration : spécimen non valable, SANS code d'accès ni QR code. Un billet réel
 * n'est délivré que par le partenaire de billetterie (un QR importé ne prouve rien).
 */
export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTranslations();
  const locale = useLocale();
  const { colors } = useTheme();
  const query = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      try {
        return await getMyTicket(supabase, id);
      } catch (error) {
        const cached = await readCache<{ id: string }[]>('tickets');
        const found = cached?.data.find((ticket) => ticket.id === id);
        if (found) return found as Awaited<ReturnType<typeof getMyTicket>>;
        throw error;
      }
    },
  });
  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const ticket = query.data;
  const demo = ticket.environment === 'demo';
  const upcoming = new Date(ticket.event.ends_at ?? ticket.event.starts_at) > new Date();
  return (
    <Screen edges={[]}>
      <Card style={{ borderStyle: 'dashed', borderWidth: 2, borderColor: colors.borderStrong }}>
        {demo ? <AppText variant="label" style={{ textAlign: 'center', color: colors.demo, backgroundColor: colors.demoSoft, padding: 8, borderRadius: 8 }}>{t('tickets.demoSpecimenTitle')}</AppText> : null}
        <Row>
          <Badge label={t(`tickets.status.${ticket.status}` as 'tickets.status.issued')} tone={ticket.status === 'issued' ? 'success' : 'neutral'} />
          {demo ? <Badge label={t('app.demoBadge')} tone="demo" /> : null}
        </Row>
        <AppText variant="title">{ticket.event.title}</AppText>
        <AppText variant="muted">{eventDate(ticket.event.starts_at, ticket.event.timezone, locale)}</AppText>
        <AppText variant="muted">{[ticket.event.venue?.name, nameOf(ticket.event.city?.names, locale)].filter(Boolean).join(', ')}</AppText>
        <AppText variant="label">{t('tickets.holder')} : {ticket.holder_name ?? '—'}</AppText>
        <AppText variant="label">{t('tickets.offer')} : {ticket.offer?.name ?? '—'}</AppText>
        <AppText variant="label">{t('common.price')} : {money(Number(ticket.original_price_minor), ticket.currency, locale)}</AppText>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.surfaceSunken, borderRadius: 12, padding: 12 }}>
          <Ionicons name="ban-outline" size={20} color={colors.textMuted} />
          <AppText variant="muted" style={{ flex: 1 }}>{demo ? t('tickets.noAccessCode') : t('tickets.providerDelivery')}</AppText>
        </View>
      </Card>
      {demo ? <Banner tone="demo" text={t('tickets.demoSpecimenText')} /> : null}
      <AppText variant="caption">{ticket.offline_allowed ? t('tickets.offlineAvailable') : t('tickets.offlineNotAllowed')}</AppText>
      {ticket.status === 'issued' && upcoming && ticket.offer?.resale_allowed ? (
        <Link href={{ pathname: '/resale/sell', params: { ticket: ticket.id } }} asChild><Button title={t('tickets.resell')} icon="repeat-outline" variant="outline" /></Link>
      ) : null}
    </Screen>
  );
}
