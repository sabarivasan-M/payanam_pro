import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

const HEIGHT: Record<Size, number> = { sm: 38, md: 48, lg: 56 };

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  icon,
  iconRight,
  fullWidth = true,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const t = useTheme();
  const c = t.colors;
  const palette: Record<Variant, { bg: string; pressed: string; fg: string; border?: string }> = {
    primary: { bg: c.primary, pressed: c.primaryPressed, fg: c.onPrimary },
    accent: { bg: c.accent, pressed: c.accent, fg: c.onAccent },
    secondary: { bg: c.primarySoft, pressed: c.primarySoft, fg: c.primary },
    outline: { bg: 'transparent', pressed: c.surfaceAlt, fg: c.text, border: c.borderStrong },
    ghost: { bg: 'transparent', pressed: c.surfaceAlt, fg: c.primary },
    danger: { bg: c.dangerSoft, pressed: c.dangerSoft, fg: c.danger },
  };
  const p = palette[variant];
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => undefined);
    onPress?.();
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHT[size],
          borderRadius: size === 'sm' ? t.radius.md : t.radius.lg,
          paddingHorizontal: size === 'sm' ? 14 : 20,
          backgroundColor: pressed ? p.pressed : p.bg,
          borderColor: p.border ?? 'transparent',
          borderWidth: p.border ? 1.5 : 0,
          opacity: isDisabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 19} color={p.fg} /> : null}
          <Text variant={size === 'sm' ? 'smallStrong' : 'bodyStrong'} style={{ color: p.fg }} numberOfLines={1}>
            {title}
          </Text>
          {iconRight ? <Ionicons name={iconRight} size={size === 'sm' ? 16 : 19} color={p.fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
