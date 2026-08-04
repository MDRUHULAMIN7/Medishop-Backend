import crypto from 'crypto';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import { SignOptions } from 'jsonwebtoken';
import { config } from '../../config/env';
import { signJwt } from '../../utils/jwt';
import { UserRole } from '../user/user.types';

export const PASSWORD_HASH_SALT_ROUNDS = 12;
const DEFAULT_REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export const isEmail = (value: string) => value.includes('@');

export const normalizePhone = (value: string) => {
  const cleaned = value.trim().replace(/[\s-]/g, '');
  if (cleaned.startsWith('+880')) {
    return cleaned;
  }
  if (cleaned.startsWith('880')) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('01')) {
    return `+88${cleaned}`;
  }
  return cleaned;
};

export const normalizeIdentifier = (value: string) => {
  const trimmed = value.trim();
  return isEmail(trimmed) ? trimmed.toLowerCase() : normalizePhone(trimmed);
};

export const getIdentifierType = (identifier: string) => (isEmail(identifier) ? 'email' : 'phone');

export const generateOtp = () => {
  if (config.ENABLE_DEMO_OTP && config.NODE_ENV !== 'production') {
    return '123456';
  }

  return String(crypto.randomInt(100000, 1000000));
};

export const generateSessionId = () => crypto.randomUUID();

export const parseDurationToMs = (value: string) => {
  const match = value.trim().match(/^(\d+)(ms|s|m|h|d)$/i);
  if (!match) {
    return DEFAULT_REFRESH_COOKIE_MAX_AGE;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 'ms':
      return amount;
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return DEFAULT_REFRESH_COOKIE_MAX_AGE;
  }
};

export const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
  maxAge: parseDurationToMs(config.JWT_REFRESH_EXPIRES_IN),
});

export const createAccessToken = (userId: string, role: UserRole, sessionId: string) =>
  signJwt(
    { id: userId, role, sessionId },
    config.JWT_ACCESS_SECRET,
    config.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn']
  );

export const createRefreshToken = (userId: string, role: UserRole, sessionId: string) =>
  signJwt(
    { id: userId, role, sessionId },
    config.JWT_REFRESH_SECRET,
    config.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn']
  );

export const hashPassword = async (password: string) => bcrypt.hash(password, PASSWORD_HASH_SALT_ROUNDS);

export const comparePassword = async (plainPassword: string, hashedPassword: string) =>
  bcrypt.compare(plainPassword, hashedPassword);

export const hashSha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

export const compareSha256Hash = (rawValue: string, storedHash: string) => hashSha256(rawValue) === storedHash;

export interface SendOtpNotificationInput {
  identifier: string;
  otp: string;
  targetType: 'email' | 'phone';
}

export const sendOtpNotification = async ({ identifier, otp, targetType }: SendOtpNotificationInput) => {
  if (config.NODE_ENV !== 'production' && config.ENABLE_DEMO_OTP) {
    console.log(`[OTP DEMO] ${targetType.toUpperCase()} ${identifier} -> ${otp}`);
    return;
  }

  if (targetType === 'phone') {
    console.log(`[OTP SMS MOCK] ${identifier} -> ${otp}`);
    return;
  }

  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
    console.log(`[OTP EMAIL MOCK] ${identifier} -> ${otp}`);
    return;
  }

  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  });

  await transport.sendMail({
    from: config.SMTP_FROM,
    to: identifier,
    subject: 'mediShop verification code',
    text: `Your mediShop verification code is ${otp}. It expires in 5 minutes.`,
  });
};
