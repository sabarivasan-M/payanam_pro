import React from 'react';
import { Image, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { storageService } from '@/services/storageService';
import { useTheme } from '@/theme/ThemeProvider';
import { initials } from '@/utils/format';
import { Text } from './Text';

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
      <Text variant="h3">{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text variant="smallStrong" color="primary">
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function KeyValue({ label, value, strong, tone, sub }: { label: string; value: string; strong?: boolean; tone?: 'success' | 'danger' | 'primary'; sub?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6, gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text variant={strong ? 'bodyStrong' : 'body'} color={strong ? 'text' : 'textSecondary'}>
          {label}
        </Text>
        {sub ? (
          <Text variant="caption" color="textMuted">
            {sub}
          </Text>
        ) : null}
      </View>
      <Text variant={strong ? 'h3' : 'bodyMedium'} color={tone ?? 'text'}>
        {value}
      </Text>
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[{ height: 1, backgroundColor: t.colors.border, marginVertical: 8 }, style]} />;
}

export function ProgressBar({ value, tone = 'primary', height = 8 }: { value: number; tone?: 'primary' | 'warning' | 'danger' | 'success'; height?: number }) {
  const t = useTheme();
  const color = { primary: t.colors.primary, warning: t.colors.warning, danger: t.colors.danger, success: t.colors.success }[tone];
  return (
    <View style={{ height, borderRadius: height, backgroundColor: t.colors.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, height: '100%', borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

/** Resolves storage references (local file / sb://bucket/path) into an <Image> */
export function StoredImage({ uri, style, fallback }: { uri: string | null | undefined; style: StyleProp<import('react-native').ImageStyle>; fallback?: React.ReactNode }) {
  const t = useTheme();
  const { data, isError } = useQuery({
    queryKey: ['storedImage', uri],
    queryFn: () => storageService.resolveUrl(uri!),
    enabled: !!uri,
    staleTime: 20 * 60 * 1000,
  });
  if (!uri || isError) {
    return (
      <>
        {fallback ?? (
          <View style={[style as StyleProp<ViewStyle>, { backgroundColor: t.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="image-outline" size={22} color={t.colors.textMuted} />
          </View>
        )}
      </>
    );
  }
  if (!data) return <View style={[style as StyleProp<ViewStyle>, { backgroundColor: t.colors.skeleton }]} />;
  return <Image source={{ uri: data }} style={style} resizeMode="cover" />;
}

export function Avatar({ name, uri, size = 48 }: { name: string; uri?: string | null; size?: number }) {
  const t = useTheme();
  const fallback = (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Text variant={size > 56 ? 'h2' : 'bodyStrong'} style={{ color: t.colors.onPrimary }}>
        {initials(name) || '?'}
      </Text>
    </View>
  );
  if (!uri) return fallback;
  return <StoredImage uri={uri} style={{ width: size, height: size, borderRadius: size / 2 }} fallback={fallback} />;
}

export function Stepper({ value, min, max, onChange, suffix }: { value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) {
  const t = useTheme();
  const btn = (icon: 'remove' | 'add', disabled: boolean, next: number) => (
    <Pressable
      onPress={() => !disabled && onChange(next)}
      accessibilityLabel={icon === 'add' ? 'Increase' : 'Decrease'}
      style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: disabled ? t.colors.surfaceAlt : t.colors.primarySoft }}
    >
      <Ionicons name={icon} size={20} color={disabled ? t.colors.textMuted : t.colors.primary} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      {btn('remove', value <= min, value - 1)}
      <Text variant="h3" style={{ minWidth: 70, textAlign: 'center' }}>
        {value} {suffix}
      </Text>
      {btn('add', value >= max, value + 1)}
    </View>
  );
}

export function SegmentedControl<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.lg, padding: 4 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              height: 40,
              borderRadius: t.radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? t.colors.surface : 'transparent',
              ...(active && t.scheme === 'light' ? t.shadows.sm : null),
            }}
          >
            <Text variant="smallStrong" color={active ? 'text' : 'textSecondary'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Horizontal scroll of tabs with counts (used by History / Bookings) */
export function TabStrip<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            onPress={() => onChange(tab.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 14,
              height: 36,
              borderRadius: t.radius.pill,
              backgroundColor: active ? t.colors.text : t.colors.surface,
              borderWidth: 1,
              borderColor: active ? t.colors.text : t.colors.border,
            }}
          >
            <Text variant="smallStrong" style={{ color: active ? t.colors.background : t.colors.text }}>
              {tab.label}
            </Text>
            {tab.count ? (
              <Text variant="caption" style={{ color: active ? t.colors.background : t.colors.textSecondary }}>
                {tab.count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
