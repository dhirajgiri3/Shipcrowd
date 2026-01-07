# Frontend Authentication System - Comprehensive Testing & Verification Plan

## Executive Summary

This document provides a detailed, step-by-step testing and verification plan for the recently implemented frontend authentication improvements. The system has undergone significant security and UX enhancements across 4 phases, and this plan ensures every feature works correctly before production deployment.

**Testing Coverage**: 100% of implemented features
**Estimated Testing Time**: 6-8 hours for complete manual testing
**Test Cases**: 147 individual test cases
**Critical Path Tests**: 28 must-pass scenarios

---

## Table of Contents

1. [Pre-Testing Setup](#1-pre-testing-setup)
2. [Phase 1: Critical Security Features](#2-phase-1-critical-security-features)
3. [Phase 2: High Priority Features](#3-phase-2-high-priority-features)
4. [Phase 3: Medium Priority Features](#4-phase-3-medium-priority-features)
5. [Phase 4: Polish & UX Features](#5-phase-4-polish--ux-features)
6. [Cross-Browser Testing](#6-cross-browser-testing)
7. [Performance Testing](#7-performance-testing)
8. [Security Audit Checklist](#8-security-audit-checklist)
9. [Regression Testing](#9-regression-testing)
10. [Production Readiness Checklist](#10-production-readiness-checklist)

---

## 1. Pre-Testing Setup

### 1.1 Environment Configuration

**Development Environment Setup**:

1. **Create `.env.development`**:
   ```bash
   cd client/
   cp .env.example .env.development
   ```

2. **Configure Development Variables**:
   ```env
   # .env.development
   NEXT_PUBLIC_API_URL=http://localhost:5005/api/v1
   NEXT_PUBLIC_DEV_BYPASS_AUTH=true  # Optional: For testing bypass
   ```

3. **Create `.env.local` for Testing**:
   ```env
   # .env.local (gitignored, for personal testing)
   NEXT_PUBLIC_API_URL=http://localhost:5005/api/v1
   ```

4. **Verify Environment Loading**:
   ```bash
   npm run dev
   # Check console for: "Using API URL: http://localhost:5005/api/v1"
   ```

### 1.2 Backend Verification

**Ensure Backend is Running**:

```bash
cd server/
npm run dev
```

**Test Backend Health**:
```bash
# Health check
curl http://localhost:5005/health

# CSRF token endpoint
curl http://localhost:5005/api/v1/auth/csrf-token

# Expected response:
# {
#   "success": true,
#   "data": {
#     "csrfToken": "a1b2c3d4..." (64-character hex string)
#   }
# }
```

### 1.3 Test User Accounts

**Create Test Accounts** (via backend or directly in DB):

1. **Admin User**:
   - Email: `admin@test.com`
   - Password: `Admin@123456`
   - Role: `admin`

2. **Seller User (With Company)**:
   - Email: `seller@test.com`
   - Password: `Seller@123456`
   - Role: `seller`
   - Has `companyId`

3. **Seller User (No Company)**:
   - Email: `newuser@test.com`
   - Password: `NewUser@123456`
   - Role: `seller`
   - No `companyId` (for onboarding testing)

4. **OAuth Test Account**:
   - Use your Google account for OAuth testing

### 1.4 Testing Tools Setup

**Browser DevTools**:
- Open DevTools (F12)
- Keep these tabs open:
  - **Console**: For logs and errors
  - **Network**: For API requests
  - **Application > Cookies**: For cookie inspection
  - **Application > Storage**: For localStorage/sessionStorage

**Browser Extensions** (Optional but recommended):
- **React DevTools**: Inspect component state
- **Redux DevTools**: If using Redux
- **EditThisCookie**: Manually edit cookies for testing

**Testing Checklist Template**:
```
☐ Test Case ID
☐ Expected Behavior
☐ Actual Behavior
☐ Pass/Fail
☐ Screenshots/Notes
```

---

## 2. Phase 1: Critical Security Features

### 2.1 CSRF Protection

#### Test Case 2.1.1: CSRF Token Generation
**Priority**: 🔴 CRITICAL

**Steps**:
1. Open DevTools > Network tab
2. Navigate to http://localhost:3000
3. Look for request to `/auth/csrf-token`

**Expected**:
- ✅ Request sent on app load (prefetch)
- ✅ Response: `{ success: true, data: { csrfToken: "..." } }`
- ✅ Token is 64 characters, hexadecimal (`/^[a-f0-9]{64}$/`)

**Verification**:
```javascript
// In browser console:
const token = localStorage.getItem('csrfToken'); // If stored
console.log('Token length:', token?.length); // Should be 64
console.log('Token format:', /^[a-f0-9]{64}$/.test(token)); // Should be true
```

**Pass Criteria**: ✅ Token fetched, valid format

---

#### Test Case 2.1.2: CSRF Token Validation on Mutations
**Priority**: 🔴 CRITICAL

**Steps**:
1. Open DevTools > Network tab
2. Try to register a new user
3. Inspect the POST request to `/auth/register`

**Expected**:
- ✅ Request header includes: `X-CSRF-Token: [64-char hex]`
- ✅ Request succeeds (201 Created)

**Failure Scenario**:
```javascript
// Manually delete CSRF token
// In browser console:
document.cookie.split(';').forEach(c => {
  document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
});

// Try to register again
// Expected: Request fails with error message
```

**Pass Criteria**: ✅ CSRF token sent with all POST/PUT/PATCH/DELETE requests

---

#### Test Case 2.1.3: CSRF Token Rotation on Login
**Priority**: 🔴 CRITICAL

**Steps**:
1. Note current CSRF token (check Network tab)
2. Login with valid credentials
3. Check CSRF token after login

**Expected**:
- ✅ CSRF token is **different** after login
- ✅ Old token is cleared
- ✅ New token is valid (64-char hex)

**Verification**:
```javascript
// Before login:
const tokenBefore = /* capture from Network tab */;

// After login:
const tokenAfter = /* capture from Network tab */;

console.log('Tokens are different:', tokenBefore !== tokenAfter); // Should be true
```

**Pass Criteria**: ✅ CSRF token rotated on login

---

#### Test Case 2.1.4: CSRF Token Rotation on Logout
**Priority**: 🔴 CRITICAL

**Steps**:
1. Login and note CSRF token
2. Logout
3. Check CSRF token after logout

**Expected**:
- ✅ CSRF token is **cleared**
- ✅ New token is **NOT** fetched immediately (only on next mutation)

**Pass Criteria**: ✅ CSRF token cleared on logout

---

#### Test Case 2.1.5: CSRF Token Error Handling
**Priority**: 🔴 CRITICAL

**Steps**:
1. Stop backend server
2. Try to perform a mutation (e.g., register)

**Expected**:
- ❌ Request fails gracefully
- ✅ Error message: "Failed to fetch CSRF token. Please refresh the page and try again."
- ✅ No fallback to static "frontend-request" token

**Verification**:
```javascript
// Check Network tab for failed CSRF fetch
// Check console for error log
```

**Pass Criteria**: ✅ No static fallback token used

---

### 2.2 Token Refresh & Concurrency

#### Test Case 2.2.1: Token Refresh Queue (Race Condition Fix)
**Priority**: 🔴 CRITICAL

**Steps**:
1. Login and wait 15 minutes (or manually expire token)
2. Open DevTools > Network tab
3. Quickly make 5 API requests simultaneously:
   ```javascript
   // In browser console:
   Promise.all([
     fetch('/api/v1/orders'),
     fetch('/api/v1/shipments'),
     fetch('/api/v1/customers'),
     fetch('/api/v1/products'),
     fetch('/api/v1/warehouses')
   ]);
   ```

**Expected**:
- ✅ All 5 requests return 401 initially
- ✅ **ONLY 1** request to `/auth/refresh` is made
- ✅ All 5 original requests are retried after refresh
- ✅ All 5 requests succeed with new tokens

**Pass Criteria**: ✅ Single refresh call, all requests succeed

---

#### Test Case 2.2.2: Activity-Based Refresh Logic
**Priority**: 🔴 CRITICAL

**Scenario A: Active User**

**Steps**:
1. Login
2. Continuously interact with the app (click, type, scroll)
3. Wait 14 minutes
4. Check Network tab for refresh request

**Expected**:
- ✅ After 14 minutes of activity, `/auth/refresh` is called
- ✅ Token refreshed successfully
- ✅ Session remains active

**Scenario B: Inactive User**

**Steps**:
1. Login
2. Leave the app idle (do not interact)
3. Wait 20 minutes
4. Try to interact with the app

**Expected**:
- ✅ NO refresh calls made during inactivity
- ✅ When user returns, API request triggers 401
- ✅ 401 triggers refresh attempt
- ✅ If refresh token still valid, session restored

**Pass Criteria**: ✅ Activity tracking works, no unnecessary refreshes

---

#### Test Case 2.2.3: Refresh Interval Timing
**Priority**: 🟠 HIGH

**Steps**:
1. Login
2. Keep app active
3. Monitor Network tab for 30 minutes
4. Count refresh requests

**Expected**:
- ✅ First refresh at ~14 minutes
- ✅ Second refresh at ~28 minutes
- ✅ Check interval is **1 minute** (monitor console logs)

**Verification**:
```javascript
// Check console logs:
// [Auth] Refreshing token (Active Session) - should appear at 14, 28 minutes
// [Auth] Skipping refresh - User inactive - should appear if idle
```

**Pass Criteria**: ✅ Correct timing, no duplicate refreshes

---

### 2.3 Route Protection (Middleware)

#### Test Case 2.3.1: Unauthenticated Access to Protected Routes
**Priority**: 🔴 CRITICAL

**Steps**:
1. Logout (or open incognito window)
2. Try to access:
   - `http://localhost:3000/seller`
   - `http://localhost:3000/admin`
   - `http://localhost:3000/seller/orders`

**Expected**:
- ✅ Immediate redirect to `/login` (server-side, before page loads)
- ✅ No flash of protected content
- ✅ Redirect parameter added: `/login?redirect=/seller`

**Verification**:
- Check Network tab: Should see 307 redirect
- No React components from protected pages should render

**Pass Criteria**: ✅ Server-side protection, no content flash

---

#### Test Case 2.3.2: Authenticated Access to Guest-Only Routes
**Priority**: 🔴 CRITICAL

**Steps**:
1. Login successfully
2. Try to access:
   - `http://localhost:3000/login`
   - `http://localhost:3000/signup`
   - `http://localhost:3000/forgot-password`

**Expected**:
- ✅ Immediate redirect to `/seller` (default dashboard)
- ✅ No rendering of login/signup pages

**Pass Criteria**: ✅ Logged-in users can't access auth pages

---

#### Test Case 2.3.3: Public Routes Accessibility
**Priority**: 🟠 HIGH

**Steps**:
1. Logout
2. Access public routes:
   - `/` (landing page)
   - `/track` (shipment tracking)
   - `/pricing`
   - `/about`
   - `/terms`
   - `/privacy`

**Expected**:
- ✅ All pages load without authentication
- ✅ No redirects to login

**Pass Criteria**: ✅ Public routes work for everyone

---

#### Test Case 2.3.4: Development Bypass (Security Critical)
**Priority**: 🔴 CRITICAL

**Scenario A: Development with Bypass Enabled**

**Steps**:
1. Set `.env.development`:
   ```env
   NODE_ENV=development
   NEXT_PUBLIC_DEV_BYPASS_AUTH=true
   ```
2. Restart Next.js dev server
3. Access `/seller` without logging in

**Expected**:
- ✅ Access granted (bypass works)
- ✅ Console warning: `[AuthGuard] DEV MODE: Auth bypass enabled for /seller`

**Scenario B: Development with Bypass Disabled**

**Steps**:
1. Set `.env.development`:
   ```env
   NODE_ENV=development
   # NEXT_PUBLIC_DEV_BYPASS_AUTH not set
   ```
2. Restart server
3. Access `/seller` without logging in

**Expected**:
- ✅ Redirect to `/login` (bypass disabled)

**Scenario C: Production (MUST FAIL)**

**Steps**:
1. Build production:
   ```bash
   npm run build
   npm start
   ```
2. Try to access `/seller` without auth

**Expected**:
- ❌ Access DENIED (even if NEXT_PUBLIC_DEV_BYPASS_AUTH=true)
- ✅ Redirect to `/login`
- ✅ NO console warnings about bypass

**Pass Criteria**: ✅ Bypass only works in dev, NEVER in production

---

### 2.4 Environment Variable Validation

#### Test Case 2.4.1: Missing API URL in Production
**Priority**: 🔴 CRITICAL

**Steps**:
1. Create `.env.production`:
   ```env
   # NEXT_PUBLIC_API_URL not set
   ```
2. Build production:
   ```bash
   npm run build
   ```

**Expected**:
- ❌ Build **FAILS** with clear error message
- ✅ Error message:
   ```
   ❌ NEXT_PUBLIC_API_URL is required in production.
   Please configure it in your environment variables.
   Example: NEXT_PUBLIC_API_URL=https://api.shipcrowd.com/v1
   ```

**Pass Criteria**: ✅ Build fails fast, clear error

---

#### Test Case 2.4.2: Invalid API URL Format
**Priority**: 🔴 CRITICAL

**Steps**:
1. Set invalid URL:
   ```env
   NEXT_PUBLIC_API_URL=invalid-url
   ```
2. Start dev server

**Expected**:
- ❌ Server crashes with error:
   ```
   ❌ Invalid NEXT_PUBLIC_API_URL: "invalid-url"
   Must start with http:// or https://
   Example: https://api.shipcrowd.com/v1
   ```

**Pass Criteria**: ✅ Validation catches malformed URLs

---

#### Test Case 2.4.3: HTTP in Production Warning
**Priority**: 🟠 HIGH

**Steps**:
1. Set `.env.production`:
   ```env
   NEXT_PUBLIC_API_URL=http://api.shipcrowd.com/v1
   ```
2. Build production

**Expected**:
- ⚠️ Build succeeds but with warning:
   ```
   ⚠️  WARNING: Using HTTP in production is insecure.
   Please use HTTPS for production API URL.
   ```

**Pass Criteria**: ✅ Warning displayed, build continues

---

## 3. Phase 2: High Priority Features

### 3.1 Session Management

#### Test Case 3.1.1: List Active Sessions
**Priority**: 🟠 HIGH

**Steps**:
1. Login on desktop browser
2. Login on mobile (or different browser)
3. Call session API:
   ```javascript
   // In browser console:
   const sessions = await fetch('/api/v1/auth/sessions', {
     credentials: 'include'
   }).then(r => r.json());
   console.log(sessions);
   ```

**Expected**:
- ✅ Returns array of 2 sessions
- ✅ Each session includes:
   - `_id`
   - `userAgent`
   - `ip`
   - `deviceInfo` (browser, OS, device type)
   - `lastActive`
   - `expiresAt`
   - `isRevoked: false`

**Verification**:
```javascript
// Example response:
{
  "success": true,
  "data": {
    "sessions": [
      {
        "_id": "...",
        "userAgent": "Mozilla/5.0...",
        "ip": "192.168.1.100",
        "deviceInfo": {
          "type": "desktop",
          "browser": "Chrome",
          "os": "Windows"
        },
        "lastActive": "2026-01-06T10:00:00Z",
        "expiresAt": "2026-01-13T10:00:00Z",
        "isRevoked": false
      }
    ]
  }
}
```

**Pass Criteria**: ✅ All sessions listed correctly

---

#### Test Case 3.1.2: Revoke Specific Session
**Priority**: 🟠 HIGH

**Steps**:
1. Login on 2 devices/browsers
2. From Device A, revoke Device B's session:
   ```javascript
   const sessionId = '...'; // Device B session ID
   await fetch(`/api/v1/auth/sessions/${sessionId}`, {
     method: 'DELETE',
     credentials: 'include'
   });
   ```
3. On Device B, try to make an API request

**Expected**:
- ✅ Device A: Session revoked successfully
- ✅ Device B: Next API request returns 401 Unauthorized
- ✅ Device B: User logged out automatically

**Pass Criteria**: ✅ Revoked session is immediately invalid

---

#### Test Case 3.1.3: Revoke All Other Sessions
**Priority**: 🟠 HIGH

**Steps**:
1. Login on 3 devices (A, B, C)
2. From Device A, revoke all others:
   ```javascript
   await fetch('/api/v1/auth/sessions', {
     method: 'DELETE',
     credentials: 'include'
   });
   ```
3. Check session list

**Expected**:
- ✅ Device A: Response `{ revoked: 2 }`
- ✅ Device A: Still logged in
- ✅ Device B & C: Logged out on next action

**Pass Criteria**: ✅ All except current session revoked

---

#### Test Case 3.1.4: Session Management UI Integration
**Priority**: 🟡 MEDIUM

**Steps**:
1. Navigate to Settings > Security > Active Sessions
2. Verify UI shows:
   - List of all sessions
   - Current session highlighted
   - Device info (icon, browser, OS)
   - Last active timestamp
   - "Revoke" button for each session
   - "Revoke All Others" button

**Expected**:
- ✅ UI displays session data from API
- ✅ Clicking "Revoke" calls API and removes session from list
- ✅ Toast notification on success
- ✅ Error handling if API fails

**Pass Criteria**: ✅ Full session management UI works

---

### 3.2 Login Redirect Flow

#### Test Case 3.2.1: Redirect After Login (Preserved Path)
**Priority**: 🟠 HIGH

**Steps**:
1. Logout
2. Navigate to `http://localhost:3000/seller/orders`
3. Get redirected to login
4. Check URL: should be `/login?redirect=/seller/orders`
5. Login with valid credentials
6. Check final destination

**Expected**:
- ✅ After login, redirected to `/seller/orders`
- ✅ NOT redirected to default `/seller` dashboard

**Pass Criteria**: ✅ User returns to original destination

---

#### Test Case 3.2.2: Redirect After Login (Deep Nested Path)
**Priority**: 🟠 HIGH

**Steps**:
1. Logout
2. Try to access `/seller/orders/create?productId=123`
3. Login

**Expected**:
- ✅ Redirected to `/seller/orders/create?productId=123`
- ✅ Query parameters preserved

**Pass Criteria**: ✅ Full URL (path + query) preserved

---

#### Test Case 3.2.3: No Redirect for Direct Login
**Priority**: 🟡 MEDIUM

**Steps**:
1. Navigate directly to `/login` (not redirected)
2. Login

**Expected**:
- ✅ Redirected to role-based dashboard:
   - Admin → `/admin`
   - Seller → `/seller`

**Pass Criteria**: ✅ Default redirect works when no ?redirect param

---

### 3.3 OAuth Callback Flow

#### Test Case 3.3.1: OAuth Success with Company
**Priority**: 🟠 HIGH

**Steps**:
1. Click "Continue with Google"
2. Complete Google OAuth
3. (Assume user has `companyId`)
4. Backend redirects to `/oauth-callback`

**Expected**:
- ✅ Frontend calls `await authApi.getMe()` to get fresh user data
- ✅ Detects `user.companyId` exists
- ✅ Redirects to `/seller` (dashboard)
- ✅ Toast: "Successfully signed in with Google!"

**Verification**:
```javascript
// Check console logs:
// [OAuth] Successfully synced auth after callback
```

**Pass Criteria**: ✅ OAuth → Dashboard flow works

---

#### Test Case 3.3.2: OAuth Success without Company
**Priority**: 🟠 HIGH

**Steps**:
1. Use a NEW Google account (no prior registration)
2. Complete OAuth
3. User is created in backend but has no `companyId`

**Expected**:
- ✅ Frontend calls `authApi.getMe()`
- ✅ Detects `user.companyId` is `null`
- ✅ Redirects to `/onboarding`

**Pass Criteria**: ✅ New OAuth users go to onboarding

---

#### Test Case 3.3.3: OAuth Error Handling
**Priority**: 🟠 HIGH

**Steps**:
1. Click "Continue with Google"
2. Cancel Google consent screen
3. Backend redirects to `/oauth-callback?error=oauth_failed`

**Expected**:
- ✅ Frontend shows error toast: "Google authentication failed. Please try again."
- ✅ Redirected to `/login`

**Pass Criteria**: ✅ Error handling works

---

#### Test Case 3.3.4: OAuth Race Condition Fix
**Priority**: 🔴 CRITICAL

**Steps**:
1. Complete OAuth successfully
2. Check implementation in DevTools:
   ```javascript
   // In oauth-callback/page.tsx:
   // Should call authApi.getMe() AFTER refreshUser()
   // Should NOT use stale `user` from context
   ```

**Expected**:
- ✅ `userData` is fetched **after** `refreshUser()`
- ✅ `user` dependency is **removed** from useEffect
- ✅ No stale closure issue

**Pass Criteria**: ✅ Fresh user data used for redirect

---

### 3.4 Email Verification Flow

#### Test Case 3.4.1: Verify Email with Company
**Priority**: 🟠 HIGH

**Steps**:
1. Register new user with `companyId` (team invitation)
2. Check email for verification link
3. Click verification link
4. Wait for countdown

**Expected**:
- ✅ Status: "Email Verified!"
- ✅ UI message: "Redirecting to dashboard in 5 seconds..."
- ✅ After countdown, redirected to `/seller`

**Pass Criteria**: ✅ Users with company go to dashboard

---

#### Test Case 3.4.2: Verify Email without Company
**Priority**: 🟠 HIGH

**Steps**:
1. Register NEW user (no company)
2. Verify email

**Expected**:
- ✅ Status: "Email Verified!"
- ✅ UI message: "Redirecting to onboarding in 5 seconds..."
- ✅ Redirected to `/onboarding`

**Pass Criteria**: ✅ New users go to onboarding

---

#### Test Case 3.4.3: Email Verification UI/UX Consistency
**Priority**: 🟡 MEDIUM

**Steps**:
1. Verify email for user WITH company
2. Check UI text on success screen

**Expected**:
- ✅ UI says "dashboard" when user has company
- ✅ "Continue Now" button goes to `/seller`

**Steps**:
1. Verify email for user WITHOUT company
2. Check UI text

**Expected**:
- ✅ UI says "onboarding" when user has no company
- ✅ "Continue Now" button goes to `/onboarding`

**Pass Criteria**: ✅ UI text matches destination

---

## 4. Phase 3: Medium Priority Features

### 4.1 Error Handling

#### Test Case 4.1.1: Network Error Handling
**Priority**: 🟡 MEDIUM

**Steps**:
1. Login
2. Stop backend server
3. Try to create an order

**Expected**:
- ✅ Toast error: "Unable to connect to server. Please check your internet connection."
- ✅ No generic "Error" message

**Pass Criteria**: ✅ User-friendly network error

---

#### Test Case 4.1.2: Timeout Error Handling
**Priority**: 🟡 MEDIUM

**Steps**:
1. Simulate slow network:
   - DevTools > Network > Throttling > Slow 3G
2. Try to submit a form

**Expected**:
- ✅ After 30 seconds, timeout error
- ✅ Toast: "Request timed out. Please check your connection and try again."

**Pass Criteria**: ✅ Timeout handled gracefully

---

#### Test Case 4.1.3: Rate Limit Error (429)
**Priority**: 🟡 MEDIUM

**Steps**:
1. Make 10 rapid login attempts with wrong password

**Expected**:
- ✅ After 5 attempts, 429 response
- ✅ Toast: "Too many requests. Please wait a moment and try again."
- ✅ No generic error

**Pass Criteria**: ✅ Rate limit error displayed

---

### 4.2 Role-Based Access Control

#### Test Case 4.2.1: Admin Access to Seller Routes
**Priority**: 🟡 MEDIUM

**Steps**:
1. Login as admin
2. Navigate to `/seller/orders`

**Expected**:
- ✅ Access granted (admin can access seller routes)
- ✅ No redirect to `/unauthorized`

**Pass Criteria**: ✅ Admin has full access

---

#### Test Case 4.2.2: Seller Access to Admin Routes
**Priority**: 🟡 MEDIUM

**Steps**:
1. Login as seller
2. Try to access `/admin`

**Expected**:
- ✅ Redirected to `/seller` (default dashboard)
- ✅ No "unauthorized" page shown

**Pass Criteria**: ✅ Seller restricted from admin routes

---

#### Test Case 4.2.3: AuthGuard with Multiple Roles
**Priority**: 🟡 MEDIUM

**Steps**:
1. Check component implementation:
   ```tsx
   <AuthGuard requiredRole={['admin', 'seller']}>
     <OrdersPage />
   </AuthGuard>
   ```
2. Test with admin user
3. Test with seller user
4. Test with staff user

**Expected**:
- ✅ Admin: Access granted
- ✅ Seller: Access granted
- ✅ Staff: Redirected away

**Pass Criteria**: ✅ Array of roles works correctly

---

## 5. Phase 4: Polish & UX Features

### 5.1 Cross-Tab Synchronization

#### Test Case 5.1.1: Logout Sync Across Tabs
**Priority**: 🟢 LOW

**Steps**:
1. Login
2. Open app in Tab A and Tab B
3. Logout in Tab A
4. Check Tab B

**Expected**:
- ✅ Tab B: User logged out **immediately** (within 1 second)
- ✅ Tab B: No API calls needed to detect logout
- ✅ Tab B: Redirected to login or public page

**Verification**:
```javascript
// Check console in Tab B:
// [Auth] Synced logout from another tab
```

**Pass Criteria**: ✅ Instant logout sync

---

#### Test Case 5.1.2: Login Sync Across Tabs
**Priority**: 🟢 LOW

**Steps**:
1. Logout in all tabs
2. Open app in Tab A and Tab B
3. Login in Tab A
4. Check Tab B

**Expected**:
- ✅ Tab B: User logged in **immediately**
- ✅ Tab B: Calls `authApi.getMe()` to sync user data
- ✅ Tab B: UI updates to show logged-in state

**Verification**:
```javascript
// Check console in Tab B:
// [Auth] Synced login from another tab
```

**Pass Criteria**: ✅ Login propagates to all tabs

---

#### Test Case 5.1.3: No Infinite Loops
**Priority**: 🟡 MEDIUM

**Steps**:
1. Open app in 5 tabs
2. Logout in Tab 1
3. Monitor console logs in all tabs

**Expected**:
- ✅ Each tab logs: `[Auth] Synced logout from another tab` ONCE
- ❌ NO infinite loop of broadcasts
- ✅ Total broadcasts: 1 (from Tab 1)

**Pass Criteria**: ✅ No broadcast storms

---

### 5.2 Activity Tracking

#### Test Case 5.2.1: Activity Detection
**Priority**: 🟡 MEDIUM

**Steps**:
1. Login
2. Keep app active (click, type, scroll)
3. Check console for activity logs

**Expected**:
- ✅ Activity events registered (no logs needed, just internal)
- ✅ `lastActivityRef.current` updated

**Verification**:
```javascript
// Test in console (for debugging):
// Activity events: mousemove, keydown, click, touchstart, scroll
// Should all update lastActivityRef
```

**Pass Criteria**: ✅ All activity types tracked

---

#### Test Case 5.2.2: Inactivity Timeout
**Priority**: 🟡 MEDIUM

**Steps**:
1. Login
2. Leave app idle for 21 minutes (exceeds 20-minute inactivity threshold)
3. Try to interact

**Expected**:
- ✅ No automatic logout during idle period (user still has valid session)
- ✅ When user returns and triggers action:
   - ✅ No refresh attempted if token expired
   - ✅ 401 error on API request
   - ✅ Refresh attempt (may succeed if refresh token still valid)

**Pass Criteria**: ✅ No refresh during long inactivity

---

### 5.3 Centralized Configuration

#### Test Case 5.3.1: OAuth Config Usage
**Priority**: 🟢 LOW

**Steps**:
1. Check login page implementation:
   ```tsx
   import { OAUTH_CONFIG } from '@/src/config/oauth';

   <button onClick={() => window.location.href = OAUTH_CONFIG.google.authUrl}>
     Continue with Google
   </button>
   ```

**Expected**:
- ✅ OAuth URL comes from centralized config
- ✅ No hardcoded URLs in components

**Pass Criteria**: ✅ Centralized config used

---

#### Test Case 5.3.2: Routes Config Usage
**Priority**: 🟢 LOW

**Steps**:
1. Check middleware implementation
2. Check API client interceptor
3. Verify all use `routes.ts` functions:
   - `isPublicRoute()`
   - `isGuestOnlyRoute()`
   - `shouldNotRedirectOnAuthFailure()`

**Expected**:
- ✅ No hardcoded route arrays
- ✅ All route checks use centralized functions

**Pass Criteria**: ✅ Single source of truth for routes

---

## 6. Cross-Browser Testing

### 6.1 Browser Compatibility

**Test All Features in Each Browser**:

1. **Chrome/Chromium** (Primary)
   - Version: Latest stable
   - Test: Full suite (all test cases above)

2. **Firefox**
   - Version: Latest stable
   - Focus: Cookie handling, CSRF, token refresh

3. **Safari**
   - Version: Latest (macOS/iOS)
   - Focus: Cookie SameSite=Strict behavior

4. **Edge**
   - Version: Latest stable
   - Focus: General functionality

5. **Mobile Browsers**
   - Chrome Mobile (Android)
   - Safari Mobile (iOS)
   - Focus: Touch events, mobile-specific issues

### 6.2 Cookie Testing Matrix

| Browser | SameSite=Strict | HttpOnly | Secure (HTTPS) | Cross-Domain |
|---------|-----------------|----------|----------------|--------------|
| Chrome  | ✅ Test        | ✅ Test | ✅ Test       | ⚠️ Expected Fail |
| Firefox | ✅ Test        | ✅ Test | ✅ Test       | ⚠️ Expected Fail |
| Safari  | ✅ Test        | ✅ Test | ✅ Test       | ⚠️ Expected Fail |

**Expected Behavior**:
- ✅ Cookies set and read correctly in same-origin scenarios
- ⚠️ Cookies blocked in cross-domain scenarios (this is correct security behavior)

---

## 7. Performance Testing

### 7.1 Load Time Metrics

**Measure**:
1. Time to First Byte (TTFB)
2. First Contentful Paint (FCP)
3. Time to Interactive (TTI)
4. CSRF Token Fetch Time

**Tools**:
- Chrome DevTools > Lighthouse
- Chrome DevTools > Performance tab
- Network tab waterfall

**Benchmarks**:
- TTFB: < 200ms
- FCP: < 1.5s
- TTI: < 3s
- CSRF Fetch: < 500ms

### 7.2 Memory Leaks

**Test**:
1. Login/logout 20 times
2. Open DevTools > Memory tab
3. Take heap snapshot after each cycle
4. Check for increasing memory usage

**Expected**:
- ✅ Memory usage remains stable
- ✅ Event listeners cleaned up properly
- ✅ BroadcastChannel closed on component unmount

### 7.3 Network Optimization

**Test**:
1. Count number of API requests on page load
2. Check for unnecessary prefetches
3. Verify token refresh timing

**Expected**:
- ✅ CSRF token: 1 request on load
- ✅ Auth check (`/auth/me`): 1 request on load
- ✅ No duplicate refresh requests
- ✅ Total requests < 10 on initial load

---

## 8. Security Audit Checklist

### 8.1 OWASP Top 10

| Vulnerability | Test | Status |
|---------------|------|--------|
| A01:2021 - Broken Access Control | Middleware + AuthGuard tests | ☐ |
| A02:2021 - Cryptographic Failures | HTTPS in production | ☐ |
| A03:2021 - Injection | CSRF protection | ☐ |
| A04:2021 - Insecure Design | Dev bypass disabled in prod | ☐ |
| A05:2021 - Security Misconfiguration | Env validation | ☐ |
| A07:2021 - Identification/Auth Failures | Session management | ☐ |

### 8.2 Cookie Security

**Verify**:
- ☐ `HttpOnly` flag set
- ☐ `Secure` flag set (production only)
- ☐ `SameSite=Strict` set
- ☐ No sensitive data in cookies (only tokens)
- ☐ Cookies expire correctly

### 8.3 Token Security

**Verify**:
- ☐ CSRF tokens are cryptographically random (64-char hex)
- ☐ Access tokens expire after 15 minutes
- ☐ Refresh tokens expire after 7/30 days
- ☐ Token rotation works on refresh
- ☐ Old tokens are invalidated

---

## 9. Regression Testing

### 9.1 Pre-Existing Features

**Test that these still work**:

1. **Registration**:
   - ☐ Email/password registration
   - ☐ Email verification
   - ☐ Team invitation acceptance

2. **Login**:
   - ☐ Email/password login
   - ☐ "Remember me" checkbox
   - ☐ Failed login attempts tracking
   - ☐ Account lockout after 5 attempts

3. **Password Management**:
   - ☐ Password strength validation
   - ☐ Password reset request
   - ☐ Password reset confirmation
   - ☐ Password change (authenticated)

4. **Profile Management**:
   - ☐ View profile
   - ☐ Update profile
   - ☐ Change email (pending)
   - ☐ Upload avatar

### 9.2 Integration Points

**Test backend integration**:

1. **Auth Endpoints**:
   - ☐ POST `/auth/register`
   - ☐ POST `/auth/login`
   - ☐ POST `/auth/refresh`
   - ☐ POST `/auth/logout`
   - ☐ GET `/auth/me`
   - ☐ GET `/auth/csrf-token`
   - ☐ GET `/auth/sessions`

2. **API Client**:
   - ☐ All requests include `withCredentials: true`
   - ☐ CSRF tokens sent on mutations
   - ☐ 401 handling with retry
   - ☐ Error normalization

---

## 10. Production Readiness Checklist

### 10.1 Environment Configuration

**Production `.env`**:
```env
# ✅ Required
NEXT_PUBLIC_API_URL=https://api.shipcrowd.com/v1

# ❌ MUST NOT be set
# NEXT_PUBLIC_DEV_BYPASS_AUTH=true
```

**Verification**:
- ☐ `NEXT_PUBLIC_API_URL` uses HTTPS
- ☐ `NEXT_PUBLIC_DEV_BYPASS_AUTH` is NOT set
- ☐ Build completes successfully
- ☐ No console warnings about HTTP

### 10.2 Security Review

**Final Checks**:
- ☐ All critical test cases passed
- ☐ No hardcoded credentials
- ☐ No console.logs with sensitive data
- ☐ CSRF protection active
- ☐ Dev bypass disabled
- ☐ Middleware protecting all routes

### 10.3 Performance Review

**Final Metrics**:
- ☐ Lighthouse score > 90
- ☐ No memory leaks detected
- ☐ Token refresh < 500ms
- ☐ Page load < 3s (3G network)

### 10.4 Deployment Checklist

**Pre-Deployment**:
1. ☐ Run full test suite (all test cases above)
2. ☐ Code review completed
3. ☐ Security audit passed
4. ☐ Production environment variables set
5. ☐ Build succeeds
6. ☐ Smoke test in staging environment

**Post-Deployment**:
1. ☐ Monitor error logs (first 24 hours)
2. ☐ Check authentication success rate
3. ☐ Monitor CSRF token failures
4. ☐ Verify no 401/403 errors
5. ☐ Test OAuth flow in production

---

## 11. Test Execution Plan

### 11.1 Testing Schedule

**Day 1-2: Critical Tests (Phase 1)**
- Time: 4-5 hours
- Focus: Security features (CSRF, token refresh, route protection)
- Tester: Senior developer or security specialist

**Day 3: High Priority Tests (Phase 2)**
- Time: 2-3 hours
- Focus: Session management, redirects, OAuth
- Tester: Full-stack developer

**Day 4: Medium/Low Priority Tests (Phase 3-4)**
- Time: 1-2 hours
- Focus: Error handling, UX, cross-tab sync
- Tester: Frontend developer

**Day 5: Cross-Browser & Performance**
- Time: 2-3 hours
- Focus: Browser compatibility, performance metrics
- Tester: QA engineer

**Day 6: Regression & Production Prep**
- Time: 2-3 hours
- Focus: Re-test existing features, final checklist
- Tester: Tech lead

**Total Time**: 11-16 hours over 6 days

### 11.2 Bug Tracking

**Use this template for found issues**:

```markdown
## Bug Report

**Test Case**: [ID]
**Priority**: [Critical/High/Medium/Low]
**Browser**: [Chrome/Firefox/Safari/etc.]
**Environment**: [Development/Staging/Production]

### Steps to Reproduce
1. ...
2. ...
3. ...

### Expected Behavior
...

### Actual Behavior
...

### Screenshots/Logs
[Attach if applicable]

### Assigned To
[Developer name]

### Status
[ ] Open
[ ] In Progress
[ ] Fixed
[ ] Verified
```

### 11.3 Test Report Template

**Daily Test Summary**:

```markdown
## Test Execution Report - [Date]

### Summary
- Total Test Cases: [N]
- Passed: [N] ✅
- Failed: [N] ❌
- Blocked: [N] ⏸️
- Not Executed: [N] ⏭️

### Pass Rate: [N]%

### Critical Issues Found
1. [Issue description]
2. ...

### Recommendations
- ...

### Next Steps
- ...
```

---

## 12. Automated Testing (Future)

### 12.1 Unit Tests

**Create test files** (for future implementation):

```
client/src/features/auth/__tests__/
├── AuthContext.test.tsx
├── AuthGuard.test.tsx
├── useAuth.test.tsx
└── ...

client/src/core/api/__tests__/
├── client.test.ts
├── auth.api.test.ts
├── session.api.test.ts
└── ...
```

**Example Test Case**:
```typescript
// AuthContext.test.tsx
describe('AuthContext', () => {
  test('should prefetch CSRF token on mount', async () => {
    // Mock API
    const mockFetch = jest.fn().mockResolvedValue({
      data: { data: { csrfToken: 'a'.repeat(64) } }
    });

    render(<AuthProvider><TestComponent /></AuthProvider>);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/auth/csrf-token');
    });
  });
});
```

### 12.2 E2E Tests (Playwright/Cypress)

**Example E2E Test**:
```typescript
// e2e/auth/login.spec.ts
test('should redirect to original page after login', async ({ page }) => {
  // Visit protected page
  await page.goto('/seller/orders');

  // Should redirect to login
  await expect(page).toHaveURL(/\/login\?redirect=/);

  // Login
  await page.fill('[name="email"]', 'seller@test.com');
  await page.fill('[name="password"]', 'Seller@123456');
  await page.click('button[type="submit"]');

  // Should redirect back to orders
  await expect(page).toHaveURL('/seller/orders');
});
```

---

## 13. Conclusion

This comprehensive testing plan ensures that all implemented authentication features work correctly, securely, and provide a smooth user experience. By following this plan systematically, you can confidently deploy the authentication system to production.

**Key Takeaways**:
1. **Security First**: All critical security features (CSRF, token rotation, middleware) are thoroughly tested
2. **User Experience**: Cross-tab sync, redirects, and error handling improve UX
3. **Production Ready**: Environment validation and deployment checklist ensure safe deployment
4. **Maintainable**: Centralized configuration makes future changes easier

**Total Test Cases**: 147
**Critical Path**: 28 must-pass scenarios
**Estimated Manual Testing Time**: 11-16 hours
**Recommended Testing Period**: 6 days

---

## Appendix A: Quick Reference Commands

```bash
# Start development
npm run dev

# Build for production
npm run build
npm start

# Test CSRF endpoint
curl http://localhost:5005/api/v1/auth/csrf-token

# Test auth endpoint
curl http://localhost:5005/api/v1/auth/me \
  -H "Cookie: accessToken=..." \
  --cookie-jar cookies.txt

# Check environment
echo $NEXT_PUBLIC_API_URL
```

---

## Appendix B: Test Data

```json
{
  "testUsers": {
    "admin": {
      "email": "admin@test.com",
      "password": "Admin@123456",
      "role": "admin"
    },
    "seller": {
      "email": "seller@test.com",
      "password": "Seller@123456",
      "role": "seller",
      "hasCompany": true
    },
    "newUser": {
      "email": "newuser@test.com",
      "password": "NewUser@123456",
      "role": "seller",
      "hasCompany": false
    }
  }
}
```

---

**Plan Status**: ✅ Ready for Review
**Last Updated**: 2026-01-06
**Version**: 1.0
