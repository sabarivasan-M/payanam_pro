import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabIcon, tabScreenOptions } from '@/components/ui/TabBar';
import { usePartnerBookings } from '@/features/bookings/hooks';
import { useT } from '@/features/i18n';
import { useTheme } from '@/theme/ThemeProvider';

export default function PartnerTabs() {
  const t = useTheme();
  const tr = useT();
  const insets = useSafeAreaInsets();
  const bookings = usePartnerBookings();
  const pending = bookings.data?.filter((b) => b.status === 'PENDING_OWNER_CONFIRMATION').length ?? 0;
  return (
    <Tabs screenOptions={tabScreenOptions(t, insets.bottom)}>
      <Tabs.Screen name="index" options={{ title: tr('dashboard'), tabBarIcon: tabIcon('grid-outline', 'grid') }} />
      <Tabs.Screen
        name="bookings"
        options={{
          title: tr('bookings'),
          tabBarIcon: tabIcon('calendar-outline', 'calendar'),
          tabBarBadge: pending || undefined,
          tabBarBadgeStyle: { backgroundColor: t.colors.accent, color: t.colors.onAccent, fontFamily: t.fonts.bold, fontSize: 10 },
        }}
      />
      <Tabs.Screen name="bikes" options={{ title: tr('bikes'), tabBarIcon: tabIcon('bicycle-outline', 'bicycle') }} />
      <Tabs.Screen name="earnings" options={{ title: tr('earnings'), tabBarIcon: tabIcon('wallet-outline', 'wallet') }} />
      <Tabs.Screen name="settings" options={{ title: tr('settings'), tabBarIcon: tabIcon('settings-outline', 'settings') }} />
    </Tabs>
  );
}
