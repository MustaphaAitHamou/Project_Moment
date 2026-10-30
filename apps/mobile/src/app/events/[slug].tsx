import Ionicons from '@expo/vector-icons/Ionicons';
import { generateIdempotencyKey, offerSellability } from '@tamurt/core';
import { categoryVisual } from '@tamurt/ui';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Linking, Platform, Pressable, Share, View } from 'react-native';
import { useLocale, useTranslations } from 'use-intl';
import { Poster } from '@/components/event-card';
import { AppText, Badge, Banner, Button, Card, Chip, ErrorState, LoadingState, Row, Screen } from '@/components/ui';
import { addToDeviceCalendar } from '@/lib/calendar';
import { webUrl } from '@/lib/env';
import { eventRange, money, nameOf } from '@/lib/format';
import { useEvent, useIsFavorite, useToggleFavorite } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { useApi } from '@/providers/api';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/providers/theme';

export default function EventScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const api = useApi();
  const { colors } = useTheme();
  const { viewer } = useAuth();
  const query = useEvent(slug);
  const event = query.data;
  const favorite = useIsFavorite(viewer?.id, event?.id);
  const toggleFavorite = useToggleFavorite(viewer?.id, event?.id ?? '');
  const [offerId, setOfferId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const reserveKey = useMemo(() => generateIdempotencyKey(), []);

  if (query.isLoading) return <LoadingState />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;
  if (!event) return <ErrorState message={t('event.notFound')} />;

  const now = new Date();
  const isPast = new Date(event.ends_at ?? event.starts_at) < now;
  const offers = [...event.offers].filter((offer) => offer.status !== 'draft').sort((a, b) => a.sort_order - b.sort_order);
  const selected = offers.find((offer) => offer.id === offerId) ?? offers.find((offer) => offerSellability(offer, event, now) === 'ok');
  const lat = event.venue?.lat ?? event.lat;
  const lng = event.venue?.lng ?? event.lng;
  const placeName = event.venue?.name ?? event.location_name ?? nameOf(event.city.names, locale);
  const requireLogin = () => router.push('/auth/login');

  async function reserve() {
    if (!selected) return;
    if (!viewer) return requireLogin();
    setBusy(true);
    try {
      const reservation = await api.checkout.reserve({ offerId: selected.id, quantity }, `${reserveKey}-${selected.id}-${quantity}`);
      router.push({ pathname: '/checkout/[reservationId]', params: { reservationId: reservation.id } });
    } catch (error) {
      Alert.alert(t('common.error'), (error as Error).message);
    }
    setBusy(false);
  }

  async function register() {
    if (!viewer) return requireLogin();
    const { error } = await supabase.rpc('register_for_event', { p_event_id: event!.id, p_quantity: 1 });
    Alert.alert(error ? t('common.error') : t('event.registrationConfirmed'), error?.message);
  }

  async function addCalendar() {
    const result = await addToDeviceCalendar({
      title: event!.title,
      startDate: new Date(event!.starts_at),
      endDate: new Date(event!.ends_at ?? new Date(event!.starts_at).getTime() + 2 * 3_600_000),
      location: placeName,
      notes: event!.summary ?? undefined,
      url: webUrl(locale, `/events/${event!.slug}`),
      timeZone: event!.timezone,
    }).catch(() => 'unavailable' as const);
    Alert.alert(result === 'added' ? t('agenda.addedToDeviceCalendar') : result === 'denied' ? t('agenda.calendarPermissionDenied') : t('common.notAvailable'));
  }

  const openDirections = () => {
    if (lat === null || lat === undefined || lng === null || lng === undefined) return;
    const label = encodeURIComponent(placeName);
    void Linking.openURL(Platform.OS === 'ios' ? `http://maps.apple.com/?daddr=${lat},${lng}&q=${label}` : `geo:${lat},${lng}?q=${lat},${lng}(${label})`);
  };

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <Screen edges={[]} padded={false}>
        <Poster seed={event.slug} category={event.category_slug} height={200} />
        <View style={{ padding: 16, gap: 14 }}>
          {event.is_demo ? <Banner tone="demo" text={t('event.demoBanner')} /> : null}
          {event.status === 'cancelled' ? <Banner tone="danger" title={t('event.cancelledBanner')} text={event.cancellation_reason ?? undefined} /> : null}
          {isPast && event.status !== 'cancelled' ? <Banner tone="info" text={t('event.pastBanner')} /> : null}
          <Row>
            <View style={{ backgroundColor: categoryVisual(event.category_slug).color, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
              <AppText variant="caption" style={{ color: '#FFFFFF', fontWeight: '700' }}>{t(`categories.${event.category_slug}` as 'categories.other')}</AppText>
            </View>
            {event.is_demo ? <Badge label={t('app.demoBadge')} tone="demo" /> : null}
          </Row>
          <AppText variant="display">{event.title}</AppText>
          {event.summary ? <AppText variant="muted">{event.summary}</AppText> : null}
          <AppText variant="label">{t('event.organizer')} : {event.organizer.name}{event.organizer.verification_status === 'verified' ? ' ✓' : ''}</AppText>
          <Row>
            <Button title={favorite.data ? t('event.removeFavorite') : t('event.addFavorite')} variant="outline" icon={favorite.data ? 'heart' : 'heart-outline'} loading={toggleFavorite.isPending} onPress={() => (viewer ? toggleFavorite.mutate(!favorite.data) : requireLogin())} />
            <Button title={t('event.share')} variant="outline" icon="share-outline" onPress={() => void Share.share({ message: `${t('event.shareText', { title: event.title })} ${webUrl(locale, `/events/${event.slug}`)}` })} />
            {!isPast && event.status !== 'cancelled' ? <Button title={t('agenda.addToCalendar')} variant="outline" icon="calendar-outline" onPress={() => void addCalendar()} /> : null}
          </Row>
          <Card>
            <Row><Ionicons name="time-outline" size={18} color={colors.primary} /><AppText variant="label" style={{ flex: 1 }}>{eventRange(event.starts_at, event.ends_at, event.timezone, locale, event.city.country_code)}</AppText></Row>
            <AppText variant="caption">{t('dates.localTimeCity', { timezone: event.timezone })}</AppText>
          </Card>
          <Card>
            <Row><Ionicons name="location-outline" size={18} color={colors.primary} /><AppText variant="label" style={{ flex: 1 }}>{event.is_online ? t('event.online') : placeName}</AppText></Row>
            {!event.is_online ? <AppText variant="muted">{[event.venue?.address_line1 ?? event.address_line, event.venue?.postal_code ?? event.postal_code, nameOf(event.city.names, locale)].filter(Boolean).join(', ')}</AppText> : null}
            {lat !== null && lat !== undefined ? <Button title={t('event.directions')} variant="ghost" icon="navigate-outline" onPress={openDirections} /> : null}
          </Card>

          <Card>
            <AppText variant="heading">{event.registration_mode === 'tickets' ? t('event.tickets') : t('event.price')}</AppText>
            {event.status === 'cancelled' || isPast ? (
              <AppText variant="muted">{t('event.ticketsUnavailable')}</AppText>
            ) : event.registration_mode === 'tickets' && offers.length ? (
              <>
                {offers.map((offer) => {
                  const reason = offerSellability(offer, event, now);
                  const active = selected?.id === offer.id;
                  return (
                    <Pressable key={offer.id} accessibilityRole="radio" accessibilityState={{ checked: active, disabled: reason !== 'ok' }} disabled={reason !== 'ok'} onPress={() => { setOfferId(offer.id); setQuantity(offer.min_per_order); }} style={{ borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : colors.surface, borderRadius: 12, padding: 12, opacity: reason === 'ok' ? 1 : 0.55, gap: 4 }}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <AppText variant="label">{offer.name}</AppText>
                        <AppText variant="label">{money(offer.face_value_minor, offer.currency, locale, event.city.country_code)}</AppText>
                      </Row>
                      <Row>
                        {offer.environment === 'demo' ? <Badge label={t('checkout.demoMode')} tone="demo" /> : null}
                        {offer.available_estimate === 0 ? <Badge label={t('common.soldOut')} /> : null}
                      </Row>
                    </Pressable>
                  );
                })}
                {selected ? (
                  <Row>
                    <AppText variant="label">{t('checkout.quantity')}</AppText>
                    {Array.from({ length: Math.min(selected.max_per_order, 6) - selected.min_per_order + 1 }, (_, index) => selected.min_per_order + index).map((n) => (
                      <Chip key={n} label={String(n)} selected={quantity === n} onPress={() => setQuantity(n)} />
                    ))}
                  </Row>
                ) : null}
                {viewer && !viewer.hasAppAccess ? <Banner tone="info" text={t('checkout.betaToBuy')} /> : null}
                <Button title={viewer ? t('checkout.reserve') : t('checkout.loginToBuy')} icon="ticket-outline" loading={busy} disabled={!selected || Boolean(viewer && !viewer.hasAppAccess)} onPress={() => void reserve()} />
                <AppText variant="caption">{t('checkout.liveDisabled')}</AppText>
              </>
            ) : event.registration_mode === 'free_registration' ? (
              <Button title={t('event.register')} icon="checkmark-circle-outline" onPress={() => void register()} />
            ) : (
              <AppText variant="muted">{event.is_free ? t('event.free') : t('event.externalInfoOnly')}</AppText>
            )}
          </Card>

          {event.description ? (
            <>
              <AppText variant="heading">{t('event.about')}</AppText>
              <AppText>{event.description}</AppText>
            </>
          ) : null}
          {event.artists.length ? (
            <>
              <AppText variant="heading">{t('event.artists')}</AppText>
              <Row>{event.artists.map(({ artist }) => (artist ? <Badge key={artist.id} label={artist.name} /> : null))}</Row>
            </>
          ) : null}
          <Link href={{ pathname: '/resale', params: { event: event.id } }} asChild>
            <Button title={t('nav.resale')} variant="ghost" icon="repeat-outline" />
          </Link>
        </View>
      </Screen>
    </>
  );
}
