import React from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BikeImage } from '@/components/bike/BikeImage';
import { BIKE_STATUS_META, BikeStatusBadge } from '@/components/bike/BikeCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Header } from '@/components/ui/Header';
import { IconButton } from '@/components/ui/IconButton';
import { KeyValue } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useBike } from '@/features/bikes/hooks';
import { qk } from '@/features/queryKeys';
import { useServiceMutation } from '@/hooks/useServiceMutation';
import { bikeService, PHOTO_ANGLES } from '@/services/bikeService';
import { confirm } from '@/stores/uiStore';
import type { BikeStatus } from '@/types/models';
import { capitalize, formatINR } from '@/utils/format';

export default function PartnerBikeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useBike(id);
  const setStatus = useServiceMutation((s: BikeStatus) => bikeService.setStatus(q.data!, s), {
    invalidate: [qk.bikesAll, ['bike']],
    success: (b) => `Marked ${BIKE_STATUS_META[b.status].label}`,
  });
  const remove = useServiceMutation(() => bikeService.deleteBike(q.data!), {
    invalidate: [qk.bikesAll],
    success: 'Bike deleted',
    onSuccess: () => router.back(),
  });

  if (q.isLoading) return <LoadingState />;
  if (q.isError || !q.data) {
    return (
      <Screen header={<Header title="Bike" />}>
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Screen>
    );
  }
  const b = q.data;
  const locked = b.status === 'BOOKED' || b.status === 'ACTIVE';

  const del = async () => {
    if (await confirm({ title: `Delete ${b.brand} ${b.model}?`, message: 'This removes the listing and its photos. This cannot be undone.', confirmLabel: 'Delete', destructive: true })) remove.mutate(undefined);
  };

  return (
    <Screen
      header={<Header title={`${b.brand} ${b.model}`} subtitle={b.registrationNumber} right={<IconButton icon="create-outline" accessibilityLabel="Edit bike" onPress={() => router.push(`/partner/bike-form?id=${b.id}`)} />} />}
      footer={<Button title="Delete bike" variant="danger" icon="trash-outline" onPress={del} loading={remove.isPending} disabled={locked} />}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {PHOTO_ANGLES.map((a) => (
          <View key={a} style={{ width: 220, gap: 4 }}>
            <BikeImage bike={b} images={b.images} angle={a} height={150} />
            <Text variant="caption" color="textMuted" align="center">
              {capitalize(a)} {b.images.some((i) => i.angle === a) ? '' : '· placeholder'}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 }}>
        <Text variant="h3">Status</Text>
        <BikeStatusBadge status={b.status} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {(['AVAILABLE', 'MAINTENANCE', 'INACTIVE'] as BikeStatus[]).map((s) => (
          <Chip key={s} label={s === 'AVAILABLE' ? 'Mark Available' : s === 'MAINTENANCE' ? 'Maintenance' : 'Mark Unavailable'} selected={b.status === s} onPress={() => !locked && b.status !== s && setStatus.mutate(s)} />
        ))}
      </View>
      {locked ? (
        <Text variant="caption" color="textMuted" style={{ marginTop: 6 }}>
          Status is locked while the bike is booked or on rental.
        </Text>
      ) : null}

      <Card style={{ marginTop: 16 }}>
        <KeyValue label="Year" value={`${b.year}`} />
        <KeyValue label="Type" value={capitalize(b.bikeType)} />
        <KeyValue label="Fuel / transmission" value={`${capitalize(b.fuelType)} · ${capitalize(b.transmission)}`} />
        <KeyValue label="Engine" value={b.engineCc ? `${b.engineCc} cc` : 'Electric'} />
        <KeyValue label="Rating" value={b.ratingCount ? `★ ${b.rating.toFixed(1)} (${b.ratingCount})` : 'No ratings yet'} />
        <KeyValue label="Pickup" value={b.pickupLabel} />
      </Card>
      <Card style={{ marginTop: 12 }}>
        <Text variant="h3" style={{ marginBottom: 4 }}>
          Pricing
        </Text>
        <KeyValue label="Per day" value={formatINR(b.dailyPrice)} />
        <KeyValue label="Per hour" value={formatINR(b.hourlyPrice)} />
        <KeyValue label="Included km/day" value={`${b.includedKmPerDay} km`} />
        <KeyValue label="Extra km" value={`${formatINR(b.extraKmRate)}/km`} />
        <KeyValue label="Extra minute" value={`${formatINR(b.extraMinuteRate)}/min`} />
        <KeyValue label="Deposit" value={formatINR(b.securityDeposit)} />
        {b.forSale && b.purchasePrice ? <KeyValue label="Sale price" value={formatINR(b.purchasePrice)} /> : null}
      </Card>
    </Screen>
  );
}
