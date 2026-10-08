import { useQuery } from '@tanstack/react-query';
import { earningsService } from '@/services/earningsService';
import { paymentService } from '@/services/paymentService';
import { qk } from '../queryKeys';

export const useEarnings = (partnerId: string) =>
  useQuery({ queryKey: qk.earnings(partnerId), queryFn: () => earningsService.getSummary(partnerId) });

export const useBookingPayments = (bookingId: string) =>
  useQuery({ queryKey: qk.payments(bookingId), queryFn: () => paymentService.listForBooking(bookingId) });
