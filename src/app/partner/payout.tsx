import React, { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormInput } from '@/components/forms/FormInput';
import { MockBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { KeyValue } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { usePartner } from '@/features/profile/hooks';
import { qk } from '@/features/queryKeys';
import { useServiceMutation } from '@/hooks/useServiceMutation';
import { profileService } from '@/services/profileService';
import { useProfile } from '@/stores/sessionStore';

const schema = z
  .object({
    accountName: z.string().trim().min(2, 'Enter the account holder name'),
    accountNumber: z.string().trim().regex(/^(\d{9,18})?$/, 'Account number should be 9–18 digits'),
    ifsc: z.string().trim().toUpperCase().regex(/^([A-Z]{4}0[A-Z0-9]{6})?$/, 'Enter a valid IFSC (e.g. HDFC0001234)'),
    upi: z.string().trim().regex(/^([\w.-]{2,}@[a-zA-Z]{2,})?$/, 'Enter a valid UPI ID (name@bank)'),
  })
  .refine((v) => (v.accountNumber && v.ifsc) || v.upi, { path: ['upi'], message: 'Add a bank account + IFSC or a UPI ID' });

/** Only a masked account number is stored; real payouts would be set up via the payment provider's KYC. */
export default function Payout() {
  const profile = useProfile();
  const q = usePartner(profile.id);
  const { control, handleSubmit, reset } = useForm({ resolver: zodResolver(schema), defaultValues: { accountName: '', accountNumber: '', ifsc: '', upi: '' } });
  useEffect(() => {
    if (q.data) reset({ accountName: q.data.payoutAccountName ?? q.data.businessName, accountNumber: '', ifsc: q.data.payoutIfsc ?? '', upi: q.data.payoutUpi ?? '' });
  }, [q.data, reset]);
  const save = useServiceMutation((v: z.infer<typeof schema>) => profileService.savePayout(profile.id, v), {
    invalidate: [qk.partner(profile.id)],
    success: 'Payout details saved',
    onSuccess: () => router.back(),
  });

  if (q.isLoading) return <LoadingState />;
  if (q.isError || !q.data) {
    return (
      <Screen header={<Header title="Payout settlement" />}>
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Screen>
    );
  }
  return (
    <Screen keyboard header={<Header title="Bank & payout" />} footer={<Button title="Save payout details" size="lg" onPress={handleSubmit((v) => save.mutate(v))} loading={save.isPending} />}>
      <View style={{ gap: 16 }}>
        <MockBadge label="DEMO · NO REAL PAYOUTS" />
        {q.data.payoutAccountMasked || q.data.payoutUpi ? (
          <Card tone="soft" elevated={false}>
            <Text variant="smallStrong">Current settlement account</Text>
            <KeyValue label="Bank account" value={q.data.payoutAccountMasked ?? '—'} />
            <KeyValue label="IFSC" value={q.data.payoutIfsc ?? '—'} />
            <KeyValue label="UPI" value={q.data.payoutUpi ?? '—'} />
          </Card>
        ) : null}
        <FormInput control={control} name="accountName" label="Account holder name" icon="person-outline" />
        <FormInput control={control} name="accountNumber" label="Account number" keyboardType="number-pad" icon="card-outline" hint="Stored masked — only the last 4 digits are kept" />
        <FormInput control={control} name="ifsc" label="IFSC" autoCapitalize="characters" icon="business-outline" />
        <FormInput control={control} name="upi" label="UPI ID" autoCapitalize="none" icon="phone-portrait-outline" placeholder="yourname@okbank" />
        <Text variant="caption" color="textMuted">
          Settlements are processed T+2 days after rental completion. In production, bank verification happens through the payment provider.
        </Text>
      </View>
    </Screen>
  );
}
