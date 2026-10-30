'use client';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import { categoryVisual } from '@tamurt/ui';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface Props {
  center: { lat: number; lng: number; zoom: number };
  styleUrl: string;
  categories?: string[];
  free?: boolean;
}

interface Point {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  timezone: string;
  category_slug: string;
  is_demo: boolean;
  lat: number;
  lng: number;
}

/**
 * Carte des événements (MapLibre + tuiles OpenFreeMap, sans clé ni service payant).
 * Les points sont chargés pour la zone visible et regroupés (clusters). La géolocalisation
 * n'est demandée qu'au clic sur le bouton de localisation.
 */
export function EventMap({ center, styleUrl, categories, free }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const container = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let map: MapLibreMap | undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let loaded = false;
    // Fond de carte injoignable (réseau, bloqueur, WebGL absent) : repli sur la liste.
    const watchdog = setTimeout(() => {
      if (!loaded) setUnavailable(true);
    }, 15_000);

    async function init() {
      const maplibre = await import('maplibre-gl');
      maplibre.setWorkerUrl(`${window.location.origin}/maplibre/maplibre-gl-worker.mjs`);
      if (cancelled || !container.current) return;
      try {
        map = new maplibre.Map({ container: container.current, style: styleUrl, center: [center.lng, center.lat], zoom: center.zoom, attributionControl: { compact: true } });
      } catch {
        setUnavailable(true);
        return;
      }
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new maplibre.GeolocateControl({ positionOptions: { enableHighAccuracy: false }, trackUserLocation: false }), 'top-right');

      const load = async () => {
        if (!map) return;
        const bounds = map.getBounds();
        const { data, error } = await getSupabaseBrowserClient().rpc('map_events', {
          p_min_lat: bounds.getSouth(),
          p_min_lng: bounds.getWest(),
          p_max_lat: bounds.getNorth(),
          p_max_lng: bounds.getEast(),
          p_from: new Date().toISOString(),
          ...(categories?.length ? { p_categories: categories } : {}),
          ...(free ? { p_free: true } : {}),
          p_limit: 1000,
        });
        if (error || !map) return;
        const points = (data ?? []) as Point[];
        setCount(points.length);
        (map.getSource('events') as GeoJSONSource | undefined)?.setData({
          type: 'FeatureCollection',
          features: points.map((point) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
            properties: { slug: point.slug, title: point.title, startsAt: point.starts_at, timezone: point.timezone, color: categoryVisual(point.category_slug).color, demo: point.is_demo },
          })),
        });
      };

      map.on('load', () => {
        loaded = true;
        setUnavailable(false);
        if (!map) return;
        map.addSource('events', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterRadius: 48, clusterMaxZoom: 14 });
        map.addLayer({ id: 'clusters', type: 'circle', source: 'events', filter: ['has', 'point_count'], paint: { 'circle-color': '#E8401A', 'circle-opacity': 0.9, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2, 'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 30] } });
        map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'events', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 13 }, paint: { 'text-color': '#FFFFFF' } });
        map.addLayer({ id: 'points', type: 'circle', source: 'events', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': ['get', 'color'], 'circle-radius': 8, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2 } });
        void load();
      });
      map.on('moveend', () => {
        clearTimeout(timer);
        timer = setTimeout(() => void load(), 250);
      });
      map.on('click', 'clusters', async (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        const source = map?.getSource('events') as GeoJSONSource | undefined;
        if (!feature || !source || feature.geometry.type !== 'Point') return;
        const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id as number);
        map?.easeTo({ center: feature.geometry.coordinates as [number, number], zoom });
      });
      map.on('click', 'points', (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== 'Point' || !map) return;
        const props = feature.properties as { slug: string; title: string; startsAt: string; timezone: string; demo: boolean };
        // Contenu construit avec textContent : aucun HTML issu des données n'est interprété.
        const root = document.createElement('div');
        root.className = 'space-y-1 text-sm';
        const date = document.createElement('p');
        date.className = 'font-semibold text-primary';
        date.textContent = new Intl.DateTimeFormat(locale, { timeZone: props.timezone, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(props.startsAt));
        const link = document.createElement('a');
        link.href = `/${locale}/events/${encodeURIComponent(props.slug)}`;
        link.className = 'font-bold hover:underline';
        link.textContent = props.title;
        root.append(date, link);
        if (props.demo) {
          const badge = document.createElement('p');
          badge.className = 'text-xs text-demo';
          badge.textContent = t('app.demoBadge');
          root.append(badge);
        }
        new maplibre.Popup({ offset: 12, maxWidth: '260px' }).setLngLat(feature.geometry.coordinates as [number, number]).setDOMContent(root).addTo(map);
      });
      for (const layer of ['clusters', 'points']) {
        map.on('mouseenter', layer, () => { if (map) map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { if (map) map.getCanvas().style.cursor = ''; });
      }
      map.on('error', () => {
        if (!loaded) setUnavailable(true);
      });
    }

    init().catch(() => setUnavailable(true));
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(watchdog);
      map?.remove();
    };
  }, [center.lat, center.lng, center.zoom, styleUrl, categories, free, locale, t]);

  return (
    <div className="space-y-2">
      {unavailable ? <Alert tone="warning">{t('map.unavailable')}</Alert> : null}
      <div ref={container} className="h-[60vh] min-h-80 w-full overflow-hidden rounded-xl border border-line bg-sunken" role="region" aria-label={t('map.title')} />
      <p className="text-sm text-muted" role="status">{unavailable ? null : count === null ? t('common.loading') : t('map.eventsInArea', { count })}</p>
    </div>
  );
}
