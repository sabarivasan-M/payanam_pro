import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';
import { delay } from '@/lib/id';
import type { GeoPoint } from '@/types/models';
import { haversineKm } from '@/utils/geo';

/**
 * Map / location provider.
 * MOCK routing: an L-shaped "street" route with a 1.3× road factor and 22 km/h city speed.
 * To use Google Directions / Mapbox later, implement `MapProvider.getRoute` on a server
 * (keeps the API key off the device) and swap `routeProvider` below.
 */
export interface RouteResult {
  points: GeoPoint[];
  distanceKm: number;
  etaMinutes: number;
  provider: string;
  isMock: boolean;
}

export interface MapProvider {
  name: string;
  isMock: boolean;
  getRoute(from: GeoPoint, to: GeoPoint): Promise<RouteResult>;
}

export const DEFAULT_LOCATION: GeoPoint & { label: string } = {
  lat: 13.0569,
  lng: 80.2425,
  label: 'Nungambakkam, Chennai',
};

export const POPULAR_AREAS: (GeoPoint & { label: string })[] = [
  DEFAULT_LOCATION,
  { lat: 13.0418, lng: 80.2341, label: 'T. Nagar, Chennai' },
  { lat: 13.0012, lng: 80.2565, label: 'Adyar, Chennai' },
  { lat: 12.9815, lng: 80.218, label: 'Velachery, Chennai' },
  { lat: 13.085, lng: 80.2101, label: 'Anna Nagar, Chennai' },
  { lat: 13.0339, lng: 80.2619, label: 'Mylapore, Chennai' },
];

const mockRouteProvider: MapProvider = {
  name: 'mock',
  isMock: true,
  async getRoute(from, to) {
    await delay(350);
    const mid1: GeoPoint = { lat: from.lat + (to.lat - from.lat) * 0.15, lng: from.lng };
    const mid2: GeoPoint = { lat: mid1.lat, lng: from.lng + (to.lng - from.lng) * 0.6 };
    const mid3: GeoPoint = { lat: to.lat, lng: mid2.lng };
    const points = [from, mid1, mid2, mid3, to];
    const distanceKm = Math.max(0.3, haversineKm(from, to) * 1.3);
    return { points, distanceKm, etaMinutes: Math.max(2, Math.round((distanceKm / 22) * 60)), provider: 'mock', isMock: true };
  },
};

const routeProvider: MapProvider = mockRouteProvider;

export type LocationResult =
  | { status: 'granted'; point: GeoPoint; label: string; isMock: false }
  | { status: 'denied' | 'unavailable'; point: GeoPoint; label: string; isMock: true };

export const mapService = {
  provider: routeProvider.name,

  getRoute: (from: GeoPoint, to: GeoPoint) => routeProvider.getRoute(from, to),

  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    const res = await Location.getForegroundPermissionsAsync();
    return res.status as 'granted' | 'denied' | 'undetermined';
  },

  /** Real device location when permitted; falls back to the demo location otherwise. */
  async getCurrentLocation(): Promise<LocationResult> {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        return { status: 'denied', point: DEFAULT_LOCATION, label: DEFAULT_LOCATION.label, isMock: true };
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      let label = 'Current location';
      if (Platform.OS !== 'web') {
        try {
          const [place] = await Location.reverseGeocodeAsync({ latitude: point.lat, longitude: point.lng });
          if (place) label = [place.district ?? place.subregion, place.city].filter(Boolean).join(', ') || label;
        } catch {
          // Reverse geocoding is optional.
        }
      }
      return { status: 'granted', point, label, isMock: false };
    } catch {
      return { status: 'unavailable', point: DEFAULT_LOCATION, label: DEFAULT_LOCATION.label, isMock: true };
    }
  },

  /** Hands off turn-by-turn navigation to Google Maps (no API key needed). */
  async openNavigation(to: GeoPoint) {
    await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}&travelmode=driving`);
  },
};
