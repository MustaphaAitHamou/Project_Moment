import { COUNTRIES, EVENT_CATEGORY_SLUGS, filtersToRpcArgs, parseSearchParams, type CountryCode } from '@tamurt/core';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { useTranslations } from 'use-intl';
import { EventCard } from '@/components/event-card';
import { AppText, Chip, EmptyState, ErrorState, LoadingState, Row, Screen, TextField } from '@/components/ui';
import { useSearch } from '@/lib/queries';

export default function SearchScreen() {
  const t = useTranslations();
  const params = useLocalSearchParams<Record<string, string>>();
  const [q, setQ] = useState(params.q ?? '');
  const [submitted, setSubmitted] = useState(params.q ?? '');
  const [category, setCategory] = useState<string | undefined>(params.category);
  const [free, setFree] = useState(params.free === '1');
  const [date, setDate] = useState<string | undefined>(params.date);
  const filters = useMemo(() => parseSearchParams({ ...params, q: submitted, ...(category ? { category } : { category: undefined }), free: free ? '1' : undefined, date }), [params, submitted, category, free, date]);
  const config = COUNTRIES[(filters.country ?? 'FR') as CountryCode];
  const args = filtersToRpcArgs(filters, { now: new Date(), timeZone: config.defaultTimeZone, week: config.week, pageSize: 30 });
  const query = useSearch(args);
  return (
    <Screen edges={[]}>
      <TextField label={t('nav.search')} value={q} onChangeText={setQ} placeholder={t('search.placeholder')} returnKeyType="search" onSubmitEditing={() => setSubmitted(q.trim())} autoCapitalize="none" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {(['today', 'weekend', 'this_week', 'this_month'] as const).map((preset) => <Chip key={preset} label={t(`dates.${preset}`)} selected={date === preset} onPress={() => setDate(date === preset ? undefined : preset)} />)}
        <Chip label={t('search.onlyFree')} selected={free} onPress={() => setFree(!free)} />
      </ScrollView>
      <Row>{EVENT_CATEGORY_SLUGS.map((slug) => <Chip key={slug} label={t(`categories.${slug}`)} selected={category === slug} onPress={() => setCategory(category === slug ? undefined : slug)} />)}</Row>
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : (
        <>
          <AppText variant="label">{t('search.results', { count: Number(query.data?.total ?? 0) })}</AppText>
          {query.data?.items.length ? query.data.items.map((event) => <EventCard key={event.id} event={event} />) : <EmptyState icon="search-outline" title={t('search.noResults')} text={t('search.noResultsHint')} />}
        </>
      )}
    </Screen>
  );
}
