import React, { useEffect, useRef } from 'react';
import { Animated, Linking, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { BikeImage } from '@/components/bike/BikeImage';
import { BookingStatusBadge, BookingTimeline, HandoverChecklist, LifecycleProgress } from '@/components/booking/BookingParts';
import { InspectionResultCard } from '@/components/booking/InspectionResultCard';
import { DemoSwitchCard } from '@/components/demo/DemoCard';
import { RouteMap } from '@/components/map/RouteMap';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { IconButton } from '@/components/ui/IconButton';
import { Avatar, KeyValue, SectionHeader } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { Banner, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useBookingDetails } from '@/features/bookings/hooks';
import { useBookingAction } from '@/features/bookings/useBookingAction';
import { bookingService } from '@/services/bookingService';
import { useLocationStore } from '@/stores/locationStore';
import { useActor } from '@/stores/sessionStore';
import { confirm } from '@/stores/uiStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { BookingDetails } from '@/types/models';
import { CANCELLABLE_STATUSES } from '@/utils/bookingStateMachine';
import { formatDateTime, formatDuration, formatINR, formatTime } from '@/utils/format';

function Pulse({ icon }: { icon: keyof typeof Ionicons.glyphMap }) {
  const t = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 900, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 120 }}>
      <Animated.View style={{ position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: t.colors.primarySoft, transform: [{ scale }] }} />
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={34} color={t.colors.onPrimary} />
      </View>
    </View>
  );
}

function Hero({ icon, title, message, pulse }: { icon: keyof typeof Ionicons.glyphMap; title: string; message: string; pulse?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 6, paddingVertical: 8 }}>
      {pulse ? (
        <Pulse icon={icon} />
      ) : (
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <Ionicons name={icon} size={34} color={t.colors.primary} />
        </View>
      )}
      <Text variant="h1" align="center">
        {title}
      </Text>
      <Text color="textSecondary" align="center" style={{ maxWidth: 320 }}>
        {message}
      </Text>
    </View>
  );
}

export default function CustomerBookingHub() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const actor = useActor();
  const q = useBookingDetails(id);
  const origin = useLocationStore((s) => s.point);

  const cancel = useBookingAction(id, () => bookingService.cancel(id, actor, 'Cancelled by customer'), { success: 'Booking cancelled' });
  const onTheWay = useBookingAction(id, () => bookingService.markOnTheWay(id, actor), { onSuccess: () => router.push(`/customer/booking/${id}/map`) });
  const arrived = useBookingAction(id, () => bookingService.markArrived(id, actor), { success: "You're here! Handover is starting." });
  const resume = useBookingAction(id, () => bookingService.resumeAfterVerification(id, actor));
  const start = useBookingAction(id, () => bookingService.startRental(id, actor), {
    success: 'Rental started — ride safe!',
    onSuccess: () => router.replace(`/customer/booking/${id}/active`),
  });

  if (q.isLoading) return <LoadingState label="Loading booking…" />;
  if (q.isError || !q.data) {
    return (
      <Screen header={<Header title="Booking" />}>
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Screen>
    );
  }
  const b = q.data;
  const bikePoint = { lat: b.bike.pickupLat, lng: b.bike.pickupLng };
  const partnerPath = `/partner/booking/${b.id}`;

  const doCancel = async () => {
    if (await confirm({ title: 'Cancel this booking?', message: 'The held amount will be released.', confirmLabel: 'Cancel booking', destructive: true })) cancel.mutate(undefined);
  };

  const body = renderStage(b);

  function renderStage(bk: BookingDetails): React.ReactNode {
    switch (bk.status) {
      case 'PENDING_VERIFICATION':
        return (
          <>
            <Hero icon="hourglass-outline" title="Verifying your documents" message="Your request will be sent to the partner as soon as verification completes." pulse />
            <Button title="Check status" onPress={() => resume.mutate(undefined)} loading={resume.isPending} />
          </>
        );
      case 'PENDING_OWNER_CONFIRMATION':
        return (
          <>
            <Hero icon="time-outline" title="Waiting for rental partner confirmation" message={`${bk.partner.businessName} usually responds within 10 minutes. We'll notify you.`} pulse />
            <DemoSwitchCard to="partner" path={partnerPath} message="On one phone? Switch to the demo Rental Partner to accept this request." />
          </>
        );
      case 'REJECTED':
        return (
          <>
            <Hero icon="close-circle-outline" title="Request declined" message={bk.cancelReason ? `Reason: ${bk.cancelReason}` : 'The partner could not accept this request.'} />
            <Button title="Find another bike" onPress={() => router.replace('/customer/rent')} />
          </>
        );
      case 'CANCELLED':
        return <Hero icon="ban-outline" title="Booking cancelled" message={bk.cancelReason ?? 'This booking was cancelled.'} />;
      case 'CONFIRMED':
      case 'CUSTOMER_ARRIVING':
        return (
          <>
            <Banner tone="success" title={bk.status === 'CONFIRMED' ? 'Booking confirmed' : "You're on your way"} message={`Pickup at ${bk.bike.pickupLabel} · ${bk.partner.address}`} />
            <RouteMap height={190} markers={[{ point: origin, kind: 'user' }, { point: bikePoint, kind: 'bike', label: 'Bike' }]} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button title="Navigate to Bike" icon="navigate" onPress={() => (bk.status === 'CONFIRMED' ? onTheWay.mutate(undefined) : router.push(`/customer/booking/${bk.id}/map`))} loading={onTheWay.isPending} />
              </View>
            </View>
            <Button title="I've reached the pickup point" variant="secondary" icon="location" onPress={() => arrived.mutate(undefined)} loading={arrived.isPending} />
          </>
        );
      case 'READY_FOR_PICKUP':
      case 'BIKE_INSPECTION':
        return (
          <>
            <Hero
              icon={bk.status === 'READY_FOR_PICKUP' ? 'flag' : 'camera'}
              title={bk.status === 'READY_FOR_PICKUP' ? "You're here" : 'Bike inspection in progress'}
              message={bk.status === 'READY_FOR_PICKUP' ? 'Meet the partner. They will photograph the bike with you before handover.' : 'The partner is capturing front, rear, sides and speedometer photos.'}
              pulse
            />
            <DemoSwitchCard to="partner" path={partnerPath} message="Switch to the demo Rental Partner to capture the handover inspection photos." />
          </>
        );
      case 'CUSTOMER_VERIFICATION':
        if (!bk.faceVerified) {
          return (
            <>
              <Hero icon="scan-outline" title="Verify it's really you" message="The bike passed inspection. Take a quick selfie so the partner can hand over the keys." />
              {bk.preInspection?.result ? <InspectionResultCard result={bk.preInspection.result} title="Handover inspection" /> : null}
              <Button title="Take selfie" icon="camera" size="lg" onPress={() => router.push(`/customer/booking/${bk.id}/selfie`)} />
            </>
          );
        }
        return (
          <>
            <Hero icon="key" title="Your rental is ready" message="All checks are complete. Start the rental when you have the keys." />
            <Card>
              <KeyValue label="Bike" value={`${bk.bike.brand} ${bk.bike.model}`} />
              <KeyValue label="Rental starts" value={formatTime(new Date())} />
              <KeyValue label="Rental ends" value={formatDateTime(new Date(Date.now() + bk.plan.includedDurationMinutes * 60000))} />
              <KeyValue label="Included kilometres" value={`${bk.plan.includedDistanceKm} km`} />
              <KeyValue label="Extra kilometre rate" value={`${formatINR(bk.plan.extraKmRate)}/km`} />
              <KeyValue label="Extra time rate" value={`${formatINR(bk.plan.extraMinuteRate)}/min`} />
            </Card>
            <Button title="Start Rental" icon="play" size="lg" onPress={() => start.mutate(undefined)} loading={start.isPending} />
          </>
        );
      case 'ACTIVE':
        return (
          <>
            <Hero icon="speedometer" title="Rental in progress" message="Track time and distance on the live rental screen." />
            <Button title="Open live rental" icon="pulse" size="lg" onPress={() => router.push(`/customer/booking/${bk.id}/active`)} />
          </>
        );
      case 'RETURN_REQUESTED':
        return (
          <>
            <Hero icon="return-down-back" title="Return the bike" message="Upload five photos of the bike at the pickup point to finish your rental." />
            <Button title="Upload return photos" icon="camera" size="lg" onPress={() => router.push(`/customer/booking/${bk.id}/return`)} />
          </>
        );
      case 'RETURN_INSPECTION':
        return (
          <>
            <Hero icon="search" title="Partner is reviewing your return" message="The partner checks the photos and confirms the bike's condition. Your bill will be ready shortly." pulse />
            {bk.returnInspection?.result ? <InspectionResultCard result={bk.returnInspection.result} title="Return inspection" /> : null}
            <DemoSwitchCard to="partner" path={`/partner/booking/${bk.id}/return-review`} message="Switch to the demo Rental Partner to review this return." />
          </>
        );
      case 'DAMAGE_REVIEW':
        return (
          <>
            <Banner tone="danger" title="Damage review" message="The partner reported possible damage. Review the evidence and respond." />
            <Button title="View damage review" icon="eye" size="lg" onPress={() => router.push(`/customer/booking/${bk.id}/damage`)} />
          </>
        );
      case 'COMPLETED':
        return (
          <>
            <Hero icon="checkmark-done-circle" title="Rental completed" message="Thanks for riding with PAYANAM. Your deposit has been refunded." />
            <Button title="View final bill" icon="receipt-outline" size="lg" onPress={() => router.push(`/customer/booking/${bk.id}/bill`)} />
          </>
        );
      default:
        return null;
    }
  }

  const preRental = ['PENDING_OWNER_CONFIRMATION', 'CONFIRMED', 'CUSTOMER_ARRIVING', 'READY_FOR_PICKUP', 'BIKE_INSPECTION', 'CUSTOMER_VERIFICATION'].includes(b.status);

  return (
    <Screen header={<Header title="Booking" subtitle={`#${b.id.slice(0, 8).toUpperCase()}`} right={<BookingStatusBadge status={b.status} />} />} onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <LifecycleProgress status={b.status} />
      <View style={{ gap: 14, marginTop: 16 }}>{body}</View>

      {preRental ? (
        <View style={{ marginTop: 18 }}>
          <HandoverChecklist booking={b} />
        </View>
      ) : null}

      <SectionHeader title="Booking summary" />
      <Card style={{ marginTop: 10 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 8 }}>
          <View style={{ width: 84 }}>
            <BikeImage bike={b.bike} images={b.bikeImages} height={64} radius={12} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">
              {b.bike.brand} {b.bike.model}
            </Text>
            <Text variant="small" color="textSecondary">
              {b.plan.label} · {b.plan.includedDistanceKm} km included
            </Text>
          </View>
        </View>
        <KeyValue label="Pickup" value={formatDateTime(b.startTime)} />
        <KeyValue label="Expected return" value={formatDateTime(b.endTime)} />
        <KeyValue label="Duration" value={formatDuration(b.plan.includedDurationMinutes)} />
        <KeyValue label={b.finalBill ? 'Final amount' : 'Booking amount'} value={formatINR(b.finalBill?.total ?? b.plan.baseAmount)} strong />
      </Card>

      <SectionHeader title="Rental partner" />
      <Card style={{ marginTop: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={b.partnerProfile.fullName} uri={b.partnerProfile.avatarUrl} size={46} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{b.partner.businessName}</Text>
            <Text variant="small" color="textSecondary">
              {b.partnerProfile.fullName} · ★ {b.partner.rating.toFixed(1)}
            </Text>
          </View>
          <IconButton icon="call" variant="primary" accessibilityLabel="Call rental partner" onPress={() => Linking.openURL(`tel:+91${b.partnerProfile.phone}`)} />
        </View>
      </Card>

      <SectionHeader title="Timeline" />
      <Card style={{ marginTop: 10 }}>
        <BookingTimeline events={b.events} />
      </Card>

      {CANCELLABLE_STATUSES.includes(b.status) && !['BIKE_INSPECTION', 'CUSTOMER_VERIFICATION'].includes(b.status) ? (
        <Button title="Cancel booking" variant="danger" style={{ marginTop: 18 }} onPress={doCancel} loading={cancel.isPending} />
      ) : null}
    </Screen>
  );
}
