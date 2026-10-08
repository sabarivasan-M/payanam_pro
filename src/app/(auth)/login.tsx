import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Logo } from '@/components/brand/Logo';
import { FormInput } from '@/components/forms/FormInput';
import { Badge, MockBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { Banner } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { DEMO_ACCOUNTS } from '@/api/seed';
import { config } from '@/constants/config';
import { loginSchema, type LoginForm } from '@/features/auth/schemas';
import { authService } from '@/services/authService';
import { useSession } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';
import { AppError, errorMessage } from '@/utils/errors';

export default function Login() {
  const t = useTheme();
  const role = useSession((s) => s.selectedRole);
  const setProfile = useSession((s) => s.setProfile);
  const [error, setError] = useState<{ message: string; roleMismatch: boolean } | null>(null);
  const { control, handleSubmit, setValue, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  if (!role) return <Redirect href="/role" />;
  const isPartner = role === 'partner';

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const profile = await authService.signIn(values.identifier, values.password, role);
      setProfile(profile);
      router.replace(profile.phoneVerified ? (profile.role === 'partner' ? '/partner' : '/customer') : '/otp');
    } catch (e) {
      setError({ message: errorMessage(e), roleMismatch: e instanceof AppError && e.code === 'ROLE_MISMATCH' });
    }
  });

  const fillDemo = () => {
    const acc = isPartner ? DEMO_ACCOUNTS.partner : DEMO_ACCOUNTS.customer;
    setValue('identifier', acc.email, { shouldValidate: true });
    setValue('password', config.demo.password, { shouldValidate: true });
  };

  return (
    <Screen keyboard header={<Header onBack={() => router.replace('/role')} right={<Badge label={isPartner ? 'Rental Partner' : 'Customer'} tone="primary" icon={isPartner ? 'storefront-outline' : 'person-outline'} />} />}>
      <View style={{ gap: 6, marginTop: 4 }}>
        <Logo size={30} />
        <Text variant="display" style={{ marginTop: 22 }}>
          Welcome back
        </Text>
        <Text color="textSecondary">{isPartner ? 'Log in to manage your fleet and bookings.' : 'Log in to find and book bikes near you.'}</Text>
      </View>

      <View style={{ gap: 16, marginTop: 28 }}>
        {error ? (
          <Banner
            tone="danger"
            title={error.roleMismatch ? 'Wrong account type' : 'Login failed'}
            message={error.message}
            action={error.roleMismatch ? <Button title="Change role" size="sm" variant="outline" fullWidth={false} onPress={() => router.replace('/role')} /> : undefined}
          />
        ) : null}
        <FormInput control={control} name="identifier" label="Email or phone number" placeholder="you@example.com or 98765 43210" icon="person-outline" autoCapitalize="none" keyboardType="email-address" autoComplete="username" />
        <FormInput control={control} name="password" label="Password" placeholder="Your password" icon="lock-closed-outline" secureTextEntry secureToggle autoComplete="password" />
        <Pressable onPress={() => router.push('/forgot-password')} style={{ alignSelf: 'flex-end' }} hitSlop={8}>
          <Text variant="smallStrong" color="primary">
            Forgot password?
          </Text>
        </Pressable>
        <Button title="Login" size="lg" onPress={onSubmit} loading={formState.isSubmitting} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 4 }}>
          <Text color="textSecondary">Don't have an account?</Text>
          <Pressable onPress={() => router.push(isPartner ? '/partner-signup' : '/signup')} hitSlop={8}>
            <Text variant="bodyStrong" color="primary">
              Sign Up
            </Text>
          </Pressable>
        </View>
      </View>

      {config.DEMO_MODE ? (
        <View style={{ marginTop: 28, padding: 14, borderRadius: t.radius.lg, backgroundColor: t.colors.surfaceAlt, gap: 8 }}>
          <MockBadge label="DEMO MODE" />
          <Text variant="small" color="textSecondary">
            Demo {isPartner ? 'partner' : 'customer'}: {isPartner ? DEMO_ACCOUNTS.partner.email : DEMO_ACCOUNTS.customer.email} · password {config.demo.password}
          </Text>
          <Button title="Use demo account" size="sm" variant="outline" fullWidth={false} icon="flash-outline" onPress={fillDemo} />
        </View>
      ) : null}
    </Screen>
  );
}
