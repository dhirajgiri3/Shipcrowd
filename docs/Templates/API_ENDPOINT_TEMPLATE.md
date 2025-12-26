# API Endpoint Documentation Template

## Endpoint Overview

| Property | Value |
|----------|-------|
| **Method** | `GET` / `POST` / `PUT` / `PATCH` / `DELETE` |
| **Path** | `/api/v1/...` |
| **Auth Required** | Yes / No |
| **Roles** | `admin`, `seller`, `staff` |
| **Rate Limit** | X requests per minute |

## Description

Brief description of what this endpoint does and its business purpose.

---

## Request

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token |
| `Content-Type` | Yes | `application/json` |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Resource ID |

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 20 | Items per page |
| `sort` | string | No | `-createdAt` | Sort field |

### Request Body

```json
{
  "field1": "string (required)",
  "field2": 123,
  "nested": {
    "subfield": "value"
  }
}
```

**Field Descriptions:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `field1` | string | Yes | min: 1, max: 255 | Description of field |
| `field2` | number | No | min: 0 | Description of field |

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "field1": "value",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### Success Response with Pagination

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 429 Too Many Requests

```json
{
  "success": false,
  "message": "Rate limit exceeded. Try again in X seconds."
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "An unexpected error occurred"
}
```

---

## Examples

### cURL

```bash
curl -X POST \
  'https://api.shipcrowd.com/api/v1/endpoint' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "field1": "value"
  }'
```

### JavaScript (fetch)

```javascript
const response = await fetch('https://api.shipcrowd.com/api/v1/endpoint', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    field1: 'value',
  }),
});

const data = await response.json();
```

---

## Related Endpoints

- [Related Endpoint 1](./related-endpoint-1.md)
- [Related Endpoint 2](./related-endpoint-2.md)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-01 | Initial version |

---

**Last Updated:** YYYY-MM-DD  
**Maintainer:** Development Team
