import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { MockBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { OtpInput } from '@/components/ui/OtpInput';
import { Screen } from '@/components/ui/Screen';
import { Banner } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { config } from '@/constants/config';
import { phoneSchema } from '@/features/auth/schemas';
import { authService } from '@/services/authService';
import { useSession } from '@/stores/sessionStore';
import { toast } from '@/stores/uiStore';
import { useTheme } from '@/theme/ThemeProvider';
import { errorMessage } from '@/utils/errors';

export default function OtpVerification() {
  const t = useTheme();
  const profile = useSession((s) => s.profile);
  const setProfile = useSession((s) => s.setProfile);
  const signOut = useSession((s) => s.signOut);
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sending, setSending] = useState(false);
  const [devHint, setDevHint] = useState<string | undefined>();
  const [editOpen, setEditOpen] = useState(false);
  const [draftPhone, setDraftPhone] = useState(phone);
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const sentOnce = useRef(false);

  const send = useCallback(
    async (target: string) => {
      setSending(true);
      setError(null);
      try {
        const res = await authService.sendPhoneOtp(target);
        setDevHint(res.devHint);
        setSeconds(config.otpResendSeconds);
      } catch (e) {
        setError(errorMessage(e, 'Could not send the code. Try again.'));
      } finally {
        setSending(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (profile && !sentOnce.current) {
      sentOnce.current = true;
      void send(profile.phone);
    }
  }, [profile, send]);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  const verify = useCallback(async () => {
    if (!profile || code.length !== 6) return;
    setVerifying(true);
    setError(null);
    try {
      const updated = await authService.verifyPhone(profile.id, phone, code);
      setProfile(updated);
      toast.success('Phone number verified');
      router.replace(updated.role === 'partner' ? '/partner' : '/customer');
    } catch (e) {
      setError(errorMessage(e));
      setCode('');
    } finally {
      setVerifying(false);
    }
  }, [profile, code, phone, setProfile]);

  useEffect(() => {
    if (code.length === 6) void verify();
  }, [code, verify]);

  if (!profile) return <Redirect href="/role" />;

  const savePhone = () => {
    const parsed = phoneSchema.safeParse({ phone: draftPhone });
    if (!parsed.success) {
      setPhoneError(parsed.error.issues[0]?.message);
      return;
    }
    setPhone(parsed.data.phone);
    setEditOpen(false);
    setCode('');
    void send(parsed.data.phone);
  };

  return (
    <Screen
      keyboard
      header={
        <Header
          onBack={async () => {
            await signOut();
            router.replace('/login');
          }}
        />
      }
    >
      <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="chatbubble-ellipses-outline" size={30} color={t.colors.primary} />
      </View>
      <Text variant="display" style={{ marginTop: 20 }}>
        Verify your phone number
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <Text color="textSecondary">We sent a 6-digit code to</Text>
        <Text variant="bodyStrong">+91 {phone}</Text>
      </View>
      <Pressable onPress={() => { setDraftPhone(phone); setPhoneError(undefined); setEditOpen(true); }} hitSlop={8} style={{ marginTop: 6 }}>
        <Text variant="smallStrong" color="primary">
          Change phone number
        </Text>
      </Pressable>

      <View style={{ marginTop: 28, gap: 16 }}>
        <OtpInput value={code} onChange={(v) => { setCode(v); setError(null); }} error={!!error} />
        {error ? <Banner tone="danger" title="Verification failed" message={error} /> : null}
        <Button title="Verify" size="lg" onPress={verify} loading={verifying} disabled={code.length !== 6} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          <Text color="textSecondary">Didn't get it?</Text>
          {seconds > 0 ? (
            <Text variant="bodyStrong" color="textMuted">
              Resend in 0:{String(seconds).padStart(2, '0')}
            </Text>
          ) : (
            <Pressable onPress={() => send(phone)} disabled={sending} hitSlop={8}>
              <Text variant="bodyStrong" color="primary">
                {sending ? 'Sending…' : 'Resend OTP'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {devHint ? (
        <View style={{ marginTop: 28, padding: 14, borderRadius: t.radius.lg, backgroundColor: t.colors.surfaceAlt, gap: 6 }}>
          <MockBadge label="MOCK OTP" />
          <Text variant="small" color="textSecondary">
            No SMS is sent in demo mode. Development OTP: <Text variant="smallStrong">{devHint}</Text>
          </Text>
        </View>
      ) : null}

      <BottomSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        title="Change phone number"
        subtitle="We'll send a new code to this number."
        footer={<Button title="Send code" onPress={savePhone} />}
      >
        <Input label="Phone number" prefix="+91" value={draftPhone} onChangeText={setDraftPhone} keyboardType="phone-pad" maxLength={10} error={phoneError} autoFocus />
      </BottomSheet>
    </Screen>
  );
}
