import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { InspectionResultCard } from '@/components/booking/InspectionResultCard';
import { PhotoChecklist } from '@/components/media/PhotoChecklist';
import { MockBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { Banner, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useBookingDetails } from '@/features/bookings/hooks';
import { useBookingAction } from '@/features/bookings/useBookingAction';
import { inspectionService, REQUIRED_INSPECTION_ANGLES, type InspectionPhotos } from '@/services/inspectionService';
import { useActor } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { InspectionResult } from '@/types/models';

export default function HandoverInspection() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const actor = useActor();
  const q = useBookingDetails(id);
  const [photos, setPhotos] = useState<InspectionPhotos>({});
  const [damage, setDamage] = useState<string[]>([]);
  const [result, setResult] = useState<InspectionResult | null>(null);

  const submit = useBookingAction(id, () => inspectionService.submitPreRental(id, actor, photos, damage), {
    onSuccess: (r) => setResult(r.result),
  });

  if (q.isLoading) return <LoadingState />;
  if (q.isError || !q.data) {
    return (
      <Screen header={<Header title="Bike inspection" />}>
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Screen>
    );
  }
  const b = q.data;
  const complete = REQUIRED_INSPECTION_ANGLES.every((a) => photos[a.angle]);

  if (result) {
    const passed = result.verdict === 'passed';
    return (
      <Screen
        header={<Header title="Inspection result" back={false} />}
        footer={
          passed ? (
            <Button title="Continue to customer verification" size="lg" iconRight="arrow-forward" onPress={() => router.replace(`/partner/booking/${id}`)} />
          ) : (
            <Button title="Retake photos" size="lg" icon="camera" onPress={() => setResult(null)} />
          )
        }
      >
        <View style={{ gap: 14 }}>
          <InspectionResultCard result={result} title="Handover inspection" />
          {passed ? (
            <Banner tone="success" title="Bike inspection passed" message="The customer has been asked to verify their identity with a selfie." />
          ) : (
            <Banner tone="warning" title="Inspection incomplete" message="Some required photos are missing or unclear. Retake them to continue." />
          )}
        </View>
      </Screen>
    );
  }

  if (b.status !== 'BIKE_INSPECTION') {
    return (
      <Screen header={<Header title="Bike inspection" />}>
        <Banner tone="info" title="Inspection not open" message={b.inspectionPassed ? 'This bike has already been inspected.' : 'Mark the customer as arrived and start the inspection from the booking screen.'} />
        <Button title="Back to booking" style={{ marginTop: 16 }} onPress={() => router.replace(`/partner/booking/${id}`)} />
      </Screen>
    );
  }

  return (
    <Screen
      header={<Header title="Bike Handover Inspection" subtitle={`${b.bike.brand} ${b.bike.model} · ${b.bike.registrationNumber}`} />}
      footer={<Button title="Submit Bike Inspection" size="lg" icon="shield-checkmark-outline" disabled={!complete} loading={submit.isPending} onPress={() => submit.mutate(undefined)} />}
    >
      <Text variant="h1">Capture bike condition</Text>
      <Text color="textSecondary" style={{ marginTop: 4 }}>
        Do this with the customer present. These photos protect you if there's a damage dispute later.
      </Text>
      <View style={{ marginTop: 10, marginBottom: 14 }}>
        <MockBadge label="MOCK AI INSPECTION" />
      </View>
      {submit.isPending ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: t.radius.lg, backgroundColor: t.colors.surface, marginBottom: 14 }}>
          <ActivityIndicator color={t.colors.primary} />
          <Text>Analysing photos (mock inspection)…</Text>
        </View>
      ) : null}
      <PhotoChecklist photos={photos} onChange={setPhotos} damagePhotos={damage} onDamageChange={setDamage} bucket="inspection-images" ownerId={actor.id} disabled={submit.isPending} />
    </Screen>
  );
}
