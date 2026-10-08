import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Logo } from '@/components/brand/Logo';
import { BikeIllustration } from '@/components/bike/BikeIllustration';
import { BikeCard, BikeCardCompact } from '@/components/bike/BikeCard';
import { FilterSheet } from '@/components/bike/FilterSheet';
import { LocationSheet } from '@/components/bike/LocationSheet';
import { BookingStatusBadge } from '@/components/booking/BookingParts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { SectionHeader } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { BikeCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useBikes } from '@/features/bikes/hooks';
import { useCurrentBooking } from '@/features/bookings/hooks';
import { useT } from '@/features/i18n';
import { useNotifications, useUnreadCount } from '@/features/notifications/hooks';
import { useCustomerProfile } from '@/features/profile/hooks';
import { countActiveFilters, DEFAULT_FILTERS, type BikeFilters } from '@/services/bikeService';
import { useLocationStore } from '@/stores/locationStore';
import { useProfile } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';
import { greeting } from '@/utils/format';

export default function CustomerHome() {
  const t = useTheme();
  const tr = useT();
  const profile = useProfile();
  const [filters, setFilters] = useState<BikeFilters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const location = useLocationStore((s) => s.label);
  const bikes = useBikes(filters);
  const topRated = useBikes(useMemo(() => ({ sort: 'rating' as const, availableOnly: true }), []));
  const current = useCurrentBooking();
  const cp = useCustomerProfile(profile.id);
  const unread = useUnreadCount();
  const notifications = useNotifications();
  const activeCount = countActiveFilters(filters);

  const quick: { label: string; active: boolean; toggle: () => void }[] = [
    { label: 'Available now', active: !!filters.availableOnly, toggle: () => setFilters((f) => ({ ...f, availableOnly: !f.availableOnly })) },
    { label: 'Scooters', active: !!filters.bikeTypes?.includes('scooter'), toggle: () => setFilters((f) => ({ ...f, bikeTypes: f.bikeTypes?.includes('scooter') ? [] : ['scooter'] })) },
    { label: 'Under ₹500', active: filters.maxPrice === 500, toggle: () => setFilters((f) => ({ ...f, maxPrice: f.maxPrice === 500 ? null : 500 })) },
    { label: 'Within 5 km', active: filters.maxDistanceKm === 5, toggle: () => setFilters((f) => ({ ...f, maxDistanceKm: f.maxDistanceKm === 5 ? null : 5 })) },
  ];

  const refresh = () => {
    void bikes.refetch();
    void topRated.refetch();
    void current.refetch();
    void notifications.refetch();
  };

  return (
    <Screen edges={['top']} refreshing={bikes.isRefetching} onRefresh={refresh}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
        <Logo size={32} />
        <IconButton icon="notifications-outline" accessibilityLabel={`Notifications, ${unread} unread`} badge={unread} onPress={() => router.push('/notifications')} />
      </View>

      <Text variant="h1" style={{ marginTop: 22 }}>
        {greeting()}, {profile.fullName.split(' ')[0]}
      </Text>
      <Pressable onPress={() => setLocationOpen(true)} accessibilityRole="button" accessibilityLabel="Change location" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <Ionicons name="location" size={16} color={t.colors.primary} />
        <Text variant="small" color="textSecondary">
          {tr('yourLocation')}:
        </Text>
        <Text variant="smallStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
          {location}
        </Text>
        <Ionicons name="chevron-down" size={16} color={t.colors.text} />
      </Pressable>

      {current.data ? (
        <Card onPress={() => router.push(`/customer/booking/${current.data!.id}`)} style={{ marginTop: 18 }} tone="soft" elevated={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={current.data.status === 'ACTIVE' ? 'speedometer' : 'receipt-outline'} size={22} color={t.colors.onPrimary} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="bodyStrong">{current.data.status === 'ACTIVE' ? 'Your ride is in progress' : 'You have an ongoing booking'}</Text>
              <BookingStatusBadge status={current.data.status} />
            </View>
            <Ionicons name="chevron-forward" size={20} color={t.colors.primary} />
          </View>
        </Card>
      ) : null}

      {cp.data && cp.data.verificationStatus !== 'verified' ? (
        <Card onPress={() => router.push('/customer/verify-documents')} style={{ marginTop: 12 }} tone="accent" elevated={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="shield-checkmark-outline" size={26} color={t.colors.warning} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">Verify once, ride anytime</Text>
              <Text variant="small" color="textSecondary">
                Upload Aadhaar & Driving Licence to unlock booking.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={t.colors.text} />
          </View>
        </Card>
      ) : null}

      <View style={{ marginTop: 18, borderRadius: t.radius.xxl, backgroundColor: t.colors.primary, padding: 20, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -26, bottom: -18, opacity: 0.95 }}>
          <BikeIllustration type="scooter" color="#F2A33A" width={190} height={114} />
        </View>
        <Text variant="overline" style={{ color: t.colors.accent }}>
          RIDE IN MINUTES
        </Text>
        <Text variant="h1" style={{ color: t.colors.onPrimary, maxWidth: '62%', marginTop: 4 }}>
          {tr('findBike')}
        </Text>
        <Text variant="small" style={{ color: t.colors.onPrimary, opacity: 0.85, maxWidth: '58%', marginTop: 6 }}>
          Verified partners, inspected bikes, clear pricing.
        </Text>
        <Button title="Explore bikes" variant="accent" size="sm" fullWidth={false} iconRight="arrow-forward" style={{ marginTop: 16 }} onPress={() => router.push('/customer/rent')} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 18, marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        <Chip label="Filters" icon="options-outline" count={activeCount} selected={activeCount > 0} onPress={() => setFilterOpen(true)} />
        {quick.map((q) => (
          <Chip key={q.label} label={q.label} selected={q.active} onPress={q.toggle} />
        ))}
      </ScrollView>

      {topRated.data && topRated.data.length > 0 && activeCount === 0 ? (
        <>
          <SectionHeader title="Top rated near you" />
          <FlatList
            horizontal
            data={topRated.data.slice(0, 6)}
            keyExtractor={(b) => b.id}
            renderItem={({ item }) => <BikeCardCompact bike={item} onPress={() => router.push(`/customer/bike/${item.id}`)} />}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -16, marginTop: 12 }}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        </>
      ) : null}

      <View style={{ marginTop: 14 }}>
        <SectionHeader title={tr('nearbyBikes')} action="See all" onAction={() => router.push('/customer/rent')} />
      </View>
      <View style={{ gap: 14, marginTop: 12 }}>
        {bikes.isLoading ? (
          <>
            <BikeCardSkeleton />
            <BikeCardSkeleton />
          </>
        ) : bikes.isError ? (
          <ErrorState error={bikes.error} title="Couldn't load bikes" onRetry={() => bikes.refetch()} compact />
        ) : bikes.data && bikes.data.length === 0 ? (
          <EmptyState
            compact
            title="No bikes available nearby"
            message="Try widening the distance or clearing filters."
            actionLabel="Clear filters"
            onAction={() => setFilters(DEFAULT_FILTERS)}
          />
        ) : (
          bikes.data?.slice(0, 6).map((b) => (
            <BikeCard key={b.id} bike={b} onPress={() => router.push(`/customer/bike/${b.id}`)} />
          ))
        )}
      </View>

      <FilterSheet visible={filterOpen} onClose={() => setFilterOpen(false)} value={filters} onApply={setFilters} />
      <LocationSheet visible={locationOpen} onClose={() => setLocationOpen(false)} />
    </Screen>
  );
}
