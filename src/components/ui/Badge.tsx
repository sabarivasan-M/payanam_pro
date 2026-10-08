import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import type { StatusTone } from '@/utils/bookingStateMachine';
import { Text } from './Text';

interface Props {
  label: string;
  tone?: StatusTone;
  icon?: keyof typeof Ionicons.glyphMap;
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, tone = 'neutral', icon, dot, style }: Props) {
  const t = useTheme();
  const map: Record<StatusTone, { bg: string; fg: string }> = {
    neutral: { bg: t.colors.surfaceAlt, fg: t.colors.textSecondary },
    info: { bg: t.colors.infoSoft, fg: t.colors.info },
    success: { bg: t.colors.successSoft, fg: t.colors.success },
    warning: { bg: t.colors.warningSoft, fg: t.colors.warning },
    danger: { bg: t.colors.dangerSoft, fg: t.colors.danger },
    primary: { bg: t.colors.primarySoft, fg: t.colors.primary },
  };
  const c = map[tone];
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 5,
          paddingHorizontal: 9,
          paddingVertical: 4,
          borderRadius: t.radius.pill,
          backgroundColor: c.bg,
        },
        style,
      ]}
    >
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.fg }} /> : null}
      {icon ? <Ionicons name={icon} size={12} color={c.fg} /> : null}
      <Text variant="caption" style={{ color: c.fg }}>
        {label}
      </Text>
    </View>
  );
}

/** Small "MOCK" pill used wherever a demo integration produced a result */
export function MockBadge({ label = 'DEMO · MOCK' }: { label?: string }) {
  return <Badge label={label} tone="warning" icon="flask-outline" />;
}
