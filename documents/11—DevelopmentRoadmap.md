# 11 — Development Roadmap

This is the execution plan. Each phase is built and tested before moving to the next — later phases depend on earlier ones being solid.

## Phase 0 — Project Setup
**Goal:** A running, empty, correctly configured server.
- Follow `01-setup.md` fully.
- Implement `config/env.ts` (Zod-validated env), `config/swagger.ts` (Swagger UI / OpenAPI spec setup), `database/connection.ts`, `server.ts` with a `/health` and `/api/v1/docs` endpoint.
- Set up `errorHandler` and `requestLogger` middleware (even before any real routes exist).
- **Exit criteria:** `npm run dev` starts the server, `/health` returns `200`, `/api/v1/docs` renders Swagger UI, connecting to MongoDB Atlas and Redis Cloud both succeed and are logged.

## Phase 1 — Authentication
**Goal:** Full auth flow working end-to-end with Swagger annotations.
- Build `user` module (model only, minimal service) and `auth` module per `05-authentication.md`.
- Add `@openapi` Swagger JSDoc annotations to all `/auth/*` routes.
- Implement `authenticate` and `authorize` middleware.
- **APIs:** all `/auth/*` endpoints from `07-api-design.md`.
- **Database:** `users` collection with indexes and a 5-role enum (`customer`, `pharmacist`, `sales_staff`, `inventory_manager`, `admin`).
- **Redis:** OTP keys, refresh token store.
- **RBAC:** public registration creates `customer` only; privileged roles are assigned by admin or seed scripts.
- **Exit criteria:** check-identifier → OTP verify/password login → complete registration → access protected test route → refresh → logout all work via Postman/Thunder Client/Swagger UI, covered by integration tests.

## Phase 2 — User Profile
**Goal:** Authenticated users can manage their profile and addresses.
- **APIs:** `/users/me` (GET/PATCH), address sub-routes.
- **Exit criteria:** a logged-in user can update profile fields and manage multiple addresses.

## Phase 3 — Categories & Brands
**Goal:** Admin-manageable taxonomy that products will attach to.
- **APIs:** `/categories`, `/brands` (public GET, admin-only write).
- **Database:** `categories`, `brands` collections.
- **Redis:** category tree cache.
- **Exit criteria:** admin can create/update/delete categories and brands; public listing endpoints return cached results.

## Phase 4 — Products
**Goal:** Full product catalog CRUD with images.
- **APIs:** `/products` full set.
- **Database:** `products` collection with text + compound indexes.
- **Redis:** product listing cache, invalidated on write.
- Cloudinary integration for product images.
- **Exit criteria:** admin can create a product with images; public can list/filter/search and view by slug.

## Phase 5 — Search
**Goal:** Fast, relevant product search.
- Extend `/products` listing with `search` query param using the MongoDB text index.
- **Redis:** search suggestion cache.
- **Exit criteria:** searching "paracetamol" returns relevant ranked results within acceptable latency.

## Phase 6 — Cart
**Goal:** Persistent per-user cart.
- **APIs:** `/cart/*`.
- **Database:** `carts` collection.
- **Exit criteria:** items added on one device are present when the same user logs in elsewhere; stock/price is re-validated on cart fetch.

## Phase 7 — Coupons
**Goal:** Discount codes applicable at checkout.
- **APIs:** `/coupons/*`.
- **Database:** `coupons` collection.
- **Redis:** coupon cache.
- **Exit criteria:** valid/expired/exhausted/inapplicable coupon cases are all correctly rejected or applied.

## Phase 8 — Prescription
**Goal:** Prescription upload and pharmacist review queue.
- **APIs:** `/prescriptions/*`.
- **Database:** `prescriptions` collection.
- Cloudinary integration for prescription images.
- **Socket:** `prescription:submitted` → `admins` room.
- **Exit criteria:** customer uploads a prescription, it appears in the admin/pharmacist queue in real time, and can be approved/rejected.

## Phase 9 — Checkout
**Goal:** Cart → validated → order created.
- **APIs:** `POST /orders/checkout`.
- Business rules: stock re-check + lock, prescription requirement check, coupon application, price snapshot.
- **Exit criteria:** checkout correctly blocks on missing prescription/insufficient stock/invalid coupon, and succeeds otherwise, clearing the cart.

## Phase 10 — Shared Inventory & POS
**Goal:** One backend, one stock source of truth, two sales channels.
- **APIs:** `/stores/*`, `/inventory/*`, `/pos/*`.
- **Database:** `stores`, `inventory_items`, `stock_ledger`, `pos_sales` collections.
- **Business rules:** online orders and offline POS sales both deduct from the same inventory ledger; invoice numbers are unique and printable; returns and voids restore stock through the ledger.
- **Exit criteria:** admin/staff can sell from POS, print invoice/receipt, adjust inventory, and stock stays synchronized between website orders and offline sales.

## Phase 11 — Orders
**Goal:** Order lifecycle management.
- **APIs:** `/orders/*` (customer + admin).
- **Socket:** `order:*` events to the owning user; `order:created` to admins.
- **Exit criteria:** admin can advance an order through its full status lifecycle; customer sees real-time updates and can view order history.

## Phase 12 — Notifications
**Goal:** Persisted notification feed backing the realtime events.
- **APIs:** `/notifications/*`.
- **Database:** `notifications` collection.
- **Exit criteria:** every order status change and prescription decision creates a notification the user can read/mark-read via the API, in addition to the live socket push.

## Phase 13 — Reviews
**Goal:** Verified-purchase product reviews.
- **APIs:** `/products/:productId/reviews`.
- **Database:** `reviews` collection; product rating rollup.
- **Exit criteria:** only users who purchased and received the product can review it; product `ratingAverage`/`ratingCount` update correctly.

## Phase 14 — Admin Dashboard APIs
**Goal:** Aggregated views for the admin panel.
- **APIs:** sales summary, order status breakdown, low-stock report — composed from existing services, exposed under `admin` module.
- **Exit criteria:** dashboard endpoints return correct aggregated numbers matching the underlying collections.

## Phase 15 — Testing Hardening
**Goal:** Confidence before deployment.
- Fill in test coverage gaps per `12-testing.md` across all modules.
- **Exit criteria:** critical paths (auth, checkout, order status transitions, POS sale flow) have both unit and integration test coverage; CI runs the full suite.

## Phase 16 — Deployment
**Goal:** Live production API.
- Follow `14-deployment.md`.
- **Exit criteria:** production API is reachable, connected to production MongoDB Atlas/Redis Cloud, `/health` passes, and the Next.js frontend is pointed at it.

## Roadmap Summary Diagram

```
Phase 0  Setup
   ↓
Phase 1  Auth
   ↓
Phase 2  User Profile
   ↓
Phase 3  Categories/Brands
   ↓
Phase 4  Products
   ↓
Phase 5  Search
   ↓
Phase 6  Cart
   ↓
Phase 7  Coupons
   ↓
Phase 8  Prescription
   ↓
Phase 9  Checkout
   ↓
Phase 10 Shared Inventory/POS
   ↓
Phase 11 Orders
   ↓
Phase 12 Notifications
   ↓
Phase 13 Reviews
   ↓
Phase 14 Admin Dashboard
   ↓
Phase 15 Testing Hardening
   ↓
Phase 16 Deployment
```
