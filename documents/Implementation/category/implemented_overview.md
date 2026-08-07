# Category Module — Implemented Overview & Architecture

## Overview
The **Category Module** is a core catalog management component in mediShop. It provides full CRUD operations, hierarchical tree structuring (parent-child category relationships), homepage featured toggles, Redis caching, and slug generation for DGDA medicine classification.

## Key Features
- **Hierarchical Category Tree (`/categories/tree`)**: Supports parent-child category relationships (e.g. `Prescription Medicines` -> `Antibiotics`).
- **Slug Auto-generation**: Generates SEO-friendly URL slugs (e.g. `prescription-medicines`) from category name.
- **Featured Toggle (`/categories/:id/toggle-feature`)**: Quick toggle for homepage featured categories.
- **Role-Based Access Control**:
  - `GET /categories`, `/categories/tree`, `/categories/featured`: Public endpoints.
  - `POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id`: Protected (`Admin` role required).

## Backend Files & Architecture
- **Model**: `backend/src/modules/category/category.model.ts`
- **Repository**: `backend/src/modules/category/category.repository.ts`
- **Service**: `backend/src/modules/category/category.service.ts`
- **Controller**: `backend/src/modules/category/category.controller.ts`
- **Routes**: `backend/src/modules/category/category.route.ts`
- **Validations**: `backend/src/modules/category/category.validation.ts`
