import React from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MockBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { StoredImage } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import type { InspectionImage, InspectionResult } from '@/types/models';

export function InspectionResultCard({ result, title }: { result: InspectionResult; title: string }) {
  const t = useTheme();
  const passed = result.verdict === 'passed';
  const rows: { label: string; value: string; ok: boolean }[] = [
    { label: 'Vehicle detected', value: result.vehicleDetected ? 'YES' : 'NO', ok: result.vehicleDetected },
    { label: 'Visible damage', value: result.visibleDamage.toUpperCase(), ok: result.visibleDamage === 'none' },
    { label: 'Speedometer', value: result.speedometer.toUpperCase(), ok: result.speedometer === 'readable' },
  ];
  if (result.newDamage) rows.push({ label: 'New damage', value: result.newDamage === 'detected' ? 'DETECTED' : 'NONE DETECTED', ok: result.newDamage !== 'detected' });
  rows.push({ label: 'Condition', value: result.condition.toUpperCase(), ok: result.condition === 'good' });
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text variant="h3">{title}</Text>
        {result.isMock ? <MockBadge label="MOCK ANALYSIS" /> : null}
      </View>
      {rows.map((r) => (
        <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: t.colors.border }}>
          <Text color="textSecondary">{r.label}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name={r.ok ? 'checkmark-circle' : 'alert-circle'} size={16} color={r.ok ? t.colors.success : t.colors.warning} />
            <Text variant="bodyStrong">{r.value}</Text>
          </View>
        </View>
      ))}
      {result.differences.length ? (
        <View style={{ marginTop: 10, gap: 4 }}>
          {result.differences.map((d) => (
            <Text key={d} variant="small" color="warning">
              • {d}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={{ marginTop: 12, padding: 12, borderRadius: t.radius.md, backgroundColor: passed ? t.colors.successSoft : t.colors.warningSoft, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={passed ? 'shield-checkmark' : 'eye-outline'} size={20} color={passed ? t.colors.success : t.colors.warning} />
        <Text variant="bodyStrong" style={{ color: passed ? t.colors.success : t.colors.warning }}>
          Inspection: {passed ? 'PASSED' : 'REVIEW REQUIRED'}
        </Text>
      </View>
      {result.isMock ? (
        <Text variant="caption" color="textMuted" style={{ marginTop: 8 }}>
          Demo result — no computer-vision model analysed these photos.
        </Text>
      ) : null}
    </Card>
  );
}

export function PhotoStrip({ images, label }: { images: InspectionImage[]; label?: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {label ? <Text variant="smallStrong" color="textSecondary">{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {images.map((img) => (
          <View key={img.id} style={{ gap: 4 }}>
            <StoredImage uri={img.url} style={{ width: 96, height: 96, borderRadius: t.radius.md }} />
            <Text variant="caption" color="textMuted" align="center">
              {img.angle}
            </Text>
          </View>
        ))}
        {images.length === 0 ? (
          <Text variant="small" color="textMuted">
            No photos
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
