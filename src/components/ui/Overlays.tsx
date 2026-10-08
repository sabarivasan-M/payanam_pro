import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUi } from '@/stores/uiStore';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from './Button';
import { Text } from './Text';

/** Global toast/snackbar host — mounted once in the root layout */
export function ToastHost() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useUi((s) => s.toast);
  const hide = useUi((s) => s.hideToast);
  const y = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (!toast) return;
    Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 18 }).start();
    const timer = setTimeout(() => {
      Animated.timing(y, { toValue: -140, duration: 220, useNativeDriver: true }).start(() => hide());
    }, 3200);
    return () => clearTimeout(timer);
  }, [toast, y, hide]);

  if (!toast) return null;
  const icon = toast.tone === 'success' ? 'checkmark-circle' : toast.tone === 'error' ? 'alert-circle' : 'information-circle';
  const color = toast.tone === 'success' ? t.colors.success : toast.tone === 'error' ? t.colors.danger : t.colors.info;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, transform: [{ translateY: y }], zIndex: 1000 }}
    >
      <Pressable
        onPress={hide}
        accessibilityRole="alert"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: 14,
          borderRadius: t.radius.lg,
          backgroundColor: t.scheme === 'dark' ? t.colors.surfaceRaised : '#13212B',
          ...t.shadows.lg,
        }}
      >
        <Ionicons name={icon} size={22} color={color} />
        <Text variant="smallStrong" style={{ color: '#fff', flex: 1 }}>
          {toast.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** Global confirmation dialog — use `confirm()` from uiStore */
export function DialogHost() {
  const t = useTheme();
  const dialog = useUi((s) => s.dialog);
  const close = useUi((s) => s.closeDialog);
  return (
    <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => close(false)}>
      <View style={{ flex: 1, backgroundColor: t.colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <View style={{ width: '100%', maxWidth: 380, backgroundColor: t.colors.surface, borderRadius: t.radius.xxl, padding: 22, gap: 10, ...t.shadows.lg }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: dialog?.destructive ? t.colors.dangerSoft : t.colors.primarySoft,
            }}
          >
            <Ionicons name={dialog?.destructive ? 'warning-outline' : 'help-circle-outline'} size={26} color={dialog?.destructive ? t.colors.danger : t.colors.primary} />
          </View>
          <Text variant="h2">{dialog?.title}</Text>
          {dialog?.message ? (
            <Text variant="body" color="textSecondary">
              {dialog.message}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title={dialog?.cancelLabel ?? 'Cancel'} variant="outline" onPress={() => close(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title={dialog?.confirmLabel ?? 'Confirm'} variant={dialog?.destructive ? 'danger' : 'primary'} onPress={() => close(true)} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
