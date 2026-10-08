import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BikeImage } from '@/components/bike/BikeImage';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Divider, KeyValue } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import type { BookingListItem } from '@/services/bookingService';
import { useTheme } from '@/theme/ThemeProvider';
import type { BookingDetails, BookingEvent, BookingStatus, FinalBill, RentalPlan } from '@/types/models';
import { BOOKING_STATUS_META, LIFECYCLE_MILESTONES, statusRank } from '@/utils/bookingStateMachine';
import { formatDateTime, formatDuration, formatINR, formatShortDate, formatTime } from '@/utils/format';

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const m = BOOKING_STATUS_META[status];
  return <Badge label={m.label} tone={m.tone} dot />;
}

/** Pre-booking estimate */
export function PriceBreakdown({ plan }: { plan: RentalPlan }) {
  const t = useTheme();
  return (
    <Card>
      <Text variant="h3" style={{ marginBottom: 6 }}>
        Price breakdown
      </Text>
      <KeyValue label="Base rental" sub={plan.label} value={formatINR(plan.baseAmount)} />
      <KeyValue label="Duration" value={formatDuration(plan.includedDurationMinutes)} />
      <KeyValue label="Included distance" value={`${plan.includedDistanceKm} km`} />
      <KeyValue label="Security deposit" sub="Refunded after a clean return" value={formatINR(plan.securityDeposit)} />
      <Divider />
      <KeyValue label="Estimated total" value={formatINR(plan.baseAmount + plan.securityDeposit)} strong />
      <View style={{ marginTop: 10, padding: 12, borderRadius: t.radius.md, backgroundColor: t.colors.accentSoft, gap: 4 }}>
        <Text variant="smallStrong">Extra charges (only if you exceed)</Text>
        <Text variant="small" color="textSecondary">
          {formatINR(plan.extraKmRate)}/km after {plan.includedDistanceKm} km
        </Text>
        <Text variant="small" color="textSecondary">
          {formatINR(plan.extraMinuteRate)}/min after {formatDuration(plan.includedDurationMinutes)}
        </Text>
      </View>
    </Card>
  );
}

/** Final invoice lines */
export function BillLines({ bill }: { bill: FinalBill }) {
  return (
    <View>
      <KeyValue label="Base rental" value={formatINR(bill.baseAmount)} />
      <KeyValue label="Extra distance" sub={bill.extraKm ? `${bill.extraKm} km over limit` : 'Within limit'} value={formatINR(bill.extraKmCharge)} />
      <KeyValue label="Extra time" sub={bill.extraMinutes ? `${bill.extraMinutes} min over limit` : 'Within limit'} value={formatINR(bill.extraTimeCharge)} />
      <KeyValue label="Damage" value={formatINR(bill.damageCharge)} tone={bill.damageCharge ? 'danger' : undefined} />
      <Divider />
      <KeyValue label="Total" value={formatINR(bill.total)} strong />
      <Divider />
      <KeyValue label="Security deposit" sub={bill.depositStatus === 'REFUNDED' ? 'Refunded to original method' : 'Refundable'} value={formatINR(bill.securityDeposit)} tone="success" />
    </View>
  );
}

export function BookingCard({ item, onPress, perspective }: { item: BookingListItem; onPress: () => void; perspective: 'customer' | 'partner' }) {
  const t = useTheme();
  const amount = item.finalBill?.total ?? item.plan.baseAmount;
  return (
    <Card onPress={onPress} accessibilityLabel="View rental details">
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 86 }}>
          {item.bike ? <BikeImage bike={item.bike} images={item.bikeImages} height={72} radius={14} /> : null}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
            <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
              {item.bike ? `${item.bike.brand} ${item.bike.model}` : 'Bike'}
            </Text>
            <BookingStatusBadge status={item.status} />
          </View>
          {perspective === 'partner' && item.customer ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="person-outline" size={13} color={t.colors.textSecondary} />
              <Text variant="small" color="textSecondary">
                {item.customer.fullName}
              </Text>
              {item.customerVerified ? <Ionicons name="shield-checkmark" size={13} color={t.colors.success} /> : null}
            </View>
          ) : null}
          <Text variant="small" color="textSecondary">
            {formatShortDate(item.startTime)} · {formatTime(item.startTime)} · {item.plan.label}
          </Text>
          <Text variant="bodyStrong" color="primary">
            {formatINR(amount)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

/** Vertical timeline built from booking_events */
export function BookingTimeline({ events }: { events: BookingEvent[] }) {
  const t = useTheme();
  const visible = events.filter((e) => e.toStatus !== 'DRAFT');
  return (
    <View>
      {visible.map((e, i) => {
        const meta = BOOKING_STATUS_META[e.toStatus];
        const last = i === visible.length - 1;
        return (
          <View key={e.id} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ alignItems: 'center', width: 18 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, marginTop: 4, backgroundColor: last ? t.colors.primary : t.colors.primarySoft, borderWidth: 2, borderColor: t.colors.primary }} />
              {!last ? <View style={{ flex: 1, width: 2, backgroundColor: t.colors.primarySoft }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : 16 }}>
              <Text variant="smallStrong">{meta.label}</Text>
              <Text variant="caption" color="textMuted">
                {formatDateTime(e.createdAt)} · by {e.actorRole === 'system' ? 'PAYANAM' : e.actorRole}
              </Text>
              {e.note ? (
                <Text variant="small" color="textSecondary" style={{ marginTop: 2 }}>
                  “{e.note}”
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Handover status shown identically to customer and partner */
export function HandoverChecklist({ booking }: { booking: BookingDetails }) {
  const t = useTheme();
  const rank = statusRank(booking.status);
  const docsOk = booking.customerProfile?.verificationStatus === 'verified';
  const items: { label: string; done: boolean; active: boolean }[] = [
    { label: 'Partner confirmed booking', done: rank >= statusRank('CONFIRMED'), active: booking.status === 'PENDING_OWNER_CONFIRMATION' },
    { label: 'Documents verified', done: docsOk, active: !docsOk },
    { label: 'Customer arrived at pickup', done: rank >= statusRank('READY_FOR_PICKUP'), active: booking.status === 'CONFIRMED' || booking.status === 'CUSTOMER_ARRIVING' },
    { label: 'Bike inspection passed', done: booking.inspectionPassed, active: booking.status === 'READY_FOR_PICKUP' || booking.status === 'BIKE_INSPECTION' },
    { label: 'Customer selfie verified', done: booking.faceVerified, active: booking.status === 'CUSTOMER_VERIFICATION' && !booking.faceVerified },
    { label: 'Rental started', done: rank >= statusRank('ACTIVE'), active: booking.status === 'CUSTOMER_VERIFICATION' && booking.faceVerified },
  ];
  return (
    <Card>
      <Text variant="h3" style={{ marginBottom: 10 }}>
        Handover status
      </Text>
      <View style={{ gap: 10 }}>
        {items.map((it) => (
          <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons
              name={it.done ? 'checkmark-circle' : it.active ? 'radio-button-on' : 'ellipse-outline'}
              size={20}
              color={it.done ? t.colors.success : it.active ? t.colors.warning : t.colors.textMuted}
            />
            <Text variant="small" color={it.done ? 'text' : it.active ? 'text' : 'textMuted'} style={{ fontFamily: it.active ? t.fonts.semibold : undefined }}>
              {it.label}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Horizontal progress across the whole lifecycle */
export function LifecycleProgress({ status }: { status: BookingStatus }) {
  const t = useTheme();
  const rank = statusRank(status);
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {LIFECYCLE_MILESTONES.map((m) => (
        <View key={m.status} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: rank >= statusRank(m.status) ? t.colors.primary : t.colors.surfaceAlt }} />
      ))}
    </View>
  );
}
