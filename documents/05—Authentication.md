# 05 — Authentication

Authentication is the most detailed module in this documentation because it is the foundation every other protected feature depends on. Once implemented, this flow does not change (see `design.md`).

## 1. Complete Unified Authentication Flow

The frontend presents a **Single Input Field** accepting either an **Email address** or a **Bangladesh Phone Number** (`01XXXXXXXXX` or `+8801XXXXXXXXX`).

```
User submits Identifier (Email or BD Phone)
    ↓
POST /api/v1/auth/check-identifier
    ↓
Server validates format (Zod: Email OR BD phone regex ^(\+88)?01[3-9]\d{8}$)
    ↓
Checks MongoDB for existing user
    ├── USER EXISTS
    │   ↓
    │   Returns { exists: true, action: "LOGIN_PASSWORD" }
    │   ↓
    │   User enters Password
    │   ↓
    │   POST /api/v1/auth/login ({ identifier, password })
    │   ↓
    │   Verify password hash → Issue Access Token + Refresh Cookie
    │
    └── USER DOES NOT EXIST
        ↓
        Returns { exists: false, action: "VERIFY_OTP" }
        ↓
        Server generates 6-digit OTP & stores in Redis (ttl: 5 min)
        ↓
        Sends OTP via Email (Nodemailer) or SMS (SMS Gateway / Mock logger)
        ↓
        User submits OTP → POST /api/v1/auth/verify-otp ({ identifier, otp })
        ↓
        On OTP success → Returns short-lived verificationToken (10 min TTL in Redis)
        ↓
        User sets Name & Password → POST /api/v1/auth/complete-registration ({ verificationToken, name, password })
        ↓
        Create user in MongoDB → Issue Access Token + Refresh Cookie
```

## 2. Check Identifier

**Endpoint:** `POST /api/v1/auth/check-identifier`

1. Validate format using Zod:
   - Email format OR Bangladesh phone regex: `^(\+88)?01[3-9]\d{8}$`.
   - Phone numbers are normalized internally to standard format (e.g. `+8801712345678`).
2. Query `users` collection in MongoDB by `email` or `phone`.
3. If user exists:
   - Returns `{ exists: true, action: "LOGIN_PASSWORD" }`.
4. If user does NOT exist:
   - Generate a 6-digit cryptographically random OTP.
   - Store hashed OTP in Redis: `otp:register:<normalized_identifier>` with TTL = 300 seconds (5 mins).
   - Send OTP via the Notification Service (see §4).
   - Returns `{ exists: false, action: "VERIFY_OTP", targetType: "email" | "phone" }`.

## 3. Registration via OTP & Password Setup

### Step 3.1: Verify OTP
**Endpoint:** `POST /api/v1/auth/verify-otp`
1. Request: `{ identifier, otp }`.
2. Look up `otp:register:<identifier>` in Redis.
3. On max 3 wrong attempts, delete the key and require requesting a new OTP.
4. On success:
   - Delete the OTP Redis key.
   - Generate a cryptographically secure `verificationToken` (UUID/random hex).
   - Save `registration_session:<verificationToken>` = `<normalized_identifier>` in Redis with a 10-minute TTL.
   - Return `{ verificationToken }` to the client.

### Step 3.2: Complete Registration
**Endpoint:** `POST /api/v1/auth/complete-registration`
1. Request: `{ verificationToken, name, password }`.
2. Retrieve identifier from Redis using `registration_session:<verificationToken>`. If expired/invalid → error `VERIFICATION_TOKEN_EXPIRED`.
3. Validate password complexity (min 8 chars, 1 letter, 1 number).
4. Hash password with bcrypt (salt rounds = 12).
5. Save new user document in MongoDB (`role: customer`, `verified: true`).
6. Delete `registration_session:<verificationToken>` from Redis.
7. Issue Access Token + Refresh Token (in HTTP-only cookie).

## 4. SMS & Email Delivery Strategy (Handling Free / Paid OTPs)

Because sending real SMS messages via telco gateways in Bangladesh (GP, Banglalink, Robi, Teletalk) incurs a per-SMS charge, **no real SMS will go to a physical phone number on free backend hosting (Render/Vercel) without a paid SMS Gateway API key**. 

To handle both **Free Hosting / Demo Testing** and **Commercial Live Launch**, the backend implements a **Pluggable SMS Provider Adapter Pattern**:

| Mode / Environment | Provider Impl | Behavior on Free Hosting / Staging |
|---|---|---|
| Development / Staging / Free Demo | `MockSmsProvider` | Logs OTP to Render logs (`[SMS MOCK] To: +88017... Code: 482910`). No SMS cost. If `ENABLE_DEMO_OTP=true`, accepts static OTP `123456` for easy demo testing. |
| Automated Testing | `TestSmsProvider` | Stores OTP in memory for integration tests to verify. Zero cost. |
| Production / Paid Launch | `BdSmsGatewayProvider` | Connects to Greenweb BD / BulkSMS BD / Twilio API when `SMS_GATEWAY_API_KEY` is configured in `.env`. Sends real SMS to handset. |
| Email Identifier (Any Env) | `NodemailerEmailProvider` | Sends real OTP email via SMTP / Resend free tier (3,000 free emails/month). 100% Free! |

> [!NOTE]
> **Summary for Free Deployment**:
> - **Email OTP**: Real emails WILL arrive in user's inbox 100% for free (via Resend/Gmail SMTP).
> - **Phone OTP**: On free hosting, real SMS will NOT reach mobile handsets unless you buy BDT 200-500 SMS credits from Greenweb BD. Instead, the demo app allows testers to use the OTP logged in Render logs or a demo OTP (`123456`) when testing with phone numbers.

## 5. Password Login

**Endpoint:** `POST /api/v1/auth/login`

1. Validate input (`identifier`, `password`).
2. Normalize identifier and find user by `email` or `phone`.
3. If user not found or password does not match → respond with generic `INVALID_CREDENTIALS` (401).
4. On success, issue tokens and set HTTP-only Refresh Token cookie.

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
| `customer` | Default role for registered users; can browse, order, and track purchases |
| `pharmacist` | Can review/approve prescription uploads and prescription-gated orders |
| `sales_staff` | Can create POS sales, print invoices, and manage counter billing |
| `inventory_manager` | Can manage store inventory, stock adjustments, and stock ledger entries |
| `admin` | Full management access (products, orders, coupons, users, stores, POS, inventory) |

Role is stored on the user document and embedded in the access token payload. `customer` is the only public-registration role. `authorize([...])` middleware guards role-restricted routes, typically `admin` for core management and `sales_staff` / `inventory_manager` for POS and stock operations.

## 13. Security Rules Summary

- Never return password hashes in any API response (enforced by a Mongoose `toJSON` transform that strips the field).
- Rate-limit `/auth/login`, `/auth/register`, and OTP endpoints separately and more strictly than general API rate limits.
- OTP is always compared against a hash, never stored or compared in plain text.
- All auth error messages are generic enough to avoid revealing account existence.
- Every login/logout/refresh/failed-attempt event is written to the audit/security log (see `13-security.md`, §6 Audit Logging).
