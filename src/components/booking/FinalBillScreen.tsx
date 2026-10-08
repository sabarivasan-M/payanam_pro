import React from 'react';
import { Share, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Logo } from '@/components/brand/Logo';
import { BillLines } from '@/components/booking/BookingParts';
import { Badge, MockBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Divider, KeyValue } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { Banner, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useBookingDetails } from '@/features/bookings/hooks';
import { useBookingPayments } from '@/features/payments/hooks';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDateTime, formatDuration, formatINR, maskRegistration } from '@/utils/format';

/** Invoice — shared by customer and partner (partner opens it from the booking screen). */
export function FinalBillScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useBookingDetails(id);
  const payments = useBookingPayments(id);

  if (q.isLoading) return <LoadingState />;
  if (q.isError || !q.data) {
    return (
      <Screen header={<Header title="Invoice" />}>
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Screen>
    );
  }
  const b = q.data;
  if (!b.finalBill) {
    return (
      <Screen header={<Header title="Invoice" />}>
        <Banner tone="info" title="Bill not ready yet" message="The final bill is generated once the return inspection is complete." />
      </Screen>
    );
  }
  const bill = b.finalBill;
  const share = () =>
    Share.share({
      message: `PAYANAM invoice #${b.id.slice(0, 8).toUpperCase()}\n${b.bike.brand} ${b.bike.model}\nTotal: ${formatINR(bill.total)}\nDeposit ${formatINR(bill.securityDeposit)}: ${bill.depositStatus}`,
    });

  return (
    <Screen
      header={<Header title="Final bill" />}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button title="Share" icon="share-outline" variant="outline" onPress={share} />
          </View>
          <View style={{ flex: 1.4 }}>
            <Button title="Done" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          </View>
        </View>
      }
    >
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 10 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: t.colors.successSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark-done" size={32} color={t.colors.success} />
        </View>
        <Text variant="h1">Rental completed</Text>
        <Text variant="display" color="primary">
          {formatINR(bill.total)}
        </Text>
        <Badge label={`Deposit ${bill.depositStatus}`} tone="success" icon="return-up-back" />
      </View>

      <Card style={{ marginTop: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Logo size={26} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="caption" color="textMuted">
              INVOICE
            </Text>
            <Text variant="smallStrong">#{b.id.slice(0, 8).toUpperCase()}</Text>
          </View>
        </View>
        <Divider style={{ marginVertical: 12 }} />
        <KeyValue label="Bike" value={`${b.bike.brand} ${b.bike.model}`} sub={maskRegistration(b.bike.registrationNumber)} />
        <KeyValue label="Partner" value={b.partner.businessName} />
        <KeyValue label="Customer" value={b.customer.fullName} />
        <KeyValue label="Plan" value={b.plan.label} />
        <KeyValue label="Distance" value={`${bill.actualDistanceKm} km`} sub={`${b.plan.includedDistanceKm} km included`} />
        <KeyValue label="Duration" value={formatDuration(bill.actualDurationMinutes)} sub={`${formatDuration(b.plan.includedDurationMinutes)} included`} />
        <KeyValue label="Generated" value={formatDateTime(bill.generatedAt)} />
        <Divider style={{ marginVertical: 12 }} />
        <BillLines bill={bill} />
      </Card>

      <Card style={{ marginTop: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text variant="h3">Payments</Text>
          <MockBadge label="MOCK PAYMENTS" />
        </View>
        {(payments.data ?? []).map((p) => (
          <KeyValue
            key={p.id}
            label={p.kind === 'authorization' ? 'Booking hold' : p.kind === 'rental_charge' ? 'Rental charge' : 'Deposit refund'}
            sub={`${p.reference} · ${p.status}`}
            value={`${p.kind === 'deposit_refund' ? '+' : ''}${formatINR(p.amount)}`}
            tone={p.kind === 'deposit_refund' ? 'success' : undefined}
          />
        ))}
        <Text variant="caption" color="textMuted" style={{ marginTop: 6 }}>
          Demo payments — no money was charged or refunded.
        </Text>
      </Card>
    </Screen>
  );
}
