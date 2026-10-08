import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Logo } from '@/components/brand/Logo';
import { BookingCard } from '@/components/booking/BookingParts';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { SectionHeader } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { ListSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { Banner, EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { usePartnerBikes } from '@/features/bikes/hooks';
import { usePartnerBookings } from '@/features/bookings/hooks';
import { useUnreadCount } from '@/features/notifications/hooks';
import { useEarnings } from '@/features/payments/hooks';
import { usePartner } from '@/features/profile/hooks';
import { useProfile } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';
import { IN_PROGRESS_STATUSES, UPCOMING_STATUSES } from '@/utils/bookingStateMachine';
import { formatINR, greeting } from '@/utils/format';

function Stat({ icon, label, value, tone = 'primary', onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string | number; tone?: 'primary' | 'warning' | 'success' | 'danger'; onPress?: () => void }) {
  const t = useTheme();
  const color = { primary: t.colors.primary, warning: t.colors.warning, success: t.colors.success, danger: t.colors.danger }[tone];
  const bg = { primary: t.colors.primarySoft, warning: t.colors.warningSoft, success: t.colors.successSoft, danger: t.colors.dangerSoft }[tone];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: '48%', flexGrow: 1, padding: 14, borderRadius: t.radius.xl, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, gap: 8, opacity: pressed ? 0.85 : 1 })}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text variant="h1">{value}</Text>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </Pressable>
  );
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ alignItems: 'center', gap: 6, width: 68 }}>
      <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={22} color={t.colors.primary} />
      </View>
      <Text variant="caption" align="center">
        {label}
      </Text>
    </Pressable>
  );
}

export default function PartnerDashboard() {
  const t = useTheme();
  const profile = useProfile();
  const partner = usePartner(profile.id);
  const bookings = usePartnerBookings();
  const bikes = usePartnerBikes(profile.id);
  const earnings = useEarnings(profile.id);
  const unread = useUnreadCount();

  const all = bookings.data ?? [];
  const today = new Date().toDateString();
  const pending = all.filter((b) => b.status === 'PENDING_OWNER_CONFIRMATION');
  const active = all.filter((b) => IN_PROGRESS_STATUSES.includes(b.status));
  const todays = all.filter((b) => new Date(b.startTime).toDateString() === today && b.status !== 'CANCELLED' && b.status !== 'REJECTED');
  const upcoming = all.filter((b) => UPCOMING_STATUSES.includes(b.status) && b.status !== 'PENDING_OWNER_CONFIRMATION');
  const available = bikes.data?.filter((b) => b.status === 'AVAILABLE').length ?? 0;
  const unavailable = (bikes.data?.length ?? 0) - available;

  const refresh = () => {
    void bookings.refetch();
    void bikes.refetch();
    void earnings.refetch();
  };

  return (
    <Screen edges={['top']} onRefresh={refresh} refreshing={bookings.isRefetching}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
        <Logo size={32} />
        <IconButton icon="notifications-outline" accessibilityLabel={`Notifications, ${unread} unread`} badge={unread} onPress={() => router.push('/notifications')} />
      </View>
      <Text variant="small" color="textSecondary" style={{ marginTop: 20 }}>
        {greeting()}, {profile.fullName.split(' ')[0]}
      </Text>
      <Text variant="h1">{partner.data?.businessName ?? ' '}</Text>

      {partner.data && partner.data.idVerificationStatus !== 'verified' ? (
        <View style={{ marginTop: 12 }}>
          <Banner tone="warning" title="ID verification pending" message="Customers see a 'Verified partner' badge once your ID is approved." />
        </View>
      ) : null}

      <View style={{ marginTop: 18, padding: 18, borderRadius: t.radius.xxl, backgroundColor: t.colors.primary }}>
        <Text variant="overline" style={{ color: t.colors.accent }}>
          TODAY'S EARNINGS
        </Text>
        {earnings.isLoading ? (
          <Skeleton width={140} height={34} style={{ marginTop: 6 }} />
        ) : (
          <Text style={{ fontFamily: t.fonts.extrabold, fontSize: 34, color: t.colors.onPrimary, marginTop: 2 }}>{formatINR(earnings.data?.today ?? 0)}</Text>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
          <View>
            <Text variant="caption" style={{ color: t.colors.onPrimary, opacity: 0.8 }}>
              This month
            </Text>
            <Text variant="bodyStrong" style={{ color: t.colors.onPrimary }}>
              {formatINR(earnings.data?.month ?? 0)}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/partner/earnings')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text variant="smallStrong" style={{ color: t.colors.accent }}>
              View earnings
            </Text>
            <Ionicons name="arrow-forward" size={14} color={t.colors.accent} />
          </Pressable>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 }}>
        <QuickAction icon="add-circle-outline" label="Add Bike" onPress={() => router.push('/partner/bike-form')} />
        <QuickAction icon="calendar-outline" label="Bookings" onPress={() => router.push('/partner/bookings')} />
        <QuickAction icon="bicycle-outline" label="Manage Bikes" onPress={() => router.push('/partner/bikes')} />
        <QuickAction icon="wallet-outline" label="Earnings" onPress={() => router.push('/partner/earnings')} />
        <QuickAction icon="notifications-outline" label="Alerts" onPress={() => router.push('/notifications')} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
        <Stat icon="today-outline" label="Today's rentals" value={todays.length} onPress={() => router.push('/partner/bookings')} />
        <Stat icon="speedometer-outline" label="Active rentals" value={active.length} tone="success" onPress={() => router.push('/partner/bookings?tab=active')} />
        <Stat icon="hourglass-outline" label="Pending requests" value={pending.length} tone="warning" onPress={() => router.push('/partner/bookings?tab=pending')} />
        <Stat icon="checkmark-circle-outline" label="Available bikes" value={available} onPress={() => router.push('/partner/bikes')} />
        <Stat icon="close-circle-outline" label="Unavailable bikes" value={unavailable} tone="danger" onPress={() => router.push('/partner/bikes')} />
        <Stat icon="cash-outline" label="Monthly earnings" value={formatINR(earnings.data?.month ?? 0)} tone="success" onPress={() => router.push('/partner/earnings')} />
      </View>

      <SectionHeader title="Pending requests" action={pending.length ? 'See all' : undefined} onAction={() => router.push('/partner/bookings?tab=pending')} />
      <View style={{ gap: 12, marginTop: 10 }}>
        {bookings.isLoading ? (
          <ListSkeleton rows={2} />
        ) : bookings.isError ? (
          <ErrorState error={bookings.error} onRetry={() => bookings.refetch()} compact />
        ) : pending.length === 0 ? (
          <Card elevated={false}>
            <EmptyState compact icon="file-tray-outline" title="No pending bookings" message="New rental requests will appear here instantly." />
          </Card>
        ) : (
          pending.slice(0, 3).map((b) => <BookingCard key={b.id} item={b} perspective="partner" onPress={() => router.push(`/partner/booking/${b.id}`)} />)
        )}
      </View>

      {active.length + upcoming.length > 0 ? (
        <>
          <SectionHeader title="In progress" />
          <View style={{ gap: 12, marginTop: 10 }}>
            {[...active, ...upcoming].slice(0, 4).map((b) => (
              <BookingCard key={b.id} item={b} perspective="partner" onPress={() => router.push(`/partner/booking/${b.id}`)} />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
