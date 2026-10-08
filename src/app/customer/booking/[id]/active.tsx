import React, { useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { BikeImage } from '@/components/bike/BikeImage';
import { LiveRentalPanel } from '@/components/booking/LiveRentalPanel';
import { RouteMap } from '@/components/map/RouteMap';
import { MockBadge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { IconButton } from '@/components/ui/IconButton';
import { ListItem } from '@/components/ui/ListItem';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { config } from '@/constants/config';
import { useBookingDetails } from '@/features/bookings/hooks';
import { useBookingAction } from '@/features/bookings/useBookingAction';
import { qk } from '@/features/queryKeys';
import { useLiveUsage } from '@/hooks/useLiveUsage';
import { bookingService } from '@/services/bookingService';
import { trackingService } from '@/services/trackingService';
import { useLocationStore } from '@/stores/locationStore';
import { useActor } from '@/stores/sessionStore';
import { confirm, toast } from '@/stores/uiStore';
import { useTheme } from '@/theme/ThemeProvider';
import { getUsageStatus } from '@/utils/pricing';

export default function ActiveRental() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const actor = useActor();
  const qc = useQueryClient();
  const q = useBookingDetails(id);
  const usage = useLiveUsage(q.data?.session);
  const here = useLocationStore((s) => s.point);
  const [sos, setSos] = useState(false);
  const warned = useRef({ distance: false, time: false });

  const end = useBookingAction(id, () => bookingService.requestReturn(id, actor), {
    onSuccess: () => router.replace(`/customer/booking/${id}/return`),
  });

  // Fire one-time 80% warnings as in-app notifications
  useEffect(() => {
    if (!q.data || !usage) return;
    const s = getUsageStatus(q.data.plan, usage.distanceKm, usage.durationMinutes);
    if ((s.distanceWarning && !warned.current.distance) || (s.timeWarning && !warned.current.time)) {
      warned.current = { distance: s.distanceWarning, time: s.timeWarning };
      void trackingService.checkWarnings(q.data, usage);
    }
  }, [q.data, usage]);

  if (q.isLoading) return <LoadingState />;
  if (q.isError || !q.data) {
    return (
      <Screen header={<Header title="Live rental" />}>
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Screen>
    );
  }
  const b = q.data;
  if (b.status !== 'ACTIVE' || !b.session || !usage) return <Redirect href={`/customer/booking/${id}`} />;

  const simulate = async (delta: { km?: number; minutes?: number }) => {
    await trackingService.simulate(b.session!.id, delta);
    await qc.invalidateQueries({ queryKey: qk.booking(id) });
  };

  const endRental = async () => {
    if (await confirm({ title: 'End rental?', message: 'Ride back to the pickup point first. You will upload return photos next.', confirmLabel: 'End Rental' })) end.mutate(undefined);
  };

  return (
    <Screen
      header={<Header title="Live rental" subtitle={`${b.bike.brand} ${b.bike.model}`} right={<IconButton icon="warning" variant="primary" color="onPrimary" accessibilityLabel="Emergency and safety" onPress={() => setSos(true)} />} />}
      footer={<Button title="End Rental" icon="stop-circle-outline" size="lg" onPress={endRental} loading={end.isPending} />}
    >
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 84 }}>
            <BikeImage bike={b.bike} images={b.bikeImages} height={62} radius={12} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">
              {b.bike.brand} {b.bike.model}
            </Text>
            <Text variant="small" color="textSecondary">
              {b.plan.label} · from {b.partner.businessName}
            </Text>
          </View>
          <IconButton icon="call" accessibilityLabel="Contact rental owner" onPress={() => Linking.openURL(`tel:+91${b.partnerProfile.phone}`)} />
        </View>
      </Card>

      <View style={{ marginTop: 14 }}>
        <LiveRentalPanel plan={b.plan} session={b.session} usage={usage} />
      </View>

      <Text variant="h3" style={{ marginTop: 18, marginBottom: 10 }}>
        Current location
      </Text>
      <RouteMap height={180} markers={[{ point: here, kind: 'user' }, { point: { lat: b.bike.pickupLat, lng: b.bike.pickupLng }, kind: 'bike', label: 'Return point' }]} />

      {config.DEMO_MODE ? (
        <View style={{ marginTop: 16, padding: 14, borderRadius: t.radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.colors.warning, gap: 10 }}>
          <MockBadge label="DEMO · MOCK TRACKING" />
          <Text variant="small" color="textSecondary">
            Distance grows slowly in real time. Fast-forward to see warnings and extra charges.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button title="+10 km" size="sm" variant="outline" onPress={() => simulate({ km: 10 })} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="+40 km" size="sm" variant="outline" onPress={() => simulate({ km: 40 })} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="+1 hour" size="sm" variant="outline" onPress={() => simulate({ minutes: 60 })} />
            </View>
          </View>
        </View>
      ) : null}

      <BottomSheet visible={sos} onClose={() => setSos(false)} title="Emergency & safety" subtitle="Help is one tap away.">
        <ListItem icon="medkit-outline" title={`Call emergency (${config.emergencyNumber})`} subtitle="Police, ambulance, fire" destructive onPress={() => Linking.openURL(`tel:${config.emergencyNumber}`)} />
        <ListItem icon="call-outline" title="Call rental partner" subtitle={b.partner.businessName} onPress={() => Linking.openURL(`tel:+91${b.partnerProfile.phone}`)} />
        <ListItem icon="headset-outline" title="PAYANAM support" subtitle="24×7 rider helpline" onPress={() => Linking.openURL(`tel:${config.supportPhone}`)} />
        <ListItem
          icon="share-social-outline"
          title="Share live location"
          subtitle="Sends a Google Maps link"
          onPress={() => {
            void Linking.openURL(`sms:?body=${encodeURIComponent(`I'm riding a PAYANAM bike. My location: https://maps.google.com/?q=${here.lat},${here.lng}`)}`).catch(() => toast.error('Could not open messages'));
          }}
          last
        />
      </BottomSheet>
    </Screen>
  );
}
