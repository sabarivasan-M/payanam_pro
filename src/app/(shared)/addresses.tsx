import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { ListItem } from '@/components/ui/ListItem';
import { Screen } from '@/components/ui/Screen';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useAddresses } from '@/features/profile/hooks';
import { qk } from '@/features/queryKeys';
import { useServiceMutation } from '@/hooks/useServiceMutation';
import { mapService, POPULAR_AREAS } from '@/services/mapService';
import { profileService } from '@/services/profileService';
import { useProfile } from '@/stores/sessionStore';
import { confirm } from '@/stores/uiStore';
import type { Address, GeoPoint } from '@/types/models';

/** Saved places (customer) or pickup locations (partner) */
export default function Addresses() {
  const { kind: kindParam } = useLocalSearchParams<{ kind?: string }>();
  const kind: Address['kind'] = kindParam === 'pickup' ? 'pickup' : 'saved';
  const profile = useProfile();
  const q = useAddresses(profile.id, kind);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('Chennai');
  const [point, setPoint] = useState<GeoPoint | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const invalidate = [qk.addresses(profile.id, kind)];

  const add = useServiceMutation(
    () =>
      profileService.addAddress({
        ownerId: profile.id,
        kind,
        label: label.trim(),
        line1: line1.trim(),
        city: city.trim(),
        lat: point?.lat ?? POPULAR_AREAS[0].lat,
        lng: point?.lng ?? POPULAR_AREAS[0].lng,
        isDefault: (q.data?.length ?? 0) === 0,
      }),
    {
      invalidate,
      success: 'Location saved',
      onSuccess: () => {
        setOpen(false);
        setLabel('');
        setLine1('');
        setPoint(null);
      },
    },
  );
  const setDefault = useServiceMutation((a: Address) => profileService.setDefaultAddress(a), { invalidate });
  const remove = useServiceMutation((id: string) => profileService.removeAddress(id), { invalidate, success: 'Removed' });

  const submit = () => {
    const e: Record<string, string> = {};
    if (label.trim().length < 2) e.label = 'Give this place a name';
    if (line1.trim().length < 4) e.line1 = 'Enter the address';
    if (city.trim().length < 2) e.city = 'Enter the city';
    setErrors(e);
    if (Object.keys(e).length === 0) add.mutate(undefined);
  };

  const useGps = async () => {
    const res = await mapService.getCurrentLocation();
    setPoint(res.point);
    if (res.status === 'granted' && !line1) setLine1(res.label);
  };

  const title = kind === 'pickup' ? 'Pickup locations' : 'Saved locations';
  return (
    <Screen header={<Header title={title} />} footer={<Button title={kind === 'pickup' ? 'Add pickup location' : 'Add location'} icon="add" onPress={() => setOpen(true)} />}>
      {q.isLoading ? (
        <ListSkeleton rows={3} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState icon="location-outline" title={`No ${title.toLowerCase()} yet`} message={kind === 'pickup' ? 'Add the places where customers collect your bikes.' : 'Save Home or Work to find bikes faster.'} />
      ) : (
        <View style={{ gap: 12 }}>
          {q.data.map((a) => (
            <Card key={a.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Text variant="bodyStrong">{a.label}</Text>
                    {a.isDefault ? <Badge label="Default" tone="primary" /> : null}
                  </View>
                  <Text variant="small" color="textSecondary">
                    {a.line1}, {a.city}
                  </Text>
                </View>
                {!a.isDefault ? <Button title="Make default" size="sm" variant="ghost" fullWidth={false} onPress={() => setDefault.mutate(a)} /> : null}
                <IconButton
                  icon="trash-outline"
                  color="danger"
                  accessibilityLabel={`Remove ${a.label}`}
                  onPress={async () => {
                    if (await confirm({ title: `Remove ${a.label}?`, confirmLabel: 'Remove', destructive: true })) remove.mutate(a.id);
                  }}
                />
              </View>
            </Card>
          ))}
        </View>
      )}
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={kind === 'pickup' ? 'New pickup location' : 'New saved location'} footer={<Button title="Save" onPress={submit} loading={add.isPending} />}>
        <Input label="Name" placeholder={kind === 'pickup' ? 'e.g. Anna Nagar branch' : 'e.g. Home'} value={label} onChangeText={setLabel} error={errors.label} />
        <Input label="Address" placeholder="Door no, street, area" value={line1} onChangeText={setLine1} error={errors.line1} />
        <Input label="City" value={city} onChangeText={setCity} error={errors.city} />
        <ListItem icon="locate" title={point ? 'Location pinned' : 'Pin current location'} subtitle={point ? `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}` : 'Uses GPS; defaults to central Chennai'} onPress={useGps} last />
      </BottomSheet>
    </Screen>
  );
}
