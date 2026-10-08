import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormInput } from '@/components/forms/FormInput';
import { ImageCaptureField } from '@/components/media/ImageCaptureField';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { Banner } from '@/components/ui/StateViews';
import { profileService } from '@/services/profileService';
import { useProfile, useSession } from '@/stores/sessionStore';
import { toast } from '@/stores/uiStore';
import { errorMessage } from '@/utils/errors';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
});

export default function ProfileEdit() {
  const profile = useProfile();
  const setProfile = useSession((s) => s.setProfile);
  const [avatar, setAvatar] = useState<string | null>(profile.avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fullName: profile.fullName, email: profile.email, phone: profile.phone },
  });

  const save = handleSubmit(async (v) => {
    setError(null);
    try {
      const phoneChanged = v.phone !== profile.phone;
      let updated = await profileService.updateProfile(profile.id, { fullName: v.fullName, email: v.email, avatarUrl: avatar });
      if (phoneChanged) {
        // A new number must be re-verified by OTP (the OTP screen sends the code) before it is saved.
        updated = { ...updated, phone: v.phone, phoneVerified: false };
        setProfile(updated);
        toast.info('Verify your new phone number');
        router.replace('/otp');
        return;
      }
      setProfile(updated);
      toast.success('Profile updated');
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <Screen keyboard header={<Header title="Edit profile" />} footer={<Button title="Save changes" size="lg" onPress={save} loading={formState.isSubmitting} />}>
      <View style={{ gap: 16 }}>
        {error ? <Banner tone="danger" title="Couldn't save" message={error} /> : null}
        <ImageCaptureField label="Profile photo" value={avatar} onChange={setAvatar} bucket="profile-images" ownerId={profile.id} cameraType="front" aspect={[1, 1]} />
        <FormInput control={control} name="fullName" label="Full name" icon="person-outline" />
        <FormInput control={control} name="email" label="Email" icon="mail-outline" keyboardType="email-address" autoCapitalize="none" />
        <FormInput control={control} name="phone" label="Phone" prefix="+91" keyboardType="phone-pad" maxLength={10} hint="Changing your number requires OTP verification" />
      </View>
    </Screen>
  );
}
