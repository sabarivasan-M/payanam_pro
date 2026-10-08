import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  tone?: 'surface' | 'soft' | 'accent' | 'outline';
  elevated?: boolean;
  accessibilityLabel?: string;
}

export function Card({ children, onPress, style, padded = true, tone = 'surface', elevated = true, accessibilityLabel }: Props) {
  const t = useTheme();
  const bg =
    tone === 'soft' ? t.colors.primarySoft : tone === 'accent' ? t.colors.accentSoft : tone === 'outline' ? 'transparent' : t.colors.surface;
  const base: ViewStyle = {
    backgroundColor: bg,
    borderRadius: t.radius.xl,
    padding: padded ? t.spacing.lg : 0,
    borderWidth: 1,
    borderColor: tone === 'surface' || tone === 'outline' ? t.colors.border : 'transparent',
    ...(elevated && tone === 'surface' && t.scheme === 'light' ? t.shadows.sm : null),
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      // No "button" role: cards often contain their own buttons, and nested buttons are invalid on web.
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [base, { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }, style]}
    >
      {children}
    </Pressable>
  );
}
