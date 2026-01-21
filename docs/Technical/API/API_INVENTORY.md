# Helix API Inventory

**Version**: 1.0
**Base URL**: `http://localhost:5005/api/v1` (Development)
**Date**: January 3, 2026
**Total Endpoints**: 120+

---

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Session Management](#session-management)
3. [Account Recovery](#account-recovery)
4. [User & Identity Management](#user--identity-management)
5. [Company & Organization](#company--organization)
6. [KYC Verification](#kyc-verification)
7. [Orders](#orders)
8. [Shipments](#shipments)
9. [Rate Cards & Zones](#rate-cards--zones)
10. [Warehouse Management](#warehouse-management)
11. [Warehouse Operations (Inventory, Picking, Packing)](#warehouse-operations)
12. [NDR Management](#ndr-management)
13. [RTO Management](#rto-management)
14. [Marketplace Integrations](#marketplace-integrations)
15. [Analytics & Reporting](#analytics--reporting)
16. [Commission Management](#commission-management)
17. [Communication](#communication)
18. [Webhooks](#webhooks)
19. [System & Audit](#system--audit)
20. [Public APIs](#public-apis)

---

## Authentication & Authorization

**Base Path**: `/api/v1/auth`

### POST `/auth/register`
**Description**: Register a new user account
**Access**: Public
**Rate Limit**: Registration rate limiter
**CSRF**: Required
**Request Body**:
```json
{
  "email": "seller@example.com",
  "password": "StrongP@ss123",
  "name": "John Doe",
  "phone": "+919876543210",
  "role": "seller",
  "companyName": "My Store"
}
```
**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "name": "..." },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```
**Controller**: `AuthController.register`
**Service**: `OAuthService.register`
**Model**: `User`, `Company`
**Test**: ✅ `auth/register.test.ts`

---

### POST `/auth/login`
**Description**: Authenticate user and create session
**Access**: Public
**Rate Limit**: Login rate limiter (5 attempts per 15 minutes)
**CSRF**: Required
**Request Body**:
```json
{
  "email": "seller@example.com",
  "password": "StrongP@ss123"
}
```
**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "role": "seller" },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```
**Cookies Set**: `accessToken` (httpOnly, 15min), `refreshToken` (httpOnly, 7d)
**Controller**: `AuthController.login`
**Service**: `OAuthService.login`, `SessionService.create`
**Model**: `User`, `Session`
**Test**: ✅ `auth/login.test.ts`

---

### POST `/auth/refresh`
**Description**: Refresh access token using refresh token
**Access**: Public (requires valid refresh token in cookie)
**Request**: Uses `refreshToken` from httpOnly cookie
**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "new-access-token"
  }
}
```
**Controller**: `AuthController.refreshToken`
**Service**: `TokenService.verifyRefreshToken`, `TokenService.generateAccessToken`

---

### GET `/auth/me`
**Description**: Get current authenticated user details
**Access**: Private (requires authentication)
**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "...",
      "name": "...",
      "role": "seller",
      "company": { "id": "...", "name": "..." },
      "isVerified": true
    }
  }
}
```
**Controller**: `AuthController.getMe`

---

### POST `/auth/logout`
**Description**: Logout user and revoke session
**Access**: Private
**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```
**Controller**: `AuthController.logout`
**Service**: `SessionService.revoke`

---

### POST `/auth/verify-email`
**Description**: Verify email address with token
**Access**: Public
**Rate Limit**: Email verification rate limiter
**Request Body**:
```json
{
  "token": "verification-token-from-email"
}
```
**Response**: `200 OK`
**Controller**: `AuthController.verifyEmail`
**Service**: `TokenService.verifyEmailToken`
**Test**: ✅ `auth/email-verification.test.ts`

---

### POST `/auth/resend-verification`
**Description**: Resend email verification email
**Access**: Public
**CSRF**: Required
**Request Body**:
```json
{
  "email": "seller@example.com"
}
```
**Response**: `200 OK`
**Controller**: `AuthController.resendVerificationEmail`
**Service**: `EmailService.sendVerificationEmail`

---

### POST `/auth/reset-password`
**Description**: Request password reset email
**Access**: Public
**CSRF**: Required
**Rate Limit**: Password reset rate limiter
**Request Body**:
```json
{
  "email": "seller@example.com"
}
```
**Response**: `200 OK`
**Controller**: `AuthController.requestPasswordReset`
**Service**: `PasswordService.requestReset`
**Test**: ✅ `auth/password-reset.test.ts`

---

### POST `/auth/reset-password/confirm`
**Description**: Reset password with token
**Access**: Public
**CSRF**: Required
**Request Body**:
```json
{
  "token": "reset-token",
  "newPassword": "NewP@ss123"
}
```
**Response**: `200 OK`
**Controller**: `AuthController.resetPassword`
**Service**: `PasswordService.resetPassword`

---

### POST `/auth/change-password`
**Description**: Change password for authenticated user
**Access**: Private
**CSRF**: Required
**Request Body**:
```json
{
  "currentPassword": "OldP@ss123",
  "newPassword": "NewP@ss123"
}
```
**Response**: `200 OK`
**Controller**: `AuthController.changePassword`
**Service**: `PasswordService.changePassword`
**Test**: ✅ `auth/password-change.test.ts`

---

### POST `/auth/change-email`
**Description**: Request email change (sends verification to new email)
**Access**: Private
**CSRF**: Required
**Request Body**:
```json
{
  "newEmail": "newemail@example.com",
  "password": "CurrentP@ss"
}
```
**Response**: `200 OK`
**Controller**: `AuthController.changeEmail`
**Service**: `EmailChangeService.requestChange`
**Test**: ✅ `auth/email-change.test.ts`

---

### POST `/auth/verify-email-change`
**Description**: Verify and complete email change
**Access**: Public
**Request Body**:
```json
{
  "token": "email-change-token"
}
```
**Response**: `200 OK`
**Controller**: `AuthController.verifyEmailChange`
**Service**: `EmailChangeService.completeChange`

---

### POST `/auth/check-password-strength`
**Description**: Check password strength using zxcvbn
**Access**: Public
**CSRF**: Required
**Request Body**:
```json
{
  "password": "TestPassword123"
}
```
**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "score": 3,
    "feedback": { "warning": "", "suggestions": [] }
  }
}
```
**Controller**: `AuthController.checkPasswordStrength`

---

### POST `/auth/set-password`
**Description**: Set password for OAuth users (enables email/password login)
**Access**: Private
**Request Body**:
```json
{
  "password": "NewP@ss123"
}
```
**Response**: `200 OK`
**Controller**: `AuthController.setPassword`

---

### GET `/auth/google`
**Description**: Initiate Google OAuth flow
**Access**: Public
**Redirect**: Google OAuth consent screen
**Scope**: `profile`, `email`

---

### GET `/auth/google/callback`
**Description**: Google OAuth callback handler
**Access**: Public (called by Google)
**Response**: Redirect to frontend with tokens in cookies
**Redirect**: `{CLIENT_URL}/oauth-callback`

---

## Session Management

**Base Path**: `/api/v1/sessions`
**Authentication**: All routes require authentication

### GET `/sessions`
**Description**: Get all active sessions for current user
**Access**: Private
**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "...",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2026-01-03T10:00:00Z",
        "expiresAt": "2026-01-10T10:00:00Z",
        "isCurrent": true
      }
    ]
  }
}
```
**Controller**: `SessionController.getSessions`
**Service**: `SessionService.list`
**Model**: `Session`
**Test**: ✅ `auth/session-management.test.ts`

---

### DELETE `/sessions/:sessionId`
**Description**: Revoke a specific session
**Access**: Private
**Response**: `200 OK`
**Controller**: `SessionController.terminateSession`
**Service**: `SessionService.revoke`

---

### DELETE `/sessions`
**Description**: Revoke all sessions except current
**Access**: Private
**Response**: `200 OK`
**Controller**: `SessionController.terminateAllSessions`
**Service**: `SessionService.revokeAllExceptCurrent`

---

## Account Recovery

**Base Path**: `/api/v1/recovery`

### GET `/recovery/security-questions`
**Description**: Get available security questions
**Access**: Public
**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "questions": [
      "What was your first pet's name?",
      "What city were you born in?",
      ...
    ]
  }
}
```
**Controller**: `RecoveryController.getSecurityQuestions`

---

### POST `/recovery/setup-questions`
**Description**: Set up security questions for account recovery
**Access**: Private
**CSRF**: Required
**Request Body**:
```json
{
  "questions": [
    { "question": "What was your first pet's name?", "answer": "Fluffy" },
    { "question": "What city were you born in?", "answer": "Mumbai" }
  ]
}
```
**Response**: `201 Created`
**Controller**: `RecoveryController.setupSecurityQuestionsHandler`

---

### POST `/recovery/setup-backup-email`
**Description**: Set up backup email for account recovery
**Access**: Private
**CSRF**: Required
**Request Body**:
```json
{
  "backupEmail": "backup@example.com"
}
```
**Response**: `200 OK`
**Controller**: `RecoveryController.setupBackupEmailHandler`

---

### POST `/recovery/generate-keys`
**Description**: Generate recovery keys for account
**Access**: Private
**CSRF**: Required
**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "recoveryKeys": [
      "XXXX-XXXX-XXXX-XXXX",
      "YYYY-YYYY-YYYY-YYYY",
      ...
    ]
  }
}
```
**Controller**: `RecoveryController.generateRecoveryKeysHandler`

---

### GET `/recovery/status`
**Description**: Get recovery options status
**Access**: Private
**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "securityQuestions": true,
    "backupEmail": true,
    "recoveryKeys": 5
  }
}
```
**Controller**: `RecoveryController.getRecoveryStatus`

---

### POST `/recovery/send-options`
**Description**: Send recovery options email
**Access**: Public
**CSRF**: Required
**Request Body**:
```json
{
  "email": "user@example.com"
}
```
**Response**: `200 OK`
**Controller**: `RecoveryController.sendRecoveryOptionsHandler`

---

## User & Identity Management

**Base Path**: `/api/v1`

### GET `/profile`
**Description**: Get current user profile
**Access**: Private
**Response**: `200 OK`
**Controller**: `ProfileController.getProfile`
**Model**: `User`

---

### PUT `/profile`
**Description**: Update user profile
**Access**: Private
**Request Body**:
```json
{
  "name": "John Doe Updated",
  "phone": "+919876543210"
}
```
**Response**: `200 OK`
**Controller**: `ProfileController.updateProfile`
**Service**: `ProfileService.update`

---

### POST `/profile/image`
**Description**: Upload profile image
**Access**: Private
**Content-Type**: `multipart/form-data`
**Request**: Form field `image` with image file
**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "imageUrl": "https://cloudinary.com/..."
  }
}
```
**Controller**: `ProfileController.uploadImage`
**Service**: `CloudinaryStorageService.upload`

---

### GET `/users`
**Description**: Get all users (Admin only)
**Access**: Private (Admin)
**Query Params**: `page`, `limit`, `role`, `search`
**Response**: `200 OK`
**Controller**: `UserController.getUsers`

---

### GET `/users/:userId`
**Description**: Get user by ID (Admin only)
**Access**: Private (Admin)
**Response**: `200 OK`
**Controller**: `UserController.getUserById`

---

### PATCH `/users/:userId`
**Description**: Update user (Admin only)
**Access**: Private (Admin)
**Response**: `200 OK`
**Controller**: `UserController.updateUser`

---

### DELETE `/users/:userId`
**Description**: Delete user (Admin only)
**Access**: Private (Admin)
**Response**: `200 OK`
**Controller**: `UserController.deleteUser`

---

### DELETE `/account`
**Description**: Delete own account
**Access**: Private
**Response**: `200 OK`
**Controller**: `AccountController.deleteAccount`
**Service**: `AccountService.deleteAccount`

---

## Company & Organization

**Base Path**: `/api/v1/companies`
**Authentication**: Required for all routes

### GET `/companies`
**Description**: Get all companies (Admin only)
**Access**: Private (Admin)
**Query Params**: `page`, `limit`, `search`, `kycStatus`
**Response**: `200 OK`
**Controller**: `CompanyController.getCompanies`
**Model**: `Company`

---

### GET `/companies/:companyId`
**Description**: Get company by ID
**Access**: Private
**Response**: `200 OK`
**Controller**: `CompanyController.getCompanyById`

---

### POST `/companies`
**Description**: Create new company
**Access**: Private
**Request Body**:
```json
{
  "name": "My Store",
  "email": "contact@mystore.com",
  "phone": "+919876543210",
  "address": { "line1": "...", "city": "...", "state": "...", "pincode": "..." },
  "gstin": "29XXXXX1234Z5Z6",
  "panNumber": "ABCDE1234F",
  "businessType": "retail"
}
```
**Response**: `201 Created`
**Controller**: `CompanyController.createCompany`

---

### PUT `/companies/:companyId`
**Description**: Update company details
**Access**: Private
**Response**: `200 OK`
**Controller**: `CompanyController.updateCompany`

---

### DELETE `/companies/:companyId`
**Description**: Delete company (Admin only)
**Access**: Private (Admin)
**Response**: `200 OK`
**Controller**: `CompanyController.deleteCompany`

---

### GET `/team`
**Description**: Get team members
**Access**: Private
**Response**: `200 OK`
**Controller**: `TeamController.getTeamMembers`
**Model**: `TeamPermission`

---

### POST `/team/invite`
**Description**: Invite team member
**Access**: Private
**Request Body**:
```json
{
  "email": "member@example.com",
  "role": "warehouse_staff"
}
```
**Response**: `201 Created`
**Controller**: `TeamController.inviteTeamMember`
**Model**: `TeamInvitation`

---

### PUT `/team/:memberId/role`
**Description**: Update team member role
**Access**: Private
**Request Body**:
```json
{
  "role": "admin"
}
```
**Response**: `200 OK`
**Controller**: `TeamController.updateMemberRole`

---

### DELETE `/team/:memberId`
**Description**: Remove team member
**Access**: Private
**Response**: `200 OK`
**Controller**: `TeamController.removeMember`

---

## KYC Verification

**Base Path**: `/api/v1/kyc`
**Authentication**: Required

### POST `/kyc`
**Description**: Submit KYC documents
**Access**: Private
**Content-Type**: `multipart/form-data`
**Request**:
```
documentType: "pan" | "aadhaar" | "gstin" | "bank_account"
documentNumber: "ABCDE1234F"
documentImages: [file1, file2]
```
**Response**: `201 Created`
**Controller**: `KYCController.submitKYC`
**Service**: `DeepVueService.verify{PAN|Aadhaar|GSTIN|BankAccount}`
**Model**: `KYC`

---

### GET `/kyc/:kycId`
**Description**: Get KYC status
**Access**: Private
**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "kyc": {
      "id": "...",
      "documentType": "pan",
      "verificationStatus": "verified",
      "verifiedAt": "2026-01-03T10:00:00Z"
    }
  }
}
```
**Controller**: `KYCController.getKYCStatus`

---

### PUT `/kyc/:kycId/verify`
**Description**: Verify KYC (Admin only)
**Access**: Private (Admin)
**Request Body**:
```json
{
  "status": "verified",
  "notes": "Documents verified successfully"
}
```
**Response**: `200 OK`
**Controller**: `KYCController.verifyKYC`

---

### PUT `/kyc/:kycId/reject`
**Description**: Reject KYC (Admin only)
**Access**: Private (Admin)
**Request Body**:
```json
{
  "reason": "Invalid document"
}
```
**Response**: `200 OK`
**Controller**: `KYCController.rejectKYC`

---

## Orders

**Base Path**: `/api/v1/orders`
**Authentication**: Required

### POST `/orders`
**Description**: Create a new order
**Access**: Private
**CSRF**: Required
**Request Body**:
```json
{
  "orderNumber": "ORD-2026-001",
  "customer": {
    "name": "Customer Name",
    "email": "customer@example.com",
    "phone": "+919876543210"
  },
  "items": [
    {
      "sku": "SKU001",
      "name": "Product Name",
      "quantity": 2,
      "price": 1000,
      "weight": 500
    }
  ],
  "shippingAddress": {
    "line1": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "billingAddress": { ... },
  "paymentMethod": "COD" | "PREPAID",
  "totalAmount": 2100
}
```
**Response**: `201 Created`
**Controller**: `OrderController.createOrder`
**Service**: `OrderService.createOrder`
**Model**: `Order`

---

### GET `/orders`
**Description**: Get all orders with pagination and filters
**Access**: Private
**Query Params**:
- `page` (default: 1)
- `limit` (default: 20)
- `status` (pending, processing, shipped, delivered, cancelled)
- `paymentMethod` (COD, PREPAID)
- `orderSource` (manual, shopify, woocommerce, amazon, flipkart)
- `search` (order number or customer name)
- `startDate`, `endDate`
**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "orders": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```
**Controller**: `OrderController.getOrders`

---

### GET `/orders/:orderId`
**Description**: Get single order by ID
**Access**: Private
**Response**: `200 OK`
**Controller**: `OrderController.getOrderById`

---

### PATCH `/orders/:orderId`
**Description**: Update order
**Access**: Private
**CSRF**: Required
**Request Body**: Partial order fields
**Response**: `200 OK`
**Controller**: `OrderController.updateOrder`

---

### DELETE `/orders/:orderId`
**Description**: Soft delete order
**Access**: Private
**CSRF**: Required
**Response**: `200 OK`
**Controller**: `OrderController.deleteOrder`

---

### POST `/orders/bulk`
**Description**: Bulk import orders from CSV
**Access**: Private
**CSRF**: Required
**Content-Type**: `multipart/form-data`
**Request**: Field `file` with CSV file (max 5MB)
**CSV Format**:
```csv
orderNumber,customerName,customerEmail,customerPhone,sku,quantity,price,...
```
**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "imported": 50,
    "failed": 2,
    "errors": [...]
  }
}
```
**Controller**: `OrderController.bulkImportOrders`
**Service**: `OrderService.bulkImport`

---

## Shipments

**Base Path**: `/api/v1/shipments`
**Authentication**: Required (except public tracking)

### POST `/shipments`
**Description**: Create shipment from order
**Access**: Private
**CSRF**: Required
**Request Body**:
```json
{
  "orderId": "order-id",
  "courier": "velocity",
  "serviceType": "surface" | "express",
  "packageDetails": {
    "weight": 1000,
    "length": 30,
    "width": 20,
    "height": 10
  }
}
```
**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "shipment": {
      "id": "...",
      "awb": "VEL123456789",
      "trackingStatus": "pending_pickup",
      "charges": {
        "baseCharge": 50,
        "fuelSurcharge": 5,
        "codCharge": 20,
        "total": 75
      }
    }
  }
}
```
**Controller**: `ShipmentController.createShipment`
**Service**: `ShipmentService.createShipment`, `VelocityProvider.generateAWB`, `WalletService.deduct`
**Model**: `Shipment`, `WalletTransaction`

---

### GET `/shipments`
**Description**: Get all shipments with filters
**Access**: Private
**Query Params**: `page`, `limit`, `status`, `courier`, `startDate`, `endDate`
**Response**: `200 OK`
**Controller**: `ShipmentController.getShipments`

---

### GET `/shipments/:shipmentId`
**Description**: Get single shipment by ID
**Access**: Private
**Response**: `200 OK`
**Controller**: `ShipmentController.getShipmentById`

---

### GET `/shipments/tracking/:trackingNumber`
**Description**: Track shipment by AWB
**Access**: Private
**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "shipment": {
      "awb": "VEL123456789",
      "trackingStatus": "in_transit",
      "currentLocation": "Mumbai Hub",
      "estimatedDeliveryDate": "2026-01-05",
      "trackingHistory": [
        {
          "status": "picked_up",
          "location": "Seller Location",
          "timestamp": "2026-01-03T10:00:00Z"
        },
        ...
      ]
    }
  }
}
```
**Controller**: `ShipmentController.trackShipment`
**Service**: `ShipmentService.track`

---

### GET `/shipments/public/track/:trackingNumber`
**Description**: Public shipment tracking (no auth required)
**Access**: Public
**Response**: `200 OK` (same as above)
**Controller**: `ShipmentController.trackShipmentPublic`

---

### PATCH `/shipments/:shipmentId/status`
**Description**: Update shipment status manually
**Access**: Private
**CSRF**: Required
**Request Body**:
```json
{
  "status": "delivered",
  "notes": "Delivered to customer"
}
```
**Response**: `200 OK`
**Controller**: `ShipmentController.updateShipmentStatus`

---

### DELETE `/shipments/:shipmentId`
**Description**: Soft delete shipment
**Access**: Private
**CSRF**: Required
**Response**: `200 OK`
**Controller**: `ShipmentController.deleteShipment`

---

## Rate Cards & Zones

**Base Path**: `/api/v1`

### GET `/ratecards`
**Description**: Get all rate cards
**Access**: Private
**Response**: `200 OK`
**Controller**: `RateCardController.getRateCards`
**Model**: `RateCard`

---

### POST `/ratecards`
**Description**: Create rate card
**Access**: Private (Admin)
**Request Body**:
```json
{
  "courier": "velocity",
  "serviceType": "surface",
  "zone": "zone-id",
  "weightSlabs": [
    { "upTo": 500, "rate": 30 },
    { "upTo": 1000, "rate": 50 },
    { "upTo": 5000, "rate": 100 }
  ],
  "codCharges": { "percentage": 2, "min": 10 },
  "fuelSurcharge": 5,
  "validFrom": "2026-01-01",
  "validTo": "2026-12-31"
}
```
**Response**: `201 Created`
**Controller**: `RateCardController.createRateCard`

---

### GET `/zones`
**Description**: Get all zones
**Access**: Private
**Response**: `200 OK`
**Controller**: `ZoneController.getZones`
**Model**: `Zone`

---

### POST `/zones`
**Description**: Create shipping zone
**Access**: Private (Admin)
**Request Body**:
```json
{
  "name": "Zone A - Metro",
  "zoneType": "metro" | "state" | "roi",
  "pincodes": ["400001", "400002", ...],
  "states": ["Maharashtra"]
}
```
**Response**: `201 Created`
**Controller**: `ZoneController.createZone`

---

## Warehouse Management

**Base Path**: `/api/v1/warehouses`
**Authentication**: Required

### GET `/warehouses`
**Description**: Get all warehouses
**Access**: Private
**Response**: `200 OK`
**Controller**: `WarehouseController.getWarehouses`
**Model**: `Warehouse`

---

### POST `/warehouses`
**Description**: Create warehouse
**Access**: Private
**Request Body**:
```json
{
  "name": "Mumbai Warehouse",
  "code": "MH-MUM-01",
  "address": {...},
  "type": "fulfillment" | "storage" | "hybrid",
  "operatingHours": {
    "monday": { "open": "09:00", "close": "18:00" },
    ...
  },
  "contactPerson": {...}
}
```
**Response**: `201 Created`
**Controller**: `WarehouseController.createWarehouse`

---

### GET `/warehouses/:warehouseId`
**Description**: Get warehouse by ID
**Access**: Private
**Response**: `200 OK`
**Controller**: `WarehouseController.getWarehouseById`

---

### PUT `/warehouses/:warehouseId`
**Description**: Update warehouse
**Access**: Private
**Response**: `200 OK`
**Controller**: `WarehouseController.updateWarehouse`

---

### DELETE `/warehouses/:warehouseId`
**Description**: Delete warehouse
**Access**: Private
**Response**: `200 OK`
**Controller**: `WarehouseController.deleteWarehouse`

---

## Warehouse Operations

**Base Path**: `/api/v1/warehouse`
**Authentication**: Required

### Inventory Operations

#### GET `/warehouse/inventory`
**Description**: Get inventory across warehouses
**Access**: Private
**Query Params**: `warehouseId`, `sku`, `lowStock`
**Response**: `200 OK`
**Controller**: `InventoryController.getInventory`
**Service**: `InventoryService.getInventory`
**Model**: `Inventory`

---

#### POST `/warehouse/inventory/:inventoryId/transfer`
**Description**: Transfer stock between warehouses
**Access**: Private
**Request Body**:
```json
{
  "toWarehouse": "warehouse-id",
  "quantity": 100,
  "reason": "Stock rebalancing"
}
```
**Response**: `200 OK`
**Controller**: `InventoryController.transferStock`
**Service**: `InventoryService.transferStock`
**Model**: `StockMovement`

---

### Picking Operations

#### POST `/warehouse/picking`
**Description**: Create pick list from order
**Access**: Private
**Request Body**:
```json
{
  "orderId": "order-id",
  "warehouseId": "warehouse-id",
  "assignedTo": "user-id",
  "priority": "high" | "medium" | "low"
}
```
**Response**: `201 Created`
**Controller**: `PickingController.createPickList`
**Service**: `PickingService.createPickList`, `InventoryService.reserve`
**Model**: `PickList`, `Inventory`

---

#### GET `/warehouse/picking`
**Description**: Get all pick lists
**Access**: Private
**Query Params**: `status`, `assignedTo`, `warehouseId`
**Response**: `200 OK`
**Controller**: `PickingController.getPickLists`

---

#### PATCH `/warehouse/picking/:pickListId/complete`
**Description**: Mark pick list as complete
**Access**: Private
**Request Body**:
```json
{
  "itemsPicked": [
    { "sku": "SKU001", "quantityPicked": 2 }
  ]
}
```
**Response**: `200 OK`
**Controller**: `PickingController.completePickList`
**Service**: `PickingService.complete`, `InventoryService.deduct`

---

### Packing Operations

#### POST `/warehouse/packing`
**Description**: Create packing station
**Access**: Private
**Request Body**:
```json
{
  "pickListId": "picklist-id",
  "stationNumber": "STN-01",
  "assignedTo": "user-id"
}
```
**Response**: `201 Created`
**Controller**: `PackingController.createPackingStation`
**Service**: `PackingService.createStation`
**Model**: `PackingStation`

---

#### GET `/warehouse/packing`
**Description**: Get all packing stations
**Access**: Private
**Response**: `200 OK`
**Controller**: `PackingController.getPackingStations`

---

#### PATCH `/warehouse/packing/:packingStationId/complete`
**Description**: Complete packing
**Access**: Private
**Request Body**:
```json
{
  "packagedItems": [...],
  "packageDetails": {
    "weight": 1200,
    "length": 30,
    "width": 20,
    "height": 15
  }
}
```
**Response**: `200 OK`
**Controller**: `PackingController.completePackaging`
**Service**: `PackingService.complete`

---

## NDR Management

**Base Path**: `/api/v1/ndr`
**Authentication**: Required

### GET `/ndr/events`
**Description**: List all NDR events
**Access**: Private
**Query Params**: `status`, `category`, `page`, `limit`
**Response**: `200 OK`
**Controller**: `NDRController.listNDREvents`
**Model**: `NDREvent`

---

### GET `/ndr/events/:id`
**Description**: Get single NDR event
**Access**: Private
**Response**: `200 OK`
**Controller**: `NDRController.getNDREvent`

---

### POST `/ndr/events/:id/resolve`
**Description**: Resolve NDR manually
**Access**: Private
**Request Body**:
```json
{
  "resolution": "retry" | "rto" | "update_address",
  "notes": "Customer requested retry",
  "retryDate": "2026-01-05"
}
```
**Response**: `200 OK`
**Controller**: `NDRController.resolveNDR`
**Service**: `NDRResolutionService.resolve`

---

### POST `/ndr/events/:id/escalate`
**Description**: Escalate NDR to higher priority
**Access**: Private
**Response**: `200 OK`
**Controller**: `NDRController.escalateNDR`

---

### POST `/ndr/events/:id/trigger-workflow`
**Description**: Trigger resolution workflow
**Access**: Private
**Response**: `200 OK`
**Controller**: `NDRController.triggerWorkflow`
**Service**: `NDRResolutionService.initiateWorkflow`

---

### GET `/ndr/analytics/stats`
**Description**: Get NDR overall statistics
**Access**: Private
**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "totalNDRs": 250,
    "resolved": 180,
    "pending": 70,
    "resolutionRate": 72
  }
}
```
**Controller**: `NDRController.getStats`
**Service**: `NDRAnalyticsService.getStats`

---

### GET `/ndr/analytics/by-type`
**Description**: Get NDR breakdown by type
**Access**: Private
**Response**: `200 OK`
**Controller**: `NDRController.getByType`

---

### GET `/ndr/analytics/trends`
**Description**: Get NDR trends over time
**Access**: Private
**Query Params**: `startDate`, `endDate`, `granularity` (daily/weekly/monthly)
**Response**: `200 OK`
**Controller**: `NDRController.getTrends`

---

### GET `/ndr/analytics/resolution-rates`
**Description**: Get resolution rates by action
**Access**: Private
**Response**: `200 OK`
**Controller**: `NDRController.getResolutionRates`

---

### GET `/ndr/analytics/top-reasons`
**Description**: Get top NDR reasons
**Access**: Private
**Response**: `200 OK`
**Controller**: `NDRController.getTopReasons`

---

### GET `/ndr/dashboard`
**Description**: Get NDR dashboard data
**Access**: Private
**Response**: `200 OK`
**Controller**: `NDRController.getDashboard`

---

### GET `/ndr/workflows`
**Description**: Get NDR workflows
**Access**: Private
**Response**: `200 OK`
**Controller**: `NDRController.getWorkflows`
**Model**: `NDRWorkflow`

---

### POST `/ndr/workflows/seed`
**Description**: Seed default workflows (Admin only)
**Access**: Private (Admin)
**Response**: `201 Created`
**Controller**: `NDRController.seedWorkflows`

---

## RTO Management

**Base Path**: `/api/v1/rto`
**Authentication**: Required

### GET `/rto`
**Description**: Get all RTO events
**Access**: Private
**Query Params**: `status`, `page`, `limit`
**Response**: `200 OK`
**Controller**: `RTOController.getRTOEvents`
**Model**: `RTOEvent`

---

### GET `/rto/:id`
**Description**: Get single RTO event
**Access**: Private
**Response**: `200 OK`
**Controller**: `RTOController.getRTOEvent`

---

### POST `/rto/:id/initiate`
**Description**: Initiate RTO for shipment
**Access**: Private
**Request Body**:
```json
{
  "reason": "customer_refused" | "ndr_unresolved" | "quality_issue"
}
```
**Response**: `201 Created`
**Controller**: `RTOController.initiateRTO`
**Service**: `RTOService.initiateRTO`, `WalletService.deduct`

---

### PATCH `/rto/:id/complete`
**Description**: Mark RTO as complete
**Access**: Private
**Response**: `200 OK`
**Controller**: `RTOController.completeRTO`
**Service**: `RTOService.complete`

---

## Marketplace Integrations

**Base Path**: `/api/v1/integrations`
**Authentication**: Required

### Shopify Integration

#### POST `/integrations/shopify/oauth`
**Description**: Initiate Shopify OAuth flow
**Access**: Private
**Request Body**:
```json
{
  "shopDomain": "mystore.myshopify.com"
}
```
**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "authUrl": "https://mystore.myshopify.com/admin/oauth/authorize?..."
  }
}
```
**Controller**: `ShopifyController.initiateOAuth`
**Service**: `ShopifyOAuthService.getAuthUrl`

---

#### GET `/integrations/shopify/callback`
**Description**: Shopify OAuth callback
**Access**: Public (called by Shopify)
**Query Params**: `code`, `shop`, `hmac`
**Response**: Redirect to frontend
**Controller**: `ShopifyController.oauthCallback`
**Service**: `ShopifyOAuthService.completeOAuth`
**Model**: `ShopifyStore`

---

#### GET `/integrations/shopify/stores`
**Description**: Get connected Shopify stores
**Access**: Private
**Response**: `200 OK`
**Controller**: `ShopifyController.getStores`

---

#### POST `/integrations/shopify/sync/products`
**Description**: Sync products from Shopify
**Access**: Private
**Response**: `200 OK`
**Controller**: `ShopifyController.syncProducts`
**Service**: `ShopifyOrderSyncService.syncProducts`

---

#### POST `/integrations/shopify/sync/orders`
**Description**: Sync orders from Shopify
**Access**: Private
**Response**: `200 OK`
**Controller**: `ShopifyController.syncOrders`
**Service**: `ShopifyOrderSyncService.syncOrders`

---

#### DELETE `/integrations/shopify/stores/:storeId`
**Description**: Disconnect Shopify store
**Access**: Private
**Response**: `200 OK`
**Controller**: `ShopifyController.disconnectStore`

---

### WooCommerce Integration
*(Similar endpoints structure as Shopify)*

#### POST `/integrations/woocommerce/oauth`
**Description**: Initiate WooCommerce OAuth flow
**Access**: Private
**Controller**: `WooCommerceController.initiateOAuth`
**Service**: `WooCommerceOAuthService.getAuthUrl`

---

### Amazon Integration
*(Similar endpoints structure)*

#### POST `/integrations/amazon/oauth`
**Description**: Initiate Amazon SP-API OAuth
**Access**: Private
**Controller**: `AmazonController.initiateOAuth`

---

### Flipkart Integration
*(Similar endpoints structure)*

#### POST `/integrations/flipkart/oauth`
**Description**: Initiate Flipkart OAuth
**Access**: Private
**Controller**: `FlipkartController.initiateOAuth`

---

### Product Mapping

#### GET `/integrations/product-mapping`
**Description**: Get product mappings
**Access**: Private
**Query Params**: `platform`, `sku`
**Response**: `200 OK`
**Controller**: `ProductMappingController.getMappings`
**Model**: `ShopifyProductMapping`, etc.

---

#### POST `/integrations/product-mapping`
**Description**: Create product mapping
**Access**: Private
**Request Body**:
```json
{
  "platform": "shopify",
  "internalSKU": "SKU001",
  "platformSKU": "SHOPIFY-SKU001",
  "platformProductId": "shopify-product-id"
}
```
**Response**: `201 Created`
**Controller**: `ProductMappingController.createMapping`

---

## Analytics & Reporting

**Base Path**: `/api/v1`

### GET `/analytics/dashboard`
**Description**: Get dashboard analytics
**Access**: Private
**Query Params**: `startDate`, `endDate`
**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "revenue": {
      "total": 500000,
      "trend": 15
    },
    "orders": {
      "total": 1250,
      "trend": 12
    },
    "shipments": {
      "total": 1100,
      "delivered": 950
    },
    "topProducts": [...],
    "revenueChart": [...]
  }
}
```
**Controller**: `AnalyticsController.getDashboard`
**Service**: `OrderAnalyticsService`, `RevenueAnalyticsService`

---

### POST `/export/excel`
**Description**: Export data to Excel
**Access**: Private
**Request Body**:
```json
{
  "reportType": "orders" | "shipments" | "inventory",
  "filters": {...},
  "columns": ["orderNumber", "customer", "totalAmount", ...]
}
```
**Response**: `200 OK` (file download)
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="orders_2026-01-03.xlsx"
```
**Controller**: `ExportController.exportExcel`
**Service**: `ExcelExportService.export`

---

### POST `/export/csv`
**Description**: Export data to CSV
**Access**: Private
**Response**: `200 OK` (file download)
**Controller**: `ExportController.exportCSV`
**Service**: `CSVExportService.export`

---

### POST `/export/pdf`
**Description**: Export report to PDF
**Access**: Private
**Response**: `200 OK` (file download)
**Controller**: `ExportController.exportPDF`
**Service**: `PDFExportService.export`

---

## Commission Management

**Base Path**: `/api/v1/commission`
**Authentication**: Required

### GET `/commission/sales-representatives`
**Description**: Get all sales representatives
**Access**: Private
**Response**: `200 OK`
**Controller**: `SalesRepresentativeController.getRepresentatives`
**Model**: `SalesRepresentative`

---

### POST `/commission/sales-representatives`
**Description**: Create sales representative
**Access**: Private (Admin)
**Request Body**:
```json
{
  "userId": "user-id",
  "commissionRate": 5,
  "targetRevenue": 500000
}
```
**Response**: `201 Created`
**Controller**: `SalesRepresentativeController.create`

---

### GET `/commission/rules`
**Description**: Get commission rules
**Access**: Private
**Response**: `200 OK`
**Controller**: `CommissionRuleController.getRules`
**Model**: `CommissionRule`

---

### POST `/commission/rules`
**Description**: Create commission rule
**Access**: Private (Admin)
**Request Body**:
```json
{
  "name": "Tiered Commission",
  "ruleType": "tiered",
  "tiers": [
    { "upTo": 100000, "rate": 3 },
    { "upTo": 500000, "rate": 5 },
    { "upTo": null, "rate": 7 }
  ],
  "validFrom": "2026-01-01"
}
```
**Response**: `201 Created`
**Controller**: `CommissionRuleController.createRule`

---

### GET `/commission/transactions`
**Description**: Get commission transactions
**Access**: Private
**Query Params**: `status`, `salesRepId`, `page`, `limit`
**Response**: `200 OK`
**Controller**: `CommissionTransactionController.getTransactions`
**Model**: `CommissionTransaction`

---

### PUT `/commission/transactions/:id/approve`
**Description**: Approve commission (Admin only)
**Access**: Private (Admin)
**Response**: `200 OK`
**Controller**: `CommissionTransactionController.approve`
**Service**: `CommissionApprovalService.approve`

---

### GET `/commission/payouts`
**Description**: Get commission payouts
**Access**: Private
**Response**: `200 OK`
**Controller**: `PayoutController.getPayouts`
**Model**: `Payout`

---

### POST `/commission/payouts/process`
**Description**: Process pending payouts (Admin only)
**Access**: Private (Admin)
**Response**: `200 OK`
**Controller**: `PayoutController.processPayouts`
**Service**: `PayoutProcessingService.processPayouts`, `RazorpayPayoutProvider`

---

### GET `/commission/analytics`
**Description**: Get commission analytics
**Access**: Private
**Response**: `200 OK`
**Controller**: `CommissionAnalyticsController.getAnalytics`
**Service**: `CommissionAnalyticsService`

---

## Communication

**Base Path**: `/api/v1`

### POST `/email/send`
**Description**: Send email
**Access**: Private
**Request Body**:
```json
{
  "to": "customer@example.com",
  "subject": "Order Confirmation",
  "template": "order_confirmation",
  "data": { "orderNumber": "ORD-001", ... }
}
```
**Response**: `200 OK`
**Controller**: `EmailController.sendEmail`
**Service**: `EmailService.send` (SendGrid)

---

### GET `/notifications`
**Description**: Get user notifications
**Access**: Private
**Response**: `200 OK`
**Controller**: `NotificationController.getNotifications`

---

### PATCH `/notifications/:id/read`
**Description**: Mark notification as read
**Access**: Private
**Response**: `200 OK`
**Controller**: `NotificationController.markAsRead`

---

### POST `/whatsapp/send`
**Description**: Send WhatsApp message
**Access**: Private
**Request Body**:
```json
{
  "to": "+919876543210",
  "template": "order_update",
  "data": { ... }
}
```
**Response**: `200 OK`
**Controller**: `WhatsAppController.sendMessage`
**Service**: `WhatsAppService.send`

---

## Webhooks

**Base Path**: `/api/v1/webhooks`
**Authentication**: Platform-specific signature verification

### POST `/webhooks/velocity/tracking`
**Description**: Velocity tracking update webhook
**Access**: Public (signature verified)
**Headers**: `X-Velocity-Signature`
**Request Body**: Velocity tracking payload
**Response**: `200 OK`
**Middleware**: `velocityWebhookAuth`
**Controller**: `VelocityWebhookController.tracking`
**Service**: `VelocityWebhookService.processTracking`, `ShipmentService.updateTracking`, `NDRDetectionService.detectNDR`
**Model**: `Shipment`, `NDREvent`
**Test**: ✅ `velocity/webhook.integration.test.ts`

---

### POST `/webhooks/shopify/orders/create`
**Description**: Shopify order created webhook
**Access**: Public (HMAC verified)
**Headers**: `X-Shopify-Hmac-SHA256`, `X-Shopify-Shop-Domain`, `X-Shopify-Topic`
**Request Body**: Shopify order payload
**Response**: `200 OK`
**Middleware**: `shopifyWebhookAuth`
**Controller**: `ShopifyWebhookController.orderCreate`
**Service**: `ShopifyOrderSyncService.importOrder`
**Job**: `shopify-webhook-processor` (BullMQ)
**Model**: `Order`, `ShopifySyncLog`
**Test**: ✅ `shopify/complete-flow.integration.test.ts`

---

### POST `/webhooks/shopify/orders/updated`
**Description**: Shopify order updated webhook
**Access**: Public (HMAC verified)
**Controller**: `ShopifyWebhookController.orderUpdated`

---

### POST `/webhooks/woocommerce/orders/create`
**Description**: WooCommerce order created webhook
**Access**: Public (signature verified)
**Headers**: `X-WC-Webhook-Signature`
**Controller**: `WooCommerceWebhookController.orderCreate`
**Service**: `WooCommerceOrderSyncService.importOrder`
**Test**: ✅ `woocommerce/complete-flow.integration.test.ts`

---

### POST `/webhooks/flipkart/orders`
**Description**: Flipkart order webhook
**Access**: Public (signature verified)
**Controller**: `FlipkartWebhookController.orderWebhook`
**Service**: `FlipkartOrderSyncService.importOrder`
**Job**: `flipkart-webhook-processor`

---

### POST `/webhooks/razorpay/payout`
**Description**: Razorpay payout status webhook
**Access**: Public (signature verified)
**Headers**: `X-Razorpay-Signature`
**Middleware**: `razorpayWebhookAuth`
**Controller**: Handled in payout processing
**Model**: `Payout`

---

## System & Audit

**Base Path**: `/api/v1`

### GET `/audit`
**Description**: Get audit logs
**Access**: Private (Admin)
**Query Params**: `userId`, `action`, `resource`, `startDate`, `endDate`, `page`, `limit`
**Response**: `200 OK`
**Controller**: `AuditController.getAuditLogs`
**Model**: `AuditLog`

---

### GET `/audit/:id`
**Description**: Get single audit log
**Access**: Private (Admin)
**Response**: `200 OK`
**Controller**: `AuditController.getAuditLogById`

---

## Public APIs

**Base Path**: `/api/v1/public` or `/api/public`

### POST `/public/address-update`
**Description**: Update delivery address (public link from email/SMS)
**Access**: Public (token-based)
**Request Body**:
```json
{
  "token": "secure-token-from-email",
  "newAddress": {
    "line1": "New Address",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400002"
  }
}
```
**Response**: `200 OK`
**Controller**: `AddressUpdateController.updateAddress`
**Service**: `ShipmentService.updateAddress`

---

## API Summary Tables

### Endpoints by Domain

| Domain | Total Endpoints | GET | POST | PUT/PATCH | DELETE |
|--------|----------------|-----|------|-----------|--------|
| **Authentication** | 17 | 3 | 12 | 0 | 2 |
| **Session Management** | 3 | 1 | 0 | 0 | 2 |
| **Account Recovery** | 6 | 2 | 4 | 0 | 0 |
| **User & Identity** | 7 | 3 | 2 | 1 | 1 |
| **Company & Organization** | 9 | 3 | 3 | 2 | 1 |
| **KYC** | 4 | 1 | 1 | 2 | 0 |
| **Orders** | 6 | 3 | 2 | 1 | 1 |
| **Shipments** | 7 | 4 | 1 | 1 | 1 |
| **Rate Cards & Zones** | 6 | 2 | 2 | 1 | 1 |
| **Warehouses** | 5 | 2 | 1 | 1 | 1 |
| **Warehouse Operations** | 9 | 3 | 3 | 3 | 0 |
| **NDR** | 14 | 9 | 4 | 0 | 0 |
| **RTO** | 4 | 2 | 1 | 1 | 0 |
| **Marketplace Integrations** | 15+ | 5+ | 6+ | 2+ | 2+ |
| **Analytics & Reporting** | 4 | 1 | 3 | 0 | 0 |
| **Commission** | 9 | 4 | 3 | 1 | 0 |
| **Communication** | 4 | 1 | 2 | 1 | 0 |
| **Webhooks** | 8 | 0 | 8 | 0 | 0 |
| **System & Audit** | 2 | 2 | 0 | 0 | 0 |
| **Public APIs** | 2 | 1 | 1 | 0 | 0 |
| **TOTAL** | **~140** | **~51** | **~59** | **~20** | **~13** |

### Authentication Requirements Matrix

| Access Level | Endpoints Count | Description |
|--------------|----------------|-------------|
| **Public** | ~35 | No authentication required (auth, webhooks, public tracking) |
| **Private (Any Authenticated)** | ~80 | Requires valid JWT token |
| **Private (Admin Only)** | ~15 | Requires admin role |
| **Private (Seller Only)** | ~10 | Requires seller role |
| **Webhook Auth** | ~8 | Platform-specific signature verification |

### Rate Limiting

| Endpoint | Rate Limit | Window |
|----------|-----------|--------|
| **POST /auth/login** | 5 requests | 15 minutes |
| **POST /auth/register** | 3 requests | 60 minutes |
| **POST /auth/reset-password** | 3 requests | 60 minutes |
| **POST /auth/verify-email** | 5 requests | 60 minutes |
| **Global (all other endpoints)** | 100 requests | 15 minutes |

### CSRF Protection

**Endpoints Requiring CSRF Token**:
- All `POST`, `PUT`, `PATCH`, `DELETE` requests (except webhooks)
- CSRF token obtained from: `GET /csrf-token`
- Header: `X-CSRF-Token: <token>`

### Test Coverage by Domain

| Domain | Test Files | Coverage | Status |
|--------|-----------|----------|--------|
| **Authentication** | 9 integration tests | ~85% | ✅ Excellent |
| **Session Management** | Included in auth tests | ~85% | ✅ Good |
| **Orders** | Partial | ~70% | ⚠️ Needs improvement |
| **Shipments** | Partial | ~75% | ⚠️ Needs improvement |
| **Warehouse** | 4 unit tests | ~88% | ✅ Good |
| **NDR/RTO** | 5 unit tests + 1 integration | ~84% | ✅ Good |
| **Shopify** | 2 unit + 1 integration | ~85% | ✅ Excellent |
| **WooCommerce** | 1 integration | ~85% | ✅ Good |
| **Velocity** | 3 unit + 2 integration | ~89% | ✅ Excellent |
| **Analytics** | 4 unit tests | ~90% | ✅ Excellent |
| **Commission** | Partial | ~75% | ⚠️ Needs tests |
| **Wallet** | 1 unit test | ~85% | ✅ Good |

---

## Notes

### API Versioning
- **Current Version**: v1
- **Base Path**: `/api/v1`
- **Future versions**: Will be `/api/v2`, `/api/v3` maintaining backward compatibility

### Response Format
All API responses follow this standard format:

**Success Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

### Pagination
Endpoints supporting pagination use these query parameters:
- `page` (default: 1)
- `limit` (default: 20, max: 100)

Pagination response format:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Filtering & Sorting
Common query parameters:
- `search` - Text search
- `status` - Filter by status
- `startDate`, `endDate` - Date range filtering
- `sortBy` - Field to sort by
- `sortOrder` - `asc` or `desc`

### File Uploads
- **Max file size**: 5MB (configurable)
- **Allowed formats**: CSV, PDF, JPG, PNG (depending on endpoint)
- **Content-Type**: `multipart/form-data`

### Webhooks
- All webhooks are **idempotent** (can be safely retried)
- Webhook events are logged in `WebhookEvent` model
- Failed webhooks are retried with exponential backoff
- Dead letter queue for permanently failed webhooks

### Security Features
✅ **Implemented**:
- HTTPS enforcement (production)
- JWT authentication with short-lived tokens
- httpOnly cookies for token storage
- CSRF protection on state-changing requests
- Rate limiting (global and endpoint-specific)
- Input validation (Zod schemas)
- SQL injection prevention (Mongoose parameterized queries)
- XSS prevention (input sanitization)
- ReDoS protection (regex validation)
- Webhook signature verification
- Audit logging for all actions

---

**End of API Inventory**
