import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { MockBadge } from '@/components/ui/Badge';
import { Text } from '@/components/ui/Text';
import { config } from '@/constants/config';
import { authService } from '@/services/authService';
import { useSession } from '@/stores/sessionStore';
import { toast } from '@/stores/uiStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { Role } from '@/types/models';
import { errorMessage } from '@/utils/errors';

/**
 * DEMO ONLY. Lets one phone play both sides of a booking by switching between the
 * seeded customer and partner accounts. Hidden when DEMO_MODE is off.
 */
export function useDemoSwitch() {
  const setProfile = useSession((s) => s.setProfile);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const switchTo = async (role: Role, path?: string) => {
    setBusy(true);
    try {
      const profile = await authService.demoSignIn(role);
      qc.clear();
      setProfile(profile);
      router.replace((path ?? (role === 'partner' ? '/partner' : '/customer')) as never);
      toast.info(`Switched to demo ${role === 'partner' ? 'Rental Partner' : 'Customer'}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return { switchTo, busy };
}

export function DemoSwitchCard({ to, message, path }: { to: Role; message: string; path?: string }) {
  const t = useTheme();
  const { switchTo, busy } = useDemoSwitch();
  if (!config.DEMO_MODE) return null;
  return (
    <View style={{ padding: 14, borderRadius: t.radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.colors.warning, backgroundColor: t.colors.warningSoft, gap: 8 }}>
      <MockBadge label="DEMO CONTROLS" />
      <Text variant="small">{message}</Text>
      <Button
        title={to === 'partner' ? 'Switch to Rental Partner' : 'Switch to Customer'}
        icon="swap-horizontal"
        size="sm"
        variant="outline"
        fullWidth={false}
        loading={busy}
        onPress={() => switchTo(to, path)}
      />
    </View>
  );
}
