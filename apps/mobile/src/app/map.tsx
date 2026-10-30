import { listMapEvents } from '@tamurt/api-client';
import { COUNTRIES, isCountryCode } from '@tamurt/core';
import { categoryVisual } from '@tamurt/ui';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { useLocale, useTranslations } from 'use-intl';
import { AppText, Banner, Button, Screen } from '@/components/ui';
import { env } from '@/lib/env';
import { eventDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';

function regionFor(country?: string): Region {
  const center = country && isCountryCode(country) ? COUNTRIES[country].center : { lat: 36, lng: 3, zoom: 3 };
  const delta = 360 / 2 ** center.zoom;
  return { latitude: center.lat, longitude: center.lng, latitudeDelta: delta, longitudeDelta: delta };
}

/**
 * Carte : Apple Plans sur iOS (sans clé). Sur Android, Google Maps exige une clé
 * (GOOGLE_MAPS_ANDROID_API_KEY) : sans clé, la carte est remplacée par un message.
 */
export default function MapScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useLocalSearchParams<{ country?: string }>();
  const [region, setRegion] = useState<Region>(() => regionFor(params.country));
  const query = useQuery({
    queryKey: ['map', Math.round(region.latitude * 10), Math.round(region.longitude * 10), Math.round(region.latitudeDelta * 10)],
    queryFn: () =>
      listMapEvents(supabase, {
        p_min_lat: region.latitude - region.latitudeDelta / 2,
        p_max_lat: region.latitude + region.latitudeDelta / 2,
        p_min_lng: region.longitude - region.longitudeDelta / 2,
        p_max_lng: region.longitude + region.longitudeDelta / 2,
        p_from: new Date().toISOString(),
        p_limit: 300,
      }),
  });
  const mapUnavailable = Platform.OS === 'android' && !env.hasGoogleMapsKey;

  async function locate() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return Alert.alert(t('search.locationDenied'));
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setRegion({ latitude: position.coords.latitude, longitude: position.coords.longitude, latitudeDelta: 0.4, longitudeDelta: 0.4 });
  }

  if (mapUnavailable) {
    return (
      <Screen edges={[]}>
        <Banner tone="warning" text={t('map.unavailable')} />
        <Button title={t('nav.search')} onPress={() => router.push('/search')} />
      </Screen>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <MapView style={{ flex: 1 }} region={region} onRegionChangeComplete={setRegion} showsUserLocation={false} accessibilityLabel={t('map.title')}>
        {(query.data ?? []).map((point) => (
          <Marker
            key={point.id}
            coordinate={{ latitude: point.lat, longitude: point.lng }}
            pinColor={categoryVisual(point.category_slug).color}
            title={point.title}
            description={eventDate(point.starts_at, point.timezone, locale)}
            onCalloutPress={() => router.push({ pathname: '/events/[slug]', params: { slug: point.slug } })}
          />
        ))}
      </MapView>
      <View style={{ position: 'absolute', bottom: 24, start: 16, end: 16, gap: 8 }}>
        <AppText variant="caption" style={{ textAlign: 'center' }}>{t('map.eventsInArea', { count: query.data?.length ?? 0 })}</AppText>
        <Button title={t('map.locateMe')} icon="locate-outline" onPress={() => void locate()} accessibilityHint={t('search.locationConsent')} />
      </View>
    </View>
  );
}
