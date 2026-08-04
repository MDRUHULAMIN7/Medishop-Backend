export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ROLES = {
  CUSTOMER: 'customer',
  PHARMACIST: 'pharmacist',
  ADMIN: 'admin',
} as const;

export const OTP_TTL_SECONDS = 300; // 5 minutes
export const VERIFICATION_TOKEN_TTL_SECONDS = 600; // 10 minutes
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
