import React, { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

interface Props {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  error?: boolean;
  autoFocus?: boolean;
}

/** Six boxes backed by one hidden input — works with SMS autofill and paste. */
export function OtpInput({ value, onChange, length = 6, error, autoFocus = true }: Props) {
  const t = useTheme();
  const ref = useRef<TextInput>(null);
  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel="One-time password input">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        {Array.from({ length }).map((_, i) => {
          const char = value[i] ?? '';
          const focused = i === Math.min(value.length, length - 1);
          return (
            <View
              key={i}
              style={{
                flex: 1,
                maxWidth: 54,
                aspectRatio: 0.85,
                borderRadius: t.radius.lg,
                borderWidth: 1.5,
                borderColor: error ? t.colors.danger : focused ? t.colors.primary : t.colors.border,
                backgroundColor: char ? t.colors.primarySoft : t.colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="h1">{char}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus={autoFocus}
        maxLength={length}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
      />
    </Pressable>
  );
}
