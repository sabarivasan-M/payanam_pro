import type { BikeFilters } from '@/services/bikeService';
import type { GeoPoint } from '@/types/models';

export const qk = {
  bikes: (filters: BikeFilters, origin: GeoPoint | null) => ['bikes', filters, origin] as const,
  bikesAll: ['bikes'] as const,
  brands: ['brands'] as const,
  bike: (id: string) => ['bike', id] as const,
  partnerBikes: (partnerId: string) => ['bikes', 'partner', partnerId] as const,
  bikeHolds: (id: string) => ['bike', id, 'holds'] as const,
  bookingsAll: ['bookings'] as const,
  customerBookings: (id: string) => ['bookings', 'customer', id] as const,
  partnerBookings: (id: string) => ['bookings', 'partner', id] as const,
  currentBooking: (id: string) => ['bookings', 'current', id] as const,
  booking: (id: string) => ['bookings', 'detail', id] as const,
  documents: (customerId: string) => ['documents', customerId] as const,
  customerProfile: (id: string) => ['customerProfile', id] as const,
  partner: (id: string) => ['partner', id] as const,
  addresses: (ownerId: string, kind: string) => ['addresses', ownerId, kind] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
  earnings: (partnerId: string) => ['earnings', partnerId] as const,
  payments: (bookingId: string) => ['payments', bookingId] as const,
};
