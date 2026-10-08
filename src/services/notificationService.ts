import { db } from '@/api/db';
import type { AppNotification, NotificationCategory } from '@/types/models';

/**
 * In-app notification centre (DEMO: local; SUPABASE: `notifications` table).
 * Push delivery (FCM/APNs via Expo Notifications) can be added behind `notify`
 * without changing any screen.
 */
export interface NotifyInput {
  userId: string;
  category: NotificationCategory;
  type: string;
  title: string;
  body: string;
  bookingId?: string | null;
}

type Listener = (n: AppNotification) => void;
const listeners = new Set<Listener>();

export const notificationService = {
  provider: 'in_app' as const,

  async list(userId: string): Promise<AppNotification[]> {
    return db.list('notifications', { where: { userId }, orderBy: { field: 'createdAt', ascending: false } });
  },

  async notify(input: NotifyInput): Promise<AppNotification> {
    const n = await db.insert('notifications', { ...input, bookingId: input.bookingId ?? null, read: false });
    listeners.forEach((l) => l(n));
    return n;
  },

  async markRead(id: string) {
    await db.update('notifications', id, { read: true });
  },

  async markAllRead(userId: string) {
    const unread = await db.list('notifications', { where: { userId, read: false } });
    await Promise.all(unread.map((n) => db.update('notifications', n.id, { read: true })));
  },

  /** Lets the UI show a toast when a notification for the signed-in user is created */
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
