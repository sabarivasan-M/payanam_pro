import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Logo } from '@/components/brand/Logo';
import { BikeIllustration } from '@/components/bike/BikeIllustration';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useSession } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { Role } from '@/types/models';

const OPTIONS: { role: Role; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; perks: string[] }[] = [
  { role: 'customer', title: 'Customer', subtitle: 'I want to rent a bike', icon: 'person-outline', perks: ['Verified bikes nearby', 'Transparent pricing'] },
  { role: 'partner', title: 'Rental Partner', subtitle: 'I want to rent out my bike', icon: 'storefront-outline', perks: ['List your fleet', 'Verified customers'] },
];

export default function RoleSelection() {
  const t = useTheme();
  const setSelectedRole = useSession((s) => s.setSelectedRole);
  const current = useSession((s) => s.selectedRole);
  const [selected, setSelected] = useState<Role | null>(current);

  const proceed = async () => {
    if (!selected) return;
    await setSelectedRole(selected);
    router.push('/login');
  };

  return (
    <Screen footer={<Button title="Continue" iconRight="arrow-forward" size="lg" disabled={!selected} onPress={proceed} />}>
      <View style={{ paddingTop: 24, gap: 6 }}>
        <Logo size={34} />
        <Text variant="display" style={{ marginTop: 28 }}>
          Who are you?
        </Text>
        <Text variant="body" color="textSecondary">
          Choose how you'll use PAYANAM. You can't switch dashboards with the same account.
        </Text>
      </View>
      <View style={{ gap: 14, marginTop: 24 }}>
        {OPTIONS.map((o) => {
          const active = selected === o.role;
          return (
            <Pressable
              key={o.role}
              onPress={() => setSelected(o.role)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${o.title}. ${o.subtitle}`}
              style={({ pressed }) => ({
                borderRadius: t.radius.xxl,
                borderWidth: 2,
                borderColor: active ? t.colors.primary : t.colors.border,
                backgroundColor: active ? t.colors.primarySoft : t.colors.surface,
                padding: 18,
                overflow: 'hidden',
                transform: [{ scale: pressed ? 0.99 : 1 }],
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: active ? t.colors.primary : t.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={o.icon} size={26} color={active ? t.colors.onPrimary : t.colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="overline" color={active ? 'primary' : 'textMuted'}>
                    {o.title.toUpperCase()}
                  </Text>
                  <Text variant="h2">{o.subtitle}</Text>
                </View>
                <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={24} color={active ? t.colors.primary : t.colors.borderStrong} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12 }}>
                <View style={{ gap: 4 }}>
                  {o.perks.map((p) => (
                    <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="checkmark-circle" size={15} color={t.colors.success} />
                      <Text variant="small" color="textSecondary">
                        {p}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={{ marginRight: -20, marginBottom: -24, opacity: 0.9 }}>
                  <BikeIllustration type={o.role === 'customer' ? 'scooter' : 'cruiser'} color={o.role === 'customer' ? '#F2A33A' : '#0E6B5C'} width={130} height={78} />
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
