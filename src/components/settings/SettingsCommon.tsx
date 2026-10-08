import React, { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useDemoSwitch } from '@/components/demo/DemoCard';
import { MockBadge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Card } from '@/components/ui/Card';
import { ListGroup, ListItem } from '@/components/ui/ListItem';
import { Avatar } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import { localDb } from '@/api/localDb';
import { config } from '@/constants/config';
import { authService } from '@/services/authService';
import { mapService } from '@/services/mapService';
import { usePreferences, type Language, type ThemePreference } from '@/stores/preferencesStore';
import { useProfile, useSession } from '@/stores/sessionStore';
import { confirm, toast } from '@/stores/uiStore';
import { maskPhone } from '@/utils/format';
import { errorMessage } from '@/utils/errors';

export function ProfileHeaderCard({ subtitle }: { subtitle?: string }) {
  const profile = useProfile();
  return (
    <Card onPress={() => router.push('/profile-edit')} accessibilityLabel="Edit profile">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar name={profile.fullName} uri={profile.avatarUrl} size={64} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="h2">{profile.fullName}</Text>
          <Text variant="small" color="textSecondary">
            {profile.email}
          </Text>
          <Text variant="small" color="textSecondary">
            +91 {maskPhone(profile.phone)}
            {profile.age ? ` · ${profile.age} yrs` : ''}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="primary">
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Text variant="smallStrong" color="primary">
          Edit
        </Text>
      </View>
    </Card>
  );
}

const THEME_LABEL: Record<ThemePreference, string> = { system: 'System default', light: 'Light', dark: 'Dark' };
const LANG_LABEL: Record<Language, string> = { en: 'English', ta: 'தமிழ் (Tamil)' };

export function PreferencesGroup() {
  const theme = usePreferences((s) => s.theme);
  const setTheme = usePreferences((s) => s.setTheme);
  const language = usePreferences((s) => s.language);
  const setLanguage = usePreferences((s) => s.setLanguage);
  const [sheet, setSheet] = useState<'theme' | 'language' | null>(null);
  const [locStatus, setLocStatus] = useState<string>('Checking…');

  useEffect(() => {
    mapService
      .getPermissionStatus()
      .then((s) => setLocStatus(s === 'granted' ? 'Allowed' : s === 'denied' ? 'Denied' : 'Not asked'))
      .catch(() => setLocStatus('Unavailable'));
  }, []);

  const handleLocation = async () => {
    if (locStatus === 'Denied') {
      await Linking.openSettings();
      return;
    }
    const res = await mapService.getCurrentLocation();
    setLocStatus(res.status === 'granted' ? 'Allowed' : 'Denied');
  };

  return (
    <>
      <ListGroup title="Preferences">
        <ListItem icon="notifications-outline" title="Notifications" onPress={() => router.push('/notification-settings')} />
        <ListItem icon="language-outline" title="Language" value={LANG_LABEL[language]} onPress={() => setSheet('language')} />
        <ListItem icon="moon-outline" title="Dark mode" value={THEME_LABEL[theme]} onPress={() => setSheet('theme')} />
        <ListItem icon="navigate-outline" title="Location permission" value={locStatus} onPress={handleLocation} last />
      </ListGroup>
      <BottomSheet visible={sheet === 'theme'} onClose={() => setSheet(null)} title="Appearance">
        {(Object.keys(THEME_LABEL) as ThemePreference[]).map((k, i, arr) => (
          <ListItem
            key={k}
            icon={k === 'dark' ? 'moon' : k === 'light' ? 'sunny' : 'phone-portrait-outline'}
            title={THEME_LABEL[k]}
            right={theme === k ? <Text color="primary">✓</Text> : undefined}
            onPress={() => {
              setTheme(k);
              setSheet(null);
            }}
            last={i === arr.length - 1}
          />
        ))}
      </BottomSheet>
      <BottomSheet visible={sheet === 'language'} onClose={() => setSheet(null)} title="Language" subtitle="Navigation and key headings are translated. More coming soon.">
        {(Object.keys(LANG_LABEL) as Language[]).map((k, i, arr) => (
          <ListItem
            key={k}
            icon="text-outline"
            title={LANG_LABEL[k]}
            right={language === k ? <Text color="primary">✓</Text> : undefined}
            onPress={() => {
              setLanguage(k);
              setSheet(null);
            }}
            last={i === arr.length - 1}
          />
        ))}
      </BottomSheet>
    </>
  );
}

export function SupportGroup() {
  return (
    <ListGroup title="Support">
      <ListItem icon="help-buoy-outline" title="Help Center" onPress={() => router.push('/help')} />
      <ListItem icon="call-outline" title="Contact Support" onPress={() => router.push('/support')} />
      <ListItem icon="flag-outline" title="Report an Issue" onPress={() => router.push('/support?report=1')} />
      <ListItem icon="document-text-outline" title="Terms & Conditions" onPress={() => router.push('/legal/terms')} />
      <ListItem icon="lock-closed-outline" title="Privacy Policy" onPress={() => router.push('/legal/privacy')} last />
    </ListGroup>
  );
}

export function AccountActionsGroup({ allowDelete = true }: { allowDelete?: boolean }) {
  const profile = useProfile();
  const signOut = useSession((s) => s.signOut);
  const qc = useQueryClient();

  const logout = async () => {
    if (!(await confirm({ title: 'Log out?', message: 'You can log back in anytime.', confirmLabel: 'Log out' }))) return;
    await signOut();
    qc.clear();
    router.replace('/role');
  };

  const remove = async () => {
    const ok = await confirm({
      title: 'Delete account?',
      message: 'Your profile will be scheduled for deletion and you will be logged out. Ongoing bookings must be completed first.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await authService.deleteAccount(profile.id);
      await signOut();
      qc.clear();
      toast.success('Account deletion requested');
      router.replace('/role');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <ListGroup title="Account">
      <ListItem icon="log-out-outline" title="Logout" onPress={logout} last={!allowDelete} />
      {allowDelete ? <ListItem icon="trash-outline" title="Delete Account" destructive onPress={remove} last /> : null}
    </ListGroup>
  );
}

/** DEMO ONLY tools — hidden when DEMO_MODE is off */
export function DemoToolsGroup() {
  const role = useProfile().role;
  const { switchTo } = useDemoSwitch();
  const qc = useQueryClient();
  if (!config.DEMO_MODE) return null;
  const reset = async () => {
    if (!(await confirm({ title: 'Reset demo data?', message: 'All bookings, uploads and changes made in demo mode will be erased.', confirmLabel: 'Reset', destructive: true }))) return;
    await localDb.reset();
    qc.clear();
    await switchTo(role);
    toast.success('Demo data reset');
  };
  return (
    <View style={{ gap: 8 }}>
      <MockBadge label="DEMO MODE" />
      <ListGroup>
        <ListItem
          icon="swap-horizontal"
          title={role === 'customer' ? 'Switch to demo Rental Partner' : 'Switch to demo Customer'}
          subtitle="Play both sides of a booking on one phone"
          onPress={() => switchTo(role === 'customer' ? 'partner' : 'customer')}
        />
        <ListItem icon="refresh-circle-outline" title="Reset demo data" subtitle="Restore the seeded bikes and bookings" onPress={reset} last />
      </ListGroup>
    </View>
  );
}
