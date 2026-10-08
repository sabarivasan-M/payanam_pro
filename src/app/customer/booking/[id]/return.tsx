import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { InspectionResultCard } from '@/components/booking/InspectionResultCard';
import { PhotoChecklist } from '@/components/media/PhotoChecklist';
import { MockBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { ListItem } from '@/components/ui/ListItem';
import { Screen } from '@/components/ui/Screen';
import { Banner, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { config } from '@/constants/config';
import { useBookingDetails } from '@/features/bookings/hooks';
import { useBookingAction } from '@/features/bookings/useBookingAction';
import { inspectionService, REQUIRED_INSPECTION_ANGLES, type InspectionPhotos } from '@/services/inspectionService';
import { useActor } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { InspectionResult } from '@/types/models';

export default function ReturnBike() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const actor = useActor();
  const q = useBookingDetails(id);
  const [photos, setPhotos] = useState<InspectionPhotos>({});
  const [damage, setDamage] = useState<string[]>([]);
  const [simulateDamage, setSimulateDamage] = useState(false);
  const [result, setResult] = useState<InspectionResult | null>(null);

  const submit = useBookingAction(
    id,
    () => inspectionService.submitReturn(id, actor, { ...photos, ...(damage[0] ? { damage: damage[0] } : {}) }, simulateDamage),
    { onSuccess: (r) => setResult(r.result) },
  );

  if (q.isLoading) return <LoadingState />;
  if (q.isError || !q.data) {
    return (
      <Screen header={<Header title="Return bike" />}>
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Screen>
    );
  }
  const complete = REQUIRED_INSPECTION_ANGLES.every((a) => photos[a.angle]);
  const awaiting = q.data.status === 'RETURN_REQUESTED';

  if (result) {
    const passed = result.verdict === 'passed';
    return (
      <Screen header={<Header title="Return inspection" back={false} />} footer={<Button title="Back to booking" size="lg" onPress={() => router.replace(`/customer/booking/${id}`)} />}>
        <View style={{ gap: 14 }}>
          <InspectionResultCard result={result} title="Return inspection" />
          {passed ? (
            <Banner tone="success" title="Looks good!" message="The partner will confirm and your final bill will be generated." />
          ) : (
            <Banner tone="warning" title="Damage review required" message="Possible new damage was flagged. You will NOT be charged automatically — the partner reviews it first and you can respond." />
          )}
        </View>
      </Screen>
    );
  }

  if (!awaiting) {
    return (
      <Screen header={<Header title="Return bike" />}>
        <Banner tone="info" title="Return already submitted" message="Your return photos were uploaded." />
        <Button title="Back to booking" style={{ marginTop: 16 }} onPress={() => router.replace(`/customer/booking/${id}`)} />
      </Screen>
    );
  }

  return (
    <Screen
      header={<Header title="Return Bike" subtitle={`${q.data.bike.brand} ${q.data.bike.model}`} />}
      footer={<Button title="Submit return" size="lg" icon="cloud-upload-outline" disabled={!complete} loading={submit.isPending} onPress={() => submit.mutate(undefined)} />}
    >
      <Text variant="h1">Return photos</Text>
      <Text color="textSecondary" style={{ marginTop: 4, marginBottom: 16 }}>
        Park at the pickup point and photograph the bike from all sides. These are compared with the handover photos.
      </Text>
      {submit.isPending ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: t.radius.lg, backgroundColor: t.colors.surface, marginBottom: 14 }}>
          <ActivityIndicator color={t.colors.primary} />
          <Text>Comparing before and after photos (mock)…</Text>
        </View>
      ) : null}
      <PhotoChecklist photos={photos} onChange={setPhotos} damagePhotos={damage} onDamageChange={setDamage} bucket="return-images" ownerId={actor.id} disabled={submit.isPending} />
      {config.DEMO_MODE ? (
        <View style={{ marginTop: 16, padding: 14, borderRadius: t.radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.colors.warning }}>
          <MockBadge label="DEMO CONTROLS" />
          <ListItem title="Simulate new damage" subtitle="Makes the mock inspection flag a scratch so you can demo the damage review" toggle={{ value: simulateDamage, onChange: setSimulateDamage }} last />
        </View>
      ) : null}
    </Screen>
  );
}
