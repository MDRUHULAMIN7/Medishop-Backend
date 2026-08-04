# 13 — Security

## 1. Security Checklist

| Control | Implementation |
|---|---|
| Transport security | HTTPS enforced in production (via Render) |
| Security headers | `helmet` middleware |
| CORS | Explicit allow-list (`CLIENT_URL`), credentials enabled for the cookie-based refresh flow |
| Password storage | bcrypt, salt rounds 12 |
| Token security | Short-lived access tokens, rotated refresh tokens, `httpOnly`/`secure`/`sameSite` cookies |
| Rate limiting | Global limiter + stricter limiter on `/auth/*` |
| Input validation | Every request body/params/query validated with Zod before reaching a controller |
| NoSQL injection | Zod validation rejects non-primitive/unexpected shapes before they reach Mongoose queries; no raw user input is ever interpolated into a query object |
| XSS | API returns JSON only (no HTML rendering); `helmet` sets sensible defaults; input is stored as-is but the frontend is responsible for escaping on render |
| RBAC | `authorize(roles[])` middleware on every privileged route |
| Secrets management | All secrets in environment variables, never in source control |
| File upload safety | Multer file-type/size limits before Cloudinary upload; only image MIME types accepted for product/prescription images |

## 2. CORS Configuration

```ts
cors({
  origin: config.CLIENT_URL,
  credentials: true,
});
```

Only the known frontend origin is allowed, and only that origin can send/receive the refresh-token cookie.

## 3. Rate Limiting Tiers

| Route group | Window | Max Requests |
|---|---|---|
| General API | 15 min | 100 per IP |
| `/auth/login`, `/auth/register` | 15 min | 5 per IP |
| `/auth/verify-otp` | 5 min | 5 per IP |
| `/auth/forgot-password` | 15 min | 3 per IP |

## 4. NoSQL Injection Prevention

Because every input passes through a Zod schema that defines exact expected types (string, number, enum, ObjectId format) before it's used in any Mongoose query, an attacker cannot smuggle a query operator object (e.g. `{ "$gt": "" }`) in place of an expected string — Zod rejects it as a type mismatch before it ever reaches the database layer.

## 5. Data Exposure Rules

- `password` field: `select: false` on the schema, additionally stripped in a `toJSON` transform as a second layer of defense.
- Internal error details/stack traces are never sent to the client in `NODE_ENV=production`; only a generic message + `errorCode`.
- Admin-only fields (e.g., internal notes on a prescription rejection) are stripped from customer-facing responses at the service layer, not left to the frontend to hide.

## 6. Audit Logging

Security-relevant events are logged with enough context to investigate incidents, without logging sensitive payloads:

- Login success/failure (with reason code, not password)
- Password change / reset
- Refresh token reuse detection (possible theft signal)
- Admin actions on orders, prescriptions, and coupons (who, what, when)

## 7. Dependency Hygiene

- `npm audit` run in CI; high/critical vulnerabilities block merge.
- Dependencies kept current via periodic review — no pinned-forever outdated packages for security-relevant libraries (jsonwebtoken, bcrypt, mongoose).