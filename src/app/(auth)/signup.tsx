import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormInput, parseNumber } from '@/components/forms/FormInput';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { Banner } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { customerSignUpSchema, type CustomerSignUpForm } from '@/features/auth/schemas';
import { authService } from '@/services/authService';
import { useSession } from '@/stores/sessionStore';
import { errorMessage } from '@/utils/errors';

export default function CustomerSignUp() {
  const setProfile = useSession((s) => s.setProfile);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<CustomerSignUpForm>({
    resolver: zodResolver(customerSignUpSchema),
    defaultValues: { fullName: '', phone: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const profile = await authService.signUpCustomer({ fullName: v.fullName, age: v.age, phone: v.phone, email: v.email, password: v.password });
      setProfile(profile);
      router.replace('/otp');
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <Screen keyboard header={<Header title="Create account" />} footer={<Button title="Create account" size="lg" onPress={onSubmit} loading={formState.isSubmitting} />}>
      <Text variant="h1">Ride with PAYANAM</Text>
      <Text color="textSecondary" style={{ marginTop: 4 }}>
        It takes a minute. We'll verify your phone next.
      </Text>
      <View style={{ gap: 16, marginTop: 24 }}>
        {error ? <Banner tone="danger" title="Couldn't create account" message={error} /> : null}
        <FormInput control={control} name="fullName" label="Full name" placeholder="As on your driving licence" icon="person-outline" autoComplete="name" />
        <FormInput control={control} name="age" label="Age" placeholder="18+" icon="calendar-outline" keyboardType="number-pad" parse={parseNumber} maxLength={2} />
        <FormInput control={control} name="phone" label="Phone number" placeholder="98765 43210" prefix="+91" keyboardType="phone-pad" maxLength={10} autoComplete="tel" />
        <FormInput control={control} name="email" label="Email" placeholder="you@example.com" icon="mail-outline" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <FormInput control={control} name="password" label="Password" placeholder="At least 8 characters" icon="lock-closed-outline" secureTextEntry secureToggle hint="Use letters and numbers" />
        <FormInput control={control} name="confirmPassword" label="Confirm password" placeholder="Re-enter password" icon="lock-closed-outline" secureTextEntry secureToggle />
        <Text variant="caption" color="textMuted">
          By creating an account you agree to PAYANAM's Terms & Conditions and Privacy Policy.
        </Text>
      </View>
    </Screen>
  );
}
