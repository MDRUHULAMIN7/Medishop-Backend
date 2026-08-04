# 00 — Project Overview

## 1. Introduction

**mediShop** is an online pharmacy and digital healthcare platform for the Bangladesh market, inspired by MedEasy.health. It allows customers to search, order, and receive medicines and healthcare products at home, with support for prescription-based ordering, pharmacist verification, and doorstep delivery.

This document set defines the **backend blueprint** for mediShop. Phase 1 of the project delivered a frontend-only demo (Next.js, mocked data). This documentation defines the **production-grade backend** that the frontend will eventually connect to.

The backend is built as a **feature-based modular monolith** — a single deployable service, internally organized into independent, self-contained feature modules (auth, product, order, etc.), each following the same internal structure.

## 2. Goals

- Provide a secure, scalable REST API that powers the mediShop web and (future) mobile clients.
- Support prescription-gated medicine purchases with an admin/pharmacist verification step.
- Keep the codebase consistent, predictable, and easy to extend as new modules are added.
- Avoid architectural rewrites — the structure defined here should not need to change as the product grows; only new modules are added on top of it.
- Ship a documentation-first backend: this blueprint is written and agreed upon before implementation begins, and implementation follows it phase by phase.

## 3. Functional Requirements

- User registration & login (email/phone + OTP verification)
- Browse products by category, brand, and search
- Product detail with variants, stock, and prescription requirement flag
- Cart management (add, update, remove, sync)
- Prescription upload for prescription-required medicines
- Coupon / discount code application
- Checkout and order placement
- Order tracking with real-time status updates
- Order history and invoice
- Product reviews and ratings
- Notifications (order updates, offers)
- Admin dashboard: manage products, categories, brands, orders, coupons, prescriptions, users

## 4. Non-Functional Requirements

- **Security**: JWT-based auth, hashed passwords, rate limiting, input validation on every endpoint.
- **Performance**: Redis caching for hot-read data (product listings, categories); paginated APIs.
- **Reliability**: Centralized error handling; no unhandled promise rejections; structured logging.
- **Scalability**: Stateless API layer (horizontally scalable), external session/cache state in Redis.
- **Maintainability**: Strict TypeScript, consistent module structure, no business logic outside the service layer.
- **Observability**: Structured request/response logging, health-check endpoint, error tracking.

## 5. Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (LTS) |
| Language | TypeScript (strict mode) |
| Framework | Express.js |
| Database | MongoDB Atlas (via Mongoose) |
| Cache / Session store | Redis Cloud |
| Auth | JWT (access + refresh tokens), bcrypt |
| Validation | Zod |
| File storage | Cloudinary |
| Realtime | Socket.IO |
| Email/OTP delivery | SMTP (Nodemailer) or Resend |
| Logging | Pino |
| Testing | Vitest + Supertest |
| Deployment | Render (API), MongoDB Atlas, Redis Cloud |

## 6. Architecture Summary

```
Client
  ↓
Express Router
  ↓
Middleware (auth, validation, rate limit)
  ↓
Controller (HTTP layer only)
  ↓
Service (business logic)
  ↓
Repository (database access)
  ↓
MongoDB
```

Full detail in `02-architecture.md`.

## 7. Backend Principles

1. Documentation before code — this doc set is the source of truth.
2. One direction of dependency: Controller → Service → Repository. Never the reverse, never skipped.
3. Every module (auth, product, order, ...) has the same internal shape.
4. No module reaches into another module's repository directly — cross-module data access goes through that module's service.
5. Consistency beats cleverness: prefer the boring, standard pattern already used elsewhere in the codebase.