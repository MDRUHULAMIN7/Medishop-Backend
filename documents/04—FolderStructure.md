# 04 — Folder Structure

## 1. Top-Level Structure

```
medishop-backend/
├── src/
│   ├── config/
│   ├── modules/
│   ├── middlewares/
│   ├── database/
│   ├── redis/
│   ├── socket/
│   ├── utils/
│   ├── shared/
│   ├── types/
│   ├── docs/
│   └── server.ts
├── tests/
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── tsconfig.json
├── package.json
└── README.md
```

## 2. `config/`

Centralized, typed access to environment variables and app-wide constants.

```
config/
├── env.ts          # reads & validates process.env with Zod, exports typed config object
├── swagger.ts      # Swagger / OpenAPI specification & UI options configuration
└── constants.ts     # app-wide constants (pagination defaults, token lifetimes)
```

## 3. `modules/`

One folder per business feature. Every module has the same internal shape.

```
modules/
├── auth/
├── user/
├── category/
├── brand/
├── product/
├── cart/
├── coupon/
├── prescription/
├── review/
├── order/
├── notification/
├── banner/
├── site-setting/
└── admin/
```

Each module:

```
modules/product/
├── product.route.ts
├── product.controller.ts
├── product.service.ts
├── product.repository.ts
├── product.model.ts
├── product.validation.ts
├── product.types.ts
└── product.constants.ts
```

## 4. `middlewares/`

```
middlewares/
├── authenticate.ts       # verifies access token, attaches req.user
├── authorize.ts          # RBAC role check
├── validateRequest.ts    # runs a Zod schema against req.body/params/query
├── rateLimiter.ts
├── errorHandler.ts       # central error-to-response translator
└── requestLogger.ts
```

## 5. `database/`

```
database/
├── connection.ts     # Mongoose connect/disconnect + connection event logging
└── seed/              # optional seed scripts for local dev data
```

## 6. `redis/`

```
redis/
├── client.ts          # Redis connection instance
└── keys.ts             # centralized Redis key naming (otp:*, cache:product:*, etc.)
```

## 7. `socket/`

```
socket/
├── index.ts            # Socket.IO server init, attaches to HTTP server
├── events.ts            # event name constants
└── handlers/
    └── order.handler.ts
```

## 8. `utils/`

Small, reusable utility modules:
- `QueryBuilder.ts` — reusable Mongoose chainable helper (`search`, `filter`, `sort`, `paginate`, `fields`) for server-side queries.
- `asyncHandler.ts` — wraps async route handlers to automatically forward unhandled errors to `next(err)`.
- `AppError.ts` — custom operational error class hierarchy (`AppError`, `NotFoundError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`).
- `generateInvoice.ts` — PDFKit invoice stream builder for order receipts.
- `ApiResponse.ts` — standard response envelope builder (`{ success, message, data, meta }`).

## 9. `shared/`

Cross-module contracts that more than one module depends on: base repository class, shared enums (e.g., `OrderStatus`), shared Zod primitives (e.g., `mongoIdSchema`).

## 10. `types/`

Global TypeScript types/interfaces not owned by a single module (e.g., Express `Request` augmentation to add `req.user`).

## 11. `docs/`

This documentation set lives here in the actual repository, so it ships and versions alongside the code it describes.

## 12. `tests/`

Mirrors `src/modules` structure — one test folder per module, containing unit tests (service layer, mocked repository) and integration tests (Supertest against a test database).

## 13. Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Files | `kebab-case.type.ts` | `product.service.ts` |
| Classes | `PascalCase` | `AppError` |
| Functions/variables | `camelCase` | `getProductById` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_LOGIN_ATTEMPTS` |
| MongoDB collections | plural, lowercase | `products`, `orders` |
| Env variables | `UPPER_SNAKE_CASE` | `JWT_ACCESS_SECRET` |