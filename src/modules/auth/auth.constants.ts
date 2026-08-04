export const AUTH_COOKIE_NAME = 'medishop_refresh_token';
export const AUTH_ACCESS_TOKEN_KIND = 'access';
export const AUTH_REFRESH_TOKEN_KIND = 'refresh';

export const AUTH_REDIS_KEYS = {
  registrationOtp: (identifier: string) => `otp:register:${identifier}`,
  registrationAttempts: (identifier: string) => `otp:register:attempts:${identifier}`,
  registrationSession: (token: string) => `registration_session:${token}`,
  resetOtp: (identifier: string) => `otp:reset:${identifier}`,
  resetAttempts: (identifier: string) => `otp:reset:attempts:${identifier}`,
  resetSession: (token: string) => `reset_session:${token}`,
  refreshSession: (userId: string, sessionId: string) => `refresh_session:${userId}:${sessionId}`,
  refreshSessions: (userId: string) => `refresh_sessions:${userId}`,
} as const;

export const AUTH_TTL = {
  registrationOtpSeconds: 300,
  registrationSessionSeconds: 600,
  resetOtpSeconds: 300,
  resetSessionSeconds: 600,
  refreshSessionSeconds: 7 * 24 * 60 * 60,
} as const;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MIN_LETTERS = 1;
export const PASSWORD_MIN_NUMBERS = 1;
export const OTP_LENGTH = 6;
export const OTP_MAX_ATTEMPTS = 3;
