import { useEffect, useState } from 'react';
import { trackingService, type LiveUsage } from '@/services/trackingService';
import type { RentalSession } from '@/types/models';

/** Re-computes rental usage every second while a session is running. */
export function useLiveUsage(session: RentalSession | null | undefined): LiveUsage | null {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!session || session.endedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session]);
  return session ? trackingService.getLiveUsage(session, now) : null;
}
