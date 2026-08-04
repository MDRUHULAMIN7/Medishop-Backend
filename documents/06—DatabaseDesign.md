# 06 — Database Design (MongoDB)

## 1. Collections Overview

| Collection | Purpose |
|---|---|
| `users` | Customers, pharmacists, admins |
| `categories` | Medicine/product categories (hierarchical) |
| `brands` | Manufacturer/brand records |
| `products` | Medicines & healthcare products |
| `carts` | One active cart per user |
| `coupons` | Discount codes |
| `orders` | Placed orders |
| `reviews` | Product reviews & ratings |
| `prescriptions` | Uploaded prescription images + verification status |
| `notifications` | User notification feed |

## 2. `users`

| Field | Type | Notes |
|---|---|---|
| name | String | required |
| email | String | unique, sparse |
| phone | String | unique, sparse |
| password | String | bcrypt hash, `select: false` |
| role | Enum | `customer` \| `pharmacist` \| `admin`, default `customer` |
| isVerified | Boolean | default false |
| addresses | Address[] | embedded subdocuments |
| createdAt / updatedAt | Date | timestamps |

**Indexes:** unique on `email`, unique on `phone` (both sparse, since a user may register with only one).

## 3. `categories`

| Field | Type | Notes |
|---|---|---|
| name | String | required |
| slug | String | unique, indexed |
| parentCategory | ObjectId → categories | null for top-level |
| image | String | Cloudinary URL |
| isActive | Boolean | default true |

## 4. `brands`

| Field | Type | Notes |
|---|---|---|
| name | String | required, unique |
| slug | String | unique, indexed |
| logo | String | Cloudinary URL |

## 5. `products`

| Field | Type | Notes |
|---|---|---|
| name | String | required |
| slug | String | unique, indexed |
| description | String | |
| category | ObjectId → categories | indexed |
| brand | ObjectId → brands | indexed |
| price | Number | required |
| discountPrice | Number | optional |
| stock | Number | required, ≥ 0 |
| images | String[] | Cloudinary URLs |
| requiresPrescription | Boolean | default false |
| isActive | Boolean | default true |
| ratingAverage | Number | denormalized from reviews |
| ratingCount | Number | denormalized from reviews |

**Indexes:** text index on `name` + `description` (search), compound index on `category + isActive`.

## 6. `carts`

| Field | Type | Notes |
|---|---|---|
| user | ObjectId → users | unique (one cart per user) |
| items | CartItem[] | `{ product, quantity, priceAtAdd }` |
| updatedAt | Date | |

## 7. `coupons`

| Field | Type | Notes |
|---|---|---|
| code | String | unique, uppercase, indexed |
| type | Enum | `percentage` \| `flat` |
| value | Number | required |
| minOrderAmount | Number | optional |
| expiresAt | Date | required |
| usageLimit | Number | total redemptions allowed |
| usedCount | Number | default 0 |
| isActive | Boolean | default true |

## 8. `orders`

| Field | Type | Notes |
|---|---|---|
| user | ObjectId → users | indexed |
| items | OrderItem[] | snapshot of product, price, quantity at order time |
| shippingAddress | Address | embedded |
| coupon | ObjectId → coupons | optional |
| prescription | ObjectId → prescriptions | required if any item needs one |
| subtotal / discount / total | Number | |
| status | Enum | `pending` → `confirmed` → `packed` → `shipped` → `delivered` \| `cancelled` |
| paymentStatus | Enum | `unpaid` \| `paid` \| `refunded` |
| statusHistory | { status, at }[] | audit trail |

**Indexes:** compound on `user + createdAt` (order history queries), on `status` (admin dashboard filtering).

## 9. `reviews`

| Field | Type | Notes |
|---|---|---|
| product | ObjectId → products | indexed |
| user | ObjectId → users | |
| rating | Number | 1–5 |
| comment | String | |

**Constraint:** compound unique index on `product + user` — one review per user per product.

## 10. `prescriptions`

| Field | Type | Notes |
|---|---|---|
| user | ObjectId → users | indexed |
| images | String[] | Cloudinary URLs |
| status | Enum | `pending` \| `approved` \| `rejected` |
| reviewedBy | ObjectId → users | pharmacist/admin who reviewed |
| reviewNote | String | optional reason on rejection |

## 11. `notifications`

| Field | Type | Notes |
|---|---|---|
| user | ObjectId → users | indexed |
| type | Enum | `order_update` \| `promotion` \| `system` |
| title / message | String | |
| isRead | Boolean | default false |
| relatedOrder | ObjectId → orders | optional |

## 12. Relationships Summary

```
users ──< orders ──< orderItems (snapshot of products)
users ──< prescriptions
users ── carts (1:1)
users ──< reviews >── products
products >── category
products >── brand
orders >── coupon (optional)
orders >── prescription (optional, when required)
```

## 13. Validation Rules (enforced at schema + Zod layer)

- Prices, stock, and quantities are never negative.
- `orders.items` is immutable once an order moves past `pending` — corrections happen via new orders/refunds, not edits.
- A product with `requiresPrescription: true` cannot be checked out without an `approved` prescription attached to the order.