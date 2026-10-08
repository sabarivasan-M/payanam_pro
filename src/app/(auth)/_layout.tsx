import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useSession } from '@/stores/sessionStore';

/** Auth screens are only reachable while signed out (or while phone verification is pending). */
export default function AuthLayout() {
  const status = useSession((s) => s.status);
  const profile = useSession((s) => s.profile);
  if (status === 'signedIn' && profile?.phoneVerified) {
    return <Redirect href={profile.role === 'partner' ? '/partner' : '/customer'} />;
  }
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
