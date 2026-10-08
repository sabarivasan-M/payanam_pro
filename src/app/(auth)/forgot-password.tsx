import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormInput } from '@/components/forms/FormInput';
import { MockBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { OtpInput } from '@/components/ui/OtpInput';
import { Screen } from '@/components/ui/Screen';
import { Banner } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { resetSchema } from '@/features/auth/schemas';
import { authService } from '@/services/authService';
import { toast } from '@/stores/uiStore';
import { errorMessage } from '@/utils/errors';

type Step = 'identify' | 'code' | 'done';

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>('identify');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [devHint, setDevHint] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { control, handleSubmit } = useForm({ resolver: zodResolver(resetSchema), defaultValues: { password: '', confirmPassword: '' } });

  const requestCode = async () => {
    if (!identifier.trim()) {
      setError('Enter your email or phone number.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authService.requestPasswordReset(identifier);
      setDevHint(res.devHint);
      setStep('code');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const reset = handleSubmit(async ({ password }) => {
    if (code.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await authService.resetPassword(identifier, code, password);
      toast.success('Password updated. Please log in.');
      setStep('done');
      router.replace('/login');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  });

  return (
    <Screen keyboard header={<Header title="Reset password" />}>
      <Text variant="h1">{step === 'identify' ? 'Forgot your password?' : 'Set a new password'}</Text>
      <Text color="textSecondary" style={{ marginTop: 4 }}>
        {step === 'identify' ? "Enter the email or phone linked to your account and we'll send a code." : 'Enter the code we sent and choose a new password.'}
      </Text>
      <View style={{ gap: 16, marginTop: 24 }}>
        {error ? <Banner tone="danger" title="Something's not right" message={error} /> : null}
        {step === 'identify' ? (
          <>
            <Input label="Email or phone" value={identifier} onChangeText={setIdentifier} placeholder="you@example.com" autoCapitalize="none" icon="person-outline" />
            <Button title="Send code" size="lg" onPress={requestCode} loading={busy} />
          </>
        ) : (
          <>
            <OtpInput value={code} onChange={setCode} autoFocus={false} />
            {devHint ? (
              <View style={{ gap: 4 }}>
                <MockBadge label="MOCK OTP" />
                <Text variant="small" color="textSecondary">
                  Demo code: {devHint}
                </Text>
              </View>
            ) : null}
            <FormInput control={control} name="password" label="New password" secureTextEntry secureToggle icon="lock-closed-outline" />
            <FormInput control={control} name="confirmPassword" label="Confirm new password" secureTextEntry secureToggle icon="lock-closed-outline" />
            <Button title="Update password" size="lg" onPress={reset} loading={busy} />
          </>
        )}
      </View>
    </Screen>
  );
}
