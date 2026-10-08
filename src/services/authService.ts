import { db, getOrThrow } from '@/api/db';
import { DEMO_ACCOUNTS, DEMO_IDS } from '@/api/seed';
import { localDb } from '@/api/localDb';
import { config } from '@/constants/config';
import { appStorage, secureStorage } from '@/lib/kvStorage';
import { delay, sha256, uuid } from '@/lib/id';
import { getSupabase } from '@/lib/supabase';
import type { Profile, Role } from '@/types/models';
import { AppError } from '@/utils/errors';
import { otpService } from './otpService';

export interface CustomerSignUp {
  fullName: string;
  age: number;
  phone: string;
  email: string;
  password: string;
}

export interface PartnerSignUp {
  fullName: string;
  businessName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  password: string;
}

export interface AuthService {
  restore(): Promise<Profile | null>;
  signIn(identifier: string, password: string, expectedRole: Role): Promise<Profile>;
  signUpCustomer(input: CustomerSignUp): Promise<Profile>;
  signUpPartner(input: PartnerSignUp): Promise<Profile>;
  sendPhoneOtp(phone: string): Promise<{ devHint?: string }>;
  verifyPhone(userId: string, phone: string, code: string): Promise<Profile>;
  requestPasswordReset(identifier: string): Promise<{ devHint?: string }>;
  resetPassword(identifier: string, code: string, newPassword: string): Promise<void>;
  changePassword(userId: string, current: string, next: string): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(userId: string): Promise<void>;
  /** DEMO ONLY: jump into the seeded customer/partner account */
  demoSignIn(role: Role): Promise<Profile>;
}

export const isEmail = (v: string) => v.includes('@');
const normalizePhone = (v: string) => v.replace(/\D/g, '').slice(-10);

/* ------------------------------------------------------------------ */
/* DEMO / local implementation                                         */
/* ------------------------------------------------------------------ */

interface LocalCredential {
  userId: string;
  email: string;
  phone: string;
  passwordHash: string;
}

const CRED_KEY = 'payanam.credentials.v1';
const SESSION_KEY = 'payanam.session.v1';

async function loadCredentials(): Promise<LocalCredential[]> {
  const saved = await appStorage.getJSON<LocalCredential[]>(CRED_KEY);
  if (saved) return saved;
  const hash = await sha256(config.demo.password);
  const seeded: LocalCredential[] = [
    { ...DEMO_ACCOUNTS.customer, passwordHash: hash },
    { ...DEMO_ACCOUNTS.partner, passwordHash: hash },
  ];
  await appStorage.setJSON(CRED_KEY, seeded);
  return seeded;
}

const saveCredentials = (c: LocalCredential[]) => appStorage.setJSON(CRED_KEY, c);

async function assertUnique(email: string, phone: string) {
  const creds = await loadCredentials();
  if (creds.some((c) => c.email.toLowerCase() === email.toLowerCase())) {
    throw new AppError('An account with this email already exists.', 'EMAIL_TAKEN');
  }
  if (creds.some((c) => c.phone === phone)) {
    throw new AppError('An account with this phone number already exists.', 'PHONE_TAKEN');
  }
}

async function findCredential(identifier: string) {
  const creds = await loadCredentials();
  const id = identifier.trim().toLowerCase();
  return creds.find((c) => (isEmail(id) ? c.email.toLowerCase() === id : c.phone === normalizePhone(id)));
}

async function createLocalAccount(
  role: Role,
  base: { fullName: string; email: string; phone: string; password: string; age: number | null; avatarUrl: string | null },
): Promise<Profile> {
  const phone = normalizePhone(base.phone);
  await assertUnique(base.email, phone);
  const id = uuid();
  const profile = await db.insert('profiles', {
    id,
    role,
    fullName: base.fullName.trim(),
    email: base.email.trim().toLowerCase(),
    phone,
    age: base.age,
    avatarUrl: base.avatarUrl,
    phoneVerified: false,
    status: 'active',
  });
  const creds = await loadCredentials();
  creds.push({ userId: id, email: profile.email, phone, passwordHash: await sha256(base.password) });
  await saveCredentials(creds);
  await secureStorage.set(SESSION_KEY, id);
  return profile;
}

const localAuth: AuthService = {
  async restore() {
    const userId = await secureStorage.get(SESSION_KEY);
    if (!userId) return null;
    const profile = await db.get('profiles', userId);
    if (!profile) {
      await secureStorage.remove(SESSION_KEY);
      return null;
    }
    return profile;
  },

  async signIn(identifier, password, expectedRole) {
    await delay(400);
    const cred = await findCredential(identifier);
    if (!cred || cred.passwordHash !== (await sha256(password))) {
      throw new AppError('Incorrect email/phone or password.', 'INVALID_CREDENTIALS');
    }
    const profile = await getOrThrow('profiles', cred.userId);
    if (profile.role !== expectedRole) {
      throw new AppError(
        profile.role === 'partner'
          ? 'This account is registered as a Rental Partner. Go back and choose "Rental Partner".'
          : 'This account is registered as a Customer. Go back and choose "Customer".',
        'ROLE_MISMATCH',
      );
    }
    await secureStorage.set(SESSION_KEY, profile.id);
    return profile;
  },

  async signUpCustomer(input) {
    const profile = await createLocalAccount('customer', { ...input, age: input.age, avatarUrl: null });
    await db.insert('customer_profiles', { id: profile.id, verificationStatus: 'unverified', rating: 5, totalRentals: 0 });
    return profile;
  },

  async signUpPartner(input) {
    const profile = await createLocalAccount('partner', { ...input, age: null, avatarUrl: null });
    await db.insert('rental_partners', {
      id: profile.id,
      businessName: input.businessName.trim(),
      address: input.address.trim(),
      city: input.city.trim(),
      idDocumentUrl: null,
      idVerificationStatus: 'unverified',
      rating: 5,
      ratingCount: 0,
      payoutAccountName: null,
      payoutAccountMasked: null,
      payoutIfsc: null,
      payoutUpi: null,
    });
    return profile;
  },

  async sendPhoneOtp(phone) {
    return otpService.send(phone);
  },

  async verifyPhone(userId, phone, code) {
    const ok = await otpService.verify(phone, code);
    if (!ok) throw new AppError('That code is incorrect. Please check and try again.', 'OTP_INVALID');
    const creds = await loadCredentials();
    const cred = creds.find((c) => c.userId === userId);
    const normalized = normalizePhone(phone);
    if (cred && cred.phone !== normalized) {
      if (creds.some((c) => c.phone === normalized && c.userId !== userId)) {
        throw new AppError('This phone number is used by another account.', 'PHONE_TAKEN');
      }
      cred.phone = normalized;
      await saveCredentials(creds);
    }
    return db.update('profiles', userId, { phoneVerified: true, phone: normalized });
  },

  async requestPasswordReset(identifier) {
    const cred = await findCredential(identifier);
    if (!cred) throw new AppError('No account found with that email or phone.', 'NOT_FOUND');
    return otpService.send(cred.phone);
  },

  async resetPassword(identifier, code, newPassword) {
    const cred = await findCredential(identifier);
    if (!cred) throw new AppError('No account found with that email or phone.', 'NOT_FOUND');
    if (!(await otpService.verify(cred.phone, code))) throw new AppError('That code is incorrect.', 'OTP_INVALID');
    const creds = await loadCredentials();
    const target = creds.find((c) => c.userId === cred.userId)!;
    target.passwordHash = await sha256(newPassword);
    await saveCredentials(creds);
  },

  async changePassword(userId, current, next) {
    const creds = await loadCredentials();
    const cred = creds.find((c) => c.userId === userId);
    if (!cred || cred.passwordHash !== (await sha256(current))) {
      throw new AppError('Your current password is incorrect.', 'INVALID_CREDENTIALS');
    }
    cred.passwordHash = await sha256(next);
    await saveCredentials(creds);
  },

  async signOut() {
    await secureStorage.remove(SESSION_KEY);
  },

  async deleteAccount(userId) {
    const creds = await loadCredentials();
    await saveCredentials(creds.filter((c) => c.userId !== userId));
    await db.update('profiles', userId, { status: 'deletion_requested' });
    await secureStorage.remove(SESSION_KEY);
  },

  async demoSignIn(role) {
    const userId = role === 'customer' ? DEMO_IDS.customer : DEMO_IDS.partner;
    let profile = await db.get('profiles', userId);
    if (!profile) {
      await localDb.reset();
      profile = await getOrThrow('profiles', userId);
    }
    await secureStorage.set(SESSION_KEY, userId);
    return profile;
  },
};

/* ------------------------------------------------------------------ */
/* Supabase implementation                                             */
/* ------------------------------------------------------------------ */

async function profileForCurrentUser(): Promise<Profile | null> {
  const { data } = await getSupabase().auth.getUser();
  if (!data.user) return null;
  return db.get('profiles', data.user.id);
}

const supabaseAuth: AuthService = {
  restore: profileForCurrentUser,

  async signIn(identifier, password, expectedRole) {
    const sb = getSupabase();
    const creds = isEmail(identifier)
      ? { email: identifier.trim(), password }
      : { phone: `+91${normalizePhone(identifier)}`, password };
    const { error } = await sb.auth.signInWithPassword(creds);
    if (error) throw new AppError(error.message, 'INVALID_CREDENTIALS');
    const profile = await profileForCurrentUser();
    if (!profile) throw new AppError('Profile not found.', 'NOT_FOUND');
    if (profile.role !== expectedRole) {
      await sb.auth.signOut();
      throw new AppError(`This account is registered as a ${profile.role === 'partner' ? 'Rental Partner' : 'Customer'}.`, 'ROLE_MISMATCH');
    }
    return profile;
  },

  async signUpCustomer(input) {
    // Profile + customer_profiles rows are created by the `handle_new_user` trigger from metadata.
    const { error } = await getSupabase().auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: { data: { role: 'customer', full_name: input.fullName, phone: normalizePhone(input.phone), age: input.age } },
    });
    if (error) throw new AppError(error.message);
    const profile = await profileForCurrentUser();
    if (!profile) throw new AppError('Check your email to confirm your account, then log in.', 'CONFIRM_EMAIL');
    return profile;
  },

  async signUpPartner(input) {
    const { error } = await getSupabase().auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: {
          role: 'partner',
          full_name: input.fullName,
          phone: normalizePhone(input.phone),
          business_name: input.businessName,
          address: input.address,
          city: input.city,
        },
      },
    });
    if (error) throw new AppError(error.message);
    const profile = await profileForCurrentUser();
    if (!profile) throw new AppError('Check your email to confirm your account, then log in.', 'CONFIRM_EMAIL');
    return profile;
  },

  sendPhoneOtp: (phone) => otpService.send(phone),

  async verifyPhone(userId, phone, code) {
    if (!(await otpService.verify(phone, code))) throw new AppError('That code is incorrect.', 'OTP_INVALID');
    return db.update('profiles', userId, { phoneVerified: true, phone: normalizePhone(phone) });
  },

  async requestPasswordReset(identifier) {
    if (!isEmail(identifier)) throw new AppError('Enter your email address to reset your password.');
    const { error } = await getSupabase().auth.resetPasswordForEmail(identifier.trim());
    if (error) throw new AppError(error.message);
    return {};
  },

  async resetPassword(identifier, code, newPassword) {
    const sb = getSupabase();
    const { error } = await sb.auth.verifyOtp({ email: identifier.trim(), token: code, type: 'recovery' });
    if (error) throw new AppError(error.message, 'OTP_INVALID');
    const res = await sb.auth.updateUser({ password: newPassword });
    if (res.error) throw new AppError(res.error.message);
  },

  async changePassword(_userId, _current, next) {
    const { error } = await getSupabase().auth.updateUser({ password: next });
    if (error) throw new AppError(error.message);
  },

  async signOut() {
    await getSupabase().auth.signOut();
  },

  async deleteAccount(userId) {
    // Hard deletion of auth users needs the service-role key → handled by a server job
    // that processes profiles with status = 'deletion_requested'.
    await db.update('profiles', userId, { status: 'deletion_requested' });
    await getSupabase().auth.signOut();
  },

  async demoSignIn() {
    throw new AppError('Demo accounts are only available in DEMO MODE.');
  },
};

export const authService: AuthService = config.DEMO_MODE ? localAuth : supabaseAuth;
