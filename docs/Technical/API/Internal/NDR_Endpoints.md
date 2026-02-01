# NDR API Endpoints Documentation

## Overview

The NDR (Non-Delivery Report) API provides endpoints for detecting, classifying, and resolving delivery failures. All endpoints require authentication unless specified otherwise.

**Base URL:** `/api/v1/ndr`

---

## Authentication

All endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. List NDR Events

**GET** `/api/v1/ndr/events`

Retrieve a paginated list of NDR events for the authenticated company.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 20) |
| status | string | No | Filter by status: `detected`, `in_resolution`, `resolved`, `escalated`, `rto_triggered` |
| ndrType | string | No | Filter by type: `address_issue`, `customer_unavailable`, `refused`, `payment_issue`, `other` |
| startDate | string | No | Filter from date (ISO 8601) |
| endDate | string | No | Filter to date (ISO 8601) |

**Example Request:**

```bash
curl -X GET "https://api.Shipcrowd.com/api/v1/ndr/events?page=1&limit=20&status=in_resolution" \
  -H "Authorization: Bearer your_token_here"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "shipment": "65a1b2c3d4e5f6g7h8i9j0k2",
        "awb": "TRK123456789",
        "ndrReason": "Customer not available at address",
        "ndrReasonClassified": "Customer unavailable",
        "ndrType": "customer_unavailable",
        "detectedAt": "2026-01-01T10:30:00.000Z",
        "status": "in_resolution",
        "attemptNumber": 1,
        "resolutionDeadline": "2026-01-03T10:30:00.000Z",
        "resolutionActions": [
          {
            "action": "WhatsApp message sent to customer",
            "actionType": "send_whatsapp",
            "takenAt": "2026-01-01T10:35:00.000Z",
            "takenBy": "system",
            "result": "success"
          }
        ],
        "customerContacted": true,
        "order": "65a1b2c3d4e5f6g7h8i9j0k3",
        "company": "65a1b2c3d4e5f6g7h8i9j0k4"
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "pages": 3
    }
  }
}
```

---

### 2. Get NDR Event Details

**GET** `/api/v1/ndr/events/:id`

Retrieve detailed information about a specific NDR event.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | NDR event ID |

**Example Request:**

```bash
curl -X GET "https://api.Shipcrowd.com/api/v1/ndr/events/65a1b2c3d4e5f6g7h8i9j0k1" \
  -H "Authorization: Bearer your_token_here"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "shipment": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "trackingNumber": "TRK123456789",
      "currentStatus": "ndr",
      "deliveryDetails": {
        "recipientName": "John Doe",
        "recipientPhone": "+919876543210"
      }
    },
    "awb": "TRK123456789",
    "ndrReason": "Customer not available",
    "ndrType": "customer_unavailable",
    "status": "in_resolution",
    "resolutionActions": [],
    "customerContacted": true,
    "resolutionDeadline": "2026-01-03T10:30:00.000Z"
  }
}
```

---

### 3. Manually Resolve NDR

**POST** `/api/v1/ndr/events/:id/resolve`

Manually mark an NDR as resolved with a resolution note.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | NDR event ID |

**Request Body:**

```json
{
  "resolution": "Customer confirmed new delivery time",
  "notes": "Will reattempt delivery tomorrow 2-4 PM"
}
```

**Example Request:**

```bash
curl -X POST "https://api.Shipcrowd.com/api/v1/ndr/events/65a1b2c3d4e5f6g7h8i9j0k1/resolve" \
  -H "Authorization: Bearer your_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "resolution": "Customer confirmed new delivery time",
    "notes": "Will reattempt tomorrow"
  }'
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "NDR resolved successfully",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "status": "resolved",
    "resolvedAt": "2026-01-01T12:00:00.000Z"
  }
}
```

---

### 4. Escalate NDR

**POST** `/api/v1/ndr/events/:id/escalate`

Escalate an NDR to supervisor for manual intervention.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | NDR event ID |

**Request Body:**

```json
{
  "reason": "Customer unreachable after 3 attempts"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "NDR escalated successfully"
}
```

---

### 5. Trigger Workflow

**POST** `/api/v1/ndr/events/:id/trigger-workflow`

Manually trigger resolution workflow for an NDR event.

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Resolution workflow triggered"
}
```

---

### 6. Dashboard Summary

**GET** `/api/v1/ndr/dashboard`

Get NDR dashboard summary with key metrics.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "totalNDRs": 45,
    "activeNDRs": 12,
    "resolvedToday": 8,
    "ndrRate": 3.2,
    "avgResolutionTime": 18.5,
    "byType": {
      "address_issue": 18,
      "customer_unavailable": 15,
      "refused": 8,
      "payment_issue": 3,
      "other": 1
    },
    "byStatus": {
      "detected": 5,
      "in_resolution": 7,
      "resolved": 30,
      "escalated": 2,
      "rto_triggered": 1
    }
  }
}
```

---

### 7. Analytics - Overall Stats

**GET** `/api/v1/ndr/analytics/stats`

Get comprehensive NDR statistics for a date range.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | No | Start date (ISO 8601, default: 30 days ago) |
| endDate | string | No | End date (ISO 8601, default: now) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "totalNDRs": 145,
    "resolvedNDRs": 120,
    "resolutionRate": 82.75,
    "avgResolutionTimeHours": 22.5,
    "ndrRate": 3.1,
    "totalShipments": 4677
  }
}
```

---

### 8. Analytics - By Type

**GET** `/api/v1/ndr/analytics/by-type`

Get NDR breakdown by type.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "address_issue": {
      "count": 58,
      "percentage": 40,
      "resolutionRate": 85
    },
    "customer_unavailable": {
      "count": 52,
      "percentage": 36,
      "resolutionRate": 90
    },
    "refused": {
      "count": 20,
      "percentage": 14,
      "resolutionRate": 45
    }
  }
}
```

---

### 9. Analytics - Trends

**GET** `/api/v1/ndr/analytics/trends`

Get NDR trends over time.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| groupBy | string | No | Group by: `day`, `week`, `month` (default: `day`) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "date": "2026-01-01",
        "ndrCount": 12,
        "resolvedCount": 10,
        "rtoCount": 1
      },
      {
        "date": "2025-12-31",
        "ndrCount": 15,
        "resolvedCount": 12,
        "rtoCount": 2
      }
    ]
  }
}
```

---

### 10. Analytics - Resolution Rates

**GET** `/api/v1/ndr/analytics/resolution-rates`

Get resolution success rates by action type.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "call_customer": {
      "attempts": 45,
      "successful": 38,
      "successRate": 84.4
    },
    "send_whatsapp": {
      "attempts": 120,
      "successful": 95,
      "successRate": 79.2
    },
    "update_address": {
      "attempts": 35,
      "successful": 32,
      "successRate": 91.4
    }
  }
}
```

---

### 11. Analytics - Top Reasons

**GET** `/api/v1/ndr/analytics/top-reasons`

Get most common NDR reasons.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | number | No | Number of top reasons (default: 10) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "reason": "Customer not available",
      "count": 42,
      "percentage": 28.9
    },
    {
      "reason": "Wrong address",
      "count": 35,
      "percentage": 24.1
    }
  ]
}
```

---

### 12. List Workflows

**GET** `/api/v1/ndr/workflows`

Get configured NDR workflows.

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "workflow123",
      "ndrType": "address_issue",
      "isDefault": true,
      "actions": [
        {
          "sequence": 1,
          "actionType": "send_whatsapp",
          "delayMinutes": 0,
          "autoExecute": true
        },
        {
          "sequence": 2,
          "actionType": "update_address",
          "delayMinutes": 60,
          "autoExecute": true
        }
      ],
      "rtoTriggerConditions": {
        "maxAttempts": 3,
        "maxHours": 48,
        "autoTrigger": true
      }
    }
  ]
}
```

---

### 13. Seed Default Workflows

**POST** `/api/v1/ndr/workflows/seed` (Admin Only)

Seed default NDR workflows for all types.

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Default workflows seeded successfully",
  "data": {
    "created": 5
  }
}
```

---

## Error Responses

All endpoints may return the following error responses:

**401 Unauthorized:**

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

**404 Not Found:**

```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "NDR event not found"
}
```

**500 Internal Server Error:**

```json
{
  "success": false,
  "error": "INTERNAL_ERROR",
  "message": "An error occurred while processing your request"
}
```

---

## Rate Limiting

API requests are limited to **100 requests per minute** per API key. Exceeding this limit will result in a `429 Too Many Requests` response.
