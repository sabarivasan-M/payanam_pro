import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ListItem } from '@/components/ui/ListItem';
import { Text } from '@/components/ui/Text';
import { useBrands } from '@/features/bikes/hooks';
import { DEFAULT_FILTERS, type BikeFilters } from '@/services/bikeService';
import type { BikeType } from '@/types/models';

const DISTANCES = [2, 5, 10];
const PRICES = [500, 800, 1500];
const TYPES: { value: BikeType; label: string }[] = [
  { value: 'scooter', label: 'Scooter' },
  { value: 'commuter', label: 'Commuter' },
  { value: 'sports', label: 'Sports' },
  { value: 'cruiser', label: 'Cruiser' },
  { value: 'electric', label: 'Electric' },
];
const SORTS: { value: NonNullable<BikeFilters['sort']>; label: string }[] = [
  { value: 'distance', label: 'Nearest' },
  { value: 'price_low', label: 'Price: low to high' },
  { value: 'price_high', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text variant="smallStrong" color="textSecondary">
        {title}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

export function FilterSheet({ visible, onClose, value, onApply }: { visible: boolean; onClose: () => void; value: BikeFilters; onApply: (f: BikeFilters) => void }) {
  const [draft, setDraft] = useState<BikeFilters>(value);
  const brands = useBrands();
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const toggleIn = <T,>(list: T[] | undefined, item: T) => (list?.includes(item) ? list.filter((x) => x !== item) : [...(list ?? []), item]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Filters"
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button title="Reset" variant="outline" onPress={() => setDraft({ ...DEFAULT_FILTERS, search: value.search, forSale: value.forSale })} />
          </View>
          <View style={{ flex: 2 }}>
            <Button
              title="Show bikes"
              onPress={() => {
                onApply(draft);
                onClose();
              }}
            />
          </View>
        </View>
      }
    >
      <Group title="Sort by">
        {SORTS.map((s) => (
          <Chip key={s.value} label={s.label} selected={draft.sort === s.value} onPress={() => setDraft({ ...draft, sort: s.value })} />
        ))}
      </Group>
      <Group title="Distance">
        {DISTANCES.map((d) => (
          <Chip key={d} label={`Within ${d} km`} selected={draft.maxDistanceKm === d} onPress={() => setDraft({ ...draft, maxDistanceKm: draft.maxDistanceKm === d ? null : d })} />
        ))}
      </Group>
      <Group title="Price per day">
        {PRICES.map((p) => (
          <Chip key={p} label={`Under ₹${p}`} selected={draft.maxPrice === p} onPress={() => setDraft({ ...draft, maxPrice: draft.maxPrice === p ? null : p })} />
        ))}
      </Group>
      <Group title="Bike type">
        {TYPES.map((tp) => (
          <Chip key={tp.value} label={tp.label} selected={draft.bikeTypes?.includes(tp.value)} onPress={() => setDraft({ ...draft, bikeTypes: toggleIn(draft.bikeTypes, tp.value) })} />
        ))}
      </Group>
      <Group title="Brand">
        {(brands.data ?? []).map((b) => (
          <Chip key={b} label={b} selected={draft.brands?.includes(b)} onPress={() => setDraft({ ...draft, brands: toggleIn(draft.brands, b) })} />
        ))}
      </Group>
      <Group title="Transmission">
        <Chip label="Automatic" selected={draft.transmission === 'automatic'} onPress={() => setDraft({ ...draft, transmission: draft.transmission === 'automatic' ? null : 'automatic' })} />
        <Chip label="Manual / geared" selected={draft.transmission === 'manual'} onPress={() => setDraft({ ...draft, transmission: draft.transmission === 'manual' ? null : 'manual' })} />
      </Group>
      <Group title="Rating">
        {[4, 4.5].map((r) => (
          <Chip key={r} icon="star" label={`${r}+`} selected={draft.minRating === r} onPress={() => setDraft({ ...draft, minRating: draft.minRating === r ? null : r })} />
        ))}
      </Group>
      <ListItem title="Available now only" subtitle="Hide booked bikes and bikes under maintenance" toggle={{ value: !!draft.availableOnly, onChange: (v) => setDraft({ ...draft, availableOnly: v }) }} last />
    </BottomSheet>
  );
}
