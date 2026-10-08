import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { LoadingState } from '@/components/ui/StateViews';
import { useSession } from '@/stores/sessionStore';

/** Role guard: only signed-in, phone-verified rental partners can enter. */
export default function PartnerLayout() {
  const status = useSession((s) => s.status);
  const profile = useSession((s) => s.profile);
  if (status === 'loading') return <LoadingState />;
  if (status !== 'signedIn' || !profile) return <Redirect href="/role" />;
  if (!profile.phoneVerified) return <Redirect href="/otp" />;
  if (profile.role !== 'partner') return <Redirect href="/customer" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
