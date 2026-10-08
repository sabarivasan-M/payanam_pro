import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

/** Placeholder legal copy for the demo build — replace with counsel-approved text before launch. */
const DOCS: Record<string, { title: string; sections: { h: string; p: string }[] }> = {
  terms: {
    title: 'Terms & Conditions',
    sections: [
      { h: '1. The service', p: 'PAYANAM is a marketplace connecting riders with independent rental partners. Each rental is a contract between the rider and the partner; PAYANAM facilitates booking, verification and payments.' },
      { h: '2. Eligibility', p: 'Riders must be 18 or older and hold a valid two-wheeler driving licence. Identity documents must belong to the rider.' },
      { h: '3. Rental limits & charges', p: 'Each plan includes a distance and time allowance. Usage beyond these limits is charged at the rates shown before booking. Fuel, tolls, fines and challans during the rental are the rider\'s responsibility.' },
      { h: '4. Inspections & damage', p: 'Bikes are photographed at handover and return. Damage claims are reviewed with photo evidence and are never charged without the rider being able to respond.' },
      { h: '5. Cancellations', p: 'Bookings can be cancelled before handover inspection begins. Held amounts are released on cancellation.' },
      { h: 'Demo notice', p: 'This build runs in DEMO MODE: verifications, inspections and payments are simulated and no money is collected.' },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    sections: [
      { h: 'What we collect', p: 'Account details (name, phone, email), identity documents for verification, booking history, and location while you use bike discovery and active rentals.' },
      { h: 'How documents are protected', p: 'Identity documents and selfies are stored in private storage, accessible only to you and, for the duration of a booking, the verification process. They are never public.' },
      { h: 'Location', p: 'Location is used to show nearby bikes and route you to pickup points. You can deny permission and choose an area manually.' },
      { h: 'Your rights', p: 'You can edit your profile, download your data or request account deletion from Settings.' },
      { h: 'Demo notice', p: 'In demo mode all data stays on this device. Please use dummy documents only.' },
    ],
  },
};

export default function LegalDoc() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const d = DOCS[doc] ?? DOCS.terms;
  return (
    <Screen header={<Header title={d.title} />}>
      <View style={{ gap: 16 }}>
        <Text variant="caption" color="textMuted">
          Last updated October 2026
        </Text>
        {d.sections.map((s) => (
          <View key={s.h} style={{ gap: 4 }}>
            <Text variant="h3">{s.h}</Text>
            <Text color="textSecondary">{s.p}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}
