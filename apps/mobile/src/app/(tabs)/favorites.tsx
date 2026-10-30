import { Link } from 'expo-router';
import { Pressable, RefreshControl, View } from 'react-native';
import { useLocale, useTranslations } from 'use-intl';
import { Poster } from '@/components/event-card';
import { AppText, Badge, Button, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { eventDate, nameOf } from '@/lib/format';
import { useFavorites } from '@/lib/queries';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/providers/theme';

export default function FavoritesScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const { colors } = useTheme();
  const { viewer } = useAuth();
  const query = useFavorites(Boolean(viewer));
  return (
    <Screen refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}>
      <AppText variant="title">{t('favorites.title')}</AppText>
      {!viewer ? (
        <EmptyState icon="heart-outline" title={t('common.requiresLogin')} action={<Link href="/auth/login" asChild><Button title={t('nav.login')} /></Link>} />
      ) : query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : !query.data?.length ? (
        <EmptyState icon="heart-outline" title={t('favorites.empty')} text={t('favorites.emptyHint')} />
      ) : (
        query.data.map(({ event }) => (
          <Link key={event.id} href={{ pathname: '/events/[slug]', params: { slug: event.slug } }} asChild>
            <Pressable accessibilityRole="link" style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
              <View style={{ width: 96 }}><Poster seed={event.slug} category={event.category_slug} height={96} /></View>
              <View style={{ flex: 1, padding: 12, gap: 3 }}>
                <AppText variant="caption" style={{ color: colors.primary }}>{eventDate(event.starts_at, event.timezone, locale)}</AppText>
                <AppText variant="label" numberOfLines={2}>{event.title}</AppText>
                <AppText variant="caption" numberOfLines={1}>{[event.venue?.name, nameOf(event.city?.names, locale)].filter(Boolean).join(' · ')}</AppText>
                {event.is_demo ? <Badge label={t('app.demoBadge')} tone="demo" /> : null}
              </View>
            </Pressable>
          </Link>
        ))
      )}
    </Screen>
  );
}
