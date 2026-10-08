import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxHeightRatio?: number;
}

export function BottomSheet({ visible, onClose, title, subtitle, children, footer, maxHeightRatio = 0.85 }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const translate = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      translate.setValue(400);
      Animated.spring(translate, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
    }
  }, [visible, translate]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay }} onPress={onClose} accessibilityLabel="Close sheet" />
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: Dimensions.get('window').height * maxHeightRatio,
          backgroundColor: t.colors.surface,
          borderTopLeftRadius: t.radius.xxl,
          borderTopRightRadius: t.radius.xxl,
          paddingBottom: Math.max(insets.bottom, 16),
          transform: [{ translateY: translate }],
          ...t.shadows.lg,
        }}
      >
        <View style={{ alignItems: 'center', paddingTop: 10 }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: t.colors.borderStrong }} />
        </View>
        {title ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}>
            <Text variant="h2">{title}</Text>
            {subtitle ? (
              <Text variant="small" color="textSecondary" style={{ marginTop: 2 }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : null}
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 12 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 8 }}>{footer}</View> : null}
      </Animated.View>
    </Modal>
  );
}
