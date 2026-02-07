# Admin Rate Card Testing Checklist

## Overview
This document provides a comprehensive testing checklist for the admin rate card management system that was implemented to fix the 401 "User is not associated with any company" error.

---

## Backend Testing

### 1. Authentication & Authorization
- [ ] Platform admin can access all admin rate card endpoints
- [ ] Super admin can access all admin rate card endpoints
- [ ] Non-admin users receive 403 Forbidden when accessing admin endpoints
- [ ] Unauthenticated requests receive 401 Unauthorized

### 2. GET /api/v1/admin/ratecards (List All Rate Cards)
- [ ] Returns all rate cards across all companies
- [ ] Filters by status (draft, active, inactive, expired) work correctly
- [ ] Filters by companyId work correctly
- [ ] Search by name works (case-insensitive)
- [ ] Pagination works (page, limit parameters)
- [ ] Response includes populated company details (name, email, phone)
- [ ] Response includes populated zone rules with zone names
- [ ] Only non-deleted rate cards are returned
- [ ] Empty results return proper structure with empty array

### 3. GET /api/v1/admin/ratecards/stats (Statistics)
- [ ] Returns correct total count
- [ ] Returns correct count by status (active, inactive, draft)
- [ ] Returns top 10 companies by rate card count
- [ ] Company names are properly populated in topCompanies array
- [ ] Statistics update after creating/deleting rate cards

### 4. GET /api/v1/admin/ratecards/:id (Get Single Rate Card)
- [ ] Returns rate card with valid ID
- [ ] Returns 404 for non-existent ID
- [ ] Returns 400 for invalid ObjectId format
- [ ] Returns 404 for soft-deleted rate cards
- [ ] Response includes populated company details
- [ ] Response includes populated zone rules with postal codes

### 5. POST /api/v1/admin/ratecards (Create Rate Card)
- [ ] Creates rate card successfully with valid data
- [ ] Requires companyId in request body
- [ ] Validates companyId is valid ObjectId
- [ ] Prevents duplicate name within same company
- [ ] Allows same name for different companies
- [ ] Validates base rates structure
- [ ] Validates weight rules (optional)
- [ ] Validates zone rules (optional)
- [ ] Validates effective dates format
- [ ] Creates audit log entry with admin user and company
- [ ] Returns created rate card with populated company info
- [ ] Defaults status to 'draft' if not provided
- [ ] CSRF protection works

### 6. PATCH /api/v1/admin/ratecards/:id (Update Rate Card)
- [ ] Updates rate card successfully
- [ ] Allows partial updates
- [ ] Prevents duplicate name collision when changing name
- [ ] Allows keeping same name
- [ ] Updates zone rules correctly
- [ ] Updates base rates correctly
- [ ] Updates effective dates correctly
- [ ] Creates audit log with changes tracked
- [ ] Returns 404 for non-existent rate card
- [ ] Returns 400 for invalid ObjectId
- [ ] CSRF protection works

### 7. DELETE /api/v1/admin/ratecards/:id (Soft Delete)
- [ ] Soft deletes rate card (sets isDeleted: true)
- [ ] Deleted rate cards don't appear in list
- [ ] Deleted rate cards can't be retrieved by ID
- [ ] Creates audit log entry for deletion
- [ ] Returns 404 if already deleted
- [ ] Returns 404 for non-existent ID
- [ ] CSRF protection works

### 8. POST /api/v1/admin/ratecards/:id/clone (Clone Rate Card)
- [ ] Creates clone with "(Copy)" suffix in name
- [ ] Clone has status 'draft'
- [ ] Clone has new _id
- [ ] Clone preserves all base rates
- [ ] Clone preserves all weight rules
- [ ] Clone preserves all zone rules
- [ ] Clone preserves company association
- [ ] Creates audit log with original ID reference
- [ ] Returns 404 for non-existent source card
- [ ] CSRF protection works

---

## Frontend Testing

### 1. Rate Cards List Page (/admin/ratecards)

#### Data Loading
- [ ] Shows loading state while fetching data
- [ ] Displays all rate cards from all companies
- [ ] Shows "No rate cards found" when empty
- [ ] Handles API errors gracefully with error message

#### Filtering
- [ ] Status filter dropdown works (All, Active, Inactive, Draft)
- [ ] Filters update the displayed cards
- [ ] Search input filters by name (real-time)
- [ ] Search + status filter work together
- [ ] Clearing search shows all cards again

#### Stats Cards
- [ ] Total rate cards count is correct
- [ ] Shows loading spinner while stats load
- [ ] Updates when cards are created/deleted

#### Rate Card Display
- [ ] Each card shows name, company name, status badge
- [ ] Status badges have correct colors (green=active, yellow=draft, gray=inactive)
- [ ] Base rates summary displays correctly
- [ ] Effective date range displays correctly
- [ ] "View Details" button navigates to detail page

#### Actions
- [ ] Clone button creates copy with "(Copy)" suffix
- [ ] Clone shows success toast
- [ ] List refreshes after clone
- [ ] Delete button shows confirmation
- [ ] Delete removes card from list
- [ ] Delete shows success toast
- [ ] Error toast appears on failed actions

### 2. Rate Card Assignment Page (/admin/ratecards/assign)

#### Data Loading
- [ ] Loads all sellers (companies) correctly
- [ ] Loads all rate cards correctly
- [ ] Loads existing assignments correctly
- [ ] Shows loading spinners during fetch

#### Stats Display
- [ ] Total rate cards count is accurate
- [ ] Total sellers count is accurate
- [ ] Active assignments count is accurate
- [ ] Stats update after assign/unassign

#### Seller Selection
- [ ] Search filters sellers by name
- [ ] Clicking seller highlights it with blue border
- [ ] Shows assigned card count badge per seller
- [ ] Badge color: green if >0 cards, yellow if 0

#### Rate Card Assignment
- [ ] Shows "No Seller Selected" message initially
- [ ] After selecting seller, shows rate card list
- [ ] Search filters rate cards by name
- [ ] Assigned cards show green background + checkmark
- [ ] Unassigned cards show default border
- [ ] Clicking card toggles assignment
- [ ] Assign shows success (green background)
- [ ] Unassign shows success (returns to default)
- [ ] Prevents clicks during mutation (shows cursor-wait)
- [ ] Updates stats immediately after assign/unassign

#### Error Handling
- [ ] Shows error toast on assignment failure
- [ ] Shows error toast on unassignment failure
- [ ] Handles network errors gracefully

---

## Integration Testing

### 1. Admin vs Seller Endpoint Separation
- [ ] Admin page uses `/api/v1/admin/ratecards` endpoints
- [ ] Seller page uses `/api/v1/ratecards` endpoints
- [ ] Admin can see rate cards from all companies
- [ ] Seller only sees their company's rate cards
- [ ] No query key collisions (admin uses ['admin', 'ratecards'], seller uses ['rateCards'])

### 2. Cache Invalidation
- [ ] Creating rate card invalidates admin list query
- [ ] Updating rate card invalidates both list and detail queries
- [ ] Deleting rate card invalidates admin list query
- [ ] Cloning rate card invalidates admin list query
- [ ] Assignment operations invalidate assignment queries

### 3. Audit Trail
- [ ] All admin actions create audit logs
- [ ] Audit logs include correct userId (admin)
- [ ] Audit logs include correct companyId (target company)
- [ ] Audit logs include action metadata (name, changes, etc.)

### 4. Route Registration
- [ ] Admin routes mounted at `/api/v1/admin/ratecards`
- [ ] No conflicts with seller routes at `/api/v1/ratecards`
- [ ] All admin routes require authentication
- [ ] All mutation routes have CSRF protection

---

## Cross-Browser Testing

### Desktop
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile
- [ ] iOS Safari
- [ ] Android Chrome

---

## Performance Testing

- [ ] List page loads in <2 seconds with 100+ rate cards
- [ ] Search/filter updates in <500ms
- [ ] No memory leaks after multiple navigations
- [ ] React Query cache cleanup works correctly

---

## Security Testing

### Authorization
- [ ] Platform admin without company can access all endpoints
- [ ] Platform admin with company can access all endpoints
- [ ] Regular user cannot access admin endpoints (403)
- [ ] Token expiration is handled correctly

### CSRF Protection
- [ ] All POST/PATCH/DELETE requests require CSRF token
- [ ] Requests without token are rejected
- [ ] Frontend includes CSRF token in headers

### Data Validation
- [ ] SQL injection attempts are sanitized
- [ ] XSS attempts in name field are escaped
- [ ] Invalid ObjectIds are rejected
- [ ] Malformed request bodies return 400 with clear errors

---

## Regression Testing

### Seller Rate Card Functionality
- [ ] Seller can still access their rate cards
- [ ] Seller cannot access other companies' rate cards
- [ ] Seller endpoints still require company context
- [ ] Creating rate card as seller works
- [ ] Updating rate card as seller works
- [ ] Deleting rate card as seller works

---

## Test Data Setup

### Create Test Companies
```javascript
// Company 1: TechCorp
{
  name: "TechCorp",
  email: "tech@example.com",
  phone: "1234567890"
}

// Company 2: LogiHub
{
  name: "LogiHub",
  email: "logi@example.com",
  phone: "0987654321"
}
```

### Create Test Rate Cards
```javascript
// Active rate card for TechCorp
{
  name: "TechCorp Standard Rates",
  companyId: "techcorp_id",
  status: "active",
  baseRates: [
    {
      carrier: "BlueDart",
      serviceType: "Surface",
      basePrice: 50,
      minWeight: 0,
      maxWeight: 10
    }
  ],
  effectiveDates: {
    startDate: "2024-01-01",
    endDate: "2024-12-31"
  }
}

// Draft rate card for LogiHub
{
  name: "LogiHub Express Rates",
  companyId: "logihub_id",
  status: "draft",
  baseRates: [
    {
      carrier: "DTDC",
      serviceType: "Express",
      basePrice: 75,
      minWeight: 0,
      maxWeight: 5
    }
  ],
  effectiveDates: {
    startDate: "2024-06-01"
  }
}
```

### Create Test Admin User
```javascript
{
  email: "admin@shipcrowd.com",
  role: "admin",
  companyId: null // Platform admin without company
}
```

---

## Known Issues & Limitations

None identified during implementation.

---

## Sign-off

- [ ] All backend tests passed
- [ ] All frontend tests passed
- [ ] All integration tests passed
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Regression tests passed

**Tested By:** _________________
**Date:** _________________
**Approved By:** _________________
**Date:** _________________
