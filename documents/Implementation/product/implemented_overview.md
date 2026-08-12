# Phase 4 — Products Implementation Overview

## 📌 Module Summary
The **Products Module** provides full product catalog management with text search, relevance scoring, category & brand filtering, multi-image upload via Cloudinary, and Redis query caching.

---

## 🗄️ Database Schema & Indexes

### Collection: `products`
| Field | Type | Description | Index |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Unique Product ID | Primary |
| `name` | String | Commercial product name | Text Index |
| `slug` | String | Unique URL slug | Unique Index |
| `genericName` | String | Active pharmaceutical ingredient (e.g. Paracetamol) | Text Index |
| `dosageForm` | String | Form (`tablet`, `syrup`, `capsule`, `saline`, `injection`, `ointment`, `drop`, `inhaler`, `powder`, `suppository`, `other`) | Single Index |
| `strength` | String | Dosage strength (e.g. `500mg`, `100ml`) | Optional |
| `unitType` | String | Selling unit (`pcs`, `strip`, `box`, `bottle`, `tube`, `gm`, `ml`, `pack`) | Single Index |
| `packSize` | String | Packaging description (e.g. `10 strips per box`) | Optional |
| `description` | String | Product description | Text Index |
| `tags` | Array<String> | Search keywords/tags | Text Index |
| `category` | ObjectId | Ref to `Category` | Compound Index |
| `brand` | ObjectId | Ref to `Brand` | Compound Index |
| `price` | Number | Regular price (BDT) | Compound Index |
| `discountPrice` | Number | Offer price (optional) | Single Index |
| `stock` | Number | Available inventory quantity | Single Index |
| `expiryDate` | Date | Batch expiration date | Single Index |
| `batchNumber` | String | Batch manufacturing number | Single Index |
| `requiresPrescription` | Boolean | Rx prescription flag | Single Index |
| `isFeatured` | Boolean | Highlight on homepage flag | Compound Index |
| `images` | Array<String> | Cloudinary / Base64 Image URLs | Array |

---

## ⚡ Redis Caching Policy
- **Public Product Query Cache**: Key `cache:products:list:<hash(query)>` (TTL: 1 hour / 3600 seconds)
- **Featured Products Cache**: Key `cache:products:featured` (TTL: 1 hour / 3600 seconds)
- **Search Suggestions Cache**: Key `cache:products:suggestions:<prefix>` (TTL: 24 hours)
- **Write Invalidation**: Any create, update, toggle-feature, or delete operation invalidates all product cache keys via `deleteRedisCacheKeys()`.

---

## 🛠️ API Reference

### 1. List & Search Products
- **Endpoint**: `GET /api/v1/products`
- **Access**: Public
- **Query Parameters**:
  - `search` (string): Text search keyword
  - `category` (string): Category Mongo ID
  - `brand` (string): Brand Mongo ID
  - `dosageForm` (string): Dosage form
  - `minPrice` (number): Minimum BDT price
  - `maxPrice` (number): Maximum BDT price
  - `sort` (string): `price-asc`, `price-desc`, `-createdAt`, `rating`
  - `page` (number, default: 1)
  - `limit` (number, default: 20)

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Products fetched successfully",
  "data": {
    "products": [
      {
        "id": "66b12a34f1e2c3456789abcd",
        "name": "Napa 500mg Tablet",
        "genericName": "Paracetamol",
        "slug": "napa-500mg-tablet",
        "dosageForm": "tablet",
        "strength": "500mg",
        "unitType": "strip",
        "price": 12,
        "stock": 450,
        "isFeatured": true,
        "images": ["https://res.cloudinary.com/.../napa.jpg"]
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

---

### 2. Auto-Complete Search Suggestions
- **Endpoint**: `GET /api/v1/products/search/suggestions?q=para&limit=8`
- **Access**: Public

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Search suggestions retrieved successfully",
  "data": [
    {
      "id": "66b12a34f1e2c3456789abcd",
      "name": "Napa 500mg Tablet",
      "genericName": "Paracetamol",
      "slug": "napa-500mg-tablet"
    }
  ]
}
```

---

### 3. Get Featured Products
- **Endpoint**: `GET /api/v1/products/featured?limit=10`
- **Access**: Public

---

### 4. Get Product Details by ID or Slug
- **Endpoint**: `GET /api/v1/products/:idOrSlug`
- **Access**: Public

---

### 5. Create Product (Admin Only)
- **Endpoint**: `POST /api/v1/products`
- **Access**: Admin (Bearer Token required)
- **Content-Type**: `multipart/form-data` or `application/json`

---

### 6. Update Product (Admin Only)
- **Endpoint**: `PATCH /api/v1/products/:id`
- **Access**: Admin (Bearer Token required)

---

### 7. Toggle Featured Status (Admin Only)
- **Endpoint**: `PATCH /api/v1/products/:id/toggle-feature`
- **Access**: Admin (Bearer Token required)

---

### 8. Delete Product (Admin Only)
- **Endpoint**: `DELETE /api/v1/products/:id`
- **Access**: Admin (Bearer Token required)
