import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { AccountActionsGroup, DemoToolsGroup, PreferencesGroup, ProfileHeaderCard, SupportGroup } from '@/components/settings/SettingsCommon';
import { Badge } from '@/components/ui/Badge';
import { ListGroup, ListItem } from '@/components/ui/ListItem';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useT } from '@/features/i18n';
import { usePartner } from '@/features/profile/hooks';
import { useProfile } from '@/stores/sessionStore';

export default function PartnerSettings() {
  const tr = useT();
  const profile = useProfile();
  const partner = usePartner(profile.id);
  const p = partner.data;
  return (
    <Screen edges={['top']} onRefresh={() => partner.refetch()} refreshing={partner.isRefetching}>
      <Text variant="h1" style={{ marginTop: 8, marginBottom: 16 }}>
        {tr('settings')}
      </Text>
      <View style={{ gap: 22 }}>
        <ProfileHeaderCard subtitle={p ? `${p.businessName} · ★ ${p.rating.toFixed(1)}` : undefined} />
        <ListGroup title="Business">
          <ListItem icon="storefront-outline" title="Business information" subtitle={p?.businessName} onPress={() => router.push('/partner/business')} />
          <ListItem icon="call-outline" title="Contact details" subtitle={`+91 ${profile.phone} · ${profile.email}`} onPress={() => router.push('/profile-edit')} />
          <ListItem icon="location-outline" title="Pickup locations" onPress={() => router.push('/addresses?kind=pickup')} />
          <ListItem icon="card-outline" title="Bank & payout settlement" value={p?.payoutAccountMasked ?? 'Not set'} onPress={() => router.push('/partner/payout')} />
          <ListItem
            icon="shield-checkmark-outline"
            title="ID verification"
            right={<Badge label={p?.idVerificationStatus === 'verified' ? 'Verified' : 'Pending'} tone={p?.idVerificationStatus === 'verified' ? 'success' : 'warning'} dot />}
            last
          />
        </ListGroup>
        <ListGroup title="Security">
          <ListItem icon="key-outline" title="Security" subtitle="Password & sessions" onPress={() => router.push('/security')} last />
        </ListGroup>
        <PreferencesGroup />
        <SupportGroup />
        <AccountActionsGroup />
        <DemoToolsGroup />
        <Text variant="caption" color="textMuted" align="center">
          PAYANAM Partner v1.0.0
        </Text>
      </View>
    </Screen>
  );
}
