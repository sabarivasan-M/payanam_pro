import React, { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormInput } from '@/components/forms/FormInput';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { usePartner } from '@/features/profile/hooks';
import { qk } from '@/features/queryKeys';
import { useServiceMutation } from '@/hooks/useServiceMutation';
import { profileService } from '@/services/profileService';
import { useProfile } from '@/stores/sessionStore';

const schema = z.object({
  businessName: z.string().trim().min(2, 'Enter your business name'),
  address: z.string().trim().min(6, 'Enter the address'),
  city: z.string().trim().min(2, 'Enter the city'),
});

export default function BusinessInfo() {
  const profile = useProfile();
  const q = usePartner(profile.id);
  const { control, handleSubmit, reset } = useForm({ resolver: zodResolver(schema), defaultValues: { businessName: '', address: '', city: '' } });
  useEffect(() => {
    if (q.data) reset({ businessName: q.data.businessName, address: q.data.address, city: q.data.city });
  }, [q.data, reset]);
  const save = useServiceMutation((v: z.infer<typeof schema>) => profileService.updatePartner(profile.id, v), {
    invalidate: [qk.partner(profile.id)],
    success: 'Business details saved',
    onSuccess: () => router.back(),
  });

  if (q.isLoading) return <LoadingState />;
  if (q.isError) {
    return (
      <Screen header={<Header title="Business information" />}>
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Screen>
    );
  }
  return (
    <Screen keyboard header={<Header title="Business information" />} footer={<Button title="Save" size="lg" onPress={handleSubmit((v) => save.mutate(v))} loading={save.isPending} />}>
      <View style={{ gap: 16 }}>
        <FormInput control={control} name="businessName" label="Business / rental name" icon="storefront-outline" />
        <FormInput control={control} name="address" label="Registered address" icon="location-outline" />
        <FormInput control={control} name="city" label="City" icon="business-outline" />
      </View>
    </Screen>
  );
}
