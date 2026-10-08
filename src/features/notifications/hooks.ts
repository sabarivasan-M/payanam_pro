import { useQuery } from '@tanstack/react-query';
import { notificationService } from '@/services/notificationService';
import { useProfile } from '@/stores/sessionStore';
import { qk } from '../queryKeys';

export function useNotifications() {
  const profile = useProfile();
  return useQuery({
    queryKey: qk.notifications(profile.id),
    queryFn: () => notificationService.list(profile.id),
    refetchInterval: 10000,
  });
}

export function useUnreadCount() {
  const { data } = useNotifications();
  return data?.filter((n) => !n.read).length ?? 0;
}
