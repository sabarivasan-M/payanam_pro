import { useServiceMutation } from '@/hooks/useServiceMutation';
import { qk } from '../queryKeys';

/** Booking mutations refresh the detail, lists, bikes, notifications and earnings. */
export function useBookingAction<TVars, TResult>(
  bookingId: string,
  fn: (vars: TVars) => Promise<TResult>,
  opts: { success?: string; onSuccess?: (r: TResult) => void } = {},
) {
  return useServiceMutation(fn, {
    invalidate: [qk.booking(bookingId), qk.bookingsAll, qk.bikesAll, ['bike'], ['notifications'], ['earnings'], ['payments']],
    success: opts.success,
    onSuccess: opts.onSuccess,
  });
}
