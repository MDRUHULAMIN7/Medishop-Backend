# design.md — The Backend Constitution

This document lists the rules that must **never** be broken as mediShop's backend grows. Everything else in this documentation set can be extended; these cannot be silently changed. Any change to a rule here requires a deliberate decision and an update to every affected chapter in the same pull request.

## Immutable Rules

1. **The authentication flow does not change.** Register → OTP → verify → login → access + refresh tokens → rotation → logout, as defined in `05-authentication.md`, is the permanent auth flow. New auth methods (e.g., social login) are additive, not replacements.

2. **The response structure is identical across every API.** Every endpoint returns the envelope defined in `07-api-design.md` — no endpoint invents its own shape.

3. **Controller → Service → Repository is mandatory, in that order, every time.** No layer is ever skipped, and no dependency ever points backward.

4. **Every new module follows the exact folder structure in `08-modules.md`.** No module gets a "special" structure because its feature feels different.

5. **Database naming conventions do not change.** Collections stay plural/lowercase; fields stay camelCase; this applies to every collection added in the future.

6. **Redis is only used for the categories defined in `09-redis.md`** — ephemeral state, caching, and rate limiting. It is never used as a system of record; MongoDB always is.

7. **Environment variable naming convention does not change.** `UPPER_SNAKE_CASE`, grouped and documented in `03-environment.md` — every new variable is added there before it's used in code.

8. **Business logic never lives in the controller or route layer.** It lives in services, full stop.

9. **Shared utilities are never duplicated.** If two modules need the same helper, it moves to `utils/` or `shared/` — it does not get copy-pasted a second time.

10. **Logging, validation, and error handling are consistent across every module.** A new module does not get to skip Zod validation, skip the central error handler, or log differently from the rest of the system.

## Why This Document Exists

Without a written constitution, a codebase drifts — each new contributor (or each new AI-assisted session) makes locally reasonable decisions that are globally inconsistent. This document exists so that six months and twelve modules from now, mediShop's backend still looks like it was written by one disciplined team, not stitched together from a dozen different opinions.