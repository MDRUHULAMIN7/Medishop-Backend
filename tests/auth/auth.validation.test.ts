import { describe, expect, it } from 'vitest';
import {
  checkIdentifierSchema,
  completeRegistrationSchema,
  loginSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from '../../src/modules/auth/auth.validation';

describe('auth validation schemas', () => {
  it('accepts valid email and phone identifiers', () => {
    expect(checkIdentifierSchema.parse({ identifier: 'test@example.com' })).toEqual({
      identifier: 'test@example.com',
    });

    expect(checkIdentifierSchema.parse({ identifier: '+8801712345678' })).toEqual({
      identifier: '+8801712345678',
    });
  });

  it('rejects invalid identifiers', () => {
    expect(() => checkIdentifierSchema.parse({ identifier: 'not-an-identifier' })).toThrow();
  });

  it('validates otp and password payloads', () => {
    expect(verifyOtpSchema.parse({ identifier: 'test@example.com', otp: '123456' })).toEqual({
      identifier: 'test@example.com',
      otp: '123456',
    });

    expect(
      completeRegistrationSchema.parse({
        verificationToken: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test User',
        password: 'Password123',
      })
    ).toMatchObject({
      name: 'Test User',
      password: 'Password123',
    });

    expect(
      loginSchema.parse({
        identifier: 'test@example.com',
        password: 'Password123',
      })
    ).toMatchObject({
      identifier: 'test@example.com',
    });

    expect(
      resetPasswordSchema.parse({
        verificationToken: '550e8400-e29b-41d4-a716-446655440000',
        password: 'Password123',
      })
    ).toMatchObject({
      password: 'Password123',
    });
  });
});
