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
| `banners` | Hero slider promotional banners |
| `site_settings` | Dynamic branding, theme colors & contact info |

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
| isFeatured | Boolean | default false (highlights category on homepage) |
| isActive | Boolean | default true |

## 4. `brands`

| Field | Type | Notes |
|---|---|---|
| name | String | required, unique |
| slug | String | unique, indexed |
| logo | String | Cloudinary URL |
| isFeatured | Boolean | default false (highlights brand on homepage) |
| isActive | Boolean | default true |

## 5. `products`

| Field | Type | Notes |
|---|---|---|
| name | String | required (e.g. "Napa Extra 500mg") |
| slug | String | unique, indexed |
| genericName | String | e.g. "Paracetamol + Caffeine" (indexed) |
| dosageForm | Enum | `tablet` \| `syrup` \| `capsule` \| `saline` \| `injection` \| `ointment` \| `drop` \| `inhaler` \| `powder` \| `suppository` \| `other` |
| strength | String | e.g. "500mg + 65mg", "100ml" |
| unitType | Enum | `pcs` \| `strip` \| `box` \| `bottle` \| `tube` \| `gm` \| `ml` \| `pack` (selling unit) |
| packSize | String | e.g. "10 tablets per strip", "10 strips per box" |
| description | String | full details, usage & side effects |
| category | ObjectId → categories | indexed |
| brand | ObjectId → brands | indexed |
| price | Number | required (unit selling price) |
| discountPrice | Number | optional |
| stock | Number | required, ≥ 0 |
| expiryDate | Date | optional/required batch expiry date |
| batchNumber | String | optional batch tracking number |
| images | String[] | Cloudinary URLs |
| requiresPrescription | Boolean | default false |
| isFeatured | Boolean | default false |
| isActive | Boolean | default true |
| ratingAverage | Number | denormalized from reviews |
| ratingCount | Number | denormalized from reviews |

**Indexes:** text index on `name` + `genericName` + `description` (search), compound index on `category + isActive`, `isFeatured`.

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

## 12. `banners` (Hero Slider)

| Field | Type | Notes |
|---|---|---|
| title | String | optional banner header |
| subtitle | String | optional banner subhead |
| image | String | required Cloudinary URL |
| linkUrl | String | optional target URL / product / category link |
| displayOrder | Number | default 0 (sorting hero slider items) |
| isActive | Boolean | default true |

## 13. `site_settings` (Dynamic Branding & Colors)

| Field | Type | Notes |
|---|---|---|
| siteName | String | e.g. "mediShop" |
| logo | String | Cloudinary URL |
| favicon | String | Cloudinary URL |
| primaryColor | String | HEX / HSL primary theme color |
| secondaryColor | String | HEX / HSL secondary theme color |
| contactPhone | String | support hotline |
| contactEmail | String | support email |
| address | String | physical pharmacy address |
| socialLinks | Object | `{ facebook, instagram, whatsapp }` |

## 14. Relationships Summary

```
users ──< orders ──< orderItems (snapshot of products)
users ──< prescriptions
users ── carts (1:1)
users ──< reviews >── products
products >── category
products >── brand
orders >── coupon (optional)
orders >── prescription (optional, when required)
banners (standalone collection)
site_settings (singleton configuration record)
```

## 15. Validation Rules (enforced at schema + Zod layer)

- Prices, stock, and quantities are never negative.
- `orders.items` is immutable once an order moves past `pending` — corrections happen via new orders/refunds, not edits.
- A product with `requiresPrescription: true` cannot be checked out without an `approved` prescription attached to the order.