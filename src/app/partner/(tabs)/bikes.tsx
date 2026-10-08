import React, { useState } from 'react';
import { FlatList, ScrollView, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { BikeImage } from '@/components/bike/BikeImage';
import { BIKE_STATUS_META, BikeStatusBadge } from '@/components/bike/BikeCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { usePartnerBikes } from '@/features/bikes/hooks';
import { qk } from '@/features/queryKeys';
import { useServiceMutation } from '@/hooks/useServiceMutation';
import { bikeService } from '@/services/bikeService';
import { useProfile } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { Bike, BikeStatus } from '@/types/models';
import { formatINR, maskRegistration } from '@/utils/format';

export default function ManageBikes() {
  const t = useTheme();
  const profile = useProfile();
  const q = usePartnerBikes(profile.id);
  const [filter, setFilter] = useState<BikeStatus | 'ALL'>('ALL');
  const toggle = useServiceMutation((b: Bike) => bikeService.setStatus(b, b.status === 'AVAILABLE' ? 'INACTIVE' : 'AVAILABLE'), {
    invalidate: [qk.bikesAll],
    success: (b) => `${b.brand} ${b.model} is now ${BIKE_STATUS_META[b.status].label.toLowerCase()}`,
  });
  const list = (q.data ?? []).filter((b) => filter === 'ALL' || b.status === filter);
  const statuses: BikeStatus[] = ['AVAILABLE', 'BOOKED', 'ACTIVE', 'MAINTENANCE', 'INACTIVE'];

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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <Text variant="h1">Manage Bikes</Text>
              <Button title="Add Bike" icon="add" size="sm" fullWidth={false} onPress={() => router.push('/partner/bike-form')} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Chip label={`All (${q.data?.length ?? 0})`} selected={filter === 'ALL'} onPress={() => setFilter('ALL')} />
              {statuses.map((s) => (
                <Chip key={s} label={BIKE_STATUS_META[s].label} selected={filter === s} onPress={() => setFilter(s)} />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          q.isLoading ? (
            <ListSkeleton rows={4} />
          ) : q.isError ? (
            <ErrorState error={q.error} onRetry={() => q.refetch()} />
          ) : (
            <EmptyState title={filter === 'ALL' ? 'No bikes listed yet' : 'No bikes with this status'} message="Add your first bike with photos, pricing and kilometre limits." actionLabel="Add Bike" onAction={() => router.push('/partner/bike-form')} />
          )
        }
        renderItem={({ item }) => {
          const canToggle = item.status === 'AVAILABLE' || item.status === 'INACTIVE';
          return (
            <Card onPress={() => router.push(`/partner/bike/${item.id}`)}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ width: 96 }}>
                  <BikeImage bike={item} images={item.images} height={80} radius={14} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="bodyStrong">
                    {item.brand} {item.model}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {maskRegistration(item.registrationNumber)} · {item.pickupLabel}
                  </Text>
                  <Text variant="smallStrong" color="primary">
                    {formatINR(item.dailyPrice)}/day · {item.includedKmPerDay} km
                  </Text>
                  <BikeStatusBadge status={item.status} />
                </View>
                <View style={{ alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <Switch
                    value={item.status === 'AVAILABLE'}
                    disabled={!canToggle || toggle.isPending}
                    onValueChange={() => toggle.mutate(item)}
                    trackColor={{ true: t.colors.primary, false: t.colors.borderStrong }}
                    thumbColor="#fff"
                    accessibilityLabel={item.status === 'AVAILABLE' ? 'Mark unavailable' : 'Mark available'}
                  />
                  <Text variant="caption" color="textMuted">
                    {canToggle ? (item.status === 'AVAILABLE' ? 'Listed' : 'Hidden') : 'Locked'}
                  </Text>
                </View>
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}
