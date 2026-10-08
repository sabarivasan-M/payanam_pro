import React from 'react';
import { View } from 'react-native';
import { Header } from '@/components/ui/Header';
import { ListGroup, ListItem } from '@/components/ui/ListItem';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { usePreferences } from '@/stores/preferencesStore';
import { useProfile } from '@/stores/sessionStore';

export default function NotificationSettings() {
  const prefs = usePreferences((s) => s.notifications);
  const set = usePreferences((s) => s.setNotificationPref);
  const isPartner = useProfile().role === 'partner';
  return (
    <Screen header={<Header title="Notifications" />}>
      <View style={{ gap: 18 }}>
        <ListGroup>
          <ListItem icon="calendar-outline" title={isPartner ? 'New bookings & cancellations' : 'Booking updates'} subtitle="Accepted, confirmed, cancelled" toggle={{ value: prefs.booking, onChange: (v) => set('booking', v) }} />
          <ListItem icon="speedometer-outline" title="Rental alerts" subtitle="Start, ending soon, extra km/time" toggle={{ value: prefs.rental, onChange: (v) => set('rental', v) }} />
          <ListItem icon="shield-checkmark-outline" title={isPartner ? 'Returns & damage reports' : 'Verification results'} toggle={{ value: prefs.verification, onChange: (v) => set('verification', v) }} />
          <ListItem icon="megaphone-outline" title="Offers & PAYANAM news" toggle={{ value: prefs.promotions, onChange: (v) => set('promotions', v) }} last />
        </ListGroup>
        <Text variant="caption" color="textMuted">
          Safety-critical alerts (rental limits, damage reviews) always appear in your notification centre. Push delivery will use these preferences once enabled.
        </Text>
      </View>
    </Screen>
  );
}
