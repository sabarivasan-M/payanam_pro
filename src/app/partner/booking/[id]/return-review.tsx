import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BillLines } from '@/components/booking/BookingParts';
import { InspectionResultCard, PhotoStrip } from '@/components/booking/InspectionResultCard';
import { ImageCaptureField } from '@/components/media/ImageCaptureField';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { KeyValue } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { Banner, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useBookingDetails } from '@/features/bookings/hooks';
import { useBookingAction } from '@/features/bookings/useBookingAction';
import { bookingService } from '@/services/bookingService';
import { useActor } from '@/stores/sessionStore';
import { confirm } from '@/stores/uiStore';
import type { DamageSeverity } from '@/types/models';
import { formatDuration, formatINR } from '@/utils/format';
import { buildFinalBill } from '@/utils/pricing';

const OPTIONS: { value: DamageSeverity; label: string }[] = [
  { value: 'none', label: 'No Damage' },
  { value: 'minor', label: 'Minor Damage' },
  { value: 'major', label: 'Major Damage' },
  { value: 'manual_review', label: 'Request Manual Review' },
];

export default function ReturnReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const actor = useActor();
  const q = useBookingDetails(id);
  const [severity, setSeverity] = useState<DamageSeverity | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ description?: string; amount?: string }>({});

  const review = useBookingAction(
    id,
    () => bookingService.ownerReview(id, actor, { severity: severity!, description, amount: Number(amount) || 0, photoUrls: photos }),
    {
      success: severity === 'none' ? 'Return confirmed — rental completed' : 'Damage report sent to the customer',
      onSuccess: (b) => router.replace(b.status === 'COMPLETED' ? `/partner/booking/${id}/bill` : `/partner/booking/${id}`),
    },
  );

  if (q.isLoading) return <LoadingState />;
  if (q.isError || !q.data) {
    return (
      <Screen header={<Header title="Return inspection" />}>
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Screen>
    );
  }
  const b = q.data;
  if (b.status !== 'RETURN_INSPECTION') {
    return (
      <Screen header={<Header title="Return inspection" />}>
        <Banner tone="info" title="Nothing to review" message="This return has already been reviewed or isn't submitted yet." />
        <Button title="Back to booking" style={{ marginTop: 16 }} onPress={() => router.replace(`/partner/booking/${id}`)} />
      </Screen>
    );
  }

  const distance = b.session?.finalDistanceKm ?? 0;
  const minutes = b.session?.finalDurationMinutes ?? 0;
  const estimate = buildFinalBill(b.plan, distance, minutes, severity === 'minor' || severity === 'major' ? Number(amount) || 0 : 0, false);
  const needsDetails = severity === 'minor' || severity === 'major';

  const submit = async () => {
    if (!severity) return;
    const e: typeof errors = {};
    if (severity !== 'none' && description.trim().length < 6) e.description = 'Describe the damage';
    if (needsDetails && !(Number(amount) > 0)) e.amount = 'Suggest an amount';
    if (needsDetails && Number(amount) > b.plan.securityDeposit * 5) e.amount = 'Amount looks too high — request manual review instead';
    setErrors(e);
    if (Object.keys(e).length) return;
    const ok = await confirm({
      title: severity === 'none' ? 'Confirm no damage?' : 'Send damage report?',
      message: severity === 'none' ? 'The rental will be completed and the final bill generated.' : 'The customer will see your evidence and can accept or dispute it. Nothing is charged automatically.',
      confirmLabel: severity === 'none' ? 'Complete rental' : 'Send report',
    });
    if (ok) review.mutate(undefined);
  };

  return (
    <Screen keyboard header={<Header title="Return Inspection" subtitle={`${b.customer.fullName} · ${b.bike.brand} ${b.bike.model}`} />} footer={<Button title={severity === 'none' ? 'No Damage — Complete rental' : 'Submit review'} size="lg" disabled={!severity} onPress={submit} loading={review.isPending} />}>
      <View style={{ gap: 14 }}>
        {b.returnInspection?.result ? <InspectionResultCard result={b.returnInspection.result} title="Mock AI comparison" /> : null}
        <Card>
          <PhotoStrip label="Before (handover)" images={b.preInspection?.images ?? []} />
          <View style={{ height: 14 }} />
          <PhotoStrip label="After (return)" images={b.returnInspection?.images ?? []} />
        </Card>
        <Card>
          <Text variant="h3" style={{ marginBottom: 4 }}>
            Usage
          </Text>
          <KeyValue label="Distance" value={`${distance} km`} sub={`${b.plan.includedDistanceKm} km included`} />
          <KeyValue label="Time" value={formatDuration(minutes)} sub={`${formatDuration(b.plan.includedDurationMinutes)} included`} />
          <KeyValue label="Extra km charge" value={formatINR(estimate.extraKmCharge)} />
          <KeyValue label="Extra time charge" value={formatINR(estimate.extraTimeCharge)} />
        </Card>

        <Text variant="h3">Your review</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {OPTIONS.map((o) => (
            <Chip key={o.value} label={o.label} selected={severity === o.value} onPress={() => setSeverity(o.value)} />
          ))}
        </View>

        {severity && severity !== 'none' ? (
          <View style={{ gap: 12 }}>
            <Input label="Description" value={description} onChangeText={setDescription} multiline placeholder="e.g. Fresh scratch on the left side panel, 6 cm" error={errors.description} />
            {needsDetails ? <Input label="Suggested damage amount" prefix="₹" value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ''))} keyboardType="number-pad" error={errors.amount} /> : null}
            {photos.map((p, i) => (
              <ImageCaptureField key={p} label={`Damage photo ${i + 1}`} value={p} onChange={(next) => setPhotos(next ? photos.map((x, j) => (j === i ? next : x)) : photos.filter((_, j) => j !== i))} bucket="inspection-images" ownerId={actor.id} variant="row" />
            ))}
            <ImageCaptureField key={`new-${photos.length}`} label="Add damage photo" hint="Close-up of the damaged area" value={null} onChange={(ref) => ref && setPhotos([...photos, ref])} bucket="inspection-images" ownerId={actor.id} variant="row" />
            {severity === 'manual_review' ? <Banner tone="info" title="Manual review" message="PAYANAM support will review both sets of photos. No amount is proposed to the customer yet." /> : null}
          </View>
        ) : null}

        {severity ? (
          <Card>
            <Text variant="h3" style={{ marginBottom: 4 }}>
              Bill preview
            </Text>
            <BillLines bill={estimate} />
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
