# 15 — Coding Standards

## 1. Hard Rules (Never Break These)

- ❌ Never use `any`. Use `unknown` + a type guard, or define a proper interface/type.
- ❌ Never query MongoDB from a controller. Only repositories touch Mongoose models.
- ❌ Never write business logic inside a route file or controller. That belongs in the service.
- ❌ Never skip the service layer — a controller always calls a service, even for a "simple" operation.
- ❌ Never return a raw database/driver error to the client. Translate it into an `AppError` with a stable `errorCode`.
- ❌ Never hardcode a secret, API key, or connection string in source code.
- ❌ Never duplicate a utility (pagination, response formatting, error class) — extend the shared one in `utils/` or `shared/`.

## 2. Required Practices

- ✅ Every request body/params/query is validated with a Zod schema before the controller logic runs.
- ✅ Every response uses the standard envelope from `07-api-design.md`.
- ✅ Every module follows the exact file structure from `08-modules.md`.
- ✅ Every new public function has a clear return type — no relying on inference for exported functions.
- ✅ Every async controller is wrapped in `asyncHandler` so errors reach the central error middleware.
- ✅ Every error thrown from a service is an instance of `AppError` (or a subclass: `NotFoundError`, `ValidationError`, `ForbiddenError`) carrying an HTTP status and an `errorCode`.
- ✅ Every collection has explicit indexes for its actual query patterns — not "add indexes later."
- ✅ TypeScript strict mode stays on; no loosening `tsconfig.json` to silence errors.

## 3. Naming & Style

- Follow the conventions table in `04-folder-structure.md` §13.
- One export per concern — avoid god-files that mix unrelated helpers.
- Prefer named exports over default exports (easier to grep, refactor-safe).
- Async/await only — no raw `.then()` chains, no mixing callback and promise styles.

## 4. Git Workflow

- Branch per feature/phase: `feature/auth-module`, `feature/checkout-flow`.
- Conventional Commits enforced by commitlint: `feat: add refresh token rotation`, `fix: correct coupon discount calculation`.
- Pull request required before merging to `main`; CI (lint + test + build) must pass.
- No direct commits to `main`.

## 5. Code Review Checklist

- Does this change respect the Controller → Service → Repository direction?
- Does it introduce any `any`?
- Are new endpoints validated, authenticated/authorized appropriately, documented in `07-api-design.md`, and annotated with Swagger `@openapi` comments in route files?
- Are new Redis keys added through `redis/keys.ts` rather than inline strings?
- Are tests included for new business logic?

## 6. Documentation Discipline

Any change to an API contract, a database schema, or the authentication flow must be reflected in the corresponding chapter of this documentation set as well as in the Swagger `@openapi` annotations in the route files within the same pull request — the docs and Swagger spec are not allowed to drift from the code.