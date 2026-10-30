import type { DistanceUnit } from './countries';

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371.0088;
export const KM_PER_MILE = 1.609344;

export function isValidLatLng(point: Partial<LatLng> | null | undefined): point is LatLng {
  return (
    !!point &&
    typeof point.lat === 'number' &&
    typeof point.lng === 'number' &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  );
}

/** Distance orthodromique (formule de haversine), en kilomètres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function kmToMiles(km: number): number {
  return km / KM_PER_MILE;
}

export function milesToKm(miles: number): number {
  return miles * KM_PER_MILE;
}

export function formatDistance(km: number, unit: DistanceUnit, locale: string): string {
  const value = unit === 'mi' ? kmToMiles(km) : km;
  const digits = value < 10 ? 1 : 0;
  const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);
  return `${formatted} ${unit}`;
}

/** Emprise approximative autour d'un point (pour les requêtes cartographiques). */
export function boundingBox(center: LatLng, radiusKm: number): { minLat: number; minLng: number; maxLat: number; maxLng: number } {
  const latDelta = radiusKm / 110.574;
  const lngDelta = radiusKm / (111.32 * Math.max(Math.cos((center.lat * Math.PI) / 180), 0.01));
  return {
    minLat: Math.max(center.lat - latDelta, -90),
    maxLat: Math.min(center.lat + latDelta, 90),
    minLng: Math.max(center.lng - lngDelta, -180),
    maxLng: Math.min(center.lng + lngDelta, 180),
  };
}

export const SEARCH_RADII_KM = [5, 10, 25, 50, 100] as const;
