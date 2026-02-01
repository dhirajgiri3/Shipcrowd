# Super Admin User Management Feature

## Overview
Complete workflow for super admin to promote sellers to admins and manage platform users.

---

## Backend Implementation

### 1. API Endpoints

#### **GET /api/v1/admin/users**
List all users with filtering

**Query Params:**
- `role`: Filter by role (all, seller, admin, staff)
- `search`: Search by name/email
- `page`, `limit`: Pagination

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "...",
        "name": "Deepika Sharma",
        "email": "deepika@example.com",
        "role": "seller",
        "companyId": "...",
        "companyName": "Fashion Hub Store",
        "createdAt": "...",
        "canPromote": true,
        "canDemote": false
      }
    ],
    "pagination": { "total": 150, "page": 1, "pages": 15 }
  }
}
```

---

#### **POST /api/v1/admin/users/:userId/promote**
Promote seller to admin (keeps company for dual role)

**Request:**
```json
{
  "reason": "Excellent platform knowledge and leadership"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User promoted to admin successfully",
  "data": {
    "userId": "...",
    "previousRole": "seller",
    "newRole": "admin",
    "retainedCompany": true
  }
}
```

---

#### **POST /api/v1/admin/users/:userId/demote**
Demote admin to seller (keeps company)

**Request:**
```json
{
  "reason": "Role no longer needed"
}
```

---

### 2. Backend Files to Create

**Controller:** `server/src/presentation/http/controllers/admin/user-management.controller.ts`
**Service:** `server/src/core/application/services/admin/user-management.service.ts`
**Routes:** `server/src/presentation/http/routes/v1/admin/user-management.routes.ts`

---

## Frontend Implementation

### 1. Page Structure

**Route:** `/admin/users` (Super Admin Only)

**Components:**
```
AdminUsersPage/
├── UserListHeader.tsx       # Search, filters, invite button
├── UserCard.tsx             # Individual user card with actions
├── PromoteModal.tsx         # Confirmation modal for promotion
├── DemoteModal.tsx          # Confirmation modal for demotion
└── UserDetailsDrawer.tsx    # Detailed user info sidebar
```

---

### 2. UI Design (Figma-ready spec)

#### **Color Scheme:**
```css
--role-super-admin: #9333ea  /* Purple */
--role-admin: #3b82f6        /* Blue */
--role-seller: #10b981       /* Green */
--role-staff: #6b7280        /* Gray */
```

#### **Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  [← Back]  Users Management              [+ Invite User]     │
├─────────────────────────────────────────────────────────────┤
│  [All Users ▾] [All Roles ▾] [🔍 Search users...]           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ╭───────────────────────────────────────────────────────╮  │
│  │ [Avatar] Deepika Sharma                               │  │
│  │          deepika@example.com                          │  │
│  │                                                        │  │
│  │ 🏷️ Seller  •  Member since Jan 2024                  │  │
│  │ 📦 Fashion Hub Store  •  125 orders                   │  │
│  │                                                        │  │
│  │ [🔄 Promote to Admin] [View Profile →]               │  │
│  ╰───────────────────────────────────────────────────────╯  │
│                                                              │
│  ╭───────────────────────────────────────────────────────╮  │
│  │ [Avatar] Rahul Mehta                                  │  │
│  │          rahul@techstore.com                          │  │
│  │                                                        │  │
│  │ 🔱 Admin + Seller  •  Member since Dec 2023          │  │
│  │ 📦 Tech Galaxy (Dual Role)  •  456 orders            │  │
│  │                                                        │  │
│  │ [⬇️ Demote to Seller] [View Profile →]              │  │
│  ╰───────────────────────────────────────────────────────╯  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. User Experience Flow

#### **Promote Flow:**
1. Super admin clicks "Promote to Admin"
2. Modal appears:
   ```
   ┌─────────────────────────────────────┐
   │  Promote Deepika Sharma to Admin?   │
   ├─────────────────────────────────────┤
   │  This user will gain:               │
   │  ✓ Platform-wide admin access       │
   │  ✓ Keep their store (dual role)     │
   │  ✓ Ability to manage other users    │
   │                                      │
   │  Reason (optional):                 │
   │  [_____________________________]    │
   │                                      │
   │  [Cancel]  [✓ Promote to Admin]    │
   └─────────────────────────────────────┘
   ```
3. Success toast: "✓ Deepika promoted to admin"
4. Card updates to show admin badge

#### **Demote Flow:**
1. Click "Demote to Seller"
2. Modal with warning:
   ```
   ┌─────────────────────────────────────┐
   │  ⚠️ Demote Rahul to Seller?         │
   ├─────────────────────────────────────┤
   │  This user will lose:               │
   │  ✗ Platform-wide admin access       │
   │  ✓ Keep their store and orders      │
   │                                      │
   │  Reason (required):                 │
   │  [_____________________________]    │
   │                                      │
   │  [Cancel]  [Demote to Seller]      │
   └─────────────────────────────────────┘
   ```

---

### 4. Permissions & Guards

**Backend Middleware:**
```typescript
requireRole(['super_admin'])  // Only super admin can access
```

**Frontend Guard:**
```typescript
if (user.role !== 'super_admin') {
  redirect('/admin')  // Redirect non-super admins
}
```

---

### 5. Safety Features

#### **Cannot Actions:**
- ❌ Super admin cannot demote themselves
- ❌ Cannot promote to super_admin (only developer can)
- ❌ Cannot demote last super admin
- ❌ Staff cannot be promoted directly (must be owner/seller)

#### **Audit Logging:**
All role changes logged with:
- Who performed action (super admin)
- Target user
- Previous role → New role
- Reason provided
- Timestamp

---

## Database Changes

**Audit Log Entry:**
```json
{
  "performedBy": "super_admin_user_id",
  "action": "user_role_changed",
  "targetUser": "user_id",
  "changes": {
    "role": { "from": "seller", "to": "admin" },
    "companyId": "retained"
  },
  "reason": "Excellent leadership",
  "timestamp": "2026-01-23T21:00:00Z"
}
```

---

## Testing Checklist

- [ ] Super admin can view all users
- [ ] Super admin can promote seller → admin
- [ ] Admin retains company after promotion (dual role)
- [ ] Super admin can demote admin → seller
- [ ] Cannot self-demote
- [ ] Cannot promote to super_admin
- [ ] Filters work (role, search)
- [ ] Pagination works
- [ ] Audit logs created
- [ ] Regular admins cannot access this page
- [ ] Toast notifications show

---

## Priority Tasks

### Phase 1: Backend API (2-3 hours)
1. Create user-management.service.ts
2. Create user-management.controller.ts
3. Create routes with super_admin guard
4. Add audit logging

### Phase 2: Frontend Components (3-4 hours)
1. Create /admin/users page
2. Create UserCard component
3. Create modals (promote/demote)
4. Add role badges and styling
5. Connect to API

### Phase 3: Testing (1 hour)
1. Test all flows
2. Test edge cases
3. Test permissions

**Total Estimated Time: 6-8 hours**

---

## Next Steps

1. Start with backend API implementation
2. Test with Postman/Thunder Client
3. Build frontend components
4. End-to-end testing

Ready to implement? Start with backend API creation.
