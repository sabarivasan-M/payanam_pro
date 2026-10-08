import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { BarChart } from '@/components/charts/BarChart';
import { MockBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ListItem } from '@/components/ui/ListItem';
import { SectionHeader, SegmentedControl } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { ListSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useEarnings } from '@/features/payments/hooks';
import { useT } from '@/features/i18n';
import { useProfile } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatINR, formatShortDate } from '@/utils/format';
import { PLATFORM_FEE_RATE } from '@/utils/pricing';

export default function Earnings() {
  const t = useTheme();
  const tr = useT();
  const profile = useProfile();
  const q = useEarnings(profile.id);
  const [range, setRange] = useState<'week' | 'months'>('week');
  const d = q.data;

  const tiles = d
    ? [
        { label: 'Today', value: d.today },
        { label: 'This week', value: d.week },
        { label: 'This month', value: d.month },
        { label: 'Total earnings', value: d.total },
      ]
    : [];

  return (
    <Screen edges={['top']} onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <Text variant="h1">{tr('earnings')}</Text>
        <MockBadge label="DEMO PAYOUTS" />
      </View>
      {q.isLoading ? (
        <View style={{ gap: 12, marginTop: 16 }}>
          <Skeleton height={120} radius={22} />
          <Skeleton height={200} radius={22} />
          <ListSkeleton rows={3} />
        </View>
      ) : q.isError || !d ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
            {tiles.map((tile, i) => (
              <View
                key={tile.label}
                style={{
                  width: '48%',
                  flexGrow: 1,
                  padding: 14,
                  borderRadius: t.radius.xl,
                  backgroundColor: i === 0 ? t.colors.primary : t.colors.surface,
                  borderWidth: 1,
                  borderColor: i === 0 ? t.colors.primary : t.colors.border,
                }}
              >
                <Text variant="caption" style={{ color: i === 0 ? t.colors.accent : t.colors.textMuted }}>
                  {tile.label.toUpperCase()}
                </Text>
                <Text variant="h1" style={{ color: i === 0 ? t.colors.onPrimary : t.colors.text, marginTop: 4 }}>
                  {formatINR(tile.value)}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <Card style={{ flex: 1 }} tone="accent" elevated={false}>
              <Text variant="caption" color="textSecondary">
                Pending settlement
              </Text>
              <Text variant="h2">{formatINR(d.pendingSettlement)}</Text>
            </Card>
            <Card style={{ flex: 1 }} tone="soft" elevated={false}>
              <Text variant="caption" color="textSecondary">
                Completed rentals
              </Text>
              <Text variant="h2">{d.completedRentals}</Text>
            </Card>
          </View>

          <Card style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text variant="h3">Revenue</Text>
              <View style={{ width: 170 }}>
                <SegmentedControl value={range} onChange={setRange} options={[{ value: 'week', label: '7 days' }, { value: 'months', label: '6 months' }]} />
              </View>
            </View>
            <BarChart data={range === 'week' ? d.daily : d.monthly} />
          </Card>
          <Text variant="caption" color="textMuted" style={{ marginTop: 8 }}>
            Amounts shown are your share after the {Math.round(PLATFORM_FEE_RATE * 100)}% PAYANAM platform fee.
          </Text>

          <SectionHeader title="Rental-wise earnings" />
          <Card style={{ marginTop: 10 }} padded={false}>
            <View style={{ paddingHorizontal: 16 }}>
              {d.rentals.length === 0 ? (
                <EmptyState compact icon="wallet-outline" title="No earnings yet" message="Completed rentals will appear here." />
              ) : (
                d.rentals.slice(0, 20).map((r, i, arr) => (
                  <ListItem
                    key={r.payment.id}
                    icon="bicycle-outline"
                    title={r.bike ? `${r.bike.brand} ${r.bike.model}` : 'Rental'}
                    subtitle={`${formatShortDate(r.payment.createdAt)} · ${r.payment.settlementStatus === 'pending' ? 'Settlement pending' : 'Settled'}`}
                    value={formatINR(r.payment.partnerAmount)}
                    onPress={r.booking ? () => router.push(`/partner/booking/${r.booking!.id}`) : undefined}
                    last={i === arr.length - 1}
                  />
                ))
              )}
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}
