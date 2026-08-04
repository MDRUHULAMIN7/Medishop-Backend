import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUserService = vi.hoisted(() => ({
  findByIdentifier: vi.fn(),
  findById: vi.fn(),
  createCustomer: vi.fn(),
  updatePassword: vi.fn(),
  markLastLogin: vi.fn(),
  toPublicUser: vi.fn(),
}));

const mockAuthRepository = vi.hoisted(() => ({
  hash: vi.fn(),
  storeRegistrationOtp: vi.fn(),
  getRegistrationOtpHash: vi.fn(),
  incrementRegistrationAttempts: vi.fn(),
  clearRegistrationOtp: vi.fn(),
  storeRegistrationSession: vi.fn(),
  consumeRegistrationSession: vi.fn(),
  storeRefreshSession: vi.fn(),
  getRefreshSessionHash: vi.fn(),
  rotateRefreshSession: vi.fn(),
  deleteRefreshSession: vi.fn(),
  revokeAllRefreshSessions: vi.fn(),
  storeResetOtp: vi.fn(),
  getResetOtpHash: vi.fn(),
  incrementResetAttempts: vi.fn(),
  clearResetOtp: vi.fn(),
  storeResetSession: vi.fn(),
  consumeResetSession: vi.fn(),
}));

vi.mock('../../src/modules/user/user.service', () => ({
  userService: mockUserService,
}));

vi.mock('../../src/modules/auth/auth.repository', () => ({
  authRepository: mockAuthRepository,
}));

import { authService } from '../../src/modules/auth/auth.service';

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts registration flow for a new identifier', async () => {
    mockUserService.findByIdentifier.mockResolvedValue(null);
    mockAuthRepository.storeRegistrationOtp.mockResolvedValue(undefined);
    mockAuthRepository.hash.mockImplementation((value: string) =>
      crypto.createHash('sha256').update(value).digest('hex')
    );

    const result = await authService.checkIdentifier('newuser@example.com');

    expect(result).toMatchObject({
      exists: false,
      action: 'VERIFY_OTP',
      targetType: 'email',
      identifier: 'newuser@example.com',
    });
    expect(mockAuthRepository.storeRegistrationOtp).toHaveBeenCalledTimes(1);
  });

  it('verifies registration otp and returns a verification token', async () => {
    const otpHash = crypto.createHash('sha256').update('123456').digest('hex');
    mockAuthRepository.getRegistrationOtpHash.mockResolvedValue(otpHash);
    mockAuthRepository.hash.mockImplementation((value: string) =>
      crypto.createHash('sha256').update(value).digest('hex')
    );
    mockAuthRepository.clearRegistrationOtp.mockResolvedValue(undefined);
    mockAuthRepository.incrementRegistrationAttempts.mockResolvedValue(1);
    mockAuthRepository.storeRegistrationSession.mockResolvedValue(undefined);

    const result = await authService.verifyRegistrationOtp({
      identifier: 'newuser@example.com',
      otp: '123456',
    });

    expect(result.verificationToken).toBeTruthy();
    expect(mockAuthRepository.clearRegistrationOtp).toHaveBeenCalledTimes(1);
    expect(mockAuthRepository.storeRegistrationSession).toHaveBeenCalledTimes(1);
  });

  it('logs in an existing verified user with a valid password', async () => {
    const hashedPassword = await bcrypt.hash('Password123', 12);
    const userDoc = {
      _id: { toString: () => 'user-1' },
      name: 'Test User',
      email: 'test@example.com',
      phone: undefined,
      role: 'customer',
      isVerified: true,
      password: hashedPassword,
      addresses: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUserService.findByIdentifier.mockResolvedValue(userDoc);
    mockAuthRepository.storeRefreshSession.mockResolvedValue(undefined);
    mockUserService.markLastLogin.mockResolvedValue(undefined);
    mockUserService.toPublicUser.mockReturnValue({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'customer',
      isVerified: true,
      addresses: [],
    });

    const result = await authService.login({
      identifier: 'test@example.com',
      password: 'Password123',
    });

    expect(result.user.id).toBe('user-1');
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(mockAuthRepository.storeRefreshSession).toHaveBeenCalledTimes(1);
  });
});
