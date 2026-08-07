# Brand Module — API Integration Guide

## Base Path
`http://localhost:5000/api/v1/brands`

## Endpoints Summary

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/brands` | Public | List all manufacturer brands (`?includeInactive=true` for Admin) |
| `GET` | `/brands/featured` | Public | Get featured manufacturer brands |
| `GET` | `/brands/:idOrSlug` | Public | Get single brand by ID or Slug |
| `POST` | `/brands` | Admin | Create a new brand |
| `PATCH` | `/brands/:id` | Admin | Update brand details |
| `PATCH` | `/brands/:id/toggle-feature` | Admin | Toggle featured status |
| `DELETE` | `/brands/:id` | Admin | Delete a brand |

## Request & Response Payloads

### 1. Create Brand (`POST /brands`)
**Headers**: `Authorization: Bearer <Admin_Access_Token>`

```json
{
  "name": "Square Pharmaceuticals Ltd.",
  "slug": "square-pharmaceuticals",
  "logo": "https://images.unsplash.com/photo-1576602976047-174e57a47881",
  "isFeatured": true,
  "isActive": true
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Brand created successfully",
  "data": {
    "id": "64cb1a29f8f2b3e414c718fd",
    "name": "Square Pharmaceuticals Ltd.",
    "slug": "square-pharmaceuticals",
    "logo": "https://images.unsplash.com/photo-1576602976047-174e57a47881",
    "isFeatured": true,
    "isActive": true,
    "createdAt": "2026-08-07T12:00:00.000Z"
  }
}
```
