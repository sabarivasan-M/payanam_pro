import React, { useEffect, useRef } from 'react';
import { Animated, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function Skeleton({ width = '100%', height = 16, radius = 8, style }: { width?: DimensionValue; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: t.colors.skeleton, opacity }, style]} />;
}

export function BikeCardSkeleton() {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.colors.surface, borderRadius: t.radius.xl, padding: 12, gap: 10, borderWidth: 1, borderColor: t.colors.border }}>
      <Skeleton height={150} radius={16} />
      <Skeleton width="60%" height={18} />
      <Skeleton width="40%" height={14} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Skeleton width={90} height={22} />
        <Skeleton width={110} height={36} radius={12} />
      </View>
    </View>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  const t = useTheme();
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: 14, borderWidth: 1, borderColor: t.colors.border }}>
          <Skeleton width={56} height={56} radius={14} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="70%" height={15} />
            <Skeleton width="45%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}
