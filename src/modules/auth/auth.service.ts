import { config } from '../../config/env';
import { HTTP_STATUS } from '../../config/constants';
import { AppError } from '../../utils/AppError';
import { verifyJwt } from '../../utils/jwt';
import { AUTH_COOKIE_NAME, OTP_MAX_ATTEMPTS } from './auth.constants';
import { authRepository } from './auth.repository';
import {
  AuthUser,
  CheckIdentifierResult,
  CompleteRegistrationInput,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  VerifyOtpInput,
  VerifyResetOtpInput,
  ChangePasswordInput,
} from './auth.types';
import { userService } from '../user/user.service';
import {
  comparePassword,
  compareSha256Hash,
  createAccessToken,
  createRefreshToken,
  generateSessionId,
  generateOtp,
  getIdentifierType,
  getRefreshCookieOptions,
  hashPassword,
  isEmail,
  normalizeIdentifier,
  sendOtpNotification,
} from './auth.utils';
import { UserRole } from '../user/user.types';

export class AuthService {
  private async issueSession(user: { _id: { toString(): string }; role: UserRole }, isVerified = true) {
    const userId = user._id.toString();
    const sessionId = generateSessionId();
    const accessToken = createAccessToken(userId, user.role, sessionId);
    const refreshToken = createRefreshToken(userId, user.role, sessionId);

    await authRepository.storeRefreshSession(userId, sessionId, refreshToken);

    return { accessToken, refreshToken, sessionId };
  }

  async checkIdentifier(input: string): Promise<CheckIdentifierResult> {
    const identifier = normalizeIdentifier(input);
    const targetType = getIdentifierType(identifier);
    const existingUser = await userService.findByIdentifier(identifier);

    if (existingUser) {
      return {
        exists: true,
        action: 'LOGIN_PASSWORD',
        targetType,
        identifier,
      };
    }

    const otp = generateOtp();
    await authRepository.storeRegistrationOtp(identifier, otp);
    await sendOtpNotification({ identifier, otp, targetType });

    return {
      exists: false,
      action: 'VERIFY_OTP',
      targetType,
      identifier,
    };
  }

  async verifyRegistrationOtp({ identifier, otp }: VerifyOtpInput) {
    const normalizedIdentifier = normalizeIdentifier(identifier);
    const storedHash = await authRepository.getRegistrationOtpHash(normalizedIdentifier);

    if (!storedHash) {
      throw new AppError('OTP session expired. Please request a new code.', HTTP_STATUS.BAD_REQUEST, 'OTP_EXPIRED');
    }

    const isValidOtp = compareSha256Hash(otp, storedHash);
    if (!isValidOtp) {
      const attempts = await authRepository.incrementRegistrationAttempts(normalizedIdentifier);
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await authRepository.clearRegistrationOtp(normalizedIdentifier);
      }
      throw new AppError('Invalid OTP.', HTTP_STATUS.BAD_REQUEST, 'OTP_INVALID');
    }

    await authRepository.clearRegistrationOtp(normalizedIdentifier);
    const verificationToken = generateSessionId();
    await authRepository.storeRegistrationSession(verificationToken, normalizedIdentifier);
    return { verificationToken };
  }

  async completeRegistration(input: CompleteRegistrationInput) {
    const identifier = await authRepository.consumeRegistrationSession(input.verificationToken);
    if (!identifier) {
      throw new AppError(
        'Verification session expired. Please request a new OTP.',
        HTTP_STATUS.BAD_REQUEST,
        'VERIFICATION_TOKEN_EXPIRED'
      );
    }

    const existingUser = await userService.findByIdentifier(identifier);
    if (existingUser) {
      throw new AppError('User already exists.', HTTP_STATUS.CONFLICT, 'USER_ALREADY_EXISTS');
    }

    const payload = isEmail(identifier)
      ? { name: input.name, email: identifier, password: await hashPassword(input.password) }
      : { name: input.name, phone: identifier, password: await hashPassword(input.password) };

    const createdUser = await userService.createCustomer(payload);
    const session = await this.issueSession(createdUser);
    await userService.markLastLogin(createdUser._id.toString());

    return {
      user: userService.toPublicUser(createdUser),
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };
  }

  async login(input: LoginInput) {
    const identifier = normalizeIdentifier(input.identifier);
    const user = await userService.findByIdentifier(identifier, true);

    if (!user || !user.password || !user.isVerified) {
      throw new AppError('Invalid credentials.', HTTP_STATUS.UNAUTHORIZED, 'INVALID_CREDENTIALS');
    }

    if (user.status === 'blocked') {
      throw new AppError(
        'Your account has been blocked by an administrator. Please contact support.',
        HTTP_STATUS.FORBIDDEN,
        'ACCOUNT_BLOCKED'
      );
    }

    const isPasswordValid = await comparePassword(input.password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials.', HTTP_STATUS.UNAUTHORIZED, 'INVALID_CREDENTIALS');
    }

    const session = await this.issueSession(user as any);
    await userService.markLastLogin(user._id.toString());

    return {
      user: userService.toPublicUser(user),
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    const decoded = verifyJwt<AuthUser>(refreshToken, config.JWT_REFRESH_SECRET);
    const { id: userId, role, sessionId } = decoded;
    const storedHash = await authRepository.getRefreshSessionHash(userId, sessionId);

    if (!storedHash) {
      await authRepository.revokeAllRefreshSessions(userId);
      throw new AppError('Refresh token reuse detected.', HTTP_STATUS.UNAUTHORIZED, 'REFRESH_TOKEN_REUSED');
    }

    if (!compareSha256Hash(refreshToken, storedHash)) {
      await authRepository.revokeAllRefreshSessions(userId);
      throw new AppError('Refresh token reuse detected.', HTTP_STATUS.UNAUTHORIZED, 'REFRESH_TOKEN_REUSED');
    }

    const user = await userService.findById(userId);
    if (!user) {
      await authRepository.revokeAllRefreshSessions(userId);
      throw new AppError('User not found.', HTTP_STATUS.UNAUTHORIZED, 'INVALID_TOKEN');
    }

    if (user.status === 'blocked') {
      await authRepository.revokeAllRefreshSessions(userId);
      throw new AppError(
        'Your account has been blocked by an administrator. Please contact support.',
        HTTP_STATUS.FORBIDDEN,
        'ACCOUNT_BLOCKED'
      );
    }

    const accessToken = createAccessToken(userId, role, sessionId);
    const rotatedRefreshToken = createRefreshToken(userId, role, sessionId);
    await authRepository.rotateRefreshSession(userId, sessionId, rotatedRefreshToken);

    return {
      user: userService.toPublicUser(user),
      accessToken,
      refreshToken: rotatedRefreshToken,
    };
  }

  async logout(refreshToken: string) {
    const decoded = verifyJwt<AuthUser>(refreshToken, config.JWT_REFRESH_SECRET);
    await authRepository.deleteRefreshSession(decoded.id, decoded.sessionId);
    return { loggedOut: true };
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const identifier = normalizeIdentifier(input.identifier);
    const user = await userService.findByIdentifier(identifier);

    if (!user) {
      return { sent: true, targetType: getIdentifierType(identifier) };
    }

    const otp = generateOtp();
    await authRepository.storeResetOtp(identifier, otp);
    await sendOtpNotification({ identifier, otp, targetType: getIdentifierType(identifier) });

    return { sent: true, targetType: getIdentifierType(identifier) };
  }

  async verifyResetOtp({ identifier, otp }: VerifyResetOtpInput) {
    const normalizedIdentifier = normalizeIdentifier(identifier);
    const storedHash = await authRepository.getResetOtpHash(normalizedIdentifier);

    if (!storedHash) {
      throw new AppError('Reset OTP expired. Please request a new code.', HTTP_STATUS.BAD_REQUEST, 'OTP_EXPIRED');
    }

    const isValidOtp = compareSha256Hash(otp, storedHash);
    if (!isValidOtp) {
      const attempts = await authRepository.incrementResetAttempts(normalizedIdentifier);
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await authRepository.clearResetOtp(normalizedIdentifier);
      }
      throw new AppError('Invalid OTP.', HTTP_STATUS.BAD_REQUEST, 'OTP_INVALID');
    }

    await authRepository.clearResetOtp(normalizedIdentifier);
    const verificationToken = generateSessionId();
    await authRepository.storeResetSession(verificationToken, normalizedIdentifier);
    return { verificationToken };
  }

  async resetPassword(input: ResetPasswordInput) {
    const identifier = await authRepository.consumeResetSession(input.verificationToken);
    if (!identifier) {
      throw new AppError(
        'Reset session expired. Please request a new OTP.',
        HTTP_STATUS.BAD_REQUEST,
        'RESET_TOKEN_EXPIRED'
      );
    }

    const user = await userService.findByIdentifier(identifier, true);
    if (!user) {
      throw new AppError('User not found.', HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
    }

    const password = await hashPassword(input.password);
    await userService.updatePassword(user._id.toString(), password);
    await authRepository.revokeAllRefreshSessions(user._id.toString());

    return { reset: true };
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await userService.findById(userId, true);
    if (!user || !user.password) {
      throw new AppError('User not found.', HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
    }

    const isPasswordValid = await comparePassword(input.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid current password.', HTTP_STATUS.UNAUTHORIZED, 'INVALID_CREDENTIALS');
    }

    await authRepository.revokeAllRefreshSessions(userId);
    const hashedPassword = await hashPassword(input.newPassword);
    const updatedUser = await userService.updatePassword(userId, hashedPassword);

    if (!updatedUser) {
      throw new AppError('User not found.', HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
    }

    const session = await this.issueSession(updatedUser as any);

    return {
      user: userService.toPublicUser(updatedUser),
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };
  }

  async getMe(userId: string) {
    const user = await userService.findById(userId);
    if (!user) {
      throw new AppError('User not found.', HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
    }

    if (user.status === 'blocked') {
      throw new AppError(
        'Your account has been blocked by an administrator. Please contact support.',
        HTTP_STATUS.FORBIDDEN,
        'ACCOUNT_BLOCKED'
      );
    }

    return userService.toPublicUser(user);
  }

  getRefreshCookieOptions() {
    return getRefreshCookieOptions();
  }

  getRefreshCookieName() {
    return AUTH_COOKIE_NAME;
  }
}

export const authService = new AuthService();
