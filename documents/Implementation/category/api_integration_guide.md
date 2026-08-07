# Category Module — API Integration Guide

## Base Path
`http://localhost:5000/api/v1/categories`

## Endpoints Summary

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/categories` | Public | List all categories (`?includeInactive=true` for Admin) |
| `GET` | `/categories/tree` | Public | Get hierarchical tree structure |
| `GET` | `/categories/featured` | Public | Get featured categories for homepage |
| `GET` | `/categories/:idOrSlug` | Public | Get single category by ID or Slug |
| `POST` | `/categories` | Admin | Create a new category |
| `PATCH` | `/categories/:id` | Admin | Update category details |
| `PATCH` | `/categories/:id/toggle-feature` | Admin | Toggle featured status |
| `DELETE` | `/categories/:id` | Admin | Delete a category |

## Request & Response Payloads

### 1. Create Category (`POST /categories`)
**Headers**: `Authorization: Bearer <Admin_Access_Token>`

```json
{
  "name": "Antibiotics & Anti-infectives",
  "slug": "antibiotics-anti-infectives",
  "parentCategory": null,
  "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae",
  "isFeatured": true,
  "isActive": true
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "id": "64cb1a29f8f2b3e414c718fc",
    "name": "Antibiotics & Anti-infectives",
    "slug": "antibiotics-anti-infectives",
    "parentCategory": null,
    "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae",
    "isFeatured": true,
    "isActive": true,
    "createdAt": "2026-08-07T12:00:00.000Z"
  }
}
```
