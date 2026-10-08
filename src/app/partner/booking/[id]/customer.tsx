import React from 'react';
import { Linking, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Avatar, KeyValue } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useBookingDetails } from '@/features/bookings/hooks';
import { formatDate, maskPhone } from '@/utils/format';

/**
 * Customer profile as seen by the partner. Assumption: partners see verification STATUS only,
 * never the identity document images themselves (data minimisation).
 */
export default function PartnerCustomerView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useBookingDetails(id);
  if (q.isLoading) return <LoadingState />;
  if (q.isError || !q.data) {
    return (
      <Screen header={<Header title="Customer" />}>
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Screen>
    );
  }
  const { customer, customerProfile, faceVerification } = q.data;
  const verified = customerProfile?.verificationStatus === 'verified';
  return (
    <Screen header={<Header title="Customer" />} footer={<Button title="Call customer" icon="call" onPress={() => Linking.openURL(`tel:+91${customer.phone}`)} />}>
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 12 }}>
        <Avatar name={customer.fullName} uri={customer.avatarUrl} size={88} />
        <Text variant="h1">{customer.fullName}</Text>
        <Badge label={verified ? 'Identity verified' : 'Verification pending'} tone={verified ? 'success' : 'warning'} icon="shield-checkmark" />
      </View>
      <Card style={{ marginTop: 10 }}>
        <KeyValue label="Age" value={customer.age ? `${customer.age}` : '—'} />
        <KeyValue label="Phone" value={`+91 ${maskPhone(customer.phone)}`} />
        <KeyValue label="Rider rating" value={customerProfile ? `★ ${customerProfile.rating.toFixed(1)}` : '—'} />
        <KeyValue label="Completed rentals" value={`${customerProfile?.totalRentals ?? 0}`} />
        <KeyValue label="Member since" value={formatDate(customer.createdAt)} />
      </Card>
      <Card style={{ marginTop: 12 }}>
        <Text variant="h3" style={{ marginBottom: 6 }}>
          Verification
        </Text>
        <KeyValue label="Aadhaar & Driving Licence" value={verified ? 'Verified' : 'Pending'} tone={verified ? 'success' : undefined} />
        <KeyValue label="Handover selfie" value={faceVerification ? (faceVerification.status === 'verified' ? 'Matched (mock)' : 'Failed') : 'Not yet'} />
        <Text variant="caption" color="textMuted" style={{ marginTop: 6 }}>
          Document images are private to the customer and PAYANAM verification.
        </Text>
      </Card>
    </Screen>
  );
}
