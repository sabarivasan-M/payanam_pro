import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ImageCaptureField } from '@/components/media/ImageCaptureField';
import { MockBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { Banner } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useBookingAction } from '@/features/bookings/useBookingAction';
import { faceVerificationService } from '@/services/faceVerificationService';
import { useActor } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function SelfieVerification() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const actor = useActor();
  const [selfie, setSelfie] = useState<string | null>(null);
  const [result, setResult] = useState<{ matched: boolean; reason?: string; score: number } | null>(null);

  const verify = useBookingAction(id, () => faceVerificationService.verifySelfie(id, actor, selfie!), {
    onSuccess: (r) => setResult({ matched: r.matched, reason: r.reason, score: r.record.matchScore }),
  });

  return (
    <Screen
      header={<Header title="Identity check" />}
      footer={
        result?.matched ? (
          <Button title="Continue" size="lg" iconRight="arrow-forward" onPress={() => router.replace(`/customer/booking/${id}`)} />
        ) : (
          <Button title="Verify selfie" size="lg" icon="scan" disabled={!selfie} loading={verify.isPending} onPress={() => verify.mutate(undefined)} />
        )
      }
    >
      <Text variant="display">Verify it's really you</Text>
      <Text color="textSecondary" style={{ marginTop: 6 }}>
        Use the front camera in good light. Remove sunglasses or a helmet.
      </Text>
      <View style={{ marginTop: 10 }}>
        <MockBadge label="MOCK FACE VERIFICATION" />
      </View>

      <View style={{ marginTop: 20, gap: 16 }}>
        <ImageCaptureField label="Your selfie" hint="Front camera · face centred" value={selfie} onChange={(v) => { setSelfie(v); setResult(null); }} bucket="selfies" ownerId={actor.id} cameraType="front" aspect={[3, 4]} required />

        {verify.isPending ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: t.radius.lg, backgroundColor: t.colors.surface }}>
            <ActivityIndicator color={t.colors.primary} />
            <Text>Comparing with your verified Aadhaar photo (mock)…</Text>
          </View>
        ) : null}

        {result ? (
          result.matched ? (
            <View style={{ alignItems: 'center', gap: 8, padding: 20, borderRadius: t.radius.xl, backgroundColor: t.colors.successSoft }}>
              <Ionicons name="shield-checkmark" size={44} color={t.colors.success} />
              <Text variant="h2">Identity verified</Text>
              <Text variant="small" color="textSecondary">
                Demo match score {Math.round(result.score * 100)}% — no real biometric check was performed.
              </Text>
            </View>
          ) : (
            <Banner tone="danger" title="Verification failed" message={result.reason ?? 'We could not match your selfie. Retake it and try again.'} />
          )
        ) : null}
      </View>
    </Screen>
  );
}
