# 07 — API Design

## 1. Base URL & Versioning

```
/api/v1/...
```

All routes are versioned from day one so future breaking changes ship as `/api/v2` without disrupting existing clients.

## 2. Standard Success Response

```json
{
  "success": true,
  "message": "Product fetched successfully",
  "data": { },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 134
  }
}
```

`meta` is included only on paginated list endpoints.

## 3. Standard Error Response

```json
{
  "success": false,
  "message": "Product not found",
  "errorCode": "PRODUCT_NOT_FOUND",
  "errors": null
}
```

For validation errors, `errors` contains a field-level breakdown:

```json
{
  "success": false,
  "message": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "errors": [
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

## 4. HTTP Status Code Convention

| Code | Meaning | Used For |
|---|---|---|
| 200 | OK | Successful GET/PATCH/DELETE |
| 201 | Created | Successful POST creating a resource |
| 400 | Bad Request | Validation errors |
| 401 | Unauthorized | Missing/invalid/expired token |
| 403 | Forbidden | Valid token, insufficient role |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource (e.g., email already registered) |
| 422 | Unprocessable Entity | Business rule violation (e.g., insufficient stock) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unhandled/unexpected errors |

## 5. Server-Side QueryBuilder (Search, Filter, Sort, Pagination & Fields)

All collection listing endpoints (`/products`, `/orders`, `/categories`, `/brands`, `/users`) use a reusable **`QueryBuilder`** class utility (`src/utils/QueryBuilder.ts`) wrapping Mongoose queries:

```
GET /api/v1/products?search=napa&category=665f1c...&dosageForm=tablet&sort=-price,createdAt&page=1&limit=20&fields=name,price,slug
```

- **`search(['name', 'genericName', 'description'])`**: Performs regex / text search over allowed fields.
- **`filter()`**: Converts filter query parameters (excluding `sort`, `page`, `limit`, `fields`, `search`) into Mongoose query filters, supporting comparison operators (`minPrice` → `gte`, `maxPrice` → `lte`).
- **`sort()`**: Accepts comma-separated fields (`sort=-price,createdAt`). Defaults to `-createdAt`.
- **`paginate()`**: Standard offset pagination with `page` (default `1`) and `limit` (default `20`, hard cap `100`).
- **`fields()`**: Selects specific response fields (`fields=name,price,slug` → `.select('name price slug')`).

## 6. Core Endpoint Reference

### Auth
```
POST   /auth/check-identifier
POST   /auth/verify-otp
POST   /auth/complete-registration
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
POST   /auth/forgot-password
POST   /auth/verify-reset-otp
POST   /auth/reset-password
POST   /auth/change-password
```

### User
```
GET    /users/me
PATCH  /users/me
POST   /users/me/addresses
PATCH  /users/me/addresses/:addressId
DELETE /users/me/addresses/:addressId
```

### Banner (Hero Slider)
```
GET    /banners               (public — active hero sliders)
POST   /banners               (admin — upload/create banner)
PATCH  /banners/:id           (admin — update slider text, order, status)
DELETE /banners/:id           (admin — remove banner)
```

### Site Settings & Branding
```
GET    /site-settings         (public — branding, logo, colors, contact info)
PATCH  /site-settings         (admin — update site name, theme colors, contact info)
```

### Category / Brand
```
GET    /categories            (public — tree/list)
GET    /categories/featured   (public — featured categories for homepage)
POST   /categories            (admin)
PATCH  /categories/:id        (admin — edit/feature toggle)
DELETE /categories/:id        (admin)
GET    /brands                (public — list)
GET    /brands/featured       (public — featured brands)
POST   /brands                (admin)
PATCH  /brands/:id            (admin — edit/feature toggle)
DELETE /brands/:id            (admin)
```

### Product
```
GET    /products               (public — filter by category, brand, genericName, dosageForm, unitType, isFeatured)
GET    /products/featured      (public — homepage featured products)
GET    /products/:slug         (public — detail with dosageForm, strength, unitType, packSize, expiryDate)
POST   /products               (admin — create medicine with dosageForm, strength, unitType, expiryDate)
PATCH  /products/:id           (admin — update product/stock/expiry)
DELETE /products/:id           (admin)
```

### Cart
```
GET    /cart
POST   /cart/items
PATCH  /cart/items/:productId
DELETE /cart/items/:productId
DELETE /cart
```

### Prescription
```
POST   /prescriptions                  (upload)
GET    /prescriptions/me
GET    /prescriptions                  (admin/pharmacist — queue)
PATCH  /prescriptions/:id/review       (admin/pharmacist — approve/reject)
```

### Coupon
```
POST   /coupons/validate
POST   /coupons                        (admin)
GET    /coupons                        (admin)
```

### Order
```
POST   /orders/checkout
GET    /orders/me
GET    /orders/:id
GET    /orders/:id/invoice              (download PDF invoice receipt)
PATCH  /orders/:id/cancel
GET    /orders                          (admin — all orders)
PATCH  /orders/:id/status               (admin — advance status)
```

### Review
```
POST   /products/:productId/reviews
GET    /products/:productId/reviews
DELETE /reviews/:id
```

### Notification
```
GET    /notifications
PATCH  /notifications/:id/read
PATCH  /notifications/read-all
```

### Courier
```
GET    /courier/providers
GET    /courier/zones
POST   /courier/rates
POST   /courier/shipments
GET    /courier/shipments
GET    /courier/shipments/:trackingNumber
POST   /courier/shipments/:trackingNumber/cancel
POST   /courier/pickups
```

### Stores / Inventory / POS
```
GET    /stores                         (admin — list stores / branches)
POST   /stores                         (admin — create store)
PATCH  /stores/:id                     (admin — update store)
GET    /inventory                      (admin, inventory_manager — shared stock overview)
GET    /inventory/:productId           (admin, inventory_manager — per-product stock lookup)
PATCH  /inventory/:productId/adjust    (admin, inventory_manager — stock correction)
GET    /inventory/ledger               (admin, inventory_manager — stock movement audit trail)
POST   /pos/sales                      (admin, sales_staff — create offline sale invoice)
GET    /pos/sales                      (admin, sales_staff — list POS sales)
GET    /pos/sales/:id                  (admin, sales_staff — sale details / receipt)
POST   /pos/sales/:id/refund           (admin, sales_staff — refund or void sale)
GET    /pos/sales/:id/invoice          (download printable POS invoice)
```

## 7. Example — Endpoint Contract

**`POST /api/v1/orders/checkout`**

Request:
```json
{
  "addressId": "665f1c2e...",
  "couponCode": "WELCOME10"
}
```

Success (201):
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "orderId": "665f9a...",
    "status": "pending",
    "total": 850
  }
}
```

Errors:
- `400 VALIDATION_ERROR` — missing/invalid addressId
- `422 PRESCRIPTION_REQUIRED` — cart contains a prescription item with no approved prescription
- `422 INSUFFICIENT_STOCK` — an item's stock changed since it was added to cart
- `422 COUPON_INVALID` — expired/exhausted/inapplicable coupon

## 8. Idempotency & Safety

- `POST /orders/checkout` accepts an optional `Idempotency-Key` header to safely handle client retries without creating duplicate orders.
- All `PATCH`/`DELETE` admin actions on orders are logged with the acting admin's ID and timestamp for audit purposes.

## 9. Interactive API Documentation (Swagger / OpenAPI 3.0)

mediShop backend uses **Swagger UI** powered by `swagger-jsdoc` and `swagger-ui-express` for interactive API documentation and manual endpoint testing.

### Access Routes
- **Swagger UI Dashboard**: `GET /api/v1/docs`
- **OpenAPI Spec (JSON)**: `GET /api/v1/docs.json`

### Configuration (`src/config/swagger.ts`)
- OpenAPI Spec Version: `3.0.0`
- Authentication Security Definition:
  ```json
  "securitySchemes": {
    "bearerAuth": {
      "type": "http",
      "scheme": "bearer",
      "bearerFormat": "JWT"
    }
  }
  ```
- JSDoc Scanner Target: `src/modules/**/*.route.ts` and `src/modules/**/*.validation.ts`

### Documentation Standard
Every endpoint defined in `src/modules/<feature>/<feature>.route.ts` must include a `@openapi` JSDoc block describing:
- **Tags**: Business module (e.g., `Auth`, `Products`, `Orders`)
- **Summary & Description**: Purpose of the route
- **Security**: `{ bearerAuth: [] }` for protected routes
- **Request Body & Parameters**: Query parameters and body schemas
- **Responses**: `200/201` standard success envelope and relevant `4xx/5xx` standard error envelopes
