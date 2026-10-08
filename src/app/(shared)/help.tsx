import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useProfile } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';

const CUSTOMER_FAQ = [
  { q: 'Which documents do I need?', a: 'A valid Aadhaar and a two-wheeler Driving Licence. You verify them once and they stay valid for future bookings.' },
  { q: 'How are extra charges calculated?', a: 'Every plan includes a distance and time limit. Beyond them you pay the per-km and per-minute rate shown on the bike before you book. You get a warning at 80% usage.' },
  { q: 'When do I get my deposit back?', a: 'The security deposit is refunded after the return inspection is complete — usually within minutes in the app, 3–5 working days at your bank.' },
  { q: 'What if the partner reports damage?', a: 'You are never charged automatically. You see the before/after photos and the proposed amount, and can accept or request a manual review.' },
  { q: 'Can I cancel a booking?', a: 'Yes, any time before the handover inspection starts. The held amount is released immediately.' },
];

const PARTNER_FAQ = [
  { q: 'How do payouts work?', a: 'Completed rentals are settled to your bank/UPI after a short hold. PAYANAM keeps a 10% platform fee.' },
  { q: 'Why photograph every bike at handover?', a: 'Handover photos are your evidence. Return photos are compared against them, which makes damage claims quick and fair.' },
  { q: 'Can I block a bike for servicing?', a: 'Yes — mark it as Maintenance from Manage Bikes. It disappears from customer bookings until you mark it Available.' },
  { q: 'What if a customer disputes damage?', a: 'The claim moves to manual review. You can keep or withdraw it, and PAYANAM support mediates when needed.' },
];

export default function Help() {
  const t = useTheme();
  const isPartner = useProfile().role === 'partner';
  const faq = isPartner ? PARTNER_FAQ : CUSTOMER_FAQ;
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Screen header={<Header title="Help Center" />} footer={<Button title="Still need help? Contact support" variant="secondary" onPress={() => router.push('/support')} />}>
      <Text variant="h1" style={{ marginBottom: 14 }}>
        How can we help?
      </Text>
      <View style={{ gap: 10 }}>
        {faq.map((f, i) => (
          <Pressable key={f.q} onPress={() => setOpen(open === i ? null : i)} accessibilityRole="button" style={{ padding: 16, borderRadius: t.radius.lg, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {f.q}
              </Text>
              <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={18} color={t.colors.textMuted} />
            </View>
            {open === i ? <Text color="textSecondary">{f.a}</Text> : null}
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
