import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { BookingCard } from '@/components/booking/BookingParts';
import { TabStrip } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useCustomerBookings } from '@/features/bookings/hooks';
import { useT } from '@/features/i18n';
import type { BookingListItem } from '@/services/bookingService';
import { useTheme } from '@/theme/ThemeProvider';
import { IN_PROGRESS_STATUSES, UPCOMING_STATUSES } from '@/utils/bookingStateMachine';

type Tab = 'upcoming' | 'active' | 'completed' | 'cancelled';

const groupOf = (b: BookingListItem): Tab => {
  if (UPCOMING_STATUSES.includes(b.status)) return 'upcoming';
  if (IN_PROGRESS_STATUSES.includes(b.status)) return 'active';
  if (b.status === 'COMPLETED') return 'completed';
  return 'cancelled';
};

const EMPTY: Record<Tab, { title: string; message: string }> = {
  upcoming: { title: 'No upcoming rentals', message: 'Bookings you make will show up here.' },
  active: { title: 'No active rental', message: 'Your ongoing ride will appear here once it starts.' },
  completed: { title: 'No rental history yet', message: 'Completed rentals and invoices will be saved here.' },
  cancelled: { title: 'Nothing cancelled', message: 'Cancelled or declined requests appear here.' },
};

export default function History() {
  const t = useTheme();
  const tr = useT();
  const bookings = useCustomerBookings();
  const all = bookings.data ?? [];
  const counts = all.reduce<Record<Tab, number>>((acc, b) => ({ ...acc, [groupOf(b)]: acc[groupOf(b)] + 1 }), { upcoming: 0, active: 0, completed: 0, cancelled: 0 });
  const [tab, setTab] = useState<Tab>('completed');
  const list = all.filter((b) => groupOf(b) === tab);

  return (
    <Screen edges={['top']} scroll={false} padded={false}>
      <FlatList
        data={list}
        keyExtractor={(b) => b.id}
        refreshing={bookings.isRefetching}
        onRefresh={() => bookings.refetch()}
        contentContainerStyle={{ padding: t.spacing.lg, gap: 12, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 4 }}>
            <Text variant="h1" style={{ marginTop: 8 }}>
              {tr('history')}
            </Text>
            <TabStrip<Tab>
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'upcoming', label: 'Upcoming', count: counts.upcoming },
                { value: 'active', label: 'Active', count: counts.active },
                { value: 'completed', label: 'Completed', count: counts.completed },
                { value: 'cancelled', label: 'Cancelled', count: counts.cancelled },
              ]}
            />
          </View>
        }
        ListEmptyComponent={
          bookings.isLoading ? (
            <ListSkeleton rows={4} />
          ) : bookings.isError ? (
            <ErrorState error={bookings.error} onRetry={() => bookings.refetch()} />
          ) : (
            <EmptyState icon="time-outline" title={EMPTY[tab].title} message={EMPTY[tab].message} actionLabel="Find a bike" onAction={() => router.push('/customer/rent')} />
          )
        }
        renderItem={({ item }) => <BookingCard item={item} perspective="customer" onPress={() => router.push(`/customer/booking/${item.id}`)} />}
      />
    </Screen>
  );
}
