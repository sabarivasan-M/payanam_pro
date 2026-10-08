import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { BikeImage } from '@/components/bike/BikeImage';
import { PriceBreakdown } from '@/components/booking/BookingParts';
import { MockBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Header } from '@/components/ui/Header';
import { SectionHeader, Stepper } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { Banner, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useBike } from '@/features/bikes/hooks';
import { qk } from '@/features/queryKeys';
import { useServiceMutation } from '@/hooks/useServiceMutation';
import { bookingService } from '@/services/bookingService';
import { useProfile } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { PlanType } from '@/types/models';
import { formatDateTime, formatINR } from '@/utils/format';
import { buildRentalPlan, estimateTotal, MAX_CUSTOM_DAYS, MAX_HOURLY_HOURS } from '@/utils/pricing';

const PLANS: { type: PlanType; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'hourly', title: 'Hourly', subtitle: 'Quick errands', icon: 'time-outline' },
  { type: 'half_day', title: 'Half Day', subtitle: '6 hours', icon: 'partly-sunny-outline' },
  { type: 'full_day', title: 'Full Day', subtitle: '24 hours', icon: 'sunny-outline' },
  { type: 'custom', title: 'Custom', subtitle: 'Multi-day trips', icon: 'calendar-outline' },
];

type StartOption = 'now' | 'in1h' | 'tomorrow';

function startFor(option: StartOption): Date {
  const d = new Date();
  if (option === 'now') {
    d.setMinutes(d.getMinutes() + 15, 0, 0);
    return d;
  }
  if (option === 'in1h') {
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  }
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

export default function BookBike() {
  const t = useTheme();
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const profile = useProfile();
  const bike = useBike(bikeId);
  const [planType, setPlanType] = useState<PlanType>('full_day');
  const [hours, setHours] = useState(2);
  const [days, setDays] = useState(2);
  const [startOpt, setStartOpt] = useState<StartOption>('now');

  const plan = useMemo(
    () => (bike.data ? buildRentalPlan(bike.data, planType, planType === 'hourly' ? hours : planType === 'custom' ? days : 1) : null),
    [bike.data, planType, hours, days],
  );

  const create = useServiceMutation(
    () => bookingService.createBooking(profile.id, bike.data!, plan!, startFor(startOpt)),
    {
      invalidate: [qk.bookingsAll, qk.bikesAll],
      success: 'Booking request sent',
      onSuccess: (b) => router.replace(`/customer/booking/${b.id}`),
    },
  );

  if (bike.isLoading) return <LoadingState />;
  if (bike.isError || !bike.data || !plan) {
    return (
      <Screen header={<Header title="Book" />}>
        <ErrorState error={bike.error} onRetry={() => bike.refetch()} />
      </Screen>
    );
  }
  const b = bike.data;

  return (
    <Screen
      header={<Header title="Select rental duration" />}
      footer={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View>
            <Text variant="caption" color="textMuted">
              Estimated total
            </Text>
            <Text variant="h2">{formatINR(estimateTotal(plan))}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Confirm Booking" size="lg" onPress={() => create.mutate(undefined)} loading={create.isPending} disabled={b.status !== 'AVAILABLE'} />
          </View>
        </View>
      }
    >
      <Card>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ width: 92 }}>
            <BikeImage bike={b} images={b.images} height={70} radius={14} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">
              {b.brand} {b.model}
            </Text>
            <Text variant="small" color="textSecondary">
              {b.pickupLabel} · {b.partner?.businessName}
            </Text>
          </View>
        </View>
      </Card>

      {b.status !== 'AVAILABLE' ? (
        <View style={{ marginTop: 12 }}>
          <Banner tone="warning" title="Bike unavailable" message="This bike was just booked or taken offline. Pick another bike." />
        </View>
      ) : null}

      <SectionHeader title="Duration" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
        {PLANS.map((p) => {
          const active = p.type === planType;
          const preview = buildRentalPlan(b, p.type, p.type === 'hourly' ? hours : p.type === 'custom' ? days : 1);
          return (
            <Pressable
              key={p.type}
              onPress={() => setPlanType(p.type)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={{
                width: '48%',
                flexGrow: 1,
                padding: 14,
                borderRadius: t.radius.xl,
                borderWidth: 2,
                borderColor: active ? t.colors.primary : t.colors.border,
                backgroundColor: active ? t.colors.primarySoft : t.colors.surface,
                gap: 6,
              }}
            >
              <Ionicons name={p.icon} size={22} color={active ? t.colors.primary : t.colors.textSecondary} />
              <Text variant="bodyStrong">{p.title}</Text>
              <Text variant="caption" color="textSecondary">
                {p.subtitle}
              </Text>
              <Text variant="smallStrong" color="primary">
                {formatINR(preview.baseAmount)} · {preview.includedDistanceKm} km
              </Text>
            </Pressable>
          );
        })}
      </View>

      {planType === 'hourly' ? (
        <Card style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="bodyStrong">Hours</Text>
            <Stepper value={hours} min={1} max={MAX_HOURLY_HOURS} onChange={setHours} suffix="hr" />
          </View>
        </Card>
      ) : null}
      {planType === 'custom' ? (
        <Card style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="bodyStrong">Days</Text>
            <Stepper value={days} min={1} max={MAX_CUSTOM_DAYS} onChange={setDays} suffix={days > 1 ? 'days' : 'day'} />
          </View>
        </Card>
      ) : null}

      <SectionHeader title="Pickup time" />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <Chip label="In 15 min" selected={startOpt === 'now'} onPress={() => setStartOpt('now')} />
        <Chip label="In 1 hour" selected={startOpt === 'in1h'} onPress={() => setStartOpt('in1h')} />
        <Chip label="Tomorrow 9 AM" selected={startOpt === 'tomorrow'} onPress={() => setStartOpt('tomorrow')} />
      </View>
      <Text variant="small" color="textSecondary" style={{ marginTop: 8 }}>
        Starts {formatDateTime(startFor(startOpt))}. The rental clock starts at handover.
      </Text>

      <View style={{ marginTop: 18 }}>
        <PriceBreakdown plan={plan} />
      </View>

      <Card style={{ marginTop: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="wallet-outline" size={22} color={t.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Pay via UPI</Text>
            <Text variant="caption" color="textSecondary">
              Amount is held now and settled after return. Deposit is refunded.
            </Text>
          </View>
          <MockBadge label="MOCK" />
        </View>
      </Card>
    </Screen>
  );
}
