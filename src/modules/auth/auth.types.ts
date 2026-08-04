import { JwtPayload } from 'jsonwebtoken';
import { PublicUser, UserRole } from '../user/user.types';

export type IdentifierType = 'email' | 'phone';
export type AuthFlowAction = 'LOGIN_PASSWORD' | 'VERIFY_OTP';

export interface AuthUser extends JwtPayload {
  id: string;
  role: UserRole;
  sessionId: string;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedResponse {
  user: PublicUser;
  accessToken: string;
}

export interface CheckIdentifierResult {
  exists: boolean;
  action: AuthFlowAction;
  targetType: IdentifierType;
  identifier: string;
}

export interface VerifyOtpInput {
  identifier: string;
  otp: string;
}

export interface CompleteRegistrationInput {
  verificationToken: string;
  name: string;
  password: string;
}

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface ForgotPasswordInput {
  identifier: string;
}

export interface VerifyResetOtpInput {
  identifier: string;
  otp: string;
}

export interface ResetPasswordInput {
  verificationToken: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
