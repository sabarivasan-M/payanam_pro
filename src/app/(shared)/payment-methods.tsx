import React from 'react';
import { View } from 'react-native';
import { MockBadge } from '@/components/ui/Badge';
import { Header } from '@/components/ui/Header';
import { ListGroup, ListItem } from '@/components/ui/ListItem';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

/**
 * Payment methods. Assumption: PAYANAM will use a hosted checkout (Razorpay/Cashfree) where
 * the provider stores cards/UPI handles — the app never collects or stores card numbers.
 */
export default function PaymentMethods() {
  return (
    <Screen header={<Header title="Payment methods" />}>
      <View style={{ gap: 16 }}>
        <MockBadge label="DEMO · MOCK PAYMENTS" />
        <ListGroup title="Available at checkout">
          <ListItem icon="phone-portrait-outline" title="UPI" subtitle="GPay, PhonePe, Paytm, BHIM" value="Default" />
          <ListItem icon="card-outline" title="Debit / credit card" subtitle="Handled securely by the payment provider" />
          <ListItem icon="business-outline" title="Net banking" last />
        </ListGroup>
        <Text variant="caption" color="textMuted">
          In demo mode no payment is taken. In production, payments open the provider's secure checkout; PAYANAM never stores your card or UPI PIN.
        </Text>
      </View>
    </Screen>
  );
}
