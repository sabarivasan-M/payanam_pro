import { z } from 'zod';

const phone = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

const email = z.string().trim().toLowerCase().email('Enter a valid email address');

const password = z
  .string()
  .min(8, 'Use at least 8 characters')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Enter your email or phone number')
    .refine((v) => v.includes('@') ? z.string().email().safeParse(v).success : /^[6-9]\d{9}$/.test(v.replace(/\D/g, '').slice(-10)), 'Enter a valid email or 10-digit phone number'),
  password: z.string().min(1, 'Enter your password'),
});

export const customerSignUpSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name'),
    age: z.number({ error: 'Enter your age' }).int('Enter a whole number').min(18, 'You must be at least 18 to rent').max(80, 'Enter a valid age'),
    phone,
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const partnerSignUpSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name'),
    businessName: z.string().trim().min(2, 'Enter your business or rental name'),
    phone,
    email,
    address: z.string().trim().min(6, 'Enter your shop address'),
    city: z.string().trim().min(2, 'Enter your city'),
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const phoneSchema = z.object({ phone });

export const resetSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export type LoginForm = z.infer<typeof loginSchema>;
export type CustomerSignUpForm = z.infer<typeof customerSignUpSchema>;
export type PartnerSignUpForm = z.infer<typeof partnerSignUpSchema>;
