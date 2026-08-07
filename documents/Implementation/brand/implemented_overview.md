# Brand Module — Implemented Overview & Architecture

## Overview
The **Brand Module** handles pharmaceutical manufacturer profiles (e.g. `Square Pharmaceuticals`, `Beximco Pharma`, `Incepta`, `Renata`). It supports CRUD management, manufacturer logos, featured homepage highlights, and Redis caching.

## Key Features
- **Brand Directory (`/brands`)**: Complete listing of pharmaceutical manufacturers.
- **Featured Brands (`/brands/featured`)**: Highlight top pharma partners on the homepage.
- **Slug Auto-generation**: Automatic URL slug creation from manufacturer name.
- **Role-Based Access Control**:
  - `GET /brands`, `/brands/featured`: Public endpoints.
  - `POST /brands`, `PATCH /brands/:id`, `DELETE /brands/:id`: Protected (`Admin` role required).

## Backend Files & Architecture
- **Model**: `backend/src/modules/brand/brand.model.ts`
- **Repository**: `backend/src/modules/brand/brand.repository.ts`
- **Service**: `backend/src/modules/brand/brand.service.ts`
- **Controller**: `backend/src/modules/brand/brand.controller.ts`
- **Routes**: `backend/src/modules/brand/brand.route.ts`
- **Validations**: `backend/src/modules/brand/brand.validation.ts`
