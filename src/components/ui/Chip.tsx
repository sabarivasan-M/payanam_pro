import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  count?: number;
}

export function Chip({ label, selected, onPress, icon, count }: Props) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 38,
        paddingHorizontal: 14,
        borderRadius: t.radius.pill,
        borderWidth: 1.5,
        borderColor: selected ? t.colors.primary : t.colors.border,
        backgroundColor: selected ? t.colors.primarySoft : t.colors.surface,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {icon ? <Ionicons name={icon} size={15} color={selected ? t.colors.primary : t.colors.textSecondary} /> : null}
      <Text variant="smallStrong" style={{ color: selected ? t.colors.primary : t.colors.text }}>
        {label}
      </Text>
      {count ? (
        <Text variant="caption" style={{ color: t.colors.onPrimary, backgroundColor: t.colors.primary, borderRadius: 9, paddingHorizontal: 6, overflow: 'hidden' }}>
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}
