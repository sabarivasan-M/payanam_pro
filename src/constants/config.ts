/**
 * Runtime configuration. Only EXPO_PUBLIC_* values are bundled into the app —
 * they are public by definition. Secret keys must live on a server / Edge Function.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const demoFlag = (process.env.EXPO_PUBLIC_DEMO_MODE ?? 'true').toLowerCase() !== 'false';

const DEMO_MODE = demoFlag || !SUPABASE_URL || !SUPABASE_ANON_KEY;

export const config = {
  /** DEMO MODE: local database + every external integration mocked. */
  DEMO_MODE,
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY,

  /** Each integration can be switched individually once a real provider exists. */
  providers: {
    otp: (DEMO_MODE ? 'mock' : 'supabase') as 'mock' | 'supabase',
    documentVerification: 'mock' as 'mock',
    faceVerification: 'mock' as 'mock',
    bikeInspection: 'mock' as 'mock',
    map: 'mock' as 'mock',
    payment: 'mock' as 'mock',
    notifications: 'in_app' as 'in_app',
  },

  demo: {
    otpCode: '123456',
    password: 'payanam123',
    /** Simulated latency so loading states are visible in demo mode */
    latencyMs: 180,
    /** Mock tracker: km travelled per real minute of an active rental */
    kmPerMinute: 0.35,
  },

  otpResendSeconds: 30,
  supportPhone: '+914400000000',
  supportEmail: 'support@payanam.app',
  emergencyNumber: '112',
} as const;

export const isMock = (provider: string) => provider === 'mock';
