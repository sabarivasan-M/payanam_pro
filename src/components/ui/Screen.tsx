import React from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  children: React.ReactNode;
  header?: React.ReactNode;
  /** Sticky bottom area for primary CTAs */
  footer?: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  /** Tab screens sit above the tab bar, so they don't need the bottom inset */
  edges?: ('top' | 'bottom')[];
  keyboard?: boolean;
}

export function Screen({
  children,
  header,
  footer,
  scroll = true,
  padded = true,
  refreshing,
  onRefresh,
  contentStyle,
  edges = ['top', 'bottom'],
  keyboard = false,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const pad = padded ? t.spacing.lg : 0;

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[{ paddingHorizontal: pad, paddingBottom: t.spacing.xxxl, flexGrow: 1 }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.colors.primary} colors={[t.colors.primary]} /> : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingHorizontal: pad }, contentStyle]}>{children}</View>
  );

  const content = (
    <>
      {header}
      {body}
      {footer ? (
        <View
          style={{
            paddingHorizontal: t.spacing.lg,
            paddingTop: t.spacing.md,
            paddingBottom: edges.includes('bottom') ? Math.max(insets.bottom, t.spacing.md) : t.spacing.md,
            backgroundColor: t.colors.surface,
            borderTopWidth: 1,
            borderTopColor: t.colors.border,
            gap: t.spacing.sm,
          }}
        >
          {footer}
        </View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: t.colors.background }}
      edges={footer ? edges.filter((e) => e !== 'bottom') : edges}
    >
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
