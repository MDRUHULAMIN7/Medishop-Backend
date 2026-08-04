# 12 — Testing Strategy

## 1. Tooling

- **Vitest** — test runner (fast, native TypeScript/ESM support).
- **Supertest** — HTTP assertions against the Express app for integration tests.
- A dedicated **test MongoDB database** (separate URI, e.g. `medishop_test`) and a dedicated **test Redis DB index** — tests never touch development or production data.

## 2. Test Types

| Type | Scope | Example |
|---|---|---|
| Unit | A single service function, repository mocked | `orderService.calculateTotal()` given items + coupon returns correct total |
| Integration | Full request → response through the real Express app and a real (test) database | `POST /api/v1/auth/login` returns tokens for valid credentials |
| API/E2E-lite | A multi-step flow across endpoints | register → verify → login → add to cart → checkout |

## 3. Unit Testing the Service Layer

Repositories are mocked so service logic is tested in isolation:

```ts
vi.mock("../product.repository");

it("throws when stock is insufficient", async () => {
  productRepository.findById.mockResolvedValue({ stock: 1 });
  await expect(orderService.reserveStock("p1", 5)).rejects.toThrow("INSUFFICIENT_STOCK");
});
```

## 4. Integration Testing with Supertest

```ts
it("rejects login with wrong password", async () => {
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "test@medishop.com", password: "wrong" });

  expect(res.status).toBe(401);
  expect(res.body.success).toBe(false);
});
```

Database state is seeded before each test file (`beforeAll`) and cleaned between tests (`afterEach` clears collections used by that suite) to keep tests independent and order-agnostic.

## 5. What Must Be Covered (Minimum Bar)

- **Auth:** register, OTP verify (success + expired + wrong attempts), login (success + wrong password + unverified), refresh rotation, logout, forgot/reset password.
- **Product:** create/update/delete (admin-only enforcement), listing filters, search.
- **Cart:** add/update/remove, stock/price re-validation.
- **Checkout:** success path, insufficient stock, missing prescription, invalid coupon, idempotency key reuse.
- **Order:** status transitions (valid sequence enforced, invalid jumps rejected), customer can only see their own orders, admin can see all.
- **RBAC:** every admin-only route rejects a `customer`-role token with `403`.

## 6. Coverage Target

- Service layer: aim for high coverage on business-rule-heavy services (`order`, `auth`, `coupon`) — these are where bugs are most costly.
- Controllers and routes: covered indirectly via integration tests rather than isolated unit tests (there's little logic to unit-test in a controller by design).

## 7. CI Integration

`npm run test` runs in CI (see `14-deployment.md`) on every pull request; a failing test suite blocks merge.