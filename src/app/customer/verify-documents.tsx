import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ImageCaptureField } from '@/components/media/ImageCaptureField';
import { Badge, MockBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { StoredImage } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Banner, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { qk } from '@/features/queryKeys';
import { useDocuments } from '@/features/verification/hooks';
import { REQUIRED_DOCUMENTS, verificationService, type DocumentState } from '@/services/verificationService';
import { useProfile } from '@/stores/sessionStore';
import { toast } from '@/stores/uiStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { DocumentStatus } from '@/types/models';
import type { StatusTone } from '@/utils/bookingStateMachine';
import { errorMessage } from '@/utils/errors';

const STATUS: Record<DocumentStatus, { label: string; tone: StatusTone; icon: keyof typeof Ionicons.glyphMap }> = {
  not_uploaded: { label: 'Not uploaded', tone: 'neutral', icon: 'cloud-upload-outline' },
  uploaded: { label: 'Uploaded', tone: 'info', icon: 'document-outline' },
  under_verification: { label: 'Under verification', tone: 'warning', icon: 'hourglass-outline' },
  verified: { label: 'Verified', tone: 'success', icon: 'shield-checkmark' },
  rejected: { label: 'Rejected', tone: 'danger', icon: 'close-circle' },
};

export default function VerifyDocuments() {
  const t = useTheme();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const profile = useProfile();
  const qc = useQueryClient();
  const docs = useDocuments(profile.id);
  const [verifying, setVerifying] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: qk.documents(profile.id) }), qc.invalidateQueries({ queryKey: qk.customerProfile(profile.id) })]);

  const onCaptured = async (state: DocumentState, ref: string | null) => {
    if (!ref) return;
    setUploading(state.type);
    try {
      await verificationService.uploadDocument(profile.id, state.type, ref);
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(null);
    }
  };

  const submit = async () => {
    const pending = (docs.data ?? []).filter((d) => d.status === 'uploaded' && d.document);
    setVerifying(true);
    try {
      // Show "Under verification" immediately, then resolve each document.
      await Promise.all(
        pending.map(async (d) => {
          const p = verificationService.verifyDocument(d.document!);
          setTimeout(() => void refresh(), 150);
          await p;
        }),
      );
      await refresh();
      toast.success('Verification complete');
    } catch (e) {
      toast.error(errorMessage(e, 'Verification failed. Please retry.'));
      await refresh();
    } finally {
      setVerifying(false);
    }
  };

  const list = docs.data ?? [];
  const allVerified = list.length > 0 && list.every((d) => d.status === 'verified');
  const readyToSubmit = list.some((d) => d.status === 'uploaded') && list.every((d) => d.status !== 'not_uploaded' && d.status !== 'rejected');

  return (
    <Screen
      header={<Header title="Verification" />}
      footer={
        allVerified ? (
          next ? (
            <Button title="Continue to booking" size="lg" iconRight="arrow-forward" onPress={() => router.replace(`/customer/book/${next}`)} />
          ) : (
            <Button title="Done" size="lg" onPress={() => router.back()} />
          )
        ) : (
          <Button title={verifying ? 'Verifying…' : 'Submit for verification'} size="lg" icon="shield-checkmark-outline" onPress={submit} loading={verifying} disabled={!readyToSubmit} />
        )
      }
    >
      <Text variant="display">Verify your identity</Text>
      <Text color="textSecondary" style={{ marginTop: 6 }}>
        Partners hand over bikes only to verified riders. You do this once — it's valid for every future booking.
      </Text>
      <View style={{ marginTop: 14, gap: 8 }}>
        <MockBadge label="DEMO · MOCK VERIFICATION" />
        <Text variant="caption" color="textMuted">
          Demo mode does not read or validate document contents. Use dummy/test images only — never upload a real Aadhaar.
        </Text>
      </View>

      <View style={{ gap: 16, marginTop: 20 }}>
        {docs.isLoading ? (
          <ListSkeleton rows={2} />
        ) : docs.isError ? (
          <ErrorState error={docs.error} onRetry={() => docs.refetch()} compact />
        ) : (
          list.map((state) => {
            const meta = REQUIRED_DOCUMENTS.find((r) => r.type === state.type)!;
            const s = STATUS[state.status];
            const canReplace = state.status === 'not_uploaded' || state.status === 'rejected';
            return (
              <Card key={state.type}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={state.type === 'aadhaar' ? 'finger-print' : 'card-outline'} size={22} color={t.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{meta.title}</Text>
                    <Text variant="caption" color="textSecondary">
                      {meta.hint}
                    </Text>
                  </View>
                  <Badge label={s.label} tone={s.tone} icon={s.icon} />
                </View>
                {state.status === 'rejected' && state.document?.rejectionReason ? (
                  <View style={{ marginBottom: 12 }}>
                    <Banner tone="danger" title="Verification failed" message={`${state.document.rejectionReason} Upload a clearer photo.`} />
                  </View>
                ) : null}
                {canReplace ? (
                  <ImageCaptureField
                    label={`Photo of your ${meta.title}`}
                    value={null}
                    onChange={(ref) => onCaptured(state, ref)}
                    bucket="documents"
                    ownerId={profile.id}
                    disabled={uploading === state.type}
                  />
                ) : state.document ? (
                  <View style={{ gap: 10 }}>
                    <StoredImage uri={state.document.imageUrl} style={{ width: '100%', height: 150, borderRadius: t.radius.lg }} />
                    {state.status === 'uploaded' ? (
                      <Text variant="caption" color="textSecondary">
                        Ready — tap “Submit for verification”.
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </Card>
            );
          })
        )}
        {allVerified ? <Banner tone="success" title="Identity verified" message="You're all set to book bikes on PAYANAM." /> : null}
      </View>
    </Screen>
  );
}
