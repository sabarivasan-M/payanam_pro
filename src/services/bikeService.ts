import { db, getOrThrow } from '@/api/db';
import type {
  Bike,
  BikeAvailability,
  BikeStatus,
  BikeType,
  BikeWithMeta,
  GeoPoint,
  PhotoAngle,
  Transmission,
} from '@/types/models';
import { AppError } from '@/utils/errors';
import { haversineKm } from '@/utils/geo';

export interface BikeFilters {
  search?: string;
  maxDistanceKm?: number | null;
  maxPrice?: number | null;
  brands?: string[];
  bikeTypes?: BikeType[];
  availableOnly?: boolean;
  transmission?: Transmission | null;
  minRating?: number | null;
  forSale?: boolean;
  sort?: 'distance' | 'price_low' | 'price_high' | 'rating';
}

export const DEFAULT_FILTERS: BikeFilters = { sort: 'distance', availableOnly: false };

export type BikeInput = Omit<Bike, 'id' | 'createdAt' | 'updatedAt' | 'partnerId' | 'rating' | 'ratingCount' | 'status'> & {
  status?: BikeStatus;
};

export const PHOTO_ANGLES: PhotoAngle[] = ['front', 'rear', 'left', 'right', 'speedometer'];

async function attachMeta(bikes: Bike[], origin: GeoPoint | null): Promise<BikeWithMeta[]> {
  if (bikes.length === 0) return [];
  const ids = bikes.map((b) => b.id);
  const partnerIds = [...new Set(bikes.map((b) => b.partnerId))];
  const [images, partners] = await Promise.all([
    db.list('bike_images', { in: { field: 'bikeId', values: ids } }),
    db.list('rental_partners', { in: { field: 'id', values: partnerIds } }),
  ]);
  return bikes.map((b) => {
    const p = partners.find((x) => x.id === b.partnerId);
    return {
      ...b,
      images: images.filter((i) => i.bikeId === b.id),
      partner: p ? { id: p.id, businessName: p.businessName, rating: p.rating, ratingCount: p.ratingCount, city: p.city } : null,
      distanceKm: origin ? haversineKm(origin, { lat: b.pickupLat, lng: b.pickupLng }) : null,
    };
  });
}

export function applyFilters(bikes: BikeWithMeta[], f: BikeFilters): BikeWithMeta[] {
  const q = f.search?.trim().toLowerCase();
  let out = bikes.filter((b) => {
    if (q && !`${b.brand} ${b.model} ${b.pickupLabel}`.toLowerCase().includes(q)) return false;
    if (f.forSale && !b.forSale) return false;
    if (f.maxDistanceKm != null && b.distanceKm != null && b.distanceKm > f.maxDistanceKm) return false;
    if (f.maxPrice != null && b.dailyPrice > f.maxPrice) return false;
    if (f.brands?.length && !f.brands.includes(b.brand)) return false;
    if (f.bikeTypes?.length && !f.bikeTypes.includes(b.bikeType)) return false;
    if (f.availableOnly && b.status !== 'AVAILABLE') return false;
    if (f.transmission && b.transmission !== f.transmission) return false;
    if (f.minRating != null && b.rating < f.minRating) return false;
    return true;
  });
  const sort = f.sort ?? 'distance';
  out = [...out].sort((a, b) => {
    if (sort === 'price_low') return a.dailyPrice - b.dailyPrice;
    if (sort === 'price_high') return b.dailyPrice - a.dailyPrice;
    if (sort === 'rating') return b.rating - a.rating;
    return (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
  });
  return out;
}

export const countActiveFilters = (f: BikeFilters) =>
  [
    f.maxDistanceKm != null,
    f.maxPrice != null,
    !!f.brands?.length,
    !!f.bikeTypes?.length,
    !!f.availableOnly,
    !!f.transmission,
    f.minRating != null,
  ].filter(Boolean).length;

export const bikeService = {
  /** Customer marketplace listing (inactive bikes are hidden) */
  async listBikes(filters: BikeFilters, origin: GeoPoint | null): Promise<BikeWithMeta[]> {
    const bikes = (await db.list('bikes')).filter((b) => b.status !== 'INACTIVE');
    return applyFilters(await attachMeta(bikes, origin), filters);
  },

  async listBrands(): Promise<string[]> {
    const bikes = await db.list('bikes');
    return [...new Set(bikes.map((b) => b.brand))].sort();
  },

  async getBike(id: string, origin: GeoPoint | null): Promise<BikeWithMeta> {
    const bike = await getOrThrow('bikes', id);
    const [withMeta] = await attachMeta([bike], origin);
    return withMeta;
  },

  async listPartnerBikes(partnerId: string): Promise<BikeWithMeta[]> {
    const bikes = await db.list('bikes', { where: { partnerId }, orderBy: { field: 'createdAt', ascending: false } });
    return attachMeta(bikes, null);
  },

  async createBike(partnerId: string, input: BikeInput, images: Partial<Record<PhotoAngle, string>>) {
    const bike = await db.insert('bikes', {
      ...input,
      partnerId,
      status: input.status ?? 'AVAILABLE',
      rating: 0,
      ratingCount: 0,
    });
    await saveImages(bike.id, images);
    return bike;
  },

  async updateBike(id: string, input: Partial<BikeInput>, images?: Partial<Record<PhotoAngle, string>>) {
    const bike = await db.update('bikes', id, input);
    if (images) await saveImages(id, images);
    return bike;
  },

  async setStatus(bike: Bike, status: BikeStatus) {
    if ((bike.status === 'ACTIVE' || bike.status === 'BOOKED') && status !== bike.status) {
      const holding = await activeHolds(bike.id);
      if (holding.length > 0) throw new AppError('This bike has an ongoing booking. Finish it before changing status.');
    }
    return db.update('bikes', bike.id, { status });
  },

  async deleteBike(bike: Bike) {
    const holding = await activeHolds(bike.id);
    if (holding.length > 0 || bike.status === 'ACTIVE' || bike.status === 'BOOKED') {
      throw new AppError('This bike has an ongoing booking and cannot be deleted.');
    }
    const images = await db.list('bike_images', { where: { bikeId: bike.id } });
    await Promise.all(images.map((i) => db.remove('bike_images', i.id)));
    await db.remove('bikes', bike.id);
  },

  /** Time ranges during which the bike is held (bookings + owner blocks) */
  getHolds: (bikeId: string) => activeHolds(bikeId),

  async isAvailable(bike: Bike, start: Date, end: Date): Promise<{ ok: boolean; reason?: string }> {
    if (bike.status === 'MAINTENANCE') return { ok: false, reason: 'This bike is under maintenance.' };
    if (bike.status === 'INACTIVE') return { ok: false, reason: 'This bike is not listed right now.' };
    const holds = await activeHolds(bike.id);
    const clash = holds.find((h) => new Date(h.startTime) < end && new Date(h.endTime) > start);
    if (clash) return { ok: false, reason: 'The bike is already booked for part of this time.' };
    return { ok: true };
  },
};

async function activeHolds(bikeId: string): Promise<BikeAvailability[]> {
  const holds = await db.list('bike_availability', { where: { bikeId } });
  // Holds are created by bookingService and removed when a booking ends.
  return holds.filter((h) => h.reason === 'booking' || new Date(h.endTime).getTime() > Date.now());
}

async function saveImages(bikeId: string, images: Partial<Record<PhotoAngle, string>>) {
  const existing = await db.list('bike_images', { where: { bikeId } });
  for (const angle of PHOTO_ANGLES) {
    const url = images[angle];
    const current = existing.find((e) => e.angle === angle);
    if (url && current && current.url !== url) await db.update('bike_images', current.id, { url });
    else if (url && !current) await db.insert('bike_images', { bikeId, angle, url });
    else if (!url && current && angle in images) await db.remove('bike_images', current.id);
  }
}
