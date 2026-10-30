import Ionicons from '@expo/vector-icons/Ionicons';
import { COUNTRIES, COUNTRY_CODES, EVENT_CATEGORY_SLUGS, filtersToRpcArgs, type CountryCode, type EventSearchFilters } from '@tamurt/core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useTranslations } from 'use-intl';
import { EventCard } from '@/components/event-card';
import { AppText, Banner, Chip, EmptyState, ErrorState, LoadingState, Row, Screen, SectionTitle } from '@/components/ui';
import { useSearch } from '@/lib/queries';
import { useTheme } from '@/providers/theme';

function argsFor(filters: EventSearchFilters, pageSize: number) {
  const config = COUNTRIES[(filters.country ?? 'FR') as CountryCode];
  return filtersToRpcArgs(filters, { now: new Date(), timeZone: config.defaultTimeZone, week: config.week, pageSize });
}

function Section({ title, filters, onSeeAll }: { title: string; filters: EventSearchFilters; onSeeAll: () => void }) {
  const t = useTranslations();
  const query = useSearch(argsFor(filters, 6));
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle title={title} action={<Pressable accessibilityRole="link" onPress={onSeeAll}><AppText variant="label">{t('common.seeAll')}</AppText></Pressable>} />
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : query.data?.items.length ? query.data.items.map((event) => <EventCard key={event.id} event={event} />) : <EmptyState title={t('home.emptySection')} />}
    </View>
  );
}

/** Onglet « Découvrir » : recherche, pays, sélections du moment et catégories. */
export default function DiscoverScreen() {
  const t = useTranslations();
  const router = useRouter();
  const { colors } = useTheme();
  const [country, setCountry] = useState<CountryCode | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const base: EventSearchFilters = { categories: [], sort: 'date', page: 1, ...(country ? { country } : {}) };
  const openSearch = (params: Record<string, string> = {}) => router.push({ pathname: '/search', params: { ...(country ? { country } : {}), ...params } });

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 600); }} />}>
      <AppText variant="display">{t('home.heroTitle')}</AppText>
      <Pressable accessibilityRole="search" onPress={() => openSearch()} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 14 }}>
        <Ionicons name="search" size={20} color={colors.textSubtle} />
        <AppText variant="muted">{t('home.searchPlaceholder')}</AppText>
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label={t('common.allCountries')} selected={!country} onPress={() => setCountry(undefined)} />
        {COUNTRY_CODES.map((code) => <Chip key={code} label={t(`countries.${code}`)} selected={country === code} onPress={() => setCountry(code)} />)}
      </ScrollView>
      <Row>
        <Chip label={t('home.today')} onPress={() => openSearch({ date: 'today' })} />
        <Chip label={t('home.thisWeekend')} onPress={() => openSearch({ date: 'weekend' })} />
        <Chip label={t('home.free')} onPress={() => openSearch({ free: '1' })} />
        <Chip label={t('nav.map')} onPress={() => router.push({ pathname: '/map', params: country ? { country } : {} })} />
      </Row>
      <Banner tone="demo" text={t('app.demoBanner')} />
      <Section title={t('home.thisWeekend')} filters={{ ...base, date: 'weekend' }} onSeeAll={() => openSearch({ date: 'weekend' })} />
      <Section title={t('home.popular')} filters={{ ...base, sort: 'popularity' }} onSeeAll={() => openSearch({ sort: 'popularity' })} />
      <SectionTitle title={t('home.browseCategories')} />
      <Row>
        {EVENT_CATEGORY_SLUGS.map((slug) => <Chip key={slug} label={t(`categories.${slug}`)} onPress={() => openSearch({ category: slug })} />)}
      </Row>
      <Section title={t('home.upcoming')} filters={base} onSeeAll={() => openSearch()} />
    </Screen>
  );
}
