import React from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeColors, TypographyVariant } from '@/theme/tokens';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: keyof ThemeColors;
  align?: TextStyle['textAlign'];
  children?: React.ReactNode;
}

export function Text({ variant = 'body', color = 'text', align, style, ...rest }: AppTextProps) {
  const t = useTheme();
  return (
    <RNText
      {...rest}
      style={[t.typography[variant], { color: t.colors[color], textAlign: align }, style]}
      maxFontSizeMultiplier={1.4}
    />
  );
}
