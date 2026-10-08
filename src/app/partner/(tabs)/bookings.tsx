import React, { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BookingCard } from '@/components/booking/BookingParts';
import { Button } from '@/components/ui/Button';
import { TabStrip } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { usePartnerBookings } from '@/features/bookings/hooks';
import { useBookingAction } from '@/features/bookings/useBookingAction';
import { useT } from '@/features/i18n';
import { bookingService, type BookingListItem } from '@/services/bookingService';
import { useActor } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';
import { IN_PROGRESS_STATUSES } from '@/utils/bookingStateMachine';

type Tab = 'pending' | 'accepted' | 'active' | 'completed' | 'cancelled';

const groupOf = (b: BookingListItem): Tab => {
  if (b.status === 'PENDING_OWNER_CONFIRMATION') return 'pending';
  if (['CONFIRMED', 'CUSTOMER_ARRIVING', 'READY_FOR_PICKUP', 'BIKE_INSPECTION', 'CUSTOMER_VERIFICATION'].includes(b.status)) return 'accepted';
  if (IN_PROGRESS_STATUSES.includes(b.status)) return 'active';
  if (b.status === 'COMPLETED') return 'completed';
  return 'cancelled';
};

function PendingActions({ item }: { item: BookingListItem }) {
  const actor = useActor();
  const accept = useBookingAction(item.id, () => bookingService.accept(item.id, actor), { success: 'Booking accepted — customer notified' });
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: -4 }}>
      <View style={{ flex: 1 }}>
        <Button title="View & Reject" size="sm" variant="outline" onPress={() => router.push(`/partner/booking/${item.id}`)} />
      </View>
      <View style={{ flex: 1 }}>
        <Button title="Accept" size="sm" icon="checkmark" onPress={() => accept.mutate(undefined)} loading={accept.isPending} />
      </View>
    </View>
  );
}

export default function PartnerBookings() {
  const t = useTheme();
  const tr = useT();
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const q = usePartnerBookings();
  const [tab, setTab] = useState<Tab>(params.tab ?? 'pending');
  useEffect(() => {
    if (params.tab) setTab(params.tab);
  }, [params.tab]);
  const all = q.data ?? [];
  const count = (g: Tab) => all.filter((b) => groupOf(b) === g).length;
  const list = all.filter((b) => groupOf(b) === tab);

  return (
    <Screen edges={['top']} scroll={false} padded={false}>
      <FlatList
        data={list}
        keyExtractor={(b) => b.id}
        refreshing={q.isRefetching}
        onRefresh={() => q.refetch()}
        contentContainerStyle={{ padding: t.spacing.lg, gap: 12, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 4 }}>
            <Text variant="h1" style={{ marginTop: 8 }}>
              {tr('bookings')}
            </Text>
            <TabStrip<Tab>
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'pending', label: 'Pending', count: count('pending') },
                { value: 'accepted', label: 'Accepted', count: count('accepted') },
                { value: 'active', label: 'Active', count: count('active') },
                { value: 'completed', label: 'Completed', count: count('completed') },
                { value: 'cancelled', label: 'Cancelled', count: count('cancelled') },
              ]}
            />
          </View>
        }
        ListEmptyComponent={
          q.isLoading ? (
            <ListSkeleton rows={4} />
          ) : q.isError ? (
            <ErrorState error={q.error} onRetry={() => q.refetch()} />
          ) : (
            <EmptyState icon="file-tray-outline" title={tab === 'pending' ? 'No pending bookings' : `No ${tab} bookings`} message="Pull down to refresh." />
          )
        }
        renderItem={({ item }) => (
          <View style={{ gap: 10 }}>
            <BookingCard item={item} perspective="partner" onPress={() => router.push(`/partner/booking/${item.id}`)} />
            {item.status === 'PENDING_OWNER_CONFIRMATION' ? <PendingActions item={item} /> : null}
          </View>
        )}
      />
    </Screen>
  );
}
