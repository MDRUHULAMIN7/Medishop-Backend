# 14 — Deployment

## 1. Hosting Overview

| Component | Service |
|---|---|
| API server | Render (Web Service) |
| Database | MongoDB Atlas (production cluster) |
| Cache | Redis Cloud (production database) |
| File storage | Cloudinary |

## 2. Pre-Deployment Checklist

- All Phase 0–14 exit criteria (see `11-development-roadmap.md`) are met.
- `npm run build` produces a clean `dist/` with no TypeScript errors.
- `npm run test` passes fully.
- `npm audit` shows no high/critical vulnerabilities.
- `.env.example` is up to date with every variable the app actually reads.

## 3. Render Setup

```
Create Render account
  ↓
New → Web Service → connect GitHub repo
  ↓
Build Command: npm install && npm run build
  ↓
Start Command: npm start
  ↓
Add environment variables (from 03-environment.md, production values)
  ↓
Set NODE_ENV=production
  ↓
Deploy
```

## 4. Production Environment Variables

Set directly in the Render dashboard (never committed):

- `DATABASE_URL` → production MongoDB Atlas cluster (separate from the dev cluster, or a separate database within it)
- `REDIS_URL` → production Redis Cloud database
- `CLOUDINARY_*` → same account, production folder/prefix convention
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / `COOKIE_SECRET` → freshly generated, different from development
- `CLIENT_URL` → the deployed frontend's production URL (for CORS)

## 5. MongoDB Atlas — Production Hardening

- Network Access restricted to Render's outbound IPs (not `0.0.0.0/0`).
- A dedicated production database user with only the permissions the app needs.
- Automated backups enabled.

## 6. CI/CD Flow

```
Push to main branch
  ↓
CI: install deps → lint → test → build
  ↓
On success: Render auto-deploys the new build
  ↓
Post-deploy: hit /health to confirm the new instance is up
```

## 7. Health Check

```
GET /health → { status: "ok", uptime, timestamp }
```

Used by Render (and any future load balancer/uptime monitor) to detect a failed deployment or crashed instance.

## 8. Rollback

Render retains previous successful deploys — a bad deploy is rolled back to the last known-good build from the Render dashboard while the issue is fixed on a branch.

## 9. Post-Launch Monitoring

- Structured logs (Pino) are the first place to check for production errors.
- `/health` is polled by an uptime monitor (e.g., UptimeRobot) so downtime is caught immediately rather than by user reports.