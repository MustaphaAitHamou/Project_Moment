import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { Pressable, RefreshControl, View } from 'react-native';
import { useLocale, useTranslations } from 'use-intl';
import { AppText, Badge, Banner, Button, EmptyState, ErrorState, LoadingState, Row, Screen } from '@/components/ui';
import { eventDate, nameOf } from '@/lib/format';
import { useMyTickets } from '@/lib/queries';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/providers/theme';

export default function TicketsScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const { colors } = useTheme();
  const { viewer } = useAuth();
  const query = useMyTickets(Boolean(viewer));

  if (!viewer) {
    return (
      <Screen>
        <AppText variant="title">{t('tickets.title')}</AppText>
        <EmptyState icon="ticket-outline" title={t('common.requiresLogin')} action={<Link href="/auth/login" asChild><Button title={t('nav.login')} /></Link>} />
      </Screen>
    );
  }
  const tickets = query.data?.tickets ?? [];
  // Référence temporelle : instant du dernier chargement des billets (pas d'horloge pendant le rendu).
  const now = query.dataUpdatedAt;
  const upcoming = tickets.filter((ticket) => new Date(ticket.event.ends_at ?? ticket.event.starts_at).getTime() >= now);
  const past = tickets.filter((ticket) => new Date(ticket.event.ends_at ?? ticket.event.starts_at).getTime() < now);

  const list = (items: typeof tickets) =>
    items.map((ticket) => (
      <Link key={ticket.id} href={{ pathname: '/tickets/[id]', params: { id: ticket.id } }} asChild>
        <Pressable accessibilityRole="link" style={{ flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="ticket" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <AppText variant="label" numberOfLines={1}>{ticket.event.title}</AppText>
            <AppText variant="caption">{eventDate(ticket.event.starts_at, ticket.event.timezone, locale)}</AppText>
            <AppText variant="caption" numberOfLines={1}>{[ticket.event.venue?.name, nameOf(ticket.event.city?.names, locale)].filter(Boolean).join(' · ')}</AppText>
            <Row>
              <Badge label={t(`tickets.status.${ticket.status}` as 'tickets.status.issued')} tone={ticket.status === 'issued' ? 'success' : 'neutral'} />
              {ticket.environment === 'demo' ? <Badge label={t('app.demoBadge')} tone="demo" /> : null}
            </Row>
          </View>
        </Pressable>
      </Link>
    ));

  return (
    <Screen refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}>
      <AppText variant="title">{t('tickets.title')}</AppText>
      {query.data?.offline ? <Banner tone="warning" text={t('common.offlineCached')} /> : null}
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : tickets.length === 0 ? (
        <EmptyState icon="ticket-outline" title={t('tickets.empty')} text={t('tickets.emptyHint')} />
      ) : (
        <>
          <AppText variant="heading">{t('tickets.upcoming')}</AppText>
          {upcoming.length ? list(upcoming) : <AppText variant="muted">{t('common.empty')}</AppText>}
          {past.length ? <AppText variant="heading">{t('tickets.past')}</AppText> : null}
          {list(past)}
        </>
      )}
      <Link href="/orders" asChild><Button title={t('nav.orders')} variant="outline" icon="receipt-outline" /></Link>
    </Screen>
  );
}
