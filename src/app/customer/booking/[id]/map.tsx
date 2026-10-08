import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { RouteMap } from '@/components/map/RouteMap';
import { MockBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useBookingDetails } from '@/features/bookings/hooks';
import { useBookingAction } from '@/features/bookings/useBookingAction';
import { bookingService } from '@/services/bookingService';
import { mapService } from '@/services/mapService';
import { useLocationStore } from '@/stores/locationStore';
import { useActor } from '@/stores/sessionStore';
import { toast } from '@/stores/uiStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatKm } from '@/utils/format';
import { offsetPoint } from '@/utils/geo';

export default function BookingMap() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const actor = useActor();
  const q = useBookingDetails(id);
  const origin = useLocationStore((s) => s.point);
  const setLocation = useLocationStore((s) => s.setLocation);
  const bikePoint = q.data ? { lat: q.data.bike.pickupLat, lng: q.data.bike.pickupLng } : null;
  const ownerPoint = bikePoint ? offsetPoint(bikePoint, 0.0012, 0.0016) : null;

  const route = useQuery({
    queryKey: ['route', origin, bikePoint],
    queryFn: () => mapService.getRoute(origin, bikePoint!),
    enabled: !!bikePoint,
  });

  const arrived = useBookingAction(id, () => bookingService.markArrived(id, actor), {
    success: "You're here!",
    onSuccess: () => router.replace(`/customer/booking/${id}`),
  });

  const refreshLocation = async () => {
    const res = await mapService.getCurrentLocation();
    setLocation(res.point, res.label, res.status === 'granted' ? 'device' : 'default');
    if (res.status !== 'granted') toast.error('Unable to load location — showing your saved area instead.');
  };

  if (q.isLoading) return <LoadingState />;
  if (q.isError || !q.data || !bikePoint || !ownerPoint) {
    return (
      <Screen header={<Header title="Directions" />}>
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Screen>
    );
  }
  const b = q.data;
  const canArrive = b.status === 'CONFIRMED' || b.status === 'CUSTOMER_ARRIVING';

  return (
    <Screen
      header={<Header title="Navigate to bike" subtitle={b.bike.pickupLabel} right={<MockBadge label="MOCK ROUTE" />} />}
      footer={
        <>
          <Button title="Navigate to Bike" icon="navigate" size="lg" onPress={() => mapService.openNavigation(bikePoint)} />
          {canArrive ? <Button title="I've arrived" variant="secondary" icon="flag" onPress={() => arrived.mutate(undefined)} loading={arrived.isPending} /> : null}
        </>
      }
    >
      {route.isLoading ? (
        <Skeleton height={360} radius={22} />
      ) : route.isError ? (
        <ErrorState title="Unable to load route" error={route.error} onRetry={() => route.refetch()} compact />
      ) : (
        <RouteMap
          height={360}
          route={route.data?.points}
          markers={[
            { point: origin, kind: 'user' },
            { point: bikePoint, kind: 'bike', label: 'Bike' },
            { point: ownerPoint, kind: 'owner', label: 'Owner' },
          ]}
        />
      )}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Card style={{ flex: 1 }}>
          <Ionicons name="trail-sign-outline" size={20} color={t.colors.primary} />
          <Text variant="h2" style={{ marginTop: 6 }}>
            {route.data ? formatKm(route.data.distanceKm) : '—'}
          </Text>
          <Text variant="caption" color="textMuted">
            Estimated distance
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Ionicons name="time-outline" size={20} color={t.colors.primary} />
          <Text variant="h2" style={{ marginTop: 6 }}>
            {route.data ? `${route.data.etaMinutes} min` : '—'}
          </Text>
          <Text variant="caption" color="textMuted">
            Estimated arrival
          </Text>
        </Card>
      </View>
      <Card style={{ marginTop: 12 }}>
        {[
          { color: t.colors.info, label: 'You', sub: useLocationStore.getState().label },
          { color: t.colors.primary, label: `${b.bike.brand} ${b.bike.model}`, sub: b.bike.pickupLabel },
          { color: t.colors.accent, label: b.partner.businessName, sub: b.partner.address },
        ].map((r) => (
          <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: r.color }} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{r.label}</Text>
              <Text variant="caption" color="textSecondary">
                {r.sub}
              </Text>
            </View>
          </View>
        ))}
        <Button title="Refresh my location" variant="ghost" icon="locate" size="sm" onPress={refreshLocation} />
      </Card>
    </Screen>
  );
}
