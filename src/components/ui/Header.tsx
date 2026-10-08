import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { IconButton } from './IconButton';
import { Text } from './Text';

interface Props {
  title?: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  large?: boolean;
}

export function Header({ title, subtitle, back = true, onBack, right, large }: Props) {
  const t = useTheme();
  const goBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
  };
  return (
    <View style={{ paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.sm, paddingBottom: t.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md, minHeight: 44 }}>
        {back ? <IconButton icon="chevron-back" accessibilityLabel="Go back" onPress={goBack} size={42} /> : null}
        <View style={{ flex: 1 }}>
          {!large && title ? (
            <Text variant="h3" numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {!large && subtitle ? (
            <Text variant="small" color="textSecondary" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
      {large && title ? (
        <View style={{ marginTop: t.spacing.md }}>
          <Text variant="h1">{title}</Text>
          {subtitle ? (
            <Text variant="body" color="textSecondary" style={{ marginTop: 4 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
