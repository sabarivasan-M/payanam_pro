import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { palette } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * PAYANAM mark: the letter "P" drawn as a winding road with a dashed centre line,
 * ending at a marigold sun/wheel — a journey that starts with you.
 */
export function LogoMark({ size = 48, inverted = false }: { size?: number; inverted?: boolean }) {
  const bg = inverted ? '#FFFFFF' : palette.teal700;
  const road = inverted ? palette.teal700 : '#FFFFFF';
  const dash = inverted ? '#FFFFFF' : palette.teal700;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x="0" y="0" width="64" height="64" rx="18" fill={bg} />
      <Path d="M20 53 V24 C20 16.5 25 12 32 12 H35 C43.5 12 48 18 48 25 C48 32 43.5 38 35 38 H28" stroke={road} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M20 50 V24 C20 16.5 25 12 32 12 H35 C43.5 12 48 18 48 25 C48 32 43.5 38 35 38 H29" stroke={dash} strokeWidth="1.6" strokeDasharray="3 4" strokeLinecap="round" fill="none" />
      <Circle cx="34" cy="25" r="4.6" fill={palette.marigold500} />
    </Svg>
  );
}

export function Logo({ size = 36, showTamil = false, color }: { size?: number; showTamil?: boolean; color?: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityLabel="PAYANAM">
      <LogoMark size={size} />
      <View>
        <Text style={{ fontFamily: t.fonts.extrabold, fontSize: size * 0.55, letterSpacing: 2, color: color ?? t.colors.text, lineHeight: size * 0.66 }}>
          PAYANAM
        </Text>
        {showTamil ? (
          <Text variant="caption" style={{ color: color ?? t.colors.textSecondary, letterSpacing: 1 }}>
            பயணம் · your journey
          </Text>
        ) : null}
      </View>
    </View>
  );
}
