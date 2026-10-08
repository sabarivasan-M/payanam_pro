import type { GeoPoint } from '@/types/models';

const R = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Small deterministic offset, used to place the owner's shop next to the bike */
export const offsetPoint = (p: GeoPoint, dLat: number, dLng: number): GeoPoint => ({
  lat: p.lat + dLat,
  lng: p.lng + dLng,
});
