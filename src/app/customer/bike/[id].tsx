import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, FlatList, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { BikeImage } from '@/components/bike/BikeImage';
import { BikeStatusBadge } from '@/components/bike/BikeCard';
import { RouteMap } from '@/components/map/RouteMap';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { KeyValue, SectionHeader } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Banner, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useBike, useBikeHolds } from '@/features/bikes/hooks';
import { useDocuments } from '@/features/verification/hooks';
import { useLocationStore } from '@/stores/locationStore';
import { useProfile } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { PhotoAngle } from '@/types/models';
import { capitalize, formatINR, formatKm, maskRegistration } from '@/utils/format';

const GALLERY: { angle: PhotoAngle; label: string }[] = [
  { angle: 'left', label: 'Side' },
  { angle: 'front', label: 'Front' },
  { angle: 'rear', label: 'Rear' },
  { angle: 'speedometer', label: 'Speedometer' },
];

const DAY = 86400000;

export default function BikeDetails() {
  const t = useTheme();
  const { id, rent } = useLocalSearchParams<{ id: string; rent?: string }>();
  const profile = useProfile();
  const bike = useBike(id);
  const holds = useBikeHolds(id);
  const docs = useDocuments(profile.id);
  const origin = useLocationStore((s) => s.point);
  const [slide, setSlide] = useState(0);
  const [sheet, setSheet] = useState(false);
  const width = Dimensions.get('window').width;

  useEffect(() => {
    if (rent && bike.data) setSheet(true);
  }, [rent, bike.data]);

  const days = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 10 }, (_, i) => {
      const d = new Date(start.getTime() + i * DAY);
      const booked = (holds.data ?? []).some((h) => new Date(h.startTime).getTime() < d.getTime() + DAY && new Date(h.endTime).getTime() > d.getTime());
      return { d, booked };
    });
  }, [holds.data]);

  if (bike.isLoading) {
    return (
      <Screen>
        <Skeleton height={280} radius={24} style={{ marginTop: 12 }} />
        <Skeleton width="50%" height={26} style={{ marginTop: 18 }} />
        <Skeleton width="30%" height={16} style={{ marginTop: 10 }} />
        <Skeleton height={120} radius={20} style={{ marginTop: 18 }} />
      </Screen>
    );
  }
  if (bike.isError || !bike.data) {
    return (
      <Screen>
        <ErrorState error={bike.error} title="Bike not found" onRetry={() => bike.refetch()} />
      </Screen>
    );
  }

  const b = bike.data;
  const verified = docs.data?.every((d) => d.status === 'verified') ?? false;
  const available = b.status === 'AVAILABLE';
  const todayFree = !days[0]?.booked;

  const continueToRent = () => {
    setSheet(false);
    if (verified) router.push(`/customer/book/${b.id}`);
    else router.push(`/customer/verify-documents?next=${b.id}`);
  };

  const specs: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
    { icon: 'flash-outline', label: 'Engine', value: b.fuelType === 'electric' ? 'Electric motor' : `${b.engineCc} cc` },
    { icon: 'water-outline', label: 'Fuel', value: capitalize(b.fuelType) },
    { icon: 'cog-outline', label: 'Transmission', value: b.transmission === 'automatic' ? 'Automatic' : 'Manual (geared)' },
    { icon: 'speedometer-outline', label: b.fuelType === 'electric' ? 'Range' : 'Mileage', value: b.fuelType === 'electric' ? `${b.mileageKmpl} km/charge` : `${b.mileageKmpl} km/l` },
    { icon: 'people-outline', label: 'Seats', value: `${b.seatingCapacity}` },
    { icon: 'sparkles-outline', label: 'Condition', value: capitalize(b.condition) },
  ];

  return (
    <Screen
      padded={false}
      edges={['top', 'bottom']}
      footer={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View>
            <Text variant="h2">{formatINR(b.dailyPrice)}</Text>
            <Text variant="caption" color="textMuted">
              per day · {formatINR(b.hourlyPrice)}/hr
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Check Availability" size="lg" onPress={() => setSheet(true)} disabled={b.status === 'INACTIVE'} />
          </View>
        </View>
      }
    >
      <View>
        <FlatList
          data={GALLERY}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(g) => g.angle}
          onMomentumScrollEnd={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <View style={{ width, paddingHorizontal: 16 }}>
              <BikeImage bike={b} images={b.images} angle={item.angle} height={270} radius={28} />
              <View style={{ position: 'absolute', bottom: 14, left: 30 }}>
                <Badge label={`${item.label} view`} tone="neutral" icon="camera-outline" />
              </View>
            </View>
          )}
        />
        <View style={{ position: 'absolute', top: 12, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between' }}>
          <IconButton icon="chevron-back" accessibilityLabel="Go back" onPress={() => router.back()} />
          <BikeStatusBadge status={b.status} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {GALLERY.map((g, i) => (
            <View key={g.angle} style={{ width: i === slide ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === slide ? t.colors.primary : t.colors.borderStrong }} />
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 16, marginTop: 12 }}>
        <View>
          <Text variant="overline" color="textMuted">
            {b.brand.toUpperCase()} · {b.year}
          </Text>
          <Text variant="display">{b.model}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="star" size={15} color={t.colors.accent} />
              <Text variant="smallStrong">{b.rating ? b.rating.toFixed(1) : 'New'}</Text>
              <Text variant="small" color="textMuted">
                ({b.ratingCount} rides)
              </Text>
            </View>
            {b.distanceKm != null ? (
              <Text variant="small" color="textSecondary">
                {formatKm(b.distanceKm)} away
              </Text>
            ) : null}
            <Text variant="small" color="textSecondary">
              Reg. {maskRegistration(b.registrationNumber)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {specs.map((s) => (
            <View key={s.label} style={{ width: '31%', flexGrow: 1, padding: 12, borderRadius: t.radius.lg, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, gap: 4 }}>
              <Ionicons name={s.icon} size={18} color={t.colors.primary} />
              <Text variant="caption" color="textMuted">
                {s.label}
              </Text>
              <Text variant="smallStrong">{s.value}</Text>
            </View>
          ))}
        </View>

        <Card>
          <Text variant="h3" style={{ marginBottom: 4 }}>
            Pricing
          </Text>
          <KeyValue label="Rental price" value={`${formatINR(b.dailyPrice)}/day`} />
          <KeyValue label="Hourly price" value={`${formatINR(b.hourlyPrice)}/hr`} />
          <KeyValue label="Included distance" value={`${b.includedKmPerDay} km/day`} />
          <KeyValue label="Extra kilometre" value={`${formatINR(b.extraKmRate)}/km`} />
          <KeyValue label="Extra time" value={`${formatINR(b.extraMinuteRate)}/min`} />
          <KeyValue label="Security deposit" sub="Fully refundable" value={formatINR(b.securityDeposit)} />
          {b.forSale && b.purchasePrice ? <KeyValue label="Available to buy" value={formatINR(b.purchasePrice)} tone="primary" /> : null}
        </Card>

        {b.partner ? (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: t.colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="storefront" size={22} color={t.colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{b.partner.businessName}</Text>
                <Text variant="small" color="textSecondary">
                  ★ {b.partner.rating.toFixed(1)} owner rating · {b.partner.ratingCount} reviews
                </Text>
              </View>
              <Badge label="Verified" tone="success" icon="shield-checkmark" />
            </View>
          </Card>
        ) : null}

        <SectionHeader title="Pickup location" />
        <RouteMap height={170} markers={[{ point: origin, kind: 'user' }, { point: { lat: b.pickupLat, lng: b.pickupLng }, kind: 'bike', label: b.pickupLabel }]} />
        <Text variant="small" color="textSecondary" style={{ marginTop: -6 }}>
          {b.pickupLabel}, {b.city}. Exact address is shared after the partner accepts.
        </Text>

        <SectionHeader title="Available dates" />
        <FlatList
          horizontal
          data={days}
          keyExtractor={(d) => d.d.toISOString()}
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
          renderItem={({ item }) => (
            <View
              style={{
                width: 58,
                paddingVertical: 10,
                borderRadius: t.radius.lg,
                alignItems: 'center',
                backgroundColor: item.booked || !available ? t.colors.surfaceAlt : t.colors.primarySoft,
                borderWidth: 1,
                borderColor: item.booked || !available ? t.colors.border : t.colors.primary,
                opacity: item.booked || !available ? 0.6 : 1,
              }}
            >
              <Text variant="caption" color="textSecondary">
                {item.d.toLocaleDateString('en-IN', { weekday: 'short' })}
              </Text>
              <Text variant="h3" style={{ textDecorationLine: item.booked ? 'line-through' : 'none' }}>
                {item.d.getDate()}
              </Text>
              <Text variant="caption" color={item.booked || !available ? 'textMuted' : 'primary'}>
                {item.booked ? 'Booked' : available ? 'Free' : '—'}
              </Text>
            </View>
          )}
        />
        <View style={{ height: 12 }} />
      </View>

      <BottomSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        title="Availability"
        subtitle={`${b.brand} ${b.model} · ${b.pickupLabel}`}
        footer={<Button title="Continue to Rent" size="lg" iconRight="arrow-forward" onPress={continueToRent} disabled={!available || !todayFree} />}
      >
        {holds.isLoading ? (
          <Skeleton height={60} />
        ) : available && todayFree ? (
          <Banner tone="success" title="Available today" message="You can pick this bike up today. Choose your rental duration on the next step." />
        ) : (
          <Banner
            tone="warning"
            title={b.status === 'MAINTENANCE' ? 'Under maintenance' : 'Not available right now'}
            message={b.status === 'MAINTENANCE' ? 'The partner has marked this bike for servicing.' : 'This bike is booked for today. Check other bikes nearby.'}
          />
        )}
        {!verified ? (
          <Banner tone="info" icon="shield-checkmark-outline" title="Identity verification required" message="Before your first booking we'll ask for your Aadhaar and Driving Licence. It takes about a minute." />
        ) : (
          <Banner tone="success" icon="shield-checkmark" title="You're verified" message="Your documents are verified — you can book instantly." />
        )}
        <Pressable onPress={() => setSheet(false)}>
          <Text variant="small" color="textSecondary" align="center">
            Not now
          </Text>
        </Pressable>
      </BottomSheet>
    </Screen>
  );
}
