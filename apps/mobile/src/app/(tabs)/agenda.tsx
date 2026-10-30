import { getMyAgenda, listAgenda } from '@tamurt/api-client';
import { COUNTRIES, addMonthsToKey, getMonthBounds, groupByLocalDay, localDaysRange, parseDateKey, toLocalDateKey } from '@tamurt/core';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocale, useTranslations } from 'use-intl';
import { AppText, Badge, Button, Chip, EmptyState, ErrorState, LoadingState, Row, Screen } from '@/components/ui';
import { eventTime, intlLocale, nameOf } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/providers/theme';

type Mode = 'public' | 'mine';

interface AgendaItem {
  event_id: string;
  slug: string;
  title: string;
  starts_at: string;
  timezone: string;
  venue_name: string | null;
  city_names: unknown;
  is_demo: boolean;
  status: string;
}

/** Agenda mensuel (public ou personnel), rangé par jour local de chaque événement. */
export default function AgendaScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const { colors } = useTheme();
  const { viewer } = useAuth();
  const [mode, setMode] = useState<Mode>('public');
  const [anchor, setAnchor] = useState(() => toLocalDateKey(new Date(), COUNTRIES.FR.defaultTimeZone));
  const { year, month } = parseDateKey(anchor);
  const { firstKey, lastKey } = getMonthBounds(year, month);
  const range = localDaysRange(firstKey, lastKey, COUNTRIES.FR.defaultTimeZone);
  const query = useQuery({
    queryKey: ['agenda', mode, firstKey],
    enabled: mode === 'public' || Boolean(viewer),
    queryFn: async (): Promise<AgendaItem[]> =>
      mode === 'mine'
        ? getMyAgenda(supabase, range.start.toISOString(), range.end.toISOString())
        : listAgenda(supabase, { p_from: range.start.toISOString(), p_to: range.end.toISOString(), p_limit: 500 }),
  });
  const days = [...groupByLocalDay(query.data ?? []).entries()].sort(([a], [b]) => a.localeCompare(b));
  const monthLabel = new Intl.DateTimeFormat(intlLocale(locale), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${firstKey}T12:00:00Z`));

  return (
    <Screen>
      <AppText variant="title">{t('agenda.title')}</AppText>
      <Row>
        <Chip label={t('agenda.publicAgenda')} selected={mode === 'public'} onPress={() => setMode('public')} />
        <Chip label={t('agenda.myAgenda')} selected={mode === 'mine'} onPress={() => setMode('mine')} />
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <Button title="‹" variant="outline" onPress={() => setAnchor(addMonthsToKey(anchor, -1))} accessibilityHint={t('agenda.previousPeriod')} />
        <AppText variant="heading" style={{ textTransform: 'capitalize' }}>{monthLabel}</AppText>
        <Button title="›" variant="outline" onPress={() => setAnchor(addMonthsToKey(anchor, 1))} accessibilityHint={t('agenda.nextPeriod')} />
      </Row>
      <AppText variant="caption">{t('dates.localTimeCity', { timezone: '…' })}</AppText>
      {mode === 'mine' && !viewer ? (
        <EmptyState icon="calendar-outline" title={t('agenda.personalEmpty')} action={<Link href="/auth/login" asChild><Button title={t('nav.login')} /></Link>} />
      ) : query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : days.length === 0 ? (
        <EmptyState icon="calendar-outline" title={mode === 'mine' ? t('agenda.personalEmpty') : t('agenda.noEventsPeriod')} />
      ) : (
        days.map(([key, items]) => (
          <View key={key} style={{ gap: 8 }}>
            <AppText variant="label" style={{ textTransform: 'capitalize', color: colors.primary }}>
              {new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${key}T12:00:00Z`))}
            </AppText>
            {items.map((item) => (
              <Link key={`${item.event_id}-${item.starts_at}`} href={{ pathname: '/events/[slug]', params: { slug: item.slug } }} asChild>
                <Pressable accessibilityRole="link" style={{ flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border }}>
                  <AppText variant="label" style={{ width: 52, color: colors.primary }}>{eventTime(item.starts_at, item.timezone, locale)}</AppText>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="label" numberOfLines={2}>{item.title}</AppText>
                    <AppText variant="caption" numberOfLines={1}>{[item.venue_name, nameOf(item.city_names, locale)].filter(Boolean).join(' · ')}</AppText>
                    <Row>{item.is_demo ? <Badge label={t('app.demoBadge')} tone="demo" /> : null}{item.status === 'cancelled' ? <Badge label={t('event.cancelledBanner')} tone="danger" /> : null}</Row>
                  </View>
                </Pressable>
              </Link>
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}
