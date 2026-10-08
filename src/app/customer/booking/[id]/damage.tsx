import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { InspectionResultCard, PhotoStrip } from '@/components/booking/InspectionResultCard';
import { DemoSwitchCard } from '@/components/demo/DemoCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { KeyValue, StoredImage } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { Banner, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useBookingDetails } from '@/features/bookings/hooks';
import { useBookingAction } from '@/features/bookings/useBookingAction';
import { bookingService } from '@/services/bookingService';
import { useActor } from '@/stores/sessionStore';
import { confirm } from '@/stores/uiStore';
import { useTheme } from '@/theme/ThemeProvider';
import { capitalize, formatINR } from '@/utils/format';

export default function CustomerDamageReview() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const actor = useActor();
  const q = useBookingDetails(id);
  const [comment, setComment] = useState('');

  const respond = useBookingAction(id, (accept: boolean) => bookingService.respondToDamage(id, actor, { accept, comment }), {
    onSuccess: (b) => router.replace(b.status === 'COMPLETED' ? `/customer/booking/${id}/bill` : `/customer/booking/${id}`),
  });

  if (q.isLoading) return <LoadingState />;
  if (q.isError || !q.data) {
    return (
      <Screen header={<Header title="Damage review" />}>
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Screen>
    );
  }
  const b = q.data;
  const report = b.damageReport;
  if (!report) {
    return (
      <Screen header={<Header title="Damage review" />}>
        <Banner tone="info" title="No damage report" message="There is no damage claim on this booking." />
      </Screen>
    );
  }
  const underReview = report.status === 'manual_review';
  const open = b.status === 'DAMAGE_REVIEW' && report.status === 'proposed';

  const accept = async () => {
    if (await confirm({ title: `Accept ${formatINR(report.proposedAmount)} damage charge?`, message: 'This is added to your final bill. Your deposit is still refunded.', confirmLabel: 'Accept' })) respond.mutate(true);
  };

  return (
    <Screen
      header={<Header title="Damage Review" right={<Badge label={capitalize(report.severity)} tone={report.severity === 'major' ? 'danger' : 'warning'} />} />}
      footer={
        open ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title="Dispute" variant="outline" onPress={() => respond.mutate(false)} loading={respond.isPending} />
            </View>
            <View style={{ flex: 1.4 }}>
              <Button title="Accept & pay" onPress={accept} loading={respond.isPending} />
            </View>
          </View>
        ) : undefined
      }
    >
      <View style={{ gap: 14 }}>
        {underReview ? (
          <Banner tone="info" title="Under manual review" message="A PAYANAM support agent will review the evidence with both parties. No amount is charged until it's resolved." />
        ) : null}
        <Card>
          <Text variant="h3">Partner's report</Text>
          <Text color="textSecondary" style={{ marginTop: 6 }}>
            “{report.description || 'No description provided.'}”
          </Text>
          <KeyValue label="Proposed amount" value={formatINR(report.proposedAmount)} strong tone="danger" />
        </Card>
        {report.photoUrls.length ? (
          <View style={{ gap: 8 }}>
            <Text variant="smallStrong" color="textSecondary">
              Damage evidence
            </Text>
            <ScrollView horizontal contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>
              {report.photoUrls.map((u) => (
                <StoredImage key={u} uri={u} style={{ width: 140, height: 140, borderRadius: t.radius.lg }} />
              ))}
            </ScrollView>
          </View>
        ) : null}
        {b.returnInspection?.result ? <InspectionResultCard result={b.returnInspection.result} title="Mock AI comparison" /> : null}
        <PhotoStrip label="Before (handover)" images={b.preInspection?.images ?? []} />
        <PhotoStrip label="After (return)" images={b.returnInspection?.images ?? []} />
        {open ? <Input label="Your comments (optional)" value={comment} onChangeText={setComment} multiline placeholder="Add context if you disagree with the claim" /> : null}
        {underReview ? <DemoSwitchCard to="partner" path={`/partner/booking/${id}/return-review`} message="Switch to the demo partner to resolve this claim." /> : null}
      </View>
    </Screen>
  );
}
