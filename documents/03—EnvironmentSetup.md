# 03 — Environment Setup

This chapter explains every environment variable the backend needs: what it's for, where to get it, and where it's used.

## 1. `.env` Template

```env
# App
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# Database
DATABASE_URL=

# Redis
REDIS_URL=

# JWT
JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES=7d

# Cookies
COOKIE_SECRET=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email / OTP
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
OTP_EXPIRES_MINUTES=5

# Rate Limiting
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_REQUESTS=100
```

## 2. MongoDB Atlas → `DATABASE_URL`

```
Create MongoDB Atlas account
  ↓
Create a free/shared cluster
  ↓
Database Access → create a DB user (username + password)
  ↓
Network Access → allow your IP (or 0.0.0.0/0 for early development)
  ↓
Connect → Drivers → copy the connection string
  ↓
Replace <username>/<password>/<dbname> in the string
  ↓
Paste into DATABASE_URL
```

## 3. Redis Cloud → `REDIS_URL`

```
Create Redis Cloud account
  ↓
Create a free database
  ↓
Copy the "Public endpoint" and password
  ↓
Format: redis://default:<password>@<host>:<port>
  ↓
Paste into REDIS_URL
```

## 4. Cloudinary → `CLOUDINARY_*`

```
Create Cloudinary account
  ↓
Dashboard shows: Cloud Name, API Key, API Secret
  ↓
Copy each into the matching env var
```

Used for: product images, category/brand images, prescription image uploads.

## 5. JWT Secrets

Generate strong random secrets — never reuse the same secret for access and refresh tokens.

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run this twice: once for `JWT_ACCESS_SECRET`, once for `JWT_REFRESH_SECRET`. Generate a third the same way for `COOKIE_SECRET`.

## 6. SMTP / Email (OTP delivery)

Options: Gmail SMTP (development only), or a transactional provider (Resend, SendGrid, Mailgun) for production — Gmail SMTP has sending limits and is not meant for production OTP volume.

```
Provider dashboard
  ↓
Create an API key / app password
  ↓
SMTP_HOST, SMTP_USER, SMTP_PASS
```

## 7. Variable Reference Table

| Variable | Used In | Why It's Needed |
|---|---|---|
| `DATABASE_URL` | `database/connection.ts` | MongoDB connection |
| `REDIS_URL` | `redis/client.ts` | OTP store, cache, rate limiter, refresh token store |
| `JWT_ACCESS_SECRET` | `modules/auth` | Sign/verify access tokens |
| `JWT_REFRESH_SECRET` | `modules/auth` | Sign/verify refresh tokens |
| `COOKIE_SECRET` | `middlewares/cookie` | Sign HTTP-only cookies |
| `CLOUDINARY_*` | `modules/product`, `modules/prescription` | Image upload |
| `SMTP_*` | `modules/auth` (OTP), `modules/notification` | Email delivery |
| `RATE_LIMIT_*` | `middlewares/rateLimiter` | Abuse prevention |

## 8. Environment Safety Rules

- `.env` is never committed — only `.env.example` (same keys, empty/dummy values) is committed.
- Production secrets are set directly on the hosting platform (Render dashboard), never copied into any file in the repo.
- `NODE_ENV=production` disables verbose error stack traces in API responses.