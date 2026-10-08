import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import type { ColorValue } from 'react-native';
import type { Theme } from '@/theme/tokens';

/** Shared tab bar styling for customer and partner apps */
export function tabScreenOptions(t: Theme, bottomInset: number) {
  return {
    headerShown: false,
    tabBarActiveTintColor: t.colors.primary,
    tabBarInactiveTintColor: t.colors.textMuted,
    tabBarLabelStyle: { fontFamily: t.fonts.semibold, fontSize: 11, lineHeight: 14 },
    tabBarItemStyle: { height: 52 },
    tabBarStyle: {
      backgroundColor: t.colors.surface,
      borderTopColor: t.colors.border,
      height: 64 + bottomInset,
      paddingTop: 6,
      paddingBottom: Math.max(bottomInset, 6),
    },
  };
}

export const tabIcon =
  (name: keyof typeof Ionicons.glyphMap, active: keyof typeof Ionicons.glyphMap) =>
  ({ color, focused }: { color: ColorValue; focused: boolean }) => <Ionicons name={focused ? active : name} size={23} color={color as string} />;
