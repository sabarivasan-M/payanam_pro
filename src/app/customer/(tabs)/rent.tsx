import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { BikeCard } from '@/components/bike/BikeCard';
import { FilterSheet } from '@/components/bike/FilterSheet';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { BikeCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useBikes } from '@/features/bikes/hooks';
import { useT } from '@/features/i18n';
import { countActiveFilters, DEFAULT_FILTERS, type BikeFilters } from '@/services/bikeService';
import { useTheme } from '@/theme/ThemeProvider';

type Mode = 'rent' | 'buy';

export default function RentAndBuy() {
  const t = useTheme();
  const tr = useT();
  const [mode, setMode] = useState<Mode>('rent');
  const [filters, setFilters] = useState<BikeFilters>(DEFAULT_FILTERS);
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const effective: BikeFilters = { ...filters, search, forSale: mode === 'buy' };
  const bikes = useBikes(effective);
  const activeCount = countActiveFilters(filters);

  return (
    <Screen edges={['top']} scroll={false} padded={false}>
      <FlatList
        data={bikes.data ?? []}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: t.spacing.lg, gap: 14, paddingBottom: 32, flexGrow: 1 }}
        refreshing={bikes.isRefetching}
        onRefresh={() => bikes.refetch()}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 4 }}>
            <Text variant="h1" style={{ marginTop: 8 }}>
              {tr('rentBuy')}
            </Text>
            <SegmentedControl<Mode>
              value={mode}
              onChange={setMode}
              options={[
                { value: 'rent', label: 'Rent a bike' },
                { value: 'buy', label: 'Buy a bike' },
              ]}
            />
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Input value={search} onChangeText={setSearch} placeholder="Search brand, model or area" icon="search" returnKeyType="search" autoCorrect={false} />
              </View>
              <Chip label="Filter" icon="options-outline" count={activeCount} selected={activeCount > 0} onPress={() => setFilterOpen(true)} />
            </View>
            {mode === 'buy' ? (
              <Text variant="small" color="textSecondary">
                Pre-owned bikes from verified partners. Every bike can be test-ridden as a rental first.
              </Text>
            ) : null}
            {bikes.data ? (
              <Text variant="caption" color="textMuted">
                {bikes.data.length} bike{bikes.data.length === 1 ? '' : 's'} found
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          bikes.isLoading ? (
            <View style={{ gap: 14 }}>
              <BikeCardSkeleton />
              <BikeCardSkeleton />
            </View>
          ) : bikes.isError ? (
            <ErrorState error={bikes.error} onRetry={() => bikes.refetch()} />
          ) : (
            <EmptyState
              title={mode === 'buy' ? 'No bikes for sale match' : 'No bikes match your search'}
              message="Try another search or clear the filters."
              actionLabel="Clear all"
              onAction={() => {
                setFilters(DEFAULT_FILTERS);
                setSearch('');
              }}
            />
          )
        }
        renderItem={({ item }) => (
          <BikeCard
            bike={item}
            showPurchase={mode === 'buy'}
            onPress={() => router.push(`/customer/bike/${item.id}`)}
            onRent={() => router.push(`/customer/bike/${item.id}?rent=1`)}
          />
        )}
      />
      <FilterSheet visible={filterOpen} onClose={() => setFilterOpen(false)} value={filters} onApply={setFilters} />
    </Screen>
  );
}
