import { config } from '@/constants/config';
import { delay } from '@/lib/id';
import { getSupabase } from '@/lib/supabase';

/**
 * OTP provider abstraction.
 * MOCK: accepts config.demo.otpCode (123456). Nothing is sent over SMS.
 * SUPABASE: uses Supabase Auth phone verification (requires an SMS provider such as
 *           Twilio/MSG91 configured in the Supabase dashboard — never in the app).
 */
export interface OtpService {
  readonly provider: string;
  readonly isMock: boolean;
  send(phone: string): Promise<{ sentAt: number; devHint?: string }>;
  verify(phone: string, code: string): Promise<boolean>;
}

const mockOtpService: OtpService = {
  provider: 'mock',
  isMock: true,
  async send() {
    await delay(500);
    return { sentAt: Date.now(), devHint: config.demo.otpCode };
  },
  async verify(_phone, code) {
    await delay(700);
    return code === config.demo.otpCode;
  },
};

const toE164 = (phone: string) => (phone.startsWith('+') ? phone : `+91${phone}`);

const supabaseOtpService: OtpService = {
  provider: 'supabase',
  isMock: false,
  async send(phone) {
    const { error } = await getSupabase().auth.updateUser({ phone: toE164(phone) });
    if (error) throw new Error(error.message);
    return { sentAt: Date.now() };
  },
  async verify(phone, code) {
    const { error } = await getSupabase().auth.verifyOtp({ phone: toE164(phone), token: code, type: 'phone_change' });
    return !error;
  },
};

export const otpService: OtpService = config.providers.otp === 'mock' ? mockOtpService : supabaseOtpService;
