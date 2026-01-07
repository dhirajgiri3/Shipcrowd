# Backend API Testing Report

**Date:** 2026-01-05
**Purpose:** Verify backend API endpoints and document exact request/response formats
**Base URL:** `http://localhost:5005/api/v1`

---

## 1. AUTHENTICATION ENDPOINTS

### 1.1 POST /auth/register

**Test Case:** Register new user with valid data

**Request:**
```bash
curl -X POST http://localhost:5005/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: frontend-request" \
  -d '{
    "name": "Test User",
    "email": "testuser'$(date +%s)'@example.com",
    "password": "TestPassword123!",
    "role": "seller"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email to verify your account.",
  "data": {
    "companyId": "507f1f77bcf86cd799439011"
  }
}
```

**Status:** [ ] PASS [ ] FAIL

---

### 1.2 POST /auth/login

**Test Case:** Login with registered user credentials

**Request:**
```bash
curl -X POST http://localhost:5005/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: frontend-request" \
  -c cookies.txt \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123!",
    "rememberMe": false
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Test User",
      "email": "testuser@example.com",
      "role": "seller",
      "companyId": "507f1f77bcf86cd799439012",
      "isEmailVerified": false,
      "isActive": true,
      "kycStatus": {
        "isComplete": false
      }
    }
  }
}
```

**Cookies Set:**
- `accessToken` (HttpOnly, 15 min)
- `refreshToken` (HttpOnly, 7 days)

**Status:** [ ] PASS [ ] FAIL

---

### 1.3 GET /auth/csrf-token

**Test Case:** Get CSRF token (NEW ENDPOINT - MUST BE IMPLEMENTED)

**Request:**
```bash
curl -X GET http://localhost:5005/api/v1/auth/csrf-token \
  -H "Content-Type: application/json"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "csrfToken": "64-character-hex-string-or-frontend-request"
  }
}
```

**Status:** [ ] NOT_IMPLEMENTED [ ] PASS [ ] FAIL

**Notes:**
- This endpoint MUST be implemented on backend
- Can return static token 'frontend-request' for same-origin requests
- Or return dynamic token that's validated on each request

---

### 1.4 GET /auth/me

**Test Case:** Get current authenticated user

**Request:**
```bash
curl -X GET http://localhost:5005/api/v1/auth/me \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "User fetched successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Test User",
      "email": "testuser@example.com",
      "role": "seller",
      "companyId": "507f1f77bcf86cd799439012",
      "isEmailVerified": false,
      "isActive": true
    }
  }
}
```

**Status:** [ ] PASS [ ] FAIL

---

### 1.5 POST /auth/refresh

**Test Case:** Refresh access token using refresh token cookie

**Request:**
```bash
curl -X POST http://localhost:5005/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully"
}
```

**Cookies Set:**
- New `accessToken` (HttpOnly, 15 min)

**Status:** [ ] PASS [ ] FAIL

---

### 1.6 POST /auth/verify-email

**Test Case:** Verify email with token from registration email

**Request:**
```bash
curl -X POST http://localhost:5005/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: frontend-request" \
  -d '{
    "token": "64-character-hex-token-from-email"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

**Status:** [ ] PASS [ ] FAIL

---

### 1.7 POST /auth/resend-verification

**Test Case:** Resend verification email

**Request:**
```bash
curl -X POST http://localhost:5005/api/v1/auth/resend-verification \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: frontend-request" \
  -d '{
    "email": "testuser@example.com"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "If your email is registered, a new verification email will be sent"
}
```

**Security Note:** Returns 200 for non-existent emails (prevents enumeration)

**Status:** [ ] PASS [ ] FAIL

---

### 1.8 POST /auth/reset-password

**Test Case:** Request password reset

**Request:**
```bash
curl -X POST http://localhost:5005/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: frontend-request" \
  -d '{
    "email": "testuser@example.com"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "If your email is registered, you will receive a password reset link"
}
```

**Status:** [ ] PASS [ ] FAIL

---

### 1.9 POST /auth/reset-password/confirm

**Test Case:** Confirm password reset with token

**Request:**
```bash
curl -X POST http://localhost:5005/api/v1/auth/reset-password/confirm \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: frontend-request" \
  -d '{
    "token": "64-character-hex-token-from-email",
    "password": "NewPassword123!"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

**Status:** [ ] PASS [ ] FAIL

---

### 1.10 POST /auth/logout

**Test Case:** Logout user

**Request:**
```bash
curl -X POST http://localhost:5005/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: frontend-request" \
  -b cookies.txt
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Cookies Cleared:**
- `accessToken` removed
- `refreshToken` removed

**Status:** [ ] PASS [ ] FAIL

---

## 2. ORDER ENDPOINTS

### 2.1 POST /orders (Create Order)

**Test Case:** Create order with minimal required fields

**Request:**
```bash
curl -X POST http://localhost:5005/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: frontend-request" \
  -b cookies.txt \
  -d '{
    "customerInfo": {
      "name": "Jane Doe",
      "phone": "9876543210",
      "address": {
        "line1": "123 Main Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "postalCode": "400001"
      }
    },
    "products": [
      {
        "name": "Product A",
        "quantity": 2,
        "price": 500
      }
    ]
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "_id": "507f1f77bcf86cd799439014",
      "orderNumber": "ORD-20260105-ABCD1234",
      "companyId": "507f1f77bcf86cd799439012",
      "customerInfo": {
        "name": "Jane Doe",
        "phone": "9876543210",
        "address": {
          "line1": "123 Main Street",
          "city": "Mumbai",
          "state": "Maharashtra",
          "country": "India",
          "postalCode": "400001"
        }
      },
      "products": [
        {
          "name": "Product A",
          "quantity": 2,
          "price": 500
        }
      ],
      "currentStatus": "pending",
      "paymentStatus": "pending",
      "source": "manual",
      "totals": {
        "subtotal": 1000,
        "tax": 0,
        "shipping": 0,
        "discount": 0,
        "total": 1000
      },
      "statusHistory": [
        {
          "status": "pending",
          "timestamp": "2026-01-05T10:30:00.000Z"
        }
      ],
      "createdAt": "2026-01-05T10:30:00.000Z",
      "updatedAt": "2026-01-05T10:30:00.000Z"
    }
  }
}
```

**Status:** [ ] PASS [ ] FAIL

**Questions to Verify:**
- [ ] Are `totals` auto-calculated by backend or required in request?
- [ ] Does `source` default to 'manual' or must be specified?
- [ ] Exact structure of `totals` object in response?

---

### 2.2 POST /orders (Create with All Fields)

**Test Case:** Create order with all optional fields

**Request:**
```bash
curl -X POST http://localhost:5005/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: frontend-request" \
  -b cookies.txt \
  -d '{
    "customerInfo": {
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phone": "9876543210",
      "address": {
        "line1": "123 Main Street",
        "line2": "Apt 4B",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "postalCode": "400001"
      }
    },
    "products": [
      {
        "name": "Product A",
        "sku": "SKU-001",
        "quantity": 2,
        "price": 500,
        "weight": 1.5,
        "dimensions": {
          "length": 10,
          "width": 8,
          "height": 5
        }
      },
      {
        "name": "Product B",
        "sku": "SKU-002",
        "quantity": 1,
        "price": 1000
      }
    ],
    "paymentMethod": "cod",
    "notes": "Handle with care",
    "tags": ["priority", "fragile"]
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "_id": "...",
      "orderNumber": "...",
      "companyId": "...",
      "customerInfo": { ... },
      "products": [ ... ],
      "currentStatus": "pending",
      "paymentStatus": "pending",
      "paymentMethod": "cod",
      "source": "manual",
      "totals": {
        "subtotal": 2000,
        "tax": 0,
        "shipping": 0,
        "discount": 0,
        "total": 2000
      },
      "notes": "Handle with care",
      "tags": ["priority", "fragile"],
      "statusHistory": [ ... ],
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

**Status:** [ ] PASS [ ] FAIL

---

### 2.3 GET /orders (List Orders)

**Test Case:** Get paginated list of orders

**Request:**
```bash
curl -X GET "http://localhost:5005/api/v1/orders?page=1&limit=20&status=pending" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": [
    { /* order object */ },
    { /* order object */ }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasMore": true
  }
}
```

**Status:** [ ] PASS [ ] FAIL

---

### 2.4 GET /orders/:orderId

**Test Case:** Get single order by ID

**Request:**
```bash
curl -X GET "http://localhost:5005/api/v1/orders/507f1f77bcf86cd799439014" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "order": { /* full order object */ }
  }
}
```

**Status:** [ ] PASS [ ] FAIL

---

### 2.5 PATCH /orders/:orderId (Update Order Status)

**Test Case:** Update order status to ready_to_ship

**Request:**
```bash
curl -X PATCH "http://localhost:5005/api/v1/orders/507f1f77bcf86cd799439014" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: frontend-request" \
  -b cookies.txt \
  -d '{
    "currentStatus": "ready_to_ship"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Order updated successfully",
  "data": {
    "order": {
      "_id": "507f1f77bcf86cd799439014",
      "currentStatus": "ready_to_ship",
      "statusHistory": [
        {
          "status": "pending",
          "timestamp": "2026-01-05T10:30:00.000Z"
        },
        {
          "status": "ready_to_ship",
          "timestamp": "2026-01-05T10:35:00.000Z"
        }
      ],
      "updatedAt": "2026-01-05T10:35:00.000Z"
    }
  }
}
```

**Status:** [ ] PASS [ ] FAIL

**Test:** Verify status transition validation (pending → ready_to_ship should work)

---

### 2.6 DELETE /orders/:orderId

**Test Case:** Delete (soft delete) order

**Request:**
```bash
curl -X DELETE "http://localhost:5005/api/v1/orders/507f1f77bcf86cd799439014" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: frontend-request" \
  -b cookies.txt
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Order deleted successfully"
}
```

**Status:** [ ] PASS [ ] FAIL

---

## 3. VALIDATION ERROR RESPONSES

### 3.1 Invalid Email Format

**Request:**
```bash
curl -X POST http://localhost:5005/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: frontend-request" \
  -d '{
    "name": "Test",
    "email": "invalid-email",
    "password": "TestPassword123!"
  }'
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

**Status:** [ ] PASS [ ] FAIL

---

### 3.2 Weak Password

**Request:**
```bash
curl -X POST http://localhost:5005/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: frontend-request" \
  -d '{
    "name": "Test",
    "email": "test@example.com",
    "password": "weak"
  }'
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "password",
        "message": "Password must be at least 8 characters and contain uppercase, lowercase, and number"
      }
    ]
  }
}
```

**Status:** [ ] PASS [ ] FAIL

---

## 4. TESTING NOTES

### Commands to Run Tests:

**1. Start fresh session:**
```bash
rm -f cookies.txt
```

**2. Register user:**
```bash
EMAIL="testuser$(date +%s)@example.com"
curl -X POST http://localhost:5005/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: frontend-request" \
  -c cookies.txt \
  -d "{\"name\": \"Test User\", \"email\": \"$EMAIL\", \"password\": \"TestPassword123!\"}"
```

**3. Retrieve verification token from email or database:**
```bash
# Check your email or database for verification token
```

**4. Verify email:**
```bash
curl -X POST http://localhost:5005/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: frontend-request" \
  -d '{"token": "TOKEN_FROM_EMAIL"}'
```

**5. Login:**
```bash
curl -X POST http://localhost:5005/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: frontend-request" \
  -c cookies.txt \
  -d '{"email": "testuser@example.com", "password": "TestPassword123!"}'
```

**6. Create order:**
```bash
curl -X POST http://localhost:5005/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: frontend-request" \
  -b cookies.txt \
  -d '{
    "customerInfo": {
      "name": "Jane Doe",
      "phone": "9876543210",
      "address": {
        "line1": "123 Main Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "postalCode": "400001"
      }
    },
    "products": [{
      "name": "Product A",
      "quantity": 1,
      "price": 500
    }]
  }'
```

---

## 5. SUMMARY OF FINDINGS

### Auth Endpoints Status:
- [ ] Register: **PASS** / **FAIL**
- [ ] Login: **PASS** / **FAIL**
- [ ] Get Me: **PASS** / **FAIL**
- [ ] Refresh Token: **PASS** / **FAIL**
- [ ] Verify Email: **PASS** / **FAIL**
- [ ] Resend Verification: **PASS** / **FAIL**
- [ ] Reset Password: **PASS** / **FAIL**
- [ ] Reset Password Confirm: **PASS** / **FAIL**
- [ ] Logout: **PASS** / **FAIL**
- [ ] **GET /auth/csrf-token: NOT_IMPLEMENTED** ⚠️

### Order Endpoints Status:
- [ ] Create Order (minimal): **PASS** / **FAIL**
- [ ] Create Order (all fields): **PASS** / **FAIL**
- [ ] List Orders: **PASS** / **FAIL**
- [ ] Get Order: **PASS** / **FAIL**
- [ ] Update Order: **PASS** / **FAIL**
- [ ] Delete Order: **PASS** / **FAIL**

### Critical Issues Found:
- [ ] CSRF Token endpoint missing (must be implemented)
- [ ] ...

### Backend Response Format Notes:
- ...

---

## 6. ACTION ITEMS

**Before Frontend Implementation:**
1. **CRITICAL:** Implement `GET /api/v1/auth/csrf-token` endpoint on backend
2. Test all auth endpoints - verify exact response formats
3. Test all order endpoints - verify totals calculation and field names
4. Document any deviations from planned API contracts
5. Verify CSRF token protection works correctly

**After Testing Complete:**
1. Proceed with Phase 3: Auth system reimplementation
2. Create TypeScript types based on actual backend responses
3. Implement auth API layer with correct payloads
4. Implement order API layer with correct payloads

