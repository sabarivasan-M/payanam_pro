import { db } from '@/api/db';
import type { Bike, Booking, Payment } from '@/types/models';

export interface EarningsPoint {
  label: string;
  value: number;
}

export interface EarningsSummary {
  today: number;
  week: number;
  month: number;
  total: number;
  pendingSettlement: number;
  completedRentals: number;
  daily: EarningsPoint[];
  monthly: EarningsPoint[];
  rentals: { payment: Payment; booking: Booking | null; bike: Bike | null }[];
}

const DAY = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const earningsService = {
  /** Amounts are the partner's share (after PAYANAM platform fee). */
  async getSummary(partnerId: string): Promise<EarningsSummary> {
    const payments = (await db.list('payments', { where: { partnerId, kind: 'rental_charge', status: 'paid' } })).sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt),
    );
    const now = new Date();
    const today = startOfDay(now);
    const weekStart = today - 6 * DAY;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const sum = (list: Payment[]) => list.reduce((acc, p) => acc + p.partnerAmount, 0);
    const at = (p: Payment) => new Date(p.createdAt).getTime();

    const daily: EarningsPoint[] = Array.from({ length: 7 }, (_, i) => {
      const start = today - (6 - i) * DAY;
      return {
        label: DAY_LABELS[new Date(start).getDay()],
        value: sum(payments.filter((p) => at(p) >= start && at(p) < start + DAY)),
      };
    });
    const monthly: EarningsPoint[] = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return {
        label: MONTH_LABELS[d.getMonth()],
        value: sum(payments.filter((p) => at(p) >= d.getTime() && at(p) < next.getTime())),
      };
    });

    const bookingIds = payments.map((p) => p.bookingId);
    const bookings = bookingIds.length ? await db.list('bookings', { in: { field: 'id', values: bookingIds } }) : [];
    const bikeIds = [...new Set(bookings.map((b) => b.bikeId))];
    const bikes = bikeIds.length ? await db.list('bikes', { in: { field: 'id', values: bikeIds } }) : [];

    return {
      today: sum(payments.filter((p) => at(p) >= today)),
      week: sum(payments.filter((p) => at(p) >= weekStart)),
      month: sum(payments.filter((p) => at(p) >= monthStart)),
      total: sum(payments),
      pendingSettlement: sum(payments.filter((p) => p.settlementStatus === 'pending')),
      completedRentals: payments.length,
      daily,
      monthly,
      rentals: payments.map((payment) => {
        const booking = bookings.find((b) => b.id === payment.bookingId) ?? null;
        return { payment, booking, bike: booking ? (bikes.find((x) => x.id === booking.bikeId) ?? null) : null };
      }),
    };
  },
};
