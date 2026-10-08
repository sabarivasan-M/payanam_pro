import React from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  toggle?: { value: boolean; onChange: (v: boolean) => void };
  right?: React.ReactNode;
  last?: boolean;
}

export function ListItem({ icon, title, subtitle, value, onPress, destructive, toggle, right, last }: Props) {
  const t = useTheme();
  const color = destructive ? t.colors.danger : t.colors.text;
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        minHeight: 58,
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.colors.border,
      }}
    >
      {icon ? (
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: destructive ? t.colors.dangerSoft : t.colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={19} color={destructive ? t.colors.danger : t.colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" style={{ color }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="small" color="textSecondary" numberOfLines={1} style={{ maxWidth: 140 }}>
          {value}
        </Text>
      ) : null}
      {right}
      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onChange}
          trackColor={{ true: t.colors.primary, false: t.colors.borderStrong }}
          thumbColor="#fff"
        />
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color={t.colors.textMuted} />
      ) : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {content}
    </Pressable>
  );
}

export function ListGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {title ? (
        <Text variant="overline" color="textMuted" style={{ marginLeft: 4 }}>
          {title.toUpperCase()}
        </Text>
      ) : null}
      <View style={{ backgroundColor: t.colors.surface, borderRadius: t.radius.xl, paddingHorizontal: 16, borderWidth: 1, borderColor: t.colors.border }}>
        {children}
      </View>
    </View>
  );
}
