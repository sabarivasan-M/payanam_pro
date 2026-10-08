import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormInput } from '@/components/forms/FormInput';
import { ImageCaptureField } from '@/components/media/ImageCaptureField';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { Banner } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { partnerSignUpSchema, type PartnerSignUpForm } from '@/features/auth/schemas';
import { authService } from '@/services/authService';
import { profileService } from '@/services/profileService';
import { storageService } from '@/services/storageService';
import { useSession } from '@/stores/sessionStore';
import { errorMessage } from '@/utils/errors';

export default function PartnerSignUp() {
  const setProfile = useSession((s) => s.setProfile);
  const [error, setError] = useState<string | null>(null);
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [idMissing, setIdMissing] = useState(false);
  const { control, handleSubmit, formState } = useForm<PartnerSignUpForm>({
    resolver: zodResolver(partnerSignUpSchema),
    defaultValues: { fullName: '', businessName: '', phone: '', email: '', address: '', city: 'Chennai', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    if (!idPhoto) {
      setIdMissing(true);
      return;
    }
    try {
      let profile = await authService.signUpPartner({
        fullName: v.fullName,
        businessName: v.businessName,
        phone: v.phone,
        email: v.email,
        address: v.address,
        city: v.city,
        password: v.password,
      });
      // Images are uploaded only once the account exists (so storage rules can scope them to the owner).
      const idRef = await storageService.saveImage(idPhoto, 'documents', profile.id);
      await profileService.submitPartnerId(profile.id, idRef);
      if (avatar) {
        const avatarRef = await storageService.saveImage(avatar, 'profile-images', profile.id);
        profile = await profileService.updateProfile(profile.id, { avatarUrl: avatarRef });
      }
      setProfile(profile);
      router.replace('/otp');
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <Screen keyboard header={<Header title="Become a Rental Partner" />} footer={<Button title="Register & verify phone" size="lg" onPress={onSubmit} loading={formState.isSubmitting} />}>
      <Text variant="h1">List your bikes on PAYANAM</Text>
      <Text color="textSecondary" style={{ marginTop: 4 }}>
        Reach verified riders across Tamil Nadu. Registration is free.
      </Text>
      <View style={{ gap: 16, marginTop: 24 }}>
        {error ? <Banner tone="danger" title="Registration failed" message={error} /> : null}
        <Text variant="overline" color="textMuted">
          OWNER
        </Text>
        <FormInput control={control} name="fullName" label="Full name" placeholder="Owner's full name" icon="person-outline" />
        <FormInput control={control} name="phone" label="Phone" placeholder="98765 43210" prefix="+91" keyboardType="phone-pad" maxLength={10} />
        <FormInput control={control} name="email" label="Email" placeholder="you@business.com" icon="mail-outline" keyboardType="email-address" autoCapitalize="none" />
        <Text variant="overline" color="textMuted" style={{ marginTop: 8 }}>
          BUSINESS
        </Text>
        <FormInput control={control} name="businessName" label="Business / rental name" placeholder="e.g. Murugan Bike Rentals" icon="storefront-outline" />
        <FormInput control={control} name="address" label="Shop address" placeholder="Door no, street, area" icon="location-outline" />
        <FormInput control={control} name="city" label="City" placeholder="Chennai" icon="business-outline" />
        <Text variant="overline" color="textMuted" style={{ marginTop: 8 }}>
          VERIFICATION
        </Text>
        <ImageCaptureField
          label="ID verification"
          hint="Aadhaar, PAN or GST certificate (demo: use a test image)"
          value={idPhoto}
          onChange={(v) => {
            setIdPhoto(v);
            setIdMissing(false);
          }}
          bucket="documents"
          ownerId="pending"
          upload={false}
          required
        />
        {idMissing ? <Banner tone="danger" title="ID photo required" message="Add a photo of your ID to continue." /> : null}
        <ImageCaptureField label="Profile photo" hint="Optional — helps customers recognise you" value={avatar} onChange={setAvatar} bucket="profile-images" ownerId="pending" cameraType="front" aspect={[1, 1]} upload={false} />
        <FormInput control={control} name="password" label="Password" placeholder="At least 8 characters" icon="lock-closed-outline" secureTextEntry secureToggle />
        <FormInput control={control} name="confirmPassword" label="Confirm password" placeholder="Re-enter password" icon="lock-closed-outline" secureTextEntry secureToggle />
      </View>
    </Screen>
  );
}
