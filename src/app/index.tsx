import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { LogoMark } from '@/components/brand/Logo';
import { Text } from '@/components/ui/Text';
import { useSession } from '@/stores/sessionStore';
import { palette } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

/** Splash / landing: logo rises in, the road draws itself, then we route. */
export default function Splash() {
  const t = useTheme();
  const status = useSession((s) => s.status);
  const profile = useSession((s) => s.profile);
  const scale = useRef(new Animated.Value(0.6)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const road = useRef(new Animated.Value(0)).current;
  const [animDone, setAnimDone] = useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 12 }),
        Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(road, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(() => setAnimDone(true));
  }, [scale, fade, road]);

  useEffect(() => {
    if (!animDone || status === 'loading') return;
    if (status === 'signedIn' && profile) {
      if (!profile.phoneVerified) router.replace('/otp');
      else router.replace(profile.role === 'partner' ? '/partner' : '/customer');
    } else {
      router.replace('/role');
    }
  }, [animDone, status, profile]);

  return (
    <View style={{ flex: 1, backgroundColor: palette.teal700, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ alignItems: 'center', opacity: fade, transform: [{ scale }] }}>
        <LogoMark size={104} inverted />
        <Text style={{ fontFamily: t.fonts.extrabold, fontSize: 34, letterSpacing: 6, color: '#fff', marginTop: 22 }}>PAYANAM</Text>
        <Text style={{ fontFamily: t.fonts.medium, fontSize: 15, color: palette.teal100, marginTop: 4, letterSpacing: 1 }}>பயணம் · Rent the road ahead</Text>
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          opacity: road,
          transform: [{ translateY: road.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
        }}
      >
        <Svg width="100%" height={180} viewBox="0 0 400 180" preserveAspectRatio="none">
          <Path d="M-10 180 C 120 120, 160 90, 210 60 C 250 36, 300 30, 410 24 L 410 180 Z" fill={palette.teal800} />
          <Path d="M90 180 C 170 130, 220 80, 300 50" stroke={palette.marigold500} strokeWidth={4} strokeDasharray="14 12" fill="none" strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <View style={{ position: 'absolute', bottom: 28 }}>
        <Text variant="caption" style={{ color: palette.teal100 }}>
          Verified bikes · Trusted partners · Tamil Nadu
        </Text>
      </View>
    </View>
  );
}
