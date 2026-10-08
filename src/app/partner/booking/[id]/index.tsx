import React, { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { BikeImage } from '@/components/bike/BikeImage';
import { BookingStatusBadge, BookingTimeline, HandoverChecklist, LifecycleProgress } from '@/components/booking/BookingParts';
import { LiveRentalPanel } from '@/components/booking/LiveRentalPanel';
import { DemoSwitchCard } from '@/components/demo/DemoCard';
import { RouteMap } from '@/components/map/RouteMap';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Header } from '@/components/ui/Header';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { ListItem } from '@/components/ui/ListItem';
import { Avatar, KeyValue, SectionHeader } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { Banner, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { config } from '@/constants/config';
import { useBookingDetails } from '@/features/bookings/hooks';
import { useBookingAction } from '@/features/bookings/useBookingAction';
import { useLiveUsage } from '@/hooks/useLiveUsage';
import { bookingService } from '@/services/bookingService';
import { DEFAULT_LOCATION } from '@/services/mapService';
import { useActor } from '@/stores/sessionStore';
import { confirm } from '@/stores/uiStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDateTime, formatDuration, formatINR, maskPhone } from '@/utils/format';
import { partnerShare } from '@/utils/pricing';

const REJECT_REASONS = ['Bike not available', 'Under maintenance', 'Customer verification concern', 'Outside working hours'];

export default function PartnerBookingHub() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const actor = useActor();
  const q = useBookingDetails(id);
  const usage = useLiveUsage(q.data?.session);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [note, setNote] = useState('');
  const [handedOver, setHandedOver] = useState(false);
  const [sos, setSos] = useState(false);

  const accept = useBookingAction(id, () => bookingService.accept(id, actor), { success: 'Booking accepted — customer notified' });
  const reject = useBookingAction(id, () => bookingService.reject(id, actor, note.trim() || reason), { success: 'Request rejected', onSuccess: () => setRejectOpen(false) });
  const arrived = useBookingAction(id, () => bookingService.markArrived(id, actor), { success: 'Customer marked as arrived' });
  const startInspection = useBookingAction(id, () => bookingService.startHandoverInspection(id, actor), { onSuccess: () => router.push(`/partner/booking/${id}/handover`) });
  const start = useBookingAction(id, () => bookingService.startRental(id, actor), { success: 'Rental started' });
  const end = useBookingAction(id, () => bookingService.requestReturn(id, actor), { success: 'Return started — customer will upload photos' });
  const resolve = useBookingAction(id, (keep: boolean) => bookingService.resolveDamage(id, actor, keep), { success: 'Damage review closed', onSuccess: () => router.push(`/partner/booking/${id}/bill`) });
  const cancel = useBookingAction(id, () => bookingService.cancel(id, actor, 'Cancelled by partner'), { success: 'Booking cancelled' });

  if (q.isLoading) return <LoadingState label="Loading booking…" />;
  if (q.isError || !q.data) {
    return (
      <Screen header={<Header title="Booking" />}>
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Screen>
    );
  }
  const b = q.data;
  const verified = b.customerProfile?.verificationStatus === 'verified';
  const customerPath = `/customer/booking/${b.id}`;
  const bikePoint = { lat: b.bike.pickupLat, lng: b.bike.pickupLng };

  const customerCard = (
    <Card onPress={() => router.push(`/partner/booking/${b.id}/customer`)} accessibilityLabel="View customer">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={b.customer.fullName} uri={b.customer.avatarUrl} size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong">{b.customer.fullName}</Text>
          <Text variant="small" color="textSecondary">
            {b.customer.age ? `${b.customer.age} yrs · ` : ''}★ {b.customerProfile?.rating.toFixed(1) ?? '–'} · {b.customerProfile?.totalRentals ?? 0} rentals
          </Text>
          <Badge label={verified ? 'Documents verified' : 'Verification pending'} tone={verified ? 'success' : 'warning'} icon={verified ? 'shield-checkmark' : 'alert-circle-outline'} />
        </View>
        <IconButton icon="call" accessibilityLabel="Contact customer" onPress={() => Linking.openURL(`tel:+91${b.customer.phone}`)} />
      </View>
    </Card>
  );

  function stage(): React.ReactNode {
    switch (b.status) {
      case 'PENDING_OWNER_CONFIRMATION':
        return (
          <>
            <Text variant="h1">New Rental Request</Text>
            {customerCard}
            <Card>
              <KeyValue label="Bike requested" value={`${b.bike.brand} ${b.bike.model}`} />
              <KeyValue label="Rental duration" value={`${b.plan.label} · ${b.plan.includedDistanceKm} km`} />
              <KeyValue label="Start time" value={formatDateTime(b.startTime)} />
              <KeyValue label="Expected return" value={formatDateTime(b.endTime)} />
              <KeyValue label="Booking amount" value={formatINR(b.plan.baseAmount)} sub={`+ ${formatINR(b.plan.securityDeposit)} refundable deposit`} strong />
              <KeyValue label="Your payout (after 10% fee)" value={formatINR(partnerShare(b.plan.baseAmount))} tone="success" />
            </Card>
            {!verified ? <Banner tone="warning" title="Customer not fully verified" message="Documents are still being verified. You may reject if unsure." /> : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button title="REJECT" variant="danger" size="lg" onPress={() => setRejectOpen(true)} />
              </View>
              <View style={{ flex: 1.4 }}>
                <Button title="ACCEPT" size="lg" icon="checkmark" onPress={() => accept.mutate(undefined)} loading={accept.isPending} />
              </View>
            </View>
          </>
        );
      case 'CONFIRMED':
      case 'CUSTOMER_ARRIVING':
        return (
          <>
            <Banner tone={b.status === 'CUSTOMER_ARRIVING' ? 'info' : 'success'} title={b.status === 'CUSTOMER_ARRIVING' ? 'Customer is on the way' : 'Booking accepted'} message={`Keep ${b.bike.brand} ${b.bike.model} ready at ${b.bike.pickupLabel}.`} />
            <RouteMap height={170} markers={[{ point: DEFAULT_LOCATION, kind: 'user' }, { point: bikePoint, kind: 'bike', label: 'Your shop' }]} />
            {customerCard}
            <Button title="Customer has arrived" icon="flag" size="lg" onPress={() => arrived.mutate(undefined)} loading={arrived.isPending} />
            <DemoSwitchCard to="customer" path={customerPath} message="Or switch to the demo Customer to navigate and tap “I've arrived”." />
          </>
        );
      case 'READY_FOR_PICKUP':
        return (
          <>
            <Banner tone="info" title="Customer arrived" message="Photograph the bike with the customer present before handing over the keys." />
            {customerCard}
            <Button title="Start bike inspection" icon="camera" size="lg" onPress={() => startInspection.mutate(undefined)} loading={startInspection.isPending} />
          </>
        );
      case 'BIKE_INSPECTION':
        return (
          <>
            <Banner tone="info" title={b.preInspection && !b.inspectionPassed ? 'Inspection needs retake' : 'Inspection in progress'} message="Capture front, rear, both sides and the speedometer." />
            <Button title="Continue inspection" icon="camera" size="lg" onPress={() => router.push(`/partner/booking/${b.id}/handover`)} />
          </>
        );
      case 'CUSTOMER_VERIFICATION':
        if (!b.faceVerified) {
          return (
            <>
              <Banner tone="success" title="Bike inspection passed" message="Waiting for the customer to complete selfie verification on their phone." />
              <DemoSwitchCard to="customer" path={`/customer/booking/${b.id}/selfie`} message="Switch to the demo Customer to take the verification selfie." />
            </>
          );
        }
        return (
          <>
            <Banner tone="success" title="All checks complete" message="Identity, documents and bike inspection are verified." />
            <Card>
              <Text variant="h3">Handover confirmation</Text>
              <Pressable onPress={() => setHandedOver((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: handedOver }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <Ionicons name={handedOver ? 'checkbox' : 'square-outline'} size={24} color={handedOver ? t.colors.primary : t.colors.textMuted} />
                <Text style={{ flex: 1 }}>I have handed over the keys, helmet and RC copy to {b.customer.fullName.split(' ')[0]}.</Text>
              </Pressable>
            </Card>
            <Button title="Start Rental" icon="play" size="lg" disabled={!handedOver} onPress={() => start.mutate(undefined)} loading={start.isPending} />
          </>
        );
      case 'ACTIVE':
        return (
          <>
            {customerCard}
            {b.session && usage ? <LiveRentalPanel plan={b.plan} session={b.session} usage={usage} /> : null}
            <Card>
              <KeyValue label="Start time" value={b.session ? formatDateTime(b.session.startedAt) : '—'} />
              <KeyValue label="Expected return" value={b.session ? formatDateTime(new Date(new Date(b.session.startedAt).getTime() + b.plan.includedDurationMinutes * 60000)) : '—'} />
              <KeyValue label="Current duration" value={usage ? formatDuration(usage.durationMinutes) : '—'} />
              <KeyValue label="Distance" value={usage ? `${usage.distanceKm.toFixed(1)} km` : '—'} />
              <KeyValue label="Booking amount" value={formatINR(b.plan.baseAmount)} strong />
            </Card>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button title="Emergency" variant="danger" icon="warning-outline" onPress={() => setSos(true)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="End rental"
                  variant="outline"
                  icon="stop-circle-outline"
                  loading={end.isPending}
                  onPress={async () => {
                    if (await confirm({ title: 'End this rental?', message: 'Use this when the customer has returned the bike to you.', confirmLabel: 'End rental' })) end.mutate(undefined);
                  }}
                />
              </View>
            </View>
          </>
        );
      case 'RETURN_REQUESTED':
        return (
          <>
            <Banner tone="info" title="Bike is being returned" message="The customer is uploading return photos. You'll be notified for review." />
            <DemoSwitchCard to="customer" path={`/customer/booking/${b.id}/return`} message="Switch to the demo Customer to upload return photos." />
          </>
        );
      case 'RETURN_INSPECTION':
        return (
          <>
            <Banner tone="warning" title="Return inspection ready" message="Compare before/after photos and confirm the bike's condition." />
            <Button title="Review return" icon="search" size="lg" onPress={() => router.push(`/partner/booking/${b.id}/return-review`)} />
          </>
        );
      case 'DAMAGE_REVIEW':
        return b.damageReport?.status === 'manual_review' ? (
          <>
            <Banner tone="warning" title="Manual review" message={b.damageReport.customerResponse ? `Customer response: “${b.damageReport.customerResponse}”` : 'You requested a PAYANAM manual review.'} />
            <Text variant="small" color="textSecondary">
              Demo: close the review yourself. In production PAYANAM support mediates this step.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button title="Withdraw claim" variant="outline" onPress={() => resolve.mutate(false)} loading={resolve.isPending} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title={`Keep ${formatINR(b.damageReport.proposedAmount)}`} onPress={() => resolve.mutate(true)} loading={resolve.isPending} disabled={b.damageReport.proposedAmount === 0} />
              </View>
            </View>
          </>
        ) : (
          <>
            <Banner tone="info" title="Waiting for customer" message={`You proposed ${formatINR(b.damageReport?.proposedAmount ?? 0)}. The customer can accept or dispute.`} />
            <DemoSwitchCard to="customer" path={`/customer/booking/${b.id}/damage`} message="Switch to the demo Customer to respond to the damage claim." />
          </>
        );
      case 'COMPLETED':
        return (
          <>
            <Banner tone="success" title="Rental completed" message={`You earn ${formatINR(partnerShare(b.finalBill?.total ?? 0))} for this rental (demo payout).`} />
            <Button title="View bill" icon="receipt-outline" size="lg" onPress={() => router.push(`/partner/booking/${b.id}/bill`)} />
          </>
        );
      case 'REJECTED':
      case 'CANCELLED':
        return <Banner tone="info" title={b.status === 'REJECTED' ? 'You rejected this request' : 'Booking cancelled'} message={b.cancelReason ?? undefined} />;
      default:
        return null;
    }
  }

  const preRental = ['CONFIRMED', 'CUSTOMER_ARRIVING', 'READY_FOR_PICKUP', 'BIKE_INSPECTION', 'CUSTOMER_VERIFICATION'].includes(b.status);
  const canCancel = ['CONFIRMED', 'CUSTOMER_ARRIVING', 'READY_FOR_PICKUP'].includes(b.status);

  return (
    <Screen header={<Header title="Booking" subtitle={`#${b.id.slice(0, 8).toUpperCase()}`} right={<BookingStatusBadge status={b.status} />} />} onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <LifecycleProgress status={b.status} />
      <View style={{ gap: 14, marginTop: 16 }}>{stage()}</View>

      {preRental ? (
        <View style={{ marginTop: 18 }}>
          <HandoverChecklist booking={b} />
        </View>
      ) : null}

      <SectionHeader title="Bike" />
      <Card style={{ marginTop: 10 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ width: 84 }}>
            <BikeImage bike={b.bike} images={b.bikeImages} height={64} radius={12} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">
              {b.bike.brand} {b.bike.model}
            </Text>
            <Text variant="small" color="textSecondary">
              {b.bike.registrationNumber} · {b.plan.label}
            </Text>
          </View>
        </View>
      </Card>

      {b.status !== 'PENDING_OWNER_CONFIRMATION' && b.status !== 'ACTIVE' ? (
        <View style={{ marginTop: 14 }}>
          <Text variant="caption" color="textMuted">
            Customer: {b.customer.fullName} · +91 {maskPhone(b.customer.phone)}
          </Text>
        </View>
      ) : null}

      <SectionHeader title="Timeline" />
      <Card style={{ marginTop: 10 }}>
        <BookingTimeline events={b.events} />
      </Card>

      {canCancel ? (
        <Button
          title="Cancel booking"
          variant="danger"
          style={{ marginTop: 18 }}
          loading={cancel.isPending}
          onPress={async () => {
            if (await confirm({ title: 'Cancel this booking?', message: 'The customer will be notified and their hold released.', confirmLabel: 'Cancel booking', destructive: true })) cancel.mutate(undefined);
          }}
        />
      ) : null}

      <BottomSheet visible={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject request" subtitle="The customer will see this reason." footer={<Button title="Reject request" variant="danger" onPress={() => reject.mutate(undefined)} loading={reject.isPending} />}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {REJECT_REASONS.map((r) => (
            <Chip key={r} label={r} selected={reason === r && !note} onPress={() => { setReason(r); setNote(''); }} />
          ))}
        </View>
        <Input label="Or write a reason" value={note} onChangeText={setNote} placeholder="Optional" />
      </BottomSheet>

      <BottomSheet visible={sos} onClose={() => setSos(false)} title="Emergency action">
        <ListItem icon="call-outline" title="Call customer" subtitle={b.customer.fullName} onPress={() => Linking.openURL(`tel:+91${b.customer.phone}`)} />
        <ListItem icon="medkit-outline" title={`Call emergency (${config.emergencyNumber})`} destructive onPress={() => Linking.openURL(`tel:${config.emergencyNumber}`)} />
        <ListItem icon="headset-outline" title="PAYANAM partner support" onPress={() => Linking.openURL(`tel:${config.supportPhone}`)} last />
      </BottomSheet>
    </Screen>
  );
}
