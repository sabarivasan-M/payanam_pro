/**
 * PAYANAM design tokens.
 *
 * Palette idea: a deep "road at dawn" teal for trust + a marigold accent
 * (the flower of Tamil Nadu's festivals, and the colour of sunrise on a highway).
 */

export const palette = {
  teal900: '#06372F',
  teal800: '#0A4F44',
  teal700: '#0E6B5C',
  teal500: '#1F9580',
  teal300: '#7CCBBB',
  teal100: '#D8EFEA',
  teal50: '#EDF7F4',
  marigold600: '#D9861C',
  marigold500: '#F2A33A',
  marigold100: '#FDEBD0',
  marigold50: '#FEF6EA',
  ink900: '#0F1B24',
  ink700: '#2B3843',
  ink500: '#5B6670',
  ink400: '#8C96A0',
  ink300: '#B8C0C6',
  ink200: '#DDE2E5',
  ink100: '#EDF0F1',
  paper: '#F6F7F5',
  white: '#FFFFFF',
  green600: '#1E9E62',
  green100: '#DDF3E7',
  amber600: '#C97A00',
  amber100: '#FCEFD4',
  red600: '#D64545',
  red100: '#FBE2E2',
  blue600: '#2F6FDE',
  blue100: '#E0EAFB',
} as const;

export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  onPrimary: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  overlay: string;
  skeleton: string;
  mapLand: string;
  mapRoad: string;
  mapWater: string;
  mapPark: string;
}

export const lightColors: ThemeColors = {
  background: palette.paper,
  surface: palette.white,
  surfaceAlt: palette.ink100,
  surfaceRaised: palette.white,
  border: palette.ink200,
  borderStrong: palette.ink300,
  text: palette.ink900,
  textSecondary: palette.ink500,
  textMuted: palette.ink400,
  textInverse: palette.white,
  primary: palette.teal700,
  primaryPressed: palette.teal800,
  primarySoft: palette.teal50,
  onPrimary: palette.white,
  accent: palette.marigold500,
  accentSoft: palette.marigold50,
  onAccent: palette.ink900,
  success: palette.green600,
  successSoft: palette.green100,
  warning: palette.amber600,
  warningSoft: palette.amber100,
  danger: palette.red600,
  dangerSoft: palette.red100,
  info: palette.blue600,
  infoSoft: palette.blue100,
  overlay: 'rgba(15, 27, 36, 0.45)',
  skeleton: palette.ink100,
  mapLand: '#EEF1EC',
  mapRoad: '#FFFFFF',
  mapWater: '#CFE4EE',
  mapPark: '#D7EBD5',
};

export const darkColors: ThemeColors = {
  background: '#0B1215',
  surface: '#121B1F',
  surfaceAlt: '#18242A',
  surfaceRaised: '#1A262C',
  border: '#24323A',
  borderStrong: '#34454E',
  text: '#ECF1F0',
  textSecondary: '#A3B0B5',
  textMuted: '#74838A',
  textInverse: palette.ink900,
  primary: '#2FB59C',
  primaryPressed: '#26957F',
  primarySoft: '#11302B',
  onPrimary: '#04201B',
  accent: '#F5B556',
  accentSoft: '#33281A',
  onAccent: palette.ink900,
  success: '#3CC285',
  successSoft: '#123326',
  warning: '#F0A93A',
  warningSoft: '#33291A',
  danger: '#F06A6A',
  dangerSoft: '#3A1D1F',
  info: '#6C9CF0',
  infoSoft: '#1A2740',
  overlay: 'rgba(0, 0, 0, 0.6)',
  skeleton: '#1D2A30',
  mapLand: '#152025',
  mapRoad: '#22323A',
  mapWater: '#16303D',
  mapPark: '#17302A',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const typography = {
  display: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  h1: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  smallStrong: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 1.2 },
  mono: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 40, letterSpacing: 1 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const shadows = {
  sm: {
    shadowColor: '#0F1B24',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  md: {
    shadowColor: '#0F1B24',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F1B24',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
} as const;

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadows: typeof shadows;
  fonts: typeof fonts;
}

export const buildTheme = (scheme: ColorScheme): Theme => ({
  scheme,
  colors: scheme === 'dark' ? darkColors : lightColors,
  spacing,
  radius,
  typography,
  shadows,
  fonts,
});
