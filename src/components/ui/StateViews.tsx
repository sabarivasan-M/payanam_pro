import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { errorMessage } from '@/utils/errors';
import { Button } from './Button';
import { Text } from './Text';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
      <ActivityIndicator size="large" color={t.colors.primary} />
      <Text variant="small" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

interface EmptyProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function EmptyState({ icon = 'bicycle-outline', title, message, actionLabel, onAction, compact }: EmptyProps) {
  const t = useTheme();
  return (
    <View style={{ flex: compact ? 0 : 1, alignItems: 'center', justifyContent: 'center', paddingVertical: compact ? 28 : 48, paddingHorizontal: 24, gap: 10 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
        <Ionicons name={icon} size={32} color={t.colors.primary} />
      </View>
      <Text variant="h3" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="small" color="textSecondary" align="center" style={{ maxWidth: 300 }}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} fullWidth={false} style={{ marginTop: 8 }} variant="secondary" /> : null}
    </View>
  );
}

export function ErrorState({ error, title = "Couldn't load this", onRetry, compact }: { error?: unknown; title?: string; onRetry?: () => void; compact?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flex: compact ? 0 : 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: t.colors.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="cloud-offline-outline" size={32} color={t.colors.danger} />
      </View>
      <Text variant="h3" align="center">
        {title}
      </Text>
      <Text variant="small" color="textSecondary" align="center" style={{ maxWidth: 300 }}>
        {errorMessage(error)}
      </Text>
      {onRetry ? <Button title="Try again" icon="refresh" onPress={onRetry} fullWidth={false} variant="outline" style={{ marginTop: 6 }} /> : null}
    </View>
  );
}

/** Inline banner for success / warning / info messages */
export function Banner({
  tone = 'info',
  icon,
  title,
  message,
  action,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  const t = useTheme();
  const map = {
    info: [t.colors.infoSoft, t.colors.info, 'information-circle'] as const,
    success: [t.colors.successSoft, t.colors.success, 'checkmark-circle'] as const,
    warning: [t.colors.warningSoft, t.colors.warning, 'warning'] as const,
    danger: [t.colors.dangerSoft, t.colors.danger, 'alert-circle'] as const,
  };
  const [bg, fg, defIcon] = map[tone];
  return (
    <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: t.radius.lg, backgroundColor: bg, alignItems: 'flex-start' }}>
      <Ionicons name={icon ?? defIcon} size={22} color={fg} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="smallStrong" style={{ color: fg }}>
          {title}
        </Text>
        {message ? (
          <Text variant="small" color="text">
            {message}
          </Text>
        ) : null}
        {action ? <View style={{ marginTop: 8 }}>{action}</View> : null}
      </View>
    </View>
  );
}
