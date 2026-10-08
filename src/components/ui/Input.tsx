import React, { forwardRef, useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  prefix?: string;
  secureToggle?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, icon, prefix, secureToggle, secureTextEntry, style, multiline, ...rest },
  ref,
) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const borderColor = error ? t.colors.danger : focused ? t.colors.primary : t.colors.border;
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text variant="smallStrong" color="textSecondary">
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          minHeight: multiline ? 110 : 52,
          borderRadius: t.radius.lg,
          borderWidth: 1.5,
          borderColor,
          backgroundColor: t.colors.surface,
          paddingHorizontal: 14,
          gap: 10,
        }}
      >
        {icon ? <Ionicons name={icon} size={19} color={focused ? t.colors.primary : t.colors.textMuted} style={multiline ? { marginTop: 14 } : undefined} /> : null}
        {prefix ? <Text variant="bodyMedium" color="textSecondary">{prefix}</Text> : null}
        <TextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          secureTextEntry={hidden}
          placeholderTextColor={t.colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[
            t.typography.body,
            { flex: 1, color: t.colors.text, paddingVertical: multiline ? 14 : 0, minHeight: multiline ? 100 : 48, textAlignVertical: multiline ? 'top' : 'center' },
            style,
          ]}
        />
        {secureToggle ? (
          <Pressable onPress={() => setHidden((h) => !h)} accessibilityLabel={hidden ? 'Show password' : 'Hide password'} hitSlop={10}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={t.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="textMuted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
