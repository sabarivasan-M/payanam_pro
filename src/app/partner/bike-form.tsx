import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BikeIllustration } from '@/components/bike/BikeIllustration';
import { FormInput, parseNumber } from '@/components/forms/FormInput';
import { ImageCaptureField } from '@/components/media/ImageCaptureField';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Header } from '@/components/ui/Header';
import { ListItem } from '@/components/ui/ListItem';
import { Screen } from '@/components/ui/Screen';
import { Banner, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useBike } from '@/features/bikes/hooks';
import { BIKE_COLORS, bikeFormSchema, type BikeForm } from '@/features/bikes/bikeFormSchema';
import { useAddresses } from '@/features/profile/hooks';
import { qk } from '@/features/queryKeys';
import { useServiceMutation } from '@/hooks/useServiceMutation';
import { bikeService, PHOTO_ANGLES } from '@/services/bikeService';
import { useProfile } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { PhotoAngle } from '@/types/models';
import { buildRentalPlan } from '@/utils/pricing';
import { formatINR } from '@/utils/format';

const ANGLE_LABEL: Record<PhotoAngle, string> = { front: 'Front', rear: 'Rear', left: 'Left side', right: 'Right side', speedometer: 'Speedometer' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 14 }}>
      <Text variant="overline" color="textMuted" style={{ marginTop: 10 }}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function ChipField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <Text variant="smallStrong" color="textSecondary">
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => (
          <Chip key={o.value} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
        ))}
      </View>
    </View>
  );
}

export default function BikeFormScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const profile = useProfile();
  const existing = useBike(id);
  const pickups = useAddresses(profile.id, 'pickup');
  const [images, setImages] = useState<Partial<Record<PhotoAngle, string>>>({});
  const [imagesTouched, setImagesTouched] = useState(false);

  const { control, handleSubmit, reset, watch, setValue, formState } = useForm<BikeForm>({
    resolver: zodResolver(bikeFormSchema),
    defaultValues: {
      brand: '',
      model: '',
      bikeType: 'scooter',
      fuelType: 'petrol',
      transmission: 'automatic',
      color: BIKE_COLORS[0],
      seatingCapacity: 2,
      condition: 'good',
      includedKmPerDay: 100,
      extraKmRate: 5,
      extraMinuteRate: 2,
      securityDeposit: 1000,
      forSale: false,
      purchasePrice: null,
      pickupAddressId: '',
    },
  });

  useEffect(() => {
    if (existing.data && pickups.data) {
      const b = existing.data;
      const match = pickups.data.find((p) => p.label === b.pickupLabel) ?? pickups.data[0];
      reset({ ...b, purchasePrice: b.purchasePrice, pickupAddressId: match?.id ?? '' });
      setImages(Object.fromEntries(b.images.map((i) => [i.angle, i.url])));
    } else if (!editing && pickups.data?.length) {
      setValue('pickupAddressId', (pickups.data.find((p) => p.isDefault) ?? pickups.data[0]).id);
    }
  }, [existing.data, pickups.data, editing, reset, setValue]);

  const save = useServiceMutation(
    async (v: BikeForm) => {
      const pickup = pickups.data?.find((p) => p.id === v.pickupAddressId);
      if (!pickup) throw new Error('Choose a pickup location');
      const { pickupAddressId: _p, ...rest } = v;
      const input = {
        ...rest,
        registrationNumber: v.registrationNumber.replace(/\s+/g, ' ').trim(),
        purchasePrice: v.forSale ? (v.purchasePrice ?? null) : null,
        pickupLabel: pickup.label,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        city: pickup.city,
      };
      return editing ? bikeService.updateBike(id!, input, imagesTouched ? images : undefined) : bikeService.createBike(profile.id, input, images);
    },
    { invalidate: [qk.bikesAll, ['bike']], success: editing ? 'Bike updated' : 'Bike listed on PAYANAM', onSuccess: () => router.back() },
  );

  if (editing && existing.isLoading) return <LoadingState />;
  if (editing && existing.isError) {
    return (
      <Screen header={<Header title="Edit bike" />}>
        <ErrorState error={existing.error} onRetry={() => existing.refetch()} />
      </Screen>
    );
  }

  const v = watch();
  const pricing = v.dailyPrice && v.hourlyPrice ? { dailyPrice: v.dailyPrice, hourlyPrice: v.hourlyPrice, includedKmPerDay: v.includedKmPerDay || 0, extraKmRate: v.extraKmRate || 0, extraMinuteRate: v.extraMinuteRate || 0, securityDeposit: v.securityDeposit || 0 } : null;
  const preview = pricing ? buildRentalPlan(pricing, 'full_day') : null;
  const missingPhotos = PHOTO_ANGLES.filter((a) => !images[a]);

  return (
    <Screen keyboard header={<Header title={editing ? 'Edit bike' : 'Add a bike'} />} footer={<Button title={editing ? 'Save changes' : 'List bike'} size="lg" onPress={handleSubmit((vals) => save.mutate(vals))} loading={save.isPending || formState.isSubmitting} />}>
      <Card tone="soft" elevated={false}>
        <View style={{ alignItems: 'center' }}>
          <BikeIllustration type={v.bikeType} color={v.color} width={220} height={130} />
          <Text variant="bodyStrong">{[v.brand, v.model].filter(Boolean).join(' ') || 'Your bike'}</Text>
        </View>
      </Card>

      <View style={{ gap: 14, marginTop: 6 }}>
        <Section title="Bike details">
          <FormInput control={control} name="brand" label="Brand" placeholder="e.g. Honda" />
          <FormInput control={control} name="model" label="Model" placeholder="e.g. Activa 6G" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <FormInput control={control} name="year" label="Year" keyboardType="number-pad" parse={parseNumber} maxLength={4} />
            </View>
            <View style={{ flex: 1.4 }}>
              <FormInput control={control} name="registrationNumber" label="Registration no." placeholder="TN 09 AB 1234" autoCapitalize="characters" />
            </View>
          </View>
          <Controller control={control} name="bikeType" render={({ field }) => (
            <ChipField label="Bike type" value={field.value} onChange={field.onChange} options={[{ value: 'scooter', label: 'Scooter' }, { value: 'commuter', label: 'Commuter' }, { value: 'sports', label: 'Sports' }, { value: 'cruiser', label: 'Cruiser' }, { value: 'electric', label: 'Electric' }]} />
          )} />
          <Controller control={control} name="fuelType" render={({ field }) => (
            <ChipField label="Fuel type" value={field.value} onChange={field.onChange} options={[{ value: 'petrol', label: 'Petrol' }, { value: 'electric', label: 'Electric' }]} />
          )} />
          <Controller control={control} name="transmission" render={({ field }) => (
            <ChipField label="Transmission" value={field.value} onChange={field.onChange} options={[{ value: 'automatic', label: 'Automatic' }, { value: 'manual', label: 'Manual (geared)' }]} />
          )} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <FormInput control={control} name="engineCc" label="Engine (cc)" keyboardType="number-pad" parse={parseNumber} />
            </View>
            <View style={{ flex: 1 }}>
              <FormInput control={control} name="mileageKmpl" label={v.fuelType === 'electric' ? 'Range (km)' : 'Mileage (km/l)'} keyboardType="number-pad" parse={parseNumber} />
            </View>
            <View style={{ flex: 0.8 }}>
              <FormInput control={control} name="seatingCapacity" label="Seats" keyboardType="number-pad" parse={parseNumber} maxLength={1} />
            </View>
          </View>
          <Controller control={control} name="color" render={({ field }) => (
            <View style={{ gap: 8 }}>
              <Text variant="smallStrong" color="textSecondary">
                Colour
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {BIKE_COLORS.map((c) => (
                  <Pressable key={c} onPress={() => field.onChange(c)} accessibilityLabel={`Colour ${c}`} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, borderWidth: field.value === c ? 3 : 1, borderColor: field.value === c ? t.colors.primary : t.colors.border, alignItems: 'center', justifyContent: 'center' }}>
                    {field.value === c ? <Ionicons name="checkmark" size={16} color={c === '#ECF0F1' || c === '#F4D03F' ? '#000' : '#fff'} /> : null}
                  </Pressable>
                ))}
              </View>
            </View>
          )} />
          <Controller control={control} name="condition" render={({ field }) => (
            <ChipField label="Condition" value={field.value} onChange={field.onChange} options={[{ value: 'excellent', label: 'Excellent' }, { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }]} />
          )} />
        </Section>

        <Section title="Pricing & limits">
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <FormInput control={control} name="dailyPrice" label="Rental price / day" prefix="₹" keyboardType="number-pad" parse={parseNumber} />
            </View>
            <View style={{ flex: 1 }}>
              <FormInput control={control} name="hourlyPrice" label="Hourly price" prefix="₹" keyboardType="number-pad" parse={parseNumber} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <FormInput control={control} name="includedKmPerDay" label="Included km / day" keyboardType="number-pad" parse={parseNumber} />
            </View>
            <View style={{ flex: 1 }}>
              <FormInput control={control} name="securityDeposit" label="Security deposit" prefix="₹" keyboardType="number-pad" parse={parseNumber} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <FormInput control={control} name="extraKmRate" label="Extra km price" prefix="₹" keyboardType="decimal-pad" parse={parseNumber} />
            </View>
            <View style={{ flex: 1 }}>
              <FormInput control={control} name="extraMinuteRate" label="Extra minute price" prefix="₹" keyboardType="decimal-pad" parse={parseNumber} />
            </View>
          </View>
          {preview ? (
            <Banner tone="info" icon="calculator-outline" title={`Customers see ${formatINR(preview.baseAmount)}/day with ${preview.includedDistanceKm} km`} message={`Half day ${formatINR(buildRentalPlan(pricing!, 'half_day').baseAmount)} · Extra ${formatINR(preview.extraKmRate)}/km, ${formatINR(preview.extraMinuteRate)}/min`} />
          ) : null}
          <Controller control={control} name="forSale" render={({ field }) => (
            <ListItem title="Also list for sale" subtitle="Show this bike in the Buy section" toggle={{ value: field.value, onChange: field.onChange }} last />
          )} />
          {v.forSale ? <FormInput control={control} name="purchasePrice" label="Sale price" prefix="₹" keyboardType="number-pad" parse={parseNumber} /> : null}
        </Section>

        <Section title="Pickup location">
          {pickups.data?.length ? (
            <Controller control={control} name="pickupAddressId" render={({ field, fieldState }) => (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {pickups.data!.map((p) => (
                    <Chip key={p.id} icon="location-outline" label={p.label} selected={field.value === p.id} onPress={() => field.onChange(p.id)} />
                  ))}
                </View>
                {fieldState.error ? <Text variant="caption" color="danger">{fieldState.error.message}</Text> : null}
              </View>
            )} />
          ) : (
            <Banner tone="warning" title="No pickup location yet" message="Add a pickup location first." action={<Button title="Add pickup location" size="sm" variant="outline" fullWidth={false} onPress={() => router.push('/addresses?kind=pickup')} />} />
          )}
        </Section>

        <Section title="Bike photos">
          <Text variant="small" color="textSecondary" style={{ marginTop: -6 }}>
            Clear photos get more bookings. {missingPhotos.length ? `${missingPhotos.length} remaining — illustrated placeholders are shown until added.` : 'All photos added.'}
          </Text>
          <Card padded={false} style={{ paddingHorizontal: 14 }}>
            {PHOTO_ANGLES.map((a) => (
              <ImageCaptureField
                key={a}
                variant="row"
                label={ANGLE_LABEL[a]}
                value={images[a] ?? null}
                onChange={(ref) => {
                  setImagesTouched(true);
                  setImages((prev) => ({ ...prev, [a]: ref ?? undefined }));
                }}
                bucket="bike-images"
                ownerId={profile.id}
              />
            ))}
          </Card>
        </Section>
      </View>
    </Screen>
  );
}
