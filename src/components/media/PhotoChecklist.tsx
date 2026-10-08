import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import type { InspectionPhotos } from '@/services/inspectionService';
import { REQUIRED_INSPECTION_ANGLES } from '@/services/inspectionService';
import type { Bucket } from '@/services/storageService';
import { useTheme } from '@/theme/ThemeProvider';
import { ImageCaptureField } from './ImageCaptureField';

interface Props {
  photos: InspectionPhotos;
  onChange: (photos: InspectionPhotos) => void;
  damagePhotos: string[];
  onDamageChange: (photos: string[]) => void;
  bucket: Bucket;
  ownerId: string;
  disabled?: boolean;
}

/** Required angle photos + optional damage photos, with a live checklist */
export function PhotoChecklist({ photos, onChange, damagePhotos, onDamageChange, bucket, ownerId, disabled }: Props) {
  const t = useTheme();
  const done = REQUIRED_INSPECTION_ANGLES.filter((a) => photos[a.angle]).length;
  return (
    <View style={{ gap: 14 }}>
      <Card tone="soft" elevated={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text variant="bodyStrong">Checklist</Text>
          <Text variant="smallStrong" color="primary">
            {done}/{REQUIRED_INSPECTION_ANGLES.length} captured
          </Text>
        </View>
        <ProgressBar value={done / REQUIRED_INSPECTION_ANGLES.length} tone={done === REQUIRED_INSPECTION_ANGLES.length ? 'success' : 'primary'} />
        <View style={{ marginTop: 12, gap: 6 }}>
          {REQUIRED_INSPECTION_ANGLES.map((a) => {
            const ok = !!photos[a.angle];
            return (
              <View key={a.angle} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={ok ? t.colors.success : t.colors.textMuted} />
                <Text variant="small" color={ok ? 'text' : 'textSecondary'}>
                  {a.label} {ok ? 'captured' : ''}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Card padded={false} style={{ paddingHorizontal: 14 }}>
        {REQUIRED_INSPECTION_ANGLES.map((a) => (
          <ImageCaptureField
            key={a.angle}
            variant="row"
            required
            label={a.label}
            hint={a.hint}
            value={photos[a.angle] ?? null}
            onChange={(ref) => onChange({ ...photos, [a.angle]: ref ?? undefined })}
            bucket={bucket}
            ownerId={ownerId}
            disabled={disabled}
          />
        ))}
        {damagePhotos.map((ref, i) => (
          <ImageCaptureField
            key={`damage-${i}`}
            variant="row"
            label={`Damage area ${i + 1}`}
            hint="Optional close-up of an existing scratch or dent"
            value={ref}
            onChange={(next) => onDamageChange(next ? damagePhotos.map((d, j) => (j === i ? next : d)) : damagePhotos.filter((_, j) => j !== i))}
            bucket={bucket}
            ownerId={ownerId}
            disabled={disabled}
          />
        ))}
        <ImageCaptureField
          key={`damage-new-${damagePhotos.length}`}
          variant="row"
          label="Add damage area (optional)"
          hint="Photograph any scratches, dents or broken parts"
          value={null}
          onChange={(ref) => ref && onDamageChange([...damagePhotos, ref])}
          bucket={bucket}
          ownerId={ownerId}
          disabled={disabled}
        />
      </Card>
    </View>
  );
}
