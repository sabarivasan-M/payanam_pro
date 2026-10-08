import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormInput } from '@/components/forms/FormInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { ListGroup, ListItem } from '@/components/ui/ListItem';
import { Screen } from '@/components/ui/Screen';
import { Banner } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { authService } from '@/services/authService';
import { useProfile } from '@/stores/sessionStore';
import { toast } from '@/stores/uiStore';
import { errorMessage } from '@/utils/errors';
import { Platform } from 'react-native';

const schema = z
  .object({
    current: z.string().min(1, 'Enter your current password'),
    next: z.string().min(8, 'Use at least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export default function Security() {
  const profile = useProfile();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, reset, formState } = useForm({ resolver: zodResolver(schema), defaultValues: { current: '', next: '', confirm: '' } });

  const save = handleSubmit(async (v) => {
    setError(null);
    try {
      await authService.changePassword(profile.id, v.current, v.next);
      reset();
      toast.success('Password changed');
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <Screen keyboard header={<Header title="Security" />}>
      <View style={{ gap: 18 }}>
        <Card>
          <Text variant="h3" style={{ marginBottom: 12 }}>
            Change password
          </Text>
          <View style={{ gap: 14 }}>
            {error ? <Banner tone="danger" title="Couldn't change password" message={error} /> : null}
            <FormInput control={control} name="current" label="Current password" secureTextEntry secureToggle icon="lock-closed-outline" />
            <FormInput control={control} name="next" label="New password" secureTextEntry secureToggle icon="key-outline" />
            <FormInput control={control} name="confirm" label="Confirm new password" secureTextEntry secureToggle icon="key-outline" />
            <Button title="Update password" onPress={save} loading={formState.isSubmitting} />
          </View>
        </Card>
        <ListGroup title="Sessions">
          <ListItem icon="phone-portrait-outline" title="This device" subtitle={`${Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web'} · active now`} />
          <ListItem icon="call-outline" title="Phone verification" value={profile.phoneVerified ? 'Verified' : 'Pending'} onPress={profile.phoneVerified ? undefined : () => router.push('/otp')} last />
        </ListGroup>
        <Text variant="caption" color="textMuted">
          Your session token is stored in the device's secure keystore. PAYANAM staff will never ask for your password or OTP.
        </Text>
      </View>
    </Screen>
  );
}
