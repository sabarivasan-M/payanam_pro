import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import type { BikeStatus, BikeWithMeta } from '@/types/models';
import type { StatusTone } from '@/utils/bookingStateMachine';
import { formatINR, formatKm } from '@/utils/format';
import { BikeImage } from './BikeImage';

export const BIKE_STATUS_META: Record<BikeStatus, { label: string; tone: StatusTone }> = {
  AVAILABLE: { label: 'Available', tone: 'success' },
  BOOKED: { label: 'Booked', tone: 'warning' },
  ACTIVE: { label: 'On rental', tone: 'info' },
  MAINTENANCE: { label: 'Maintenance', tone: 'danger' },
  INACTIVE: { label: 'Inactive', tone: 'neutral' },
};

export function BikeStatusBadge({ status }: { status: BikeStatus }) {
  const m = BIKE_STATUS_META[status];
  return <Badge label={m.label} tone={m.tone} dot />;
}

function Rating({ value, count }: { value: number; count?: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Ionicons name="star" size={13} color={t.colors.accent} />
      <Text variant="smallStrong">{value ? value.toFixed(1) : 'New'}</Text>
      {count ? (
        <Text variant="caption" color="textMuted">
          ({count})
        </Text>
      ) : null}
    </View>
  );
}

interface Props {
  bike: BikeWithMeta;
  onPress: () => void;
  onRent?: () => void;
  showPurchase?: boolean;
}

/** Full-width marketplace card */
export function BikeCard({ bike, onPress, onRent, showPurchase }: Props) {
  const t = useTheme();
  return (
    <Card onPress={onPress} padded={false} accessibilityLabel={`${bike.brand} ${bike.model}, ${formatINR(bike.dailyPrice)} per day`}>
      <View style={{ padding: 10 }}>
        <BikeImage bike={bike} images={bike.images} height={150} />
        <View style={{ position: 'absolute', top: 20, left: 20 }}>
          <BikeStatusBadge status={bike.status} />
        </View>
        {bike.distanceKm != null ? (
          <View style={{ position: 'absolute', top: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.colors.surface, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 }}>
            <Ionicons name="navigate" size={11} color={t.colors.primary} />
            <Text variant="caption">{formatKm(bike.distanceKm)} away</Text>
          </View>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="textMuted">
              {bike.brand.toUpperCase()} · {bike.year}
            </Text>
            <Text variant="h3">{bike.model}</Text>
          </View>
          <Rating value={bike.rating} count={bike.ratingCount} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="location-outline" size={14} color={t.colors.textSecondary} />
          <Text variant="small" color="textSecondary" numberOfLines={1} style={{ flex: 1 }}>
            {bike.pickupLabel}
            {bike.partner ? ` · ${bike.partner.businessName}` : ''}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
          <View>
            {showPurchase && bike.purchasePrice ? (
              <>
                <Text variant="h2">{formatINR(bike.purchasePrice)}</Text>
                <Text variant="caption" color="textMuted">
                  Purchase price · {formatINR(bike.dailyPrice)}/day rental
                </Text>
              </>
            ) : (
              <Text variant="h2">
                {formatINR(bike.dailyPrice)}
                <Text variant="small" color="textSecondary">
                  {' '}
                  /day
                </Text>
              </Text>
            )}
          </View>
          {onRent ? (
            <Button title="Rent Now" size="sm" fullWidth={false} onPress={onRent} disabled={bike.status !== 'AVAILABLE'} />
          ) : (
            <Text variant="smallStrong" color="primary">
              View Details →
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
}

/** Compact card for horizontal carousels */
export function BikeCardCompact({ bike, onPress }: { bike: BikeWithMeta; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${bike.brand} ${bike.model}`}
      style={({ pressed }) => ({
        width: 210,
        backgroundColor: t.colors.surface,
        borderRadius: t.radius.xl,
        borderWidth: 1,
        borderColor: t.colors.border,
        padding: 8,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <BikeImage bike={bike} images={bike.images} height={110} />
      <View style={{ padding: 8, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {bike.brand} {bike.model}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="smallStrong" color="primary">
            {formatINR(bike.dailyPrice)}/day
          </Text>
          <Rating value={bike.rating} />
        </View>
        <Text variant="caption" color="textMuted">
          {bike.distanceKm != null ? `${formatKm(bike.distanceKm)} · ` : ''}
          {BIKE_STATUS_META[bike.status].label}
        </Text>
      </View>
    </Pressable>
  );
}
