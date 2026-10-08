import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useSession } from '@/stores/sessionStore';

/** Screens available to both roles — still require a verified session. */
export default function SharedLayout() {
  const status = useSession((s) => s.status);
  const profile = useSession((s) => s.profile);
  if (status === 'loading') return null;
  if (status !== 'signedIn' || !profile) return <Redirect href="/role" />;
  if (!profile.phoneVerified) return <Redirect href="/otp" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
