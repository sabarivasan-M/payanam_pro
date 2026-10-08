import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/tokens';
import { Text } from './Text';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  accessibilityLabel: string;
  size?: number;
  variant?: 'surface' | 'plain' | 'primary' | 'overlay';
  color?: keyof ThemeColors;
  badge?: number;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ icon, onPress, accessibilityLabel, size = 44, variant = 'surface', color, badge, style }: Props) {
  const t = useTheme();
  const bg =
    variant === 'surface' ? t.colors.surface : variant === 'primary' ? t.colors.primary : variant === 'overlay' ? 'rgba(15,27,36,0.45)' : 'transparent';
  const fg = color ? t.colors[color] : variant === 'primary' || variant === 'overlay' ? '#fff' : t.colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: variant === 'surface' ? 1 : 0,
          borderColor: t.colors.border,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={size * 0.48} color={fg} />
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            backgroundColor: t.colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: t.colors.surface,
          }}
        >
          <Text variant="caption" style={{ fontSize: 10, lineHeight: 12, color: t.colors.onAccent }}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
