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

## 5. Pagination, Sorting, Filtering

```
GET /api/v1/products?page=1&limit=20&sort=-createdAt&category=vitamins&minPrice=100&maxPrice=500&search=paracetamol
```

- `page` / `limit` — standard offset pagination, defaults `page=1`, `limit=20`, hard cap `limit<=100`.
- `sort` — comma-separated fields, `-` prefix for descending.
- Filters are module-specific query params validated against a Zod query schema per endpoint.

## 6. Core Endpoint Reference

### Auth
```
POST   /auth/register
POST   /auth/verify-otp
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

### Category / Brand
```
GET    /categories
POST   /categories            (admin)
PATCH  /categories/:id        (admin)
DELETE /categories/:id        (admin)
GET    /brands
POST   /brands                (admin)
```

### Product
```
GET    /products
GET    /products/:slug
POST   /products               (admin)
PATCH  /products/:id           (admin)
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