import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabIcon, tabScreenOptions } from '@/components/ui/TabBar';
import { useT } from '@/features/i18n';
import { useTheme } from '@/theme/ThemeProvider';

export default function CustomerTabs() {
  const t = useTheme();
  const tr = useT();
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={tabScreenOptions(t, insets.bottom)}>
      <Tabs.Screen name="index" options={{ title: tr('home'), tabBarIcon: tabIcon('home-outline', 'home') }} />
      <Tabs.Screen name="rent" options={{ title: tr('rentBuy'), tabBarIcon: tabIcon('bicycle-outline', 'bicycle') }} />
      <Tabs.Screen name="history" options={{ title: tr('history'), tabBarIcon: tabIcon('time-outline', 'time') }} />
      <Tabs.Screen name="settings" options={{ title: tr('settings'), tabBarIcon: tabIcon('settings-outline', 'settings') }} />
    </Tabs>
  );
}
