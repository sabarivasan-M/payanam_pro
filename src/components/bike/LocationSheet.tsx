import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ListItem } from '@/components/ui/ListItem';
import { Banner } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useAddresses } from '@/features/profile/hooks';
import { mapService, POPULAR_AREAS } from '@/services/mapService';
import { useLocationStore } from '@/stores/locationStore';
import { useProfile } from '@/stores/sessionStore';
import { toast } from '@/stores/uiStore';
import { useTheme } from '@/theme/ThemeProvider';

export function LocationSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const profile = useProfile();
  const saved = useAddresses(profile.id, 'saved');
  const setLocation = useLocationStore((s) => s.setLocation);
  const current = useLocationStore((s) => s.label);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);

  const useDevice = async () => {
    setLocating(true);
    setDenied(false);
    const res = await mapService.getCurrentLocation();
    setLocating(false);
    if (res.status === 'granted') {
      setLocation(res.point, res.label, 'device');
      toast.success('Using your current location');
      onClose();
    } else {
      setDenied(true);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Choose location" subtitle={`Currently: ${current}`}>
      <ListItem
        icon="locate"
        title="Use current location"
        subtitle="Uses your phone's GPS"
        onPress={useDevice}
        right={locating ? <ActivityIndicator color={t.colors.primary} /> : undefined}
      />
      {denied ? (
        <Banner
          tone="warning"
          title="Unable to load location"
          message="Location permission is off or unavailable. Pick an area below, or enable location in Settings."
        />
      ) : null}
      {saved.data?.length ? (
        <View>
          <Text variant="overline" color="textMuted" style={{ marginTop: 6 }}>
            SAVED PLACES
          </Text>
          {saved.data.map((a, i) => (
            <ListItem
              key={a.id}
              icon={a.label.toLowerCase() === 'home' ? 'home-outline' : 'briefcase-outline'}
              title={a.label}
              subtitle={a.line1}
              last={i === saved.data.length - 1}
              onPress={() => {
                setLocation({ lat: a.lat, lng: a.lng }, `${a.label} · ${a.line1}`, 'saved');
                onClose();
              }}
            />
          ))}
        </View>
      ) : null}
      <View>
        <Text variant="overline" color="textMuted" style={{ marginTop: 6 }}>
          POPULAR AREAS
        </Text>
        {POPULAR_AREAS.map((a, i) => (
          <ListItem
            key={a.label}
            icon="location-outline"
            title={a.label}
            last={i === POPULAR_AREAS.length - 1}
            onPress={() => {
              setLocation({ lat: a.lat, lng: a.lng }, a.label, 'area');
              onClose();
            }}
          />
        ))}
      </View>
    </BottomSheet>
  );
}
