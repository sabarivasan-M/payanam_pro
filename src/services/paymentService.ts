import { db } from '@/api/db';
import type { Booking, FinalBill } from '@/types/models';
import { partnerShare } from '@/utils/pricing';
import { mockPaymentService, type PaymentProvider } from './mock/mockPaymentService';

const provider: PaymentProvider = mockPaymentService;

export const paymentService = {
  provider: provider.name,
  isMock: provider.isMock,

  /** Hold the estimated amount (base + deposit) when a booking is requested. */
  async authorizeBooking(booking: Booking) {
    const { reference } = await provider.authorize(booking.estimatedTotal);
    return db.insert('payments', {
      bookingId: booking.id,
      payerId: booking.customerId,
      partnerId: booking.partnerId,
      kind: 'authorization',
      amount: booking.estimatedTotal,
      partnerAmount: 0,
      status: 'authorized',
      provider: provider.name,
      isMock: provider.isMock,
      reference,
      settlementStatus: 'not_applicable',
    });
  },

  async releaseAuthorization(bookingId: string) {
    const auths = await db.list('payments', { where: { bookingId, kind: 'authorization', status: 'authorized' } });
    for (const a of auths) {
      await provider.void(a.reference);
      await db.update('payments', a.id, { status: 'void' });
    }
  },

  /** Charge the final bill and refund the security deposit. */
  async settleFinalBill(booking: Booking, bill: FinalBill) {
    await this.releaseAuthorization(booking.id);
    const charge = await provider.capture(bill.total);
    await db.insert('payments', {
      bookingId: booking.id,
      payerId: booking.customerId,
      partnerId: booking.partnerId,
      kind: 'rental_charge',
      amount: bill.total,
      partnerAmount: partnerShare(bill.total),
      status: 'paid',
      provider: provider.name,
      isMock: provider.isMock,
      reference: charge.reference,
      settlementStatus: 'pending',
    });
    const refund = await provider.refund(bill.securityDeposit);
    await db.insert('payments', {
      bookingId: booking.id,
      payerId: booking.customerId,
      partnerId: booking.partnerId,
      kind: 'deposit_refund',
      amount: bill.securityDeposit,
      partnerAmount: 0,
      status: 'refunded',
      provider: provider.name,
      isMock: provider.isMock,
      reference: refund.reference,
      settlementStatus: 'not_applicable',
    });
  },

  listForBooking: (bookingId: string) => db.list('payments', { where: { bookingId }, orderBy: { field: 'createdAt' } }),
};
