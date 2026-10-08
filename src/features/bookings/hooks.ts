import { useQuery } from '@tanstack/react-query';
import { bookingService } from '@/services/bookingService';
import { useActor } from '@/stores/sessionStore';
import { TERMINAL_STATUSES } from '@/utils/bookingStateMachine';
import { qk } from '../queryKeys';

/** Live-ish booking detail: polls while the booking is in progress so both sides stay in sync. */
export function useBookingDetails(id: string | undefined) {
  const actor = useActor();
  return useQuery({
    queryKey: qk.booking(id ?? ''),
    queryFn: () => bookingService.getDetails(id!, actor),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data && TERMINAL_STATUSES.includes(q.state.data.status) ? false : 4000),
  });
}

export function useCustomerBookings() {
  const actor = useActor();
  return useQuery({ queryKey: qk.customerBookings(actor.id), queryFn: () => bookingService.listForCustomer(actor.id) });
}

export function usePartnerBookings() {
  const actor = useActor();
  return useQuery({
    queryKey: qk.partnerBookings(actor.id),
    queryFn: () => bookingService.listForPartner(actor.id),
    refetchInterval: 8000,
  });
}

export function useCurrentBooking() {
  const actor = useActor();
  return useQuery({
    queryKey: qk.currentBooking(actor.id),
    queryFn: () => bookingService.currentForCustomer(actor.id),
    refetchInterval: 8000,
  });
}
