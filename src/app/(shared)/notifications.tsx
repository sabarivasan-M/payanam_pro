import React, { useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useNotifications } from '@/features/notifications/hooks';
import { qk } from '@/features/queryKeys';
import { notificationService } from '@/services/notificationService';
import { useProfile } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { AppNotification, NotificationCategory } from '@/types/models';
import { formatRelative } from '@/utils/format';

const CATEGORY: Record<NotificationCategory, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  booking: { label: 'Booking', icon: 'calendar-outline' },
  verification: { label: 'Verification', icon: 'shield-checkmark-outline' },
  rental: { label: 'Rental', icon: 'speedometer-outline' },
  return: { label: 'Return', icon: 'return-down-back-outline' },
  payment: { label: 'Payment', icon: 'wallet-outline' },
  system: { label: 'PAYANAM', icon: 'megaphone-outline' },
};

export default function Notifications() {
  const t = useTheme();
  const profile = useProfile();
  const qc = useQueryClient();
  const q = useNotifications();
  const [filter, setFilter] = useState<NotificationCategory | 'all'>('all');
  const list = (q.data ?? []).filter((n) => filter === 'all' || n.category === filter);
  const unread = (q.data ?? []).filter((n) => !n.read).length;

  const open = async (n: AppNotification) => {
    if (!n.read) {
      await notificationService.markRead(n.id);
      void qc.invalidateQueries({ queryKey: qk.notifications(profile.id) });
    }
    if (n.bookingId) router.push(`/${profile.role}/booking/${n.bookingId}`);
    else if (n.category === 'verification' && profile.role === 'customer') router.push('/customer/verify-documents');
  };

  const markAll = async () => {
    await notificationService.markAllRead(profile.id);
    void qc.invalidateQueries({ queryKey: qk.notifications(profile.id) });
  };

  const categories: NotificationCategory[] =
    profile.role === 'customer' ? ['booking', 'verification', 'rental', 'return', 'system'] : ['booking', 'rental', 'return', 'payment', 'system'];

  return (
    <Screen
      scroll={false}
      padded={false}
      header={<Header title="Notifications" subtitle={unread ? `${unread} unread` : 'All caught up'} right={unread ? <Button title="Mark all read" size="sm" variant="ghost" fullWidth={false} onPress={markAll} /> : undefined} />}
    >
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
          <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
          {categories.map((c) => (
            <Chip key={c} label={CATEGORY[c].label} icon={CATEGORY[c].icon} selected={filter === c} onPress={() => setFilter(c)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={list}
        keyExtractor={(n) => n.id}
        refreshing={q.isRefetching}
        onRefresh={() => q.refetch()}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 10, flexGrow: 1 }}
        ListEmptyComponent={
          q.isLoading ? (
            <ListSkeleton rows={5} />
          ) : q.isError ? (
            <ErrorState error={q.error} onRetry={() => q.refetch()} />
          ) : (
            <EmptyState icon="notifications-off-outline" title="No notifications" message="Booking updates, verification results and offers will appear here." />
          )
        }
        renderItem={({ item }) => {
          const c = CATEGORY[item.category];
          return (
            <Pressable
              onPress={() => open(item)}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flexDirection: 'row',
                gap: 12,
                padding: 14,
                borderRadius: t.radius.lg,
                backgroundColor: item.read ? t.colors.surface : t.colors.primarySoft,
                borderWidth: 1,
                borderColor: item.read ? t.colors.border : 'transparent',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: item.read ? t.colors.surfaceAlt : t.colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={c.icon} size={20} color={t.colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {formatRelative(item.createdAt)}
                  </Text>
                </View>
                <Text variant="small" color="textSecondary" numberOfLines={3}>
                  {item.body}
                </Text>
                <Text variant="caption" color="primary" style={{ marginTop: 2 }}>
                  {c.label.toUpperCase()}
                </Text>
              </View>
              {!item.read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.accent, marginTop: 6 }} /> : null}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
