# 02 — Backend Architecture

This chapter is the heart of the backend. Every implementation decision downstream must respect the rules defined here.

## 1. Architectural Style

mediShop backend is a **Feature-Based Modular Monolith**:

- **Monolith** — one deployable service, one codebase, one database connection pool. No microservices at this stage; the product does not yet need that complexity.
- **Modular** — internally split into independent feature modules (`auth`, `user`, `product`, `cart`, `order`, ...). Each module owns its own routes, controller, service, repository, validation, and types.
- **Feature-based** — folders are organized by business feature, not by technical type. You will not find a single `controllers/` folder holding every controller; each module has its own `controller.ts`.

## 2. Request Lifecycle

```
Client Request
    ↓
Express Router          (matches URL + HTTP method to a module route)
    ↓
Middleware               (auth check, rate limit, request validation)
    ↓
Controller               (parses req, calls service, shapes res)
    ↓
Service                  (business logic, orchestration, rules)
    ↓
Repository               (database queries only)
    ↓
MongoDB
    ↓
Repository → Service → Controller → Response
```

## 3. Layer Responsibilities

### Controller
- Reads `req.body`, `req.params`, `req.query`.
- Calls exactly one service method.
- Shapes the HTTP response using the standard response format (`07-api-design.md`).
- **Never** contains business logic.
- **Never** queries the database directly.

### Service
- Contains all business logic and orchestration (e.g., "check stock, apply coupon, create order, decrement inventory, emit socket event").
- Calls one or more repositories.
- Framework-agnostic — a service function should not know it is being called from an HTTP request; it receives plain arguments and returns plain data or throws a typed error.
- Owns transactions when an operation spans multiple collections (e.g., checkout).

### Repository
- Only place where Mongoose models are queried.
- Exposes small, purpose-specific functions (`findById`, `findActiveByCategory`, `decrementStock`), not a generic "do anything" query builder.
- Returns raw documents/DTOs — no HTTP knowledge, no response shaping.

### Middleware
- Cross-cutting concerns that apply across modules: authentication, authorization (RBAC), request validation (Zod), rate limiting, error handling, request logging.

## 4. Dependency Rule

Dependencies only point downward:

```
Controller → Service → Repository → Database
```

- A controller must never call a repository directly.
- A repository must never call a service.
- A service may call other services (e.g., `orderService` calling `couponService.validate()`), but never another module's repository directly.

## 5. Error Flow

```
Repository throws (e.g. Mongoose CastError)
    ↓
Service catches, translates into a typed AppError (e.g. NotFoundError, ValidationError)
    ↓
Controller does not catch — it awaits and lets errors propagate via next(err)
    ↓
Central error-handling middleware formats the standard error response
```

Controllers are wrapped in an `asyncHandler` utility so thrown/rejected errors are automatically forwarded to Express's error middleware — no repeated `try/catch` in every controller.

## 6. Response Flow

Every successful response uses the same envelope (see `07-api-design.md`):

```json
{
  "success": true,
  "message": "Product fetched successfully",
  "data": { }
}
```

## 7. Design Principles Applied

- **Single Responsibility** — each layer has exactly one reason to change.
- **DRY** — shared logic (pagination, response formatting, error classes) lives in `utils/` and `shared/`, never copy-pasted per module.
- **KISS** — prefer the simplest structure that satisfies the requirement; no speculative abstraction for features that don't exist yet.
- **Open/Closed** — new modules are added without modifying existing ones; shared contracts (base repository, base error classes) are extended, not forked.

## 8. Folder-Level View

See `04-folder-structure.md` for the full directory tree. At a glance:

```
src/modules/<feature>/
  ├── <feature>.route.ts
  ├── <feature>.controller.ts
  ├── <feature>.service.ts
  ├── <feature>.repository.ts
  ├── <feature>.validation.ts
  ├── <feature>.types.ts
  └── <feature>.constants.ts
```