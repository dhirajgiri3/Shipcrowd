# ShipCrowd API Testing - Collection 01 COMPLETE

## ✅ What's Been Created

**Collection:** 01 - Authentication & Identity  
**Status:** ✅ PRODUCTION READY  
**Format:** Postman Collection v2.1.0

---

## 📦 Import Instructions

### Quick Setup (2 minutes)

**Step 1: Import Environment**
```
File → Import → postman/environments/shipcrowd.postman_environment.json
```

**Step 2: Activate Environment**
```
Click checkmark next to "ShipCrowd API - Development"
```

**Step 3: Import Collection** 
```
File → Import → postman/collections/01-Authentication-Identity.postman_collection.json
```

**Step 4: Start Testing!**
```
1. Open Collection 01
2. Folder "1. Setup & Health"
3. Run "Health Check"
4. Run "Get CSRF Token"
5. Folder "2. Registration & Email"
6. Run "Register New User"
7. Run "Login with Email & Password"
✅ You're authenticated! 
```

---

## 🎯 What You Can Test

### ✅ Complete Authentication Flow (11 folders, 34 endpoints)

**1. Setup & Health** (2 endpoints)
- Health Check
- Get CSRF Token

**2. Registration & Email** (4 endpoints)
- Register New User
- Verify Email  
- Resend Verification
- Check Password Strength

**3. Login & Tokens** (3 endpoints)
- Login with Email/Password
- Refresh Access Token
- Get Current User

**4. Password Management** (3 endpoints)
- Request Password Reset
- Reset Password with Token
- Change Password

**5. Magic Link** (2 endpoints)
- Request Magic Link
- Verify Magic Link

**6. Account Recovery** (2 endpoints)
- Request Account Unlock
- Verify Recovery Token

**7. User Operations** (3 endpoints)
- Get Current User
- Set Password (OAuth users)
- Logout

**8. Email Management** (2 endpoints)
- Change Email
- Verify Email Change

**9. Session Management** (3 endpoints)
- Get All Sessions
- Revoke Specific Session
- Revoke All Sessions

**10. Profile Management** (8 endpoints)
- Get Profile Completion
- Update Basic Profile
- Update Address
- Update Personal Info
- Update Social Links
- Update Preferences
- Get Profile Prompts
- Dismiss Profile Prompt

**11. OAuth Integration** (2 endpoints)
- Initiate Google OAuth
- Google OAuth Callback

---

## ⚙️ Auto Features

### 🔄 Auto Token Refresh
**Completely automatic!** When your access token expires:
1. Pre-request script detects expiry
2. Calls `/auth/refresh` automatically
3. Updates `ACCESS_TOKEN` silently
4. Your request proceeds normally

**You never need to manually refresh tokens!**

### ✅ Global Test Assertions
Every request automatically tests:
- Response time < 5 seconds
- Correct content type (application/json)
- Standard response structure

### 📊 Environment Variables
**Auto-managed:**
- `ACCESS_TOKEN` - Set on login
- `REFRESH_TOKEN` - Set on login  
- `ACCESS_TOKEN_EXPIRY` - Auto-calculated
- `USER_ID`, `COMPANY_ID`, `USER_ROLE` - From user data
- `CSRF_TOKEN` - From CSRF endpoint

**Pre-configured:**
- `TEST_EMAIL` = test.seller@shipcrowd.com
- `TEST_PASSWORD` = SecurePass123!@#
- `TEST_PHONE` = +919876543210
- `BASE_URL` = http://localhost:5005/api/v1

---

## 🚀 Quick Testing Workflows

### Workflow 1: New User Registration
```
1. Get CSRF Token
2. Register New User
   → Check email for verification link (or server logs in dev)
3. Verify Email
4. Login with Email & Password
   → ACCESS_TOKEN stored automatically
5. Get Current User
   → Verify you're logged in
```

### Workflow 2: Password Reset
```
1. Get CSRF Token
2. Request Password Reset
   → Check email for reset link
3. Reset Password with Token
4. Login with new password
```

### Workflow 3: Magic Link Login
```
1. Get CSRF Token
2. Request Magic Link
   → Check email
3. Verify Magic Link
   → Automatically logged in!
```

### Workflow 4: Session Management
```
1. Login (creates session 1)
2. Login again from "another device" (session 2)
3. Get All Sessions
   → See both active sessions
4. Revoke Specific Session
   → Revoke session 1
5. Get All Sessions
   → Only session 2 remains
```

### Workflow 5: Profile Completion
```
1. Login
2. Get Profile Completion
   → See what's missing (e.g., 40% complete)
3. Update Basic Profile
4. Update Address
5. Update Preferences
6. Get Profile Completion
   → 100% complete!
```

---

## 📝 Request Examples

### Example: Register New User
```http
POST {{BASE_URL}}/auth/register
X-CSRF-Token: {{CSRF_TOKEN}}
Content-Type: application/json

{
  "email": "seller@example.com",
  "password": "SecurePass123!@#",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id-here",
      "email": "seller@example.com",
      "emailVerified": false,
      "companyId": "company-id-here",
      "role": "seller"
    }
  }
}
```

---

### Example: Login
```http
POST {{BASE_URL}}/auth/login
X-CSRF-Token: {{CSRF_TOKEN}}
Content-Type: application/json

{
  "email": "seller@example.com",
  "password": "SecurePass123!@#",
  "rememberMe": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user-id",
      "email": "seller@example.com",
      "role": "seller",
      "companyId": "company-id"
    }
  }
}
```

**Auto-Stored Variables:**
- ACCESS_TOKEN
- REFRESH_TOKEN
- USER_ID
- COMPANY_ID
- USER_ROLE

---

## 🛠️ Troubleshooting

### Issue: "401 Unauthorized"
**Cause:** No access token or expired

**Fix:**
1. Run "Login with Email & Password"
2. Token will auto-refresh if expired
3. Check `ACCESS_TOKEN` environment variable

---

### Issue: "403 Forbidden - CSRF Token Missing"
**Cause:** CSRF token not provided

**Fix:**
1. Run "Get CSRF Token"
2. Verify `CSRF_TOKEN` variable is set
3. Check request has `X-CSRF-Token` header

---

### Issue: "429 Too Many Requests"
**Cause:** Rate limit exceeded

**Fix:**
1. Wait 15 minutes for reset
2. For testing: Set `NODE_ENV=test` in server
3. Use different test account

---

### Issue: "Email Not Verified"
**Cause:** Trying to login before verification

**Fix:**
1. Check email inbox for verification link
2. Run "Verify Email" with token
3. Or run "Resend Verification Email"

---

## 📊 Collection Statistics

- **Total Endpoints:** 34
- **Total Folders:** 11
- **Public Endpoints:** 13 (no auth)
- **Protected Endpoints:** 21 (auth required)
- **CSRF Protected:** 16
- **Rate Limited:** 5
- **Auto Token Refresh:** ✅ Yes
- **Global Tests:** ✅ Yes
- **Complete Documentation:** ✅ Yes

---

## ✨ Next Steps

### Option 1: Test Collection 01 Now
1. Import environment + collection
2. Run through Quick Start workflow
3. Test all 34 endpoints systematically

### Option 2: Build Collection 02
**Organization Management**
- Company Profile (12 endpoints)
- KYC Verification (12 endpoints)
- Team Management (14 endpoints)

### Option 3: Build Collection 03
**Orders & Shipments**
- Order Creation (6 endpoints)
- Shipment Management (7 endpoints)
- Tracking & Labels

---

## 🎓 Best Practices

### DO ✅
- Run "Get CSRF Token" before state-changing operations
- Use

 Collection Runner for regression testing
- Check console logs for helpful debug info
- Keep test credentials in environment file

### DON'T ❌
- Hardcode credentials in requests
- Edit auto-managed variables manually
- Skip CSRF token for protected operations
- Test with production credentials

---

**Collection Version:** 1.0.0  
**Created:** 2026-01-10  
**Status:** ✅ PRODUCTION READY  
**Next:** Import and start testing!
