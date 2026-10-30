import Ionicons from '@expo/vector-icons/Ionicons';
import type { SearchEventResult } from '@tamurt/types';
import { categoryVisual, generatePosterSvg } from '@tamurt/ui';
import { Link } from 'expo-router';
import { memo, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useLocale, useTranslations } from 'use-intl';
import { eventDate, money, nameOf } from '@/lib/format';
import { useTheme } from '@/providers/theme';
import { AppText, Badge } from './ui';

/** Affiche générative (aucun visuel tiers), identique au site web pour un même événement. */
export const Poster = memo(function Poster({ seed, category, height = 150 }: { seed: string; category: string; height?: number }) {
  const xml = useMemo(() => generatePosterSvg({ seed, category, width: 800, height: 600 }), [seed, category]);
  return (
    <View style={{ height, overflow: 'hidden' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={xml} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
    </View>
  );
});

export function EventCard({ event }: { event: SearchEventResult }) {
  const t = useTranslations();
  const locale = useLocale();
  const { colors } = useTheme();
  const cancelled = event.status === 'cancelled';
  const price = event.is_free
    ? t('common.free')
    : event.price_min_minor !== null && event.currency
      ? event.price_max_minor && event.price_max_minor !== event.price_min_minor
        ? t('common.fromPrice', { price: money(event.price_min_minor, event.currency, locale, event.country_code) })
        : money(event.price_min_minor, event.currency, locale, event.country_code)
      : null;
  return (
    <Link href={{ pathname: '/events/[slug]', params: { slug: event.slug } }} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={`${event.title}, ${eventDate(event.starts_at, event.timezone, locale, event.country_code)}`} style={({ pressed }) => ({ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.9 : 1 })}>
        <Poster seed={event.slug} category={event.category_slug} />
        <View style={{ position: 'absolute', top: 10, start: 10, flexDirection: 'row', gap: 6 }}>
          <View style={{ backgroundColor: categoryVisual(event.category_slug).color, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
            <AppText variant="caption" style={{ color: '#FFFFFF', fontWeight: '700' }}>{t(`categories.${event.category_slug}` as 'categories.other')}</AppText>
          </View>
          {event.is_demo ? <Badge label={t('app.demoBadge')} tone="demo" /> : null}
        </View>
        <View style={{ padding: 14, gap: 4 }}>
          <AppText variant="label" style={{ color: cancelled ? colors.danger : colors.primary }}>
            {cancelled ? t('event.cancelledBanner') : eventDate(event.starts_at, event.timezone, locale, event.country_code)}
          </AppText>
          <AppText variant="heading" numberOfLines={2} style={cancelled ? { textDecorationLine: 'line-through' } : undefined}>{event.title}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <AppText variant="muted" numberOfLines={1} style={{ flex: 1 }}>{[event.venue_name ?? event.location_name, nameOf(event.city_names, locale)].filter(Boolean).join(' · ')}</AppText>
            {price ? <AppText variant="label" style={{ color: event.is_free ? colors.success : colors.text }}>{price}</AppText> : null}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
