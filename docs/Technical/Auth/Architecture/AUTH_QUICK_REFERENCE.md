# 🚀 Authentication System - Quick Reference Guide

## TL;DR - What Changed?

**Access tokens are NO LONGER sent in response bodies.** They're now exclusively in HTTP-Only cookies.

| Aspect | Before | After |
|--------|--------|-------|
| Token Storage | Body + Cookie | Cookie Only ✅ |
| XSS Protection | ❌ Token exposed | ✅ Secured |
| CSRF Protection | SameSite=strict | SameSite=strict ✅ |
| Test Token Extraction | `response.body.data.accessToken` | Cookie headers ✅ |

---

## Frontend Implementation (Critical!)

### Before ❌
```javascript
// DO NOT DO THIS ANYMORE
const response = await fetch('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({...}) });
const { data } = await response.json();
const token = data.accessToken; // ❌ Now undefined
localStorage.setItem('token', token); // ❌ Don't store tokens anymore
```

### After ✅
```javascript
// DO THIS INSTEAD
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  credentials: 'include', // ✅ Critical: auto-include cookies
  body: JSON.stringify({...})
});
const { data } = await response.json();
// ✅ Token is already in HTTP-Only cookie
// ✅ Browser automatically includes it in future requests
```

---

## API Changes by Endpoint

### POST `/auth/login`
**Response before:**
```json
{
  "data": { "user": {...}, "accessToken": "..." },
  "message": "Login successful"
}
```

**Response after:**
```json
{
  "data": { "user": {...} },
  "message": "Login successful"
}
```
Token is in HTTP-Only cookie.

---

### POST `/auth/refresh`
**Response before:**
```json
{
  "data": { "user": {...}, "accessToken": "..." },
  "message": "Token refreshed"
}
```

**Response after:**
```json
{
  "data": { "user": {...} },
  "message": "Token refreshed"
}
```
New token is in HTTP-Only cookie.

---

### POST `/auth/verify-email`
**Response before:**
```json
{
  "data": {
    "user": {...},
    "autoLogin": true,
    "redirectUrl": "/seller/dashboard",
    "accessToken": "..."
  }
}
```

**Response after:**
```json
{
  "data": {
    "user": {...},
    "autoLogin": true,
    "redirectUrl": "/seller/dashboard"
  }
}
```
Check `autoLogin` flag, then redirect. Token is in cookie.

---

### POST `/auth/magic-link`
**New behavior:**
```json
{
  "data": {
    "user": {...},
    "autoLogin": true,
    "redirectUrl": "/seller/dashboard"
  }
}
```

---

### POST `/auth/change-password`
**Enhanced response:**
```json
{
  "data": {
    "sessionInvalidated": true,
    "sessionsRevoked": 3
  },
  "message": "Password changed successfully..."
}
```
- All existing sessions are revoked
- User must log in again
- `sessionsRevoked` count for transparency

---

### POST `/auth/change-email`
**Enhanced behavior:**
1. ✅ Now requires password confirmation for security
2. ✅ Prevents user enumeration (doesn't reveal if email exists)
3. ✅ Sends verification email to new address

**Request:**
```json
{
  "newEmail": "newemail@example.com",
  "password": "currentPassword123!"
}
```

---

## Token Refresh Flow

### Old Flow ❌
```
1. Get token from response: localStorage.getItem('token')
2. Include in header: Authorization: Bearer {token}
3. On 401: Manually refresh
4. Get new token from response
5. Update localStorage
```

### New Flow ✅
```
1. Cookie automatically included by browser
2. No manual Authorization header needed
3. Backend checks cookie for token
4. On 401: Browser sees refresh cookie
5. Automatic token refresh via /auth/refresh
6. New token automatically in cookie
```

**Frontend code:**
```javascript
fetch('/api/v1/protected-endpoint', {
  credentials: 'include'  // ✅ This is all you need
});
```

---

## Security Improvements

| Feature | Status | Benefit |
|---------|--------|---------|
| XSS Protection | ✅ | Token not accessible to JavaScript |
| CSRF Protection | ✅ | SameSite=strict prevents CSRF |
| Session Invalidation | ✅ | Password change revokes ALL sessions |
| Email Change Verification | ✅ | Requires password + email verification |
| Audit Logging | ✅ | Failed attempts tracked |
| Input Validation | ✅ | Zod schemas on all endpoints |

---

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "code": "AUTH_INVALID_CREDENTIALS",
  "message": "Invalid credentials",
  "timestamp": "2026-01-12T21:00:00.000Z"
}
```

### Validation Error
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": [
    {
      "field": "password",
      "message": "Password must be at least 12 characters"
    }
  ]
}
```

### Error Codes Reference
| Code | Meaning |
|------|---------|
| `AUTH_REQUIRED` | No authentication |
| `AUTH_INVALID_CREDENTIALS` | Wrong password/email |
| `AUTH_ACCOUNT_LOCKED` | Too many failed attempts |
| `AUTH_ACCOUNT_DISABLED` | Account not verified |
| `AUTH_TOKEN_EXPIRED` | Session expired |
| `AUTH_TOKEN_INVALID` | Token invalid/corrupted |
| `VALIDATION_ERROR` | Input validation failed |
| `BIZ_NOT_FOUND` | User not found |

---

## CORS Configuration (Required!)

```typescript
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,  // ✅ CRITICAL: Must be true
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));
```

---

## Browser DevTools Tips

### Check Cookies
```javascript
// In browser console
document.cookie // Shows all cookies

// Check specific cookie
document.cookie.includes('accessToken') // true = cookie present
```

### Verify HTTP-Only Flag
```
DevTools → Application → Cookies → {domain}
Look for "accessToken" or "__Secure-accessToken"
Verify "HttpOnly" column shows ✓
Verify "SameSite" column shows "Strict"
```

### Test API Call
```javascript
// Include cookies automatically
fetch('/api/v1/auth/me', {
  credentials: 'include'
})
.then(r => r.json())
.then(d => console.log(d.data.user))
```

---

## Session Management

### Device-Specific Limits
- **Desktop:** Max 1 active session
- **Mobile:** Max 2 active sessions (including tablets)
- **Global:** Max 5 total sessions across all devices

### Auto-Revocation Scenarios
1. ✅ Password change → All sessions revoked
2. ✅ 30+ failed login attempts → Account locked
3. ✅ Inactivity timeout → Session expires (8 hours default)
4. ✅ Desktop limit reached → Oldest desktop revoked
5. ✅ Mobile limit reached → Oldest mobile revoked

---

## Migration Checklist for Frontend

- [ ] Update all `fetch()` calls to use `credentials: 'include'`
- [ ] Remove manual token storage from localStorage
- [ ] Remove manual token setting in headers
- [ ] Remove Bearer token handling code
- [ ] Update login flow to check for auto-login flag
- [ ] Update redirect logic after email verification
- [ ] Test with DevTools → Network → Cookies visible
- [ ] Test cookie persistence across page reloads
- [ ] Test refresh token flow (should be automatic)
- [ ] Test multi-tab sync (cookies shared across tabs)

---

## Troubleshooting

### "Credentials mode is 'include' but CORS doesn't allow it"
**Fix:** Set `credentials: true` in CORS config

### Token not being sent in requests
**Fix:** Add `credentials: 'include'` to fetch/axios calls

### Cookie not visible in DevTools
**Fix:** Check if site is on HTTPS in production (cookies need secure flag)

### "Cannot access token from response"
**Fix:** Token is now in cookie, not in response body. Update frontend code.

### Session expires immediately
**Fix:** Check inactivity timeout. Default is 8 hours. Adjust `SESSION_TIMEOUT_MS`

### Multiple simultaneous logins not working
**Fix:** Check session limits. Desktop max is 1. Mobile max is 2.

---

## Testing Auth Endpoints

### 1. Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123!"}' \
  -v  # Shows cookies
```

### 2. Get Current User (uses cookie)
```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -b "accessToken=<token-from-step-1>" \  # Pass cookie
  -v
```

### 3. Change Password (requires auth + password)
```bash
curl -X POST http://localhost:3000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -b "accessToken=<token>" \
  -d '{"currentPassword":"OldPass123!","newPassword":"NewPass123!"}' \
  -v
```

---

## Rate Limiting

Sensitive endpoints are rate-limited:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/login` | 5 attempts | 15 minutes |
| `/auth/register` | 3 attempts | 1 hour |
| `/auth/reset-password` | 5 attempts | 1 hour |
| `/auth/verify-email` | 10 attempts | 1 hour |

If rate limited: `429 Too Many Requests`

---

## Environment Variables

```bash
# Session
SESSION_TIMEOUT_MS=28800000  # 8 hours
MAX_SESSIONS_PER_USER=5
MAX_DESKTOP_SESSIONS=1
MAX_MOBILE_SESSIONS=2

# Production
NODE_ENV=production  # Forces HTTPS for cookies
SECURE_COOKIES=true  # Requires HTTPS

# Email
MAIL_FROM=noreply@Shipcrowd.com
```

---

## Summary of Breaking Changes

| Item | Old Behavior | New Behavior | Action Required |
|------|--------------|--------------|-----------------|
| Token Storage | Response body | HTTP-Only cookie | Update frontend |
| Token Access | JavaScript | Browser only | Remove manual storage |
| Refresh | Manual | Automatic | Remove refresh logic |
| Auto-login | Manual redirect | Automatic if autoLogin=true | Update email verification flow |
| Password Change | No logout | All sessions revoked | Inform user |
| Email Change | Direct | Requires password + verification | Update form |

---

**Need more details?** See [AUTH_SYSTEM_ENHANCEMENTS.md](AUTH_SYSTEM_ENHANCEMENTS.md)

**Questions about implementation?** Check inline code comments in `server/src/presentation/http/controllers/auth/auth.controller.ts`
