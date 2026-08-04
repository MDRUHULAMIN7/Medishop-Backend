# 08 — Module Structure

## 1. Universal Module Shape

Every module under `src/modules/<name>/` follows this exact shape — no exceptions, no module-specific deviation:

```
<name>.route.ts         → wires HTTP verbs + paths to controller functions, attaches middleware
<name>.controller.ts    → parses request, calls service, sends response
<name>.service.ts       → business logic
<name>.repository.ts    → database queries
<name>.model.ts         → Mongoose schema (if the module owns a collection)
<name>.validation.ts    → Zod schemas for body/params/query
<name>.types.ts         → TypeScript interfaces/types specific to this module
<name>.constants.ts     → module-local constants (error codes, enums)
```

A module that doesn't own a collection (rare — most do) simply omits `<name>.model.ts`.

## 2. Module Registry

| Module | Owns Collection | Depends On |
|---|---|---|
| `auth` | — (writes to `users`) | `user` |
| `user` | `users` | — |
| `category` | `categories` | — |
| `brand` | `brands` | — |
| `product` | `products` | `category`, `brand`, `review` (rating rollup) |
| `cart` | `carts` | `product` |
| `coupon` | `coupons` | — |
| `prescription` | `prescriptions` | `user` |
| `review` | `reviews` | `product`, `order` (verify purchase) |
| `order` | `orders` | `cart`, `coupon`, `product`, `prescription`, `notification` |
| `notification` | `notifications` | `socket` |
| `admin` | — (orchestrates other modules' services) | all of the above |

## 3. Example — `product` Module Contract

```
product.route.ts
  GET    /products            → productController.list
  GET    /products/:slug      → productController.getBySlug
  POST   /products            → authenticate, authorize(['admin']), validateRequest(createProductSchema), productController.create
  PATCH  /products/:id        → authenticate, authorize(['admin']), validateRequest(updateProductSchema), productController.update
  DELETE /products/:id        → authenticate, authorize(['admin']), productController.remove

product.service.ts
  listProducts(filters, pagination)
  getProductBySlug(slug)
  createProduct(payload)
  updateProduct(id, payload)
  deleteProduct(id)
  decrementStock(productId, quantity)     ← called by order.service during checkout

product.repository.ts
  findMany(filter, options)
  findBySlug(slug)
  findById(id)
  create(data)
  updateById(id, data)
  deleteById(id)
```

## 4. Cross-Module Communication Rule

When `order.service` needs product data, it calls `productService.getProductById()` — **never** `productRepository` directly, and never imports `product.model.ts`. This keeps each module's persistence details private and swappable without breaking callers.

## 5. Admin Module

The `admin` module does not own its own collection. It composes existing services to power dashboard-only operations: order status overrides, prescription review queue, coupon management, sales summary aggregation. This keeps admin-only logic out of the customer-facing service files while still reusing the same validated business rules.

## 6. Adding a New Module (Checklist)

1. Create `src/modules/<name>/` with the eight standard files (skip `.model.ts` if no own collection).
2. Register the route in `src/modules/index.ts` (or equivalent central route mounter).
3. Add module row to the table in this document.
4. Add a test folder under `tests/<name>/` mirroring the module.
5. No existing module's files are modified except the central route mounter — see `design.md` Rule 4.