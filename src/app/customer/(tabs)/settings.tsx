import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { AccountActionsGroup, DemoToolsGroup, PreferencesGroup, ProfileHeaderCard, SupportGroup } from '@/components/settings/SettingsCommon';
import { Badge } from '@/components/ui/Badge';
import { ListGroup, ListItem } from '@/components/ui/ListItem';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useT } from '@/features/i18n';
import { useCustomerProfile } from '@/features/profile/hooks';
import { useProfile } from '@/stores/sessionStore';
import type { VerificationStatus } from '@/types/models';
import type { StatusTone } from '@/utils/bookingStateMachine';

const VERIFY: Record<VerificationStatus, { label: string; tone: StatusTone }> = {
  verified: { label: 'Verified', tone: 'success' },
  pending: { label: 'In progress', tone: 'warning' },
  rejected: { label: 'Action needed', tone: 'danger' },
  unverified: { label: 'Not verified', tone: 'neutral' },
};

export default function CustomerSettings() {
  const tr = useT();
  const profile = useProfile();
  const cp = useCustomerProfile(profile.id);
  const v = VERIFY[cp.data?.verificationStatus ?? 'unverified'];

  return (
    <Screen edges={['top']} onRefresh={() => cp.refetch()} refreshing={cp.isRefetching}>
      <Text variant="h1" style={{ marginTop: 8, marginBottom: 16 }}>
        {tr('settings')}
      </Text>
      <View style={{ gap: 22 }}>
        <ProfileHeaderCard subtitle={cp.data ? `${cp.data.totalRentals} rentals · ★ ${cp.data.rating.toFixed(1)} rider rating` : undefined} />
        <ListGroup title="Account">
          <ListItem icon="id-card-outline" title="Documents" subtitle="Aadhaar & Driving Licence" onPress={() => router.push('/customer/verify-documents')} />
          <ListItem icon="shield-checkmark-outline" title="Verification status" right={<Badge label={v.label} tone={v.tone} dot />} onPress={() => router.push('/customer/verify-documents')} />
          <ListItem icon="bookmark-outline" title="Saved locations" onPress={() => router.push('/addresses?kind=saved')} />
          <ListItem icon="wallet-outline" title="Payment methods" onPress={() => router.push('/payment-methods')} />
          <ListItem icon="key-outline" title="Security" subtitle="Password & sessions" onPress={() => router.push('/security')} last />
        </ListGroup>
        <PreferencesGroup />
        <SupportGroup />
        <AccountActionsGroup />
        <DemoToolsGroup />
        <Text variant="caption" color="textMuted" align="center">
          PAYANAM v1.0.0 · Made in Tamil Nadu
        </Text>
      </View>
    </Screen>
  );
}
