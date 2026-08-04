import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from './auth.constants';

const bdPhoneRegex = /^(\+88)?01[3-9]\d{8}$/;

const identifierSchema = z
  .string({ required_error: 'Identifier is required' })
  .trim()
  .min(3)
  .refine((value) => value.includes('@') || bdPhoneRegex.test(value), {
    message: 'Identifier must be a valid email address or Bangladesh phone number',
  });

const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(PASSWORD_MIN_LENGTH, { message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` })
  .refine((value) => /[A-Za-z]/.test(value), {
    message: 'Password must contain at least one letter',
  })
  .refine((value) => /\d/.test(value), {
    message: 'Password must contain at least one number',
  });

export const checkIdentifierSchema = z.object({
  identifier: identifierSchema,
});

export const verifyOtpSchema = z.object({
  identifier: identifierSchema,
  otp: z.string().trim().regex(/^\d{6}$/, { message: 'OTP must be a 6-digit code' }),
});

export const completeRegistrationSchema = z.object({
  verificationToken: z.string().uuid({ message: 'verificationToken must be a valid UUID' }),
  name: z.string().trim().min(2, { message: 'Name must be at least 2 characters' }),
  password: passwordSchema,
});

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, { message: 'Password is required' }),
});

export const forgotPasswordSchema = z.object({
  identifier: identifierSchema,
});

export const verifyResetOtpSchema = z.object({
  identifier: identifierSchema,
  otp: z.string().trim().regex(/^\d{6}$/, { message: 'OTP must be a 6-digit code' }),
});

export const resetPasswordSchema = z.object({
  verificationToken: z.string().uuid({ message: 'verificationToken must be a valid UUID' }),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Current password is required' }),
  newPassword: passwordSchema,
});
