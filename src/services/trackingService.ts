import { db, getOrThrow } from '@/api/db';
import { config } from '@/constants/config';
import type { Booking, RentalSession } from '@/types/models';
import { getUsageStatus } from '@/utils/pricing';
import { notificationService } from './notificationService';

/**
 * MOCK telematics. Real deployments would read GPS/odometer from a device or the
 * customer's phone. In demo mode distance grows with elapsed time (config.demo.kmPerMinute)
 * plus manual "simulate" offsets so warnings and extra charges can be shown quickly.
 */
export interface LiveUsage {
  distanceKm: number;
  durationMinutes: number;
  elapsedSeconds: number;
}

export const trackingService = {
  provider: 'mock' as const,

  getLiveUsage(session: RentalSession, now = Date.now()): LiveUsage {
    if (session.endedAt && session.finalDistanceKm != null && session.finalDurationMinutes != null) {
      return {
        distanceKm: session.finalDistanceKm,
        durationMinutes: session.finalDurationMinutes,
        elapsedSeconds: session.finalDurationMinutes * 60,
      };
    }
    const realSeconds = Math.max(0, (now - new Date(session.startedAt).getTime()) / 1000);
    const elapsedSeconds = realSeconds + session.simulatedMinutes * 60;
    return {
      distanceKm: (realSeconds / 60) * config.demo.kmPerMinute + session.simulatedKm,
      durationMinutes: elapsedSeconds / 60,
      elapsedSeconds,
    };
  },

  /** DEMO ONLY: fast-forward distance / time */
  async simulate(sessionId: string, delta: { km?: number; minutes?: number }) {
    const s = await getOrThrow('rental_sessions', sessionId);
    return db.update('rental_sessions', sessionId, {
      simulatedKm: s.simulatedKm + (delta.km ?? 0),
      simulatedMinutes: s.simulatedMinutes + (delta.minutes ?? 0),
    });
  },

  /** Sends the 80% distance / time warnings once per booking. */
  async checkWarnings(booking: Pick<Booking, 'id' | 'customerId' | 'partnerId' | 'plan'>, usage: LiveUsage) {
    const status = getUsageStatus(booking.plan, usage.distanceKm, usage.durationMinutes);
    const existing = await db.list('notifications', { where: { userId: booking.customerId, bookingId: booking.id } });
    const has = (type: string) => existing.some((n) => n.type === type);
    if (status.distanceWarning && !has('distance_warning')) {
      await notificationService.notify({
        userId: booking.customerId,
        category: 'rental',
        type: 'distance_warning',
        title: 'Extra kilometre warning',
        body: `You have used ${Math.round(status.distanceRatio * 100)}% of your included distance. Extra distance is charged at ₹${booking.plan.extraKmRate}/km.`,
        bookingId: booking.id,
      });
    }
    if (status.timeWarning && !has('time_warning')) {
      await notificationService.notify({
        userId: booking.customerId,
        category: 'rental',
        type: 'time_warning',
        title: 'Rental ending soon',
        body: `Less than ${Math.ceil(status.remainingMinutes)} minutes left. Extra time is charged at ₹${booking.plan.extraMinuteRate}/min.`,
        bookingId: booking.id,
      });
      await notificationService.notify({
        userId: booking.partnerId,
        category: 'rental',
        type: 'rental_ending_soon',
        title: 'Rental ending soon',
        body: 'An active rental is close to its return time.',
        bookingId: booking.id,
      });
    }
  },

  async startSession(bookingId: string) {
    return db.insert('rental_sessions', {
      bookingId,
      startedAt: new Date().toISOString(),
      endedAt: null,
      simulatedKm: 0,
      simulatedMinutes: 0,
      finalDistanceKm: null,
      finalDurationMinutes: null,
    });
  },

  async finalize(sessionId: string): Promise<RentalSession> {
    const s = await getOrThrow('rental_sessions', sessionId);
    if (s.endedAt) return s;
    const usage = this.getLiveUsage(s);
    await db.insert('rental_usage', {
      sessionId,
      distanceKm: Math.round(usage.distanceKm * 10) / 10,
      durationMinutes: Math.round(usage.durationMinutes),
      lat: 0,
      lng: 0,
      recordedAt: new Date().toISOString(),
    });
    return db.update('rental_sessions', sessionId, {
      endedAt: new Date().toISOString(),
      finalDistanceKm: Math.round(usage.distanceKm * 10) / 10,
      finalDurationMinutes: Math.round(usage.durationMinutes),
    });
  },
};
