# 09 — Redis Strategy

Redis is used for anything that is temporary, high-frequency, or needs to be shared across API instances without hitting MongoDB.

## 1. Use Cases

| Use Case | Key Pattern | TTL |
|---|---|---|
| OTP storage | `otp:register:<email>`, `otp:reset:<email>` | 5 min |
| OTP attempt counter | `otp:attempts:<email>` | 5 min |
| Refresh token store | `refresh:<userId>:<jti>` | 7 days |
| Password reset token | `reset-token:<userId>` | 10 min |
| Rate limiting | `ratelimit:<ip>:<route>` | window-based (e.g. 15 min) |
| Product listing cache | `cache:products:<queryHash>` | 5 min |
| Category tree cache | `cache:categories:tree` | 30 min |
| Coupon cache | `cache:coupon:<code>` | 10 min |
| Search suggestion cache | `cache:search:<term>` | 5 min |
| Inventory lock (checkout) | `lock:stock:<productId>` | a few seconds |

## 2. Caching Rules

- Only **hot-read, low-volatility** data is cached: product listings, category tree, brand list.
- Cache is **read-through**: on a miss, query MongoDB, populate the cache, return the result.
- Cache is invalidated (deleted, not updated) on the relevant write:
  - Product created/updated/deleted → delete all `cache:products:*` keys and the specific product's cache entry.
  - Category created/updated → delete `cache:categories:tree`.
- Never cache user-specific or sensitive data (cart, orders, prescriptions) — those always hit MongoDB directly.

## 3. OTP Storage Rules

- OTP is always stored **hashed** (bcrypt), never plain text, even though it's short-lived.
- TTL is authoritative — Redis auto-expires the key; there is no separate "is this OTP still valid" check needed beyond existence.
- Attempt counter increments on every failed verification; on reaching the limit the OTP key is deleted, forcing a fresh OTP request.

## 4. Refresh Token Store

- Enables server-side revocation — a refresh token that is valid by signature but missing from Redis is rejected.
- Logout deletes the specific `refresh:<userId>:<jti>` key.
- "Logout everywhere" / password change deletes all `refresh:<userId>:*` keys.

## 5. Rate Limiter

Implemented as a sliding-window counter in Redis (via `express-rate-limit` with a Redis store, or a custom `INCR` + `EXPIRE` pattern). Applied globally, with stricter limits layered on top for `/auth/*` routes.

## 6. Inventory Lock (Checkout)

A short-lived lock key prevents two simultaneous checkouts from both succeeding against the last unit of stock. The order service acquires the lock, re-validates stock inside the lock, decrements it, then releases the lock. This is a lightweight guard on top of MongoDB's own atomic `findOneAndUpdate` stock decrement — not a replacement for it.

## 7. Key Naming Convention

All keys are centralized in `redis/keys.ts` as functions, not hardcoded strings scattered across services:

```ts
export const redisKeys = {
  otpRegister: (email: string) => `otp:register:${email}`,
  refreshToken: (userId: string, jti: string) => `refresh:${userId}:${jti}`,
  productCache: (queryHash: string) => `cache:products:${queryHash}`,
};
```

This avoids typo-based cache bugs and makes it possible to grep for every place a given key pattern is used.