import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { ListGroup, ListItem } from '@/components/ui/ListItem';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { config } from '@/constants/config';
import { useServiceMutation } from '@/hooks/useServiceMutation';
import { profileService } from '@/services/profileService';
import { useProfile } from '@/stores/sessionStore';
import type { SupportTicket } from '@/types/models';

const CATEGORIES: { value: SupportTicket['category']; label: string }[] = [
  { value: 'booking', label: 'Booking' },
  { value: 'payment', label: 'Payment' },
  { value: 'verification', label: 'Verification' },
  { value: 'app', label: 'App problem' },
  { value: 'other', label: 'Other' },
];

export default function Support() {
  const { report } = useLocalSearchParams<{ report?: string }>();
  const profile = useProfile();
  const [category, setCategory] = useState<SupportTicket['category']>('booking');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ subject?: string; message?: string }>({});

  const submit = useServiceMutation(() => profileService.createSupportTicket({ userId: profile.id, category, subject: subject.trim(), message: message.trim() }), {
    success: (tk) => `Ticket #${tk.id.slice(0, 6).toUpperCase()} created — we'll reply within 24 hours`,
    onSuccess: () => router.back(),
  });

  const send = () => {
    const e: typeof errors = {};
    if (subject.trim().length < 4) e.subject = 'Add a short subject';
    if (message.trim().length < 10) e.message = 'Describe the issue in a few words (10+ characters)';
    setErrors(e);
    if (!e.subject && !e.message) submit.mutate(undefined);
  };

  return (
    <Screen keyboard header={<Header title={report ? 'Report an issue' : 'Contact support'} />}>
      <View style={{ gap: 18 }}>
        {!report ? (
          <ListGroup title="Reach us">
            <ListItem icon="call-outline" title="Call support" subtitle="8 AM – 10 PM, all days" onPress={() => Linking.openURL(`tel:${config.supportPhone}`)} />
            <ListItem icon="mail-outline" title="Email" subtitle={config.supportEmail} onPress={() => Linking.openURL(`mailto:${config.supportEmail}`)} last />
          </ListGroup>
        ) : null}
        <Card>
          <Text variant="h3" style={{ marginBottom: 12 }}>
            {report ? 'What went wrong?' : 'Send us a message'}
          </Text>
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map((c) => (
                <Chip key={c.value} label={c.label} selected={category === c.value} onPress={() => setCategory(c.value)} />
              ))}
            </View>
            <Input label="Subject" value={subject} onChangeText={setSubject} error={errors.subject} placeholder="e.g. Deposit not refunded" />
            <Input label="Details" value={message} onChangeText={setMessage} error={errors.message} multiline placeholder="Tell us what happened. Include booking ID if you have it." />
            <Button title="Submit" onPress={send} loading={submit.isPending} />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
