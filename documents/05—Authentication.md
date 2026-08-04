# 05 — Authentication

Authentication is the most detailed module in this documentation because it is the foundation every other protected feature depends on. Once implemented, this flow does not change (see `design.md`).

## 1. Complete Authentication Flow

```
Register (name, email/phone, password)
    ↓
Send OTP to email/phone
    ↓
Store OTP in Redis (hashed, with TTL)
    ↓
User submits OTP
    ↓
Verify OTP against Redis
    ↓
Hash password with bcrypt
    ↓
Create user account (status: verified)
    ↓
Login (email/phone + password)
    ↓
Verify password hash
    ↓
Issue Access Token (short-lived) + Refresh Token (long-lived)
    ↓
Set Refresh Token as HTTP-only cookie
    ↓
Return Access Token in response body
    ↓
Client sends Access Token on every protected request (Authorization header)
    ↓
Access Token expires
    ↓
Client calls /auth/refresh (cookie sent automatically)
    ↓
Server verifies Refresh Token, rotates it, issues a new Access Token
    ↓
Logout → Refresh Token revoked (removed from Redis) + cookie cleared
```

## 2. Registration

**Endpoint:** `POST /api/v1/auth/register`

1. Validate input with Zod: name, email or phone, password (min length, complexity rule).
2. Check the user does not already exist and is not already pending verification.
3. Create a `pending` user record (or a Redis-only pending record) — the account is not fully active until OTP verification.
4. Generate a 6-digit OTP.
5. Store `otp:register:<email>` in Redis with a TTL (`OTP_EXPIRES_MINUTES`), value = bcrypt-hashed OTP.
6. Send the OTP via email/SMS.
7. Respond with success — do not leak whether the account previously existed (avoid user enumeration).

## 3. OTP Verification

**Endpoint:** `POST /api/v1/auth/verify-otp`

1. Look up `otp:register:<email>` in Redis.
2. If missing → `OTP_EXPIRED` error.
3. Compare submitted OTP against the stored hash.
4. On 3 consecutive wrong attempts, invalidate the OTP and require a new one (tracked via a Redis counter with the same TTL).
5. On success: mark the user `verified: true`, delete the Redis key.

## 4. Password Rules

- Minimum 8 characters, at least one letter and one number.
- Hashed with bcrypt, salt rounds = 12.
- Plain-text password is never logged, never stored, never returned in any response.

## 5. Login

**Endpoint:** `POST /api/v1/auth/login`

1. Validate input.
2. Find user by email/phone. If not found → generic `INVALID_CREDENTIALS` (never reveal which field was wrong).
3. Compare password with bcrypt.
4. If the account is not verified → prompt to verify (do not log in).
5. On success, issue tokens (see below).

## 6. Token Strategy

| Token | Lifetime | Storage | Purpose |
|---|---|---|---|
| Access Token | 15 minutes | Client memory / Authorization header | Authorizes API requests |
| Refresh Token | 7 days | HTTP-only, Secure, SameSite cookie | Obtains new access tokens |

- Access token payload: `{ userId, role }` — minimal, no sensitive data.
- Refresh token is also stored server-side (Redis, keyed by `refresh:<userId>:<jti>`) so it can be revoked.
- **Refresh Token Rotation**: every time `/auth/refresh` is called, the old refresh token is invalidated and a brand-new one is issued and stored. If an old, already-rotated refresh token is ever presented again, it's treated as a signal of token theft and **all** sessions for that user are revoked.

## 7. Cookie Strategy

Refresh token cookie flags:

```
httpOnly: true
secure: true          (production)
sameSite: "strict"
path: "/api/v1/auth"
maxAge: 7 days
```

`httpOnly` prevents JavaScript access (XSS mitigation). `secure` ensures it's only sent over HTTPS in production.

## 8. Protected Route Flow

```
Request arrives with Authorization: Bearer <accessToken>
    ↓
authenticate middleware verifies signature + expiry
    ↓
On success: attaches req.user = { id, role }
    ↓
On expired: responds 401 with a specific "TOKEN_EXPIRED" code
         (client knows to call /auth/refresh, then retry original request)
    ↓
authorize(role) middleware (if route is role-restricted) checks req.user.role
```

## 9. Logout

**Endpoint:** `POST /api/v1/auth/logout`

1. Delete the refresh token record from Redis.
2. Clear the refresh token cookie.
3. Access token is not server-tracked — it simply expires naturally within 15 minutes; sensitive actions should always be re-checked server-side regardless.

## 10. Forgot Password / Reset Password

```
POST /auth/forgot-password (email)
    ↓
Generate OTP, store in Redis (otp:reset:<email>)
    ↓
Send OTP via email
    ↓
POST /auth/verify-reset-otp
    ↓
On success, issue a short-lived (10 min) single-use "reset token" (stored in Redis)
    ↓
POST /auth/reset-password (resetToken, newPassword)
    ↓
Verify resetToken, hash newPassword, update user, delete resetToken
    ↓
Revoke all existing refresh tokens for that user (force re-login everywhere)
```

## 11. Change Password (authenticated)

**Endpoint:** `POST /api/v1/auth/change-password`

Requires current password confirmation before allowing the change. On success, all other active sessions (refresh tokens) are revoked; the current session gets a fresh token pair.

## 12. Role-Based Access Control (RBAC)

| Role | Description |
|---|---|
| `customer` | Default role for registered users |
| `pharmacist` | Can review/approve prescription uploads |
| `admin` | Full management access (products, orders, coupons, users) |

Role is stored on the user document and embedded in the access token payload. `authorize(["admin"])` middleware guards admin-only routes.

## 13. Security Rules Summary

- Never return password hashes in any API response (enforced by a Mongoose `toJSON` transform that strips the field).
- Rate-limit `/auth/login`, `/auth/register`, and OTP endpoints separately and more strictly than general API rate limits.
- OTP is always compared against a hash, never stored or compared in plain text.
- All auth error messages are generic enough to avoid revealing account existence.
- Every login/logout/refresh/failed-attempt event is written to the audit/security log (see `13-security.md`, §6 Audit Logging).