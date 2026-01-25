# 🔐 COMPLETE AUTHENTICATION ARCHITECTURE - IMPROVED & ANALYSIS

**Status**: Strategic architecture document with all issues identified and solutions provided
**Last Updated**: 2026-01-06

---

## 📋 SUMMARY OF 35 ISSUES FOUND

| # | Severity | Issue | Fix Status |
|---|----------|-------|-----------|
| 1 | 🔴 CRITICAL | Email auto-login not implemented | NOT IMPLEMENTED |
| 2 | 🔴 CRITICAL | Magic link auth missing | NOT IMPLEMENTED |
| 3 | 🔴 CRITICAL | KYC middleware missing | NOT IMPLEMENTED |
| 4 | 🟠 HIGH | KYC auto-verified without admin | WRONG LOGIC |
| 5 | 🟠 HIGH | Team role assignment broken | WRONG LOGIC |
| 6 | 🟠 HIGH | Role hierarchy not enforced | NOT IMPLEMENTED |
| 7 | 🟠 HIGH | Admin role ambiguity | DESIGN FLAW |
| 8 | 🟠 HIGH | Cross-company KYC bypass | SECURITY HOLE |
| 9 | 🟠 HIGH | OAuth users blocked from actions | MISSING LOGIC |
| 10 | 🟡 MEDIUM | Email verification 24h too long | BAD PRACTICE |
| 11 | 🟡 MEDIUM | No concurrent session limit | NOT IMPLEMENTED |
| 12 | 🟡 MEDIUM | Session activity non-blocking | BAD PRACTICE |
| 13 | 🟠 HIGH | Token rotation reuse validation | MISSING CHECK |
| 14 | 🟡 MEDIUM | Password reset no logout | MISSING UX |
| 15 | 🟡 MEDIUM | Password strength inconsistent | WRONG LOGIC |
| 16 | 🟡 MEDIUM | No rate limit password reset | NOT IMPLEMENTED |
| 17 | 🟡 MEDIUM | Resend verification broken | WRONG LOGIC |
| 18 | 🟡 MEDIUM | OAuth email change missing | MISSING LOGIC |
| 19 | 🟢 LOW | No 2FA/TOTP | NOT IMPLEMENTED |
| 20 | 🟠 HIGH | No file validation KYC | MISSING VALIDATION |
| 21 | 🟡 MEDIUM | No webhook signature check | MISSING SECURITY |
| 22 | 🟢 LOW | Profile completion unused | NOT IMPLEMENTED |
| 23 | 🟡 MEDIUM | Account deletion missing | NOT IMPLEMENTED |
| 24 | 🟢 LOW | Guest/API roles undefined | MISSING ROLES |
| 25 | 🟡 MEDIUM | No audit failed auth | MISSING LOGGING |
| 26 | 🟠 HIGH | KYC status in 2 places | DATA SYNC ISSUE |
| 27 | 🟡 MEDIUM | KYC rejection resubmit | MISSING LOGIC |
| 28 | 🟡 MEDIUM | Company suspension ignored | MISSING CHECK |
| 29 | 🟡 MEDIUM | Admin ambiguity (platform vs company) | DESIGN FLAW |
| 30 | 🟠 HIGH | No GDPR consent tracking | MISSING FEATURE |
| 31 | 🟠 HIGH | First user not owner | WRONG LOGIC |
| 32 | 🟡 MEDIUM | Invited user unclear path | UX ISSUE |
| 33 | 🟡 MEDIUM | No alternative email verify | MISSING FEATURE |
| 34 | 🟠 HIGH | OAuth user no company | MISSING LOGIC |
| 35 | 🔴 CRITICAL | Magic link promised not built | NOT IMPLEMENTED |

---

## 🔴 CRITICAL ISSUES (Must Fix Immediately)

### ISSUE #1: Email Verification Auto-Login BROKEN

**Current State** (WRONG):
```typescript
// In verifyEmail() - NO session creation
typedUser.isActive = true;
await typedUser.save();
// ❌ User must manually go to login page
sendSuccess(res, null, 'Email verified successfully');
```

**Expected** (from your doc):
- "Email Verification Auto-Login" - auto-login after verification
- "Skip login page" - go directly to dashboard

**Fix Required**:
```typescript
// FIXED:
typedUser.isActive = true;
typedUser.isEmailVerified = true;
await typedUser.save();

// ✅ Generate tokens and auto-login
const accessToken = generateAccessToken(typedUser._id, typedUser.role, typedUser.companyId);
const refreshToken = generateRefreshToken(typedUser._id, typedUser.security.tokenVersion || 0, '7d');

// ✅ Create session
await createSession(typedUser._id, refreshToken, req, expiresAt);

// ✅ Set cookies
res.cookie('__Secure-accessToken', accessToken, { httpOnly: true, secure: true });
res.cookie('__Secure-refreshToken', refreshToken, { httpOnly: true, secure: true });

// ✅ Response with redirect
sendSuccess(res, {
  user: { id, name, email, role, companyId },
  autoLogin: true,
  nextStep: 'dashboard'
}, 'Email verified. Logging you in...');
```

---

### ISSUE #2: Magic Link Authentication COMPLETELY MISSING

**Your Doc Says**: "Scenario 2: Magic Link Login" - 15min token, send email, login

**Actual Code**: ❌ NOT IMPLEMENTED AT ALL

**New Endpoints Needed**:
```typescript
POST /auth/request-magic-link
├─ Input: { email }
├─ Generate 32-byte token, 15-min expiry
├─ Store in MagicLink collection
├─ Send email with link
└─ Response: "Check email"

POST /auth/verify-magic-link
├─ Input: { token }
├─ Validate token + expiry
├─ Mark as used (prevent reuse)
├─ Generate tokens + session
├─ Response: Auto-login
└─ User redirected to dashboard
```

**Database Model Needed**:
```typescript
interface MagicLink {
  email: string;
  userId: ObjectId;
  token: string; // hashed
  expiresAt: Date; // 15 minutes
  usedAt?: Date; // null until used once
  usedBy?: ObjectId;
  ip: string;
  userAgent: string;
}
```

---

### ISSUE #3: KYC Check Middleware MISSING

**Your Doc Shows**:
```typescript
router.post('/orders',
  authenticate,
  authorize(['seller', 'admin']),
  checkKYC,  // ❌ THIS DOESN'T EXIST
  orderController.create
);
```

**Current Reality**: No middleware to check KYC before actions

**Implement**:
```typescript
export const checkKYC = async (req, res, next) => {
  const user = await User.findById(req.user._id).select('kycStatus role teamRole');

  // Admin exempt
  if (user.role === 'admin') return next();

  // Viewer exempt (read-only)
  if (user.teamRole === 'viewer') return next();

  // Check completion
  if (!user.kycStatus?.isComplete) {
    return res.status(403).json({
      code: 'KYC_REQUIRED',
      message: 'Complete KYC verification to perform this action',
      kycUrl: '/kyc',
      kycStatus: user.kycStatus
    });
  }

  next();
};

// Apply to endpoints:
const KYC_REQUIRED_ROUTES = [
  'POST /orders',
  'POST /shipments',
  'POST /wallet/withdraw',
  'PUT /companies/:id/bank'
];
```

---

### ISSUE #4: KYC Auto-Verified Without Admin Review

**Current Flow (WRONG)**:
```typescript
// When user signs agreement
if (completionStatus.personalKycComplete &&
    completionStatus.companyInfoComplete &&
    completionStatus.bankDetailsComplete &&
    completionStatus.agreementComplete) {
  kyc.status = 'verified'; // ❌ AUTO-VERIFIED!
}
```

**Correct Flow**:
1. User uploads documents → status = 'pending'
2. Admin manually reviews → status = 'verified' or 'rejected'
3. NOT: User signs agreement → Auto-verified

**Fix**:
```typescript
// When user submits:
KYC.create({
  userId,
  documents: [...],
  status: 'pending', // Always pending
  verificationNotes: null,
  rejectionReason: null
});

// Admin reviews:
export const verifyKYCDocument = async (req, res, next) => {
  const kyc = await KYC.findById(req.params.kycId);

  // Verify each document
  kyc.documents.pan.verified = true;
  kyc.documents.aadhaar.verified = true;
  kyc.documents.gstin.verified = true;
  kyc.documents.bankAccount.verified = true;

  // Only THEN mark as verified
  kyc.status = 'verified';
  await kyc.save();

  // Update user
  const user = await User.findById(kyc.userId);
  user.kycStatus.isComplete = true;
  await user.save();

  // Send email
  await sendKYCApprovedEmail(user.email);
};
```

---

### ISSUE #5: Team Role Assignment Broken in Registration

**Current (WRONG)**:
```typescript
role: validatedData.role || (teamRole ? 'staff' : 'seller')
// If invited as 'manager': role='staff' ❌
// Should be: role='seller' with teamRole='manager'
```

**Fix**:
```typescript
const user = new User({
  email: validatedData.email,
  name: validatedData.name,
  role: 'seller', // Always 'seller' for non-admin
  ...(companyId && { companyId }),
  ...(teamRole && { teamRole }), // From invitation
  isActive: false,
  isEmailVerified: false,
});
```

---

### ISSUE #31: First User Doesn't Become Company Owner

**Current (WRONG)**:
```typescript
if (!user.companyId) {
  // No company context
  // User stays without company
}
```

**Fix**:
```typescript
if (!user.companyId) {
  // CREATE FIRST COMPANY
  const company = new Company({
    name: `${user.name}'s Company`,
    owner: user._id,
    status: 'pending_verification'
  });
  await company.save();

  // AUTO-ASSIGN AS OWNER
  user.companyId = company._id;
  user.teamRole = 'owner'; // ✅ KEY FIX
  await user.save();
}
```

---

### ISSUE #34: OAuth User Has No Company Context

**Current (WRONG)**:
```typescript
// In googleCallback
const user = new User({
  email: googleProfile.email,
  name: googleProfile.name,
  // ❌ NO companyId - causes dashboard redirect to fail
  oauthProvider: 'google'
});
```

**Fix** (same as #31):
```typescript
// If new OAuth user
const company = new Company({
  name: `${googleProfile.name}'s Company`,
  owner: user._id
});
await company.save();

user.companyId = company._id;
user.teamRole = 'owner';
```

---

## 🟠 HIGH SEVERITY ISSUES

### ISSUE #6: Role Hierarchy Not Enforced

**Missing Check**:
- Manager removing Admin ❌ Should be blocked
- Member promoting to Manager ❌ Should be blocked
- Admin removing Owner ❌ Should be blocked

**Add Hierarchy Validation**:
```typescript
const HIERARCHY = {
  'owner': 4,
  'admin': 3,
  'manager': 2,
  'member': 1,
  'viewer': 0
};

// When removing/modifying user:
const currentLevel = HIERARCHY[currentUser.teamRole];
const targetLevel = HIERARCHY[targetUser.teamRole];

if (targetLevel >= currentLevel) {
  return 403; // Cannot remove equal or higher
}
```

---

### ISSUE #7: Admin Role Ambiguity (Platform vs Company)

**Problem**: Same word 'admin' means different things:
- `user.role = 'admin'` → Platform admin (full access)
- `user.teamRole = 'admin'` → Company admin (company-only)

**Better Design**:
```typescript
// Platform roles:
type PlatformRole = 'superadmin' | 'admin' | 'seller' | 'staff';

// Team roles (within company):
type TeamRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';

// Distinguish in code:
const isPlatformAdmin = user.role === 'admin' && !user.companyId;
const isCompanyAdmin = user.role === 'seller' && user.teamRole === 'admin';
```

---

### ISSUE #8: Cross-Company KYC Bypass

**Security Hole**:
```typescript
// KYC verification doesn't check company ownership
const kyc = await KYC.findOne({ userId });
// ❌ What if attacker modifies companyId in request?
```

**Fix**:
```typescript
// Always verify company ownership
if (kyc.companyId.toString() !== req.user.companyId.toString()) {
  return 403; // Not your company's KYC
}
```

---

### ISSUE #9: OAuth Users Can't Access Protected Features

**Problem**:
- OAuth users created but have no strategy for KYC
- System doesn't know: Do OAuth users need KYC?

**Solution**:
```typescript
// Configure KYC requirements
const KYC_CONFIG = {
  requireForAllUsers: true, // or false
  exemptProviders: [], // or ['google', 'github']
  requireForActions: ['orders', 'shipments', 'withdraw']
};

// In checkKYC:
if (user.oauthProvider && KYC_CONFIG.exemptProviders.includes(user.oauthProvider)) {
  return next(); // OAuth users exempt
}
```

---

### ISSUE #13: Token Rotation Reuse Vulnerability

**Problem**:
```typescript
// When refreshing token:
const newRefreshToken = generateRefreshToken(...);
await revokeRefreshToken(oldToken);

// ❌ But if attacker has old token, system doesn't detect reuse
```

**Fix**:
```typescript
// Track token rotation history
interface TokenRotationLog {
  userId: ObjectId;
  oldTokenHash: string;
  newTokenHash: string;
  rotatedAt: Date;
}

// On refresh, check if old token already used:
const alreadyRotated = await TokenRotationLog.findOne({
  userId,
  oldTokenHash: hash(oldToken)
});

if (alreadyRotated) {
  // ⚠️ ALERT: Token reused after rotation
  // Potential account compromise
  await revokeAllSessions(userId);
  return 401; // "Suspicious activity detected"
}
```

---

### ISSUE #20: No File Validation on KYC Upload

**Current (DANGEROUS)**:
```typescript
// No validation - accepts anything!
req.files.upload // Could be malware!
```

**Fix**:
```typescript
const KYC_UPLOAD_CONFIG = {
  maxFileSize: 5 * 1024 * 1024, // 5 MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf']
};

// In KYC controller:
for (const file of files) {
  // Check size
  if (file.size > KYC_UPLOAD_CONFIG.maxFileSize) {
    return 413; // Too large
  }

  // Check mime type
  if (!KYC_UPLOAD_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
    return 415; // Invalid type
  }

  // Check extension
  const ext = path.extname(file.originalname);
  if (!KYC_UPLOAD_CONFIG.allowedExtensions.includes(ext)) {
    return 415; // Invalid extension
  }

  // Scan for malware (ClamAV)
  const isSafe = await scanFile(file.buffer);
  if (!isSafe) {
    return 400; // Malware detected
  }

  // Encrypt before storing
  const encrypted = encrypt(file.buffer);
  await uploadToS3(encrypted);
}
```

---

### ISSUE #26: KYC Status in Two Places (Data Sync Issue)

**Problem**:
```typescript
// User model:
user.kycStatus = { isComplete: boolean, lastUpdated: Date }

// KYC model:
kyc.status = 'pending' | 'verified' | 'rejected'
kyc.completionStatus = { personalKycComplete, ... }

// ❌ Which is source of truth?
// ❌ Can get out of sync!
```

**Fix**: Use transactions to keep in sync

```typescript
export const approveKYC = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Update KYC
    const kyc = await KYC.findById(kycId, {}, { session });
    kyc.status = 'verified';
    await kyc.save({ session });

    // Update User (ATOMICALLY)
    const user = await User.findById(kyc.userId, {}, { session });
    user.kycStatus.isComplete = true;
    user.kycStatus.lastUpdated = new Date();
    await user.save({ session });

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
```

---

### ISSUE #30: No GDPR Consent Tracking

**Missing**:
- User consent for terms & privacy
- Right to data deletion
- Right to data export

**Add**:
```typescript
interface UserConsent {
  userId: ObjectId;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
  acceptedAt: Date;
  expiresAt: Date; // Re-accept after 2 years
}

// On registration:
await UserConsent.create({
  userId,
  termsAccepted: true,
  privacyAccepted: true,
  acceptedAt: new Date()
});

// Add deletion endpoint:
POST /auth/delete-account
├─ Validate password
├─ Soft delete (7-day grace):
│  ├─ Set isDeleted = true
│  ├─ Set scheduledDeletionDate = now + 7 days
│  └─ Send "Undo deletion" email
│
├─ After 7 days (batch job):
│  ├─ Permanently delete user
│  ├─ Anonymize orders
│  ├─ Delete KYC documents
│  └─ Delete sessions
│
└─ Cannot reuse email for 30 days
```

---

## 🟡 MEDIUM SEVERITY ISSUES

### ISSUE #10: Email Verification Expires in 24 Hours (Too Long)

**Current (BAD)**:
```typescript
verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24);
```

**Should Be** (GOOD):
```typescript
verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 1); // 1 hour max
```

**Why**: If attacker intercepts email, only 1 hour window instead of 24 hours.

---

### ISSUE #11: No Concurrent Session Limit

**Missing**:
```typescript
// User can have unlimited sessions!
// Attacker steals password → infinite devices logged in
```

**Add**:
```typescript
const MAX_CONCURRENT_SESSIONS = 5;

POST /auth/login {
  // ... login logic ...

  // Check concurrent sessions
  const activeSessions = await Session.countDocuments({
    userId: user._id,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  });

  if (activeSessions >= MAX_CONCURRENT_SESSIONS) {
    // Revoke oldest session
    const oldestSession = await Session.findOne({
      userId: user._id,
      isRevoked: false
    }).sort({ lastActive: 1 });

    oldestSession.isRevoked = true;
    await oldestSession.save();

    // Send email: "Logged out from oldest device"
  }

  // Create new session
  await createSession(user._id, refreshToken, req, expiresAt);
}
```

---

### ISSUE #15: Password Strength Validation Inconsistent

**Problem**:
```typescript
// Register: Full validation ✓
password: z.string().superRefine(passwordValidator)

// Change password: Only min length ❌
newPassword: z.string().min(8)

// Reset password: Full validation ✓
password: z.string().superRefine(passwordValidator)
```

**Fix**: Use same validator everywhere

```typescript
const passwordSchema = z.string()
  .min(PASSWORD_REQUIREMENTS.minLength)
  .superRefine(passwordValidator);

// Register
const registerSchema = z.object({
  password: passwordSchema
});

// Change password
const changePasswordSchema = z.object({
  newPassword: passwordSchema // Same!
});

// Reset password
const resetPasswordSchema = z.object({
  password: passwordSchema // Same!
});
```

---

### ISSUE #16: No Rate Limiting on Password Reset

**Missing**:
```typescript
// Attacker can spam password reset emails
POST /auth/request-password-reset { email: victim@example.com }
// No rate limiting = infinite emails
```

**Add**:
```typescript
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour per email
  keyGenerator: (req) => req.body.email
});

router.post('/auth/request-password-reset', passwordResetLimiter, authController.requestPasswordReset);
```

---

### ISSUE #21: No Webhook Signature Validation

**Security Risk**:
```typescript
// Handle webhook from DeepVue KYC service
// ❌ No signature validation = attacker can spoof webhook
```

**Fix**:
```typescript
export const handleKYCWebhook = async (req, res, next) => {
  const signature = req.headers['x-deepvue-signature'];
  const payload = JSON.stringify(req.body);

  // Validate signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.DEEPVUE_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    return 401; // Invalid webhook
  }

  // Process webhook safely
  const { eventType, data } = req.body;

  // Idempotency check
  const existingEvent = await WebhookEvent.findOne({
    externalId: data.id,
    source: 'deepvue'
  });

  if (existingEvent) {
    return 200; // Already processed
  }

  // Process and save
  await WebhookEvent.create({ ... });
};
```

---

### ISSUE #25: No Audit Log for Authorization Failures

**Missing**:
```typescript
// When permission denied:
if (!hasPermission) {
  return 403; // ❌ No logging!
}
```

**Add**:
```typescript
if (!hasPermission) {
  // ✅ Log security event
  await createAuditLog(
    req.user._id,
    'authorization_failed',
    {
      resource,
      action,
      ip: req.ip,
      reason: 'insufficient_permissions'
    }
  );

  return 403;
}
```

---

## 📊 WHAT NEEDS TO BE DONE

### Immediate (This Week):

1. ✅ Implement email auto-login after verification
2. ✅ Create magic link authentication feature
3. ✅ Add checkKYC middleware to routes
4. ✅ Fix KYC to require admin approval
5. ✅ Fix team role assignment logic
6. ✅ Fix first user becomes owner
7. ✅ Fix OAuth user company context
8. ✅ Add role hierarchy enforcement
9. ✅ Add concurrent session limit
10. ✅ Add KYC file validation

### Short Term (This Month):

11. ✅ Rate limit password reset
12. ✅ Standardize password validation
13. ✅ Add webhook signature validation
14. ✅ Token rotation reuse detection
15. ✅ Password reset auto-logout
16. ✅ Email verification 1-hour expiry
17. ✅ GDPR consent tracking
18. ✅ Account deletion flow

### Nice to Have:

19. ✅ 2FA/TOTP support
20. ✅ Device trust (remember this device)
21. ✅ Login activity history
22. ✅ Suspicious activity alerts
23. ✅ Profile completion tracking

---

## ✅ VERDICT

**Your Documentation**: ⭐⭐⭐⭐⭐ Excellent design

**Your Implementation**: ⭐⭐⭐ Good foundation, major gaps

**Critical Issues Found**: 4
**High Severity Issues**: 11
**Medium Issues**: 15
**Total Issues**: 35

**After Fixes**: Production-ready auth system ✅

---

**Recommendation**: Start with Immediate issues first, they are blocking your users from core functionality.

---

## 🔧 DETAILED FIXES - PART 2 (MEDIUM SEVERITY CONTINUED)

### ISSUE #12: Session Activity Update Non-Blocking

**Problem**:
```typescript
// Activity update doesn't throw errors
await updateSessionActivity(token); // Silent failure
```

**Fix**:
```typescript
try {
  const updatedSession = await updateSessionActivity(token);
  if (!updatedSession) {
    throw new SessionNotFoundError();
  }
} catch (error) {
  logger.error('Session activity update failed:', error);
  throw error; // Now handled properly
}
```

---

### ISSUE #14: Password Reset Doesn't Logout User

**Problem**:
```typescript
// User resets password but stays logged in on old devices
typedUser.security.tokenVersion++;
// No automatic logout of other sessions
```

**Fix**:
```typescript
export const resetPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({
      'security.resetToken': validatedData.token,
      'security.resetTokenExpiry': { $gt: new Date() }
    });

    // Update password
    user.password = validatedData.password;
    user.security.resetToken = null;
    user.security.resetTokenExpiry = null;

    // ✅ Increment token version (invalidates all old JWT tokens)
    user.security.tokenVersion = (user.security.tokenVersion || 0) + 1;
    await user.save();

    // ✅ Revoke all existing sessions
    await Session.updateMany(
      { userId: user._id, isRevoked: false },
      { isRevoked: true }
    );

    // ✅ Send email
    await sendPasswordResetConfirmationEmail(user.email, {
      message: 'Your password was reset. All previous sessions logged out.',
      loginUrl: '/login',
      timestamp: new Date()
    });

    // ✅ Audit log
    await createAuditLog(user._id, 'password_reset_completed', {
      sessionsRevoked: true
    });

    // ✅ Response guides user to login
    sendSuccess(res, {
      nextAction: 'login',
      message: 'Password reset successful. Please login with new password.'
    }, 'All sessions logged out for security.');
  } catch (error) {
    logger.error('Password reset error:', error);
    next(error);
  }
};
```

---

### ISSUE #17: Resend Verification Email Broken Logic

**Problem**:
```typescript
// Can spam verification emails with no rate limit
// No check if token already sent recently
```

**Fix**:
```typescript
export const resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = resendVerificationEmailSchema.parse(req.body);
    const user = await User.findOne({ email });

    // Generic response (no user enumeration)
    const genericResponse = 'If your email is registered, a verification email will be sent';

    if (!user) {
      return sendSuccess(res, null, genericResponse);
    }

    // ✅ Check if already verified
    if (user.isEmailVerified) {
      return sendSuccess(res, null, 'Your email is already verified');
    }

    // ✅ Check recent send (prevent spam)
    const lastTokenTime = user.security?.verificationTokenExpiry
      ? new Date(user.security.verificationTokenExpiry).getTime() - (24 * 60 * 60 * 1000)
      : null;

    if (lastTokenTime && Date.now() - lastTokenTime < 5 * 60 * 1000) {
      // Less than 5 minutes since last send
      return sendError(res, 'Please wait before requesting another verification email', 429, 'TOO_MANY_REQUESTS');
    }

    // ✅ Generate NEW token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 1); // 1 hour

    user.security.verificationToken = verificationToken;
    user.security.verificationTokenExpiry = tokenExpiry;
    await user.save();

    // ✅ Send email
    await sendVerificationEmail(user.email, user.name, verificationToken);

    // ✅ Audit
    await createAuditLog(user._id, 'verification_email_resent');

    sendSuccess(res, null, genericResponse);
  } catch (error) {
    logger.error('Resend verification error:', error);
    next(error);
  }
};
```

---

### ISSUE #18: OAuth Email Change Missing

**Problem**:
```typescript
// OAuth users have no password, so changeEmail() fails at password check
```

**Fix**:
```typescript
export const changeEmail = async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const { newEmail, password, verificationMethod } = schema.parse(req.body);

    const user = await User.findById(authReq.user._id);

    // ✅ For users with password: verify it
    if (user.password) {
      const isValid = await user.comparePassword(password);
      if (!isValid) {
        return sendError(res, 'Invalid password', 401, 'INVALID_PASSWORD');
      }
    } else if (!verificationMethod || verificationMethod !== 'magic_link') {
      // ✅ For OAuth users: require magic link verification
      return sendError(res, 'OAuth users must use magic link to change email', 400, 'OAUTH_USER_VERIFICATION');
    }

    // Check if new email exists
    const existingUser = await User.findOne({ email: newEmail.toLowerCase() });
    if (existingUser) {
      return sendError(res, 'Email already in use', 409, 'EMAIL_IN_USE');
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.pendingEmailChange = {
      email: newEmail.toLowerCase(),
      token,
      tokenExpiry
    };
    await user.save();

    // Send verification to NEW email
    await sendEmailChangeVerification(newEmail, user.name, token);

    // Audit
    await createAuditLog(user._id, 'email_change_requested', { newEmail });

    sendSuccess(res, null, `Verification email sent to ${newEmail}`);
  } catch (error) {
    logger.error('Change email error:', error);
    next(error);
  }
};
```

---

### ISSUE #22: Profile Completion Tracking Unused

**Problem**:
```typescript
// Field exists but never updated or checked
profileCompletion: { status, requiredFieldsCompleted, ... }
```

**Fix**:
```typescript
// Track profile completion in auth controller
export const updateProfileCompletion = async (userId, updatedFields) => {
  const user = await User.findById(userId);

  const requiredFields = ['name', 'email', 'phone', 'address', 'city', 'state', 'country'];
  const completedFields = requiredFields.filter(field => {
    const value = updatedFields[field] || user.profile?.[field];
    return value && value.toString().trim() !== '';
  });

  const completionPercentage = Math.round((completedFields.length / requiredFields.length) * 100);

  user.profileCompletion = {
    status: completionPercentage,
    requiredFieldsCompleted: completedFields,
    lastUpdated: new Date(),
    nextPromptDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  };

  await user.save();
  return user.profileCompletion;
};

// On dashboard: show progress bar
if (user.profileCompletion.status < 100) {
  showBanner({
    type: 'info',
    progress: user.profileCompletion.status,
    message: `Complete your profile (${user.profileCompletion.status}%)`
  });
}
```

---

### ISSUE #23: Account Deactivation/Deletion Missing

**Problem**:
```typescript
// Fields exist but no endpoints to use them
isDeleted, deactivationReason, deletionReason, scheduledDeletionDate
```

**Fix**:
```typescript
// NEW ENDPOINT: Deactivate account (soft)
export const deactivateAccount = async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const { password, reason } = schema.parse(req.body);

    const user = await User.findById(authReq.user._id);

    // Verify password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return sendError(res, 'Invalid password', 401, 'INVALID_PASSWORD');
    }

    // Deactivate
    user.isActive = false;
    user.deactivationReason = reason;
    user.deactivatedAt = new Date();
    await user.save();

    // Revoke all sessions
    await Session.updateMany({ userId: user._id }, { isRevoked: true });

    // Send email
    await sendAccountDeactivatedEmail(user.email, {
      reactivationUrl: '/reactivate',
      message: 'Your account is deactivated. You can reactivate anytime within 30 days.'
    });

    // Audit
    await createAuditLog(user._id, 'account_deactivated', { reason });

    sendSuccess(res, null, 'Account deactivated. You can reactivate within 30 days.');
  } catch (error) {
    logger.error('Deactivate account error:', error);
    next(error);
  }
};

// NEW ENDPOINT: Delete account (hard delete after 7-day grace)
export const requestAccountDeletion = async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const { password } = schema.parse(req.body);

    const user = await User.findById(authReq.user._id);

    // Verify password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return sendError(res, 'Invalid password', 401, 'INVALID_PASSWORD');
    }

    // Schedule soft delete
    user.isDeleted = true;
    user.scheduledDeletionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    user.deletionReason = 'user_requested';
    await user.save();

    // Revoke all sessions
    await Session.updateMany({ userId: user._id }, { isRevoked: true });

    // Send email with undo link
    const undoToken = crypto.randomBytes(32).toString('hex');
    user.deletionUndoToken = undoToken;
    user.deletionUndoTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    await sendAccountDeletionEmail(user.email, {
      undoUrl: `/undo-deletion?token=${undoToken}`,
      message: 'Your account will be permanently deleted in 7 days. Click to undo.'
    });

    // Audit
    await createAuditLog(user._id, 'account_deletion_scheduled');

    sendSuccess(res, null, 'Account scheduled for deletion in 7 days. Check email to undo.');
  } catch (error) {
    logger.error('Request account deletion error:', error);
    next(error);
  }
};

// Batch job (run daily):
export const processScheduledDeletions = async () => {
  const now = new Date();
  const usersToDelete = await User.find({
    isDeleted: true,
    scheduledDeletionDate: { $lte: now }
  });

  for (const user of usersToDelete) {
    try {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Anonymize/delete data
        await Order.updateMany(
          { userId: user._id },
          { userId: null, userEmail: '[deleted]' },
          { session }
        );

        await Shipment.updateMany(
          { userId: user._id },
          { userId: null },
          { session }
        );

        // Delete KYC documents
        const kyc = await KYC.findOne({ userId: user._id });
        if (kyc) {
          // Delete from S3
          for (const doc of Object.values(kyc.documents)) {
            // Delete storage...
          }
          await KYC.deleteOne({ _id: kyc._id }, { session });
        }

        // Delete sessions
        await Session.deleteMany({ userId: user._id }, { session });

        // Delete user
        await User.deleteOne({ _id: user._id }, { session });

        await session.commitTransaction();

        // Audit
        await createAuditLog(user._id, 'account_permanently_deleted');
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        await session.endSession();
      }
    } catch (error) {
      logger.error(`Failed to delete user ${user._id}:`, error);
    }
  }
};
```

---

### ISSUE #27: KYC Rejection Resubmit Logic

**Problem**:
```typescript
// When KYC rejected: Can user resubmit? After how long?
```

**Fix**:
```typescript
export const rejectKYC = async (req, res, next) => {
  try {
    const { kycId, rejectionReason, allowResubmitAfter } = req.body;

    const kyc = await KYC.findById(kycId);
    kyc.status = 'rejected';
    kyc.rejectionReason = rejectionReason;
    kyc.rejectedAt = new Date();

    // ✅ Allow resubmission after N days
    kyc.canResubmitAfter = new Date(Date.now() + (allowResubmitAfter || 7) * 24 * 60 * 60 * 1000);

    await kyc.save();

    // Update user
    const user = await User.findById(kyc.userId);
    user.kycStatus.isComplete = false;
    user.kycStatus.rejectionReason = rejectionReason;
    await user.save();

    // Send email
    await sendKYCRejectionEmail(user.email, {
      reason: rejectionReason,
      resubmitDate: kyc.canResubmitAfter,
      supportUrl: '/support/kyc'
    });

    // Audit
    await createAuditLog(user._id, 'kyc_rejected', { rejectionReason });

    sendSuccess(res, null, 'KYC rejected');
  } catch (error) {
    logger.error('KYC rejection error:', error);
    next(error);
  }
};

// When user tries to resubmit:
export const submitKYC = async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;

    // Check if previous rejection
    const previousKYC = await KYC.findOne({ userId: authReq.user._id });

    if (previousKYC?.status === 'rejected') {
      if (previousKYC.canResubmitAfter > new Date()) {
        const waitUntil = previousKYC.canResubmitAfter;
        return sendError(res, `Can resubmit after ${waitUntil}`, 429, 'KYC_RESUBMIT_COOLDOWN');
      }
    }

    // Allow resubmission
    // ... rest of KYC submission logic ...
  } catch (error) {
    logger.error('KYC submission error:', error);
    next(error);
  }
};
```

---

### ISSUE #28: Company Suspension Not Checked

**Problem**:
```typescript
// If company suspended, users can still take actions
```

**Fix**:
```typescript
// Add to every protected endpoint
const checkCompanySuspension = async (req, res, next) => {
  const user = await User.findById(req.user._id).select('companyId');
  const company = await Company.findById(user.companyId).select('status');

  if (company?.status === 'suspended') {
    return res.status(403).json({
      code: 'COMPANY_SUSPENDED',
      message: 'Your company is suspended. Contact support.'
    });
  }

  next();
};

// Usage:
router.post('/orders',
  authenticate,
  authorize(['seller']),
  checkCompanySuspension,  // ✅ NEW
  checkKYC,
  orderController.create
);
```

---

### ISSUE #29: Admin Role Ambiguity

**Problem**:
```typescript
// user.role = 'admin' means: platform admin or company admin?
// Need clear distinction in code
```

**Fix**:
```typescript
// Define clearly:
const isPlatformAdmin = (user) => user.role === 'admin' && !user.companyId;
const isCompanyAdmin = (user) => user.role === 'seller' && user.teamRole === 'admin';
const isCompanyOwner = (user) => user.role === 'seller' && user.teamRole === 'owner';

// Use in checks:
router.delete('/companies/:id',
  authenticate,
  (req, res, next) => {
    const user = req.user;

    if (!isPlatformAdmin(user)) {
      return res.status(403).json({ message: 'Only platform admin can delete companies' });
    }

    next();
  }
);

// Use in logs:
await createAuditLog(user._id, 'attempted_sensitive_action', {
  userType: isPlatformAdmin(user) ? 'platform_admin' : 'company_user',
  role: user.role,
  teamRole: user.teamRole
});
```

---

### ISSUE #32: Invited User Registration Path Unclear

**Problem**:
```typescript
// How does invited user know to use the invitation link?
// What if they go to regular signup?
```

**Fix**:
```typescript
// Frontend: Show clear flow
// 1. Admin sends invitation email with link
// 2. Email includes: "Click here to join"
// 3. Link pre-fills email in signup form
// 4. User sees: "You've been invited to join Company XYZ"
// 5. Invitation token included in URL

// Backend validation:
export const register = async (req, res, next) => {
  try {
    const { email, invitationToken } = req.body;

    // If invitation token provided:
    if (invitationToken) {
      const invitation = await TeamInvitation.findOne({
        email: email.toLowerCase(),
        token: invitationToken,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      });

      if (!invitation) {
        return sendError(res, 'Invalid or expired invitation', 400, 'INVALID_INVITATION');
      }

      // Pre-fill company and role from invitation
      const companyId = invitation.companyId;
      const teamRole = invitation.teamRole;

      // Continue with registration using these values
    } else {
      // Direct signup: user creates first company
      const companyId = null;
      const teamRole = null;
    }

    // Create user with appropriate company context
  } catch (error) {
    logger.error('Registration error:', error);
    next(error);
  }
};
```

---

### ISSUE #33: No Alternative Email Verification

**Problem**:
```typescript
// If user doesn't receive email: no fallback
// No SMS verification, security questions, etc.
```

**Fix**:
```typescript
// Add optional SMS verification backup
export const sendVerificationSMS = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ email: req.params.email });

    if (!user) {
      return sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
    }

    // Generate OTP
    const otp = Math.random().toString().substring(2, 8); // 6 digits
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

    user.security.smsVerificationOTP = hashedOTP;
    user.security.smsVerificationOTPExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    user.security.smsVerificationPhone = phone;
    await user.save();

    // Send SMS via Twilio/etc
    await sendSMS(phone, `Your Shipcrowd verification code: ${otp}`);

    sendSuccess(res, null, 'SMS sent to your phone');
  } catch (error) {
    logger.error('SMS verification error:', error);
    next(error);
  }
};

export const verifyEmailViaSMS = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    // Verify OTP
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
    const isValidOTP = user.security.smsVerificationOTP === hashedOTP &&
                       user.security.smsVerificationOTPExpiry > new Date();

    if (!isValidOTP) {
      return sendError(res, 'Invalid or expired OTP', 400, 'INVALID_OTP');
    }

    // Mark as verified
    user.isEmailVerified = true;
    user.isActive = true;
    user.security.smsVerificationOTP = null;
    user.security.smsVerificationOTPExpiry = null;
    await user.save();

    // Auto-login (same as email verification)
    const tokens = await generateAuthTokens(user);
    // ... set cookies, create session, etc.
  } catch (error) {
    logger.error('SMS verification error:', error);
    next(error);
  }
};
```

---

## 🎯 COMPLETE RBAC & PERMISSION MATRIX

```typescript
const COMPLETE_PERMISSIONS = {
  admin: {
    // Platform Admin: Full access
    orders: { view: true, create: true, update: true, delete: true, export: true },
    shipments: { view: true, create: true, update: true, delete: true, track: true },
    products: { view: true, create: true, update: true, delete: true, sync: true },
    customers: { view: true, create: true, update: true, delete: true, export: true },
    warehouses: { view: true, create: true, update: true, delete: true, manage_inventory: true },
    team: { view: true, invite: true, update: true, remove: true, manage_roles: true },
    settings: { view: true, update: true, billing: true, integrations: true },
    analytics: { view: true, export: true, custom_reports: true },
    kyc: { view: true, approve: true, reject: true },
    company: { view: true, update: true, delete: true, suspend: true },
  },

  owner: {
    // Company Owner: Full company access
    orders: { view: true, create: true, update: true, delete: true, export: true },
    shipments: { view: true, create: true, update: true, delete: true, track: true },
    products: { view: true, create: true, update: true, delete: true },
    customers: { view: true, create: true, update: true, delete: true },
    warehouses: { view: true, create: true, update: true, delete: true },
    team: { view: true, invite: true, update: true, remove: true, manage_roles: true },
    settings: { view: true, update: true, billing: true, integrations: true },
    analytics: { view: true, export: true },
  },

  admin: {
    // Company Admin: Almost full, cannot remove owner
    orders: { view: true, create: true, update: true, delete: true, export: true },
    shipments: { view: true, create: true, update: true, delete: true, track: true },
    products: { view: true, create: true, update: true, delete: true },
    customers: { view: true, create: true, update: true, delete: true },
    warehouses: { view: true, create: true, update: true, delete: true },
    team: { view: true, invite: true, update: true, remove: false, manage_roles: false },
    settings: { view: true, update: true, billing: true },
    analytics: { view: true, export: true },
    // Cannot: remove owner, promote to owner, change settings, manage billing
  },

  manager: {
    // Department Manager: Operational access
    orders: { view: true, create: true, update: true, delete: false, export: true },
    shipments: { view: true, create: true, update: true, delete: false, track: true },
    products: { view: true, create: true, update: true, delete: false },
    customers: { view: true, create: true, update: true, delete: false },
    warehouses: { view: true, create: true, update: true, delete: false },
    team: { view: true, invite: true, update: false, remove: false },
    settings: { view: false },
    analytics: { view: true, export: true },
  },

  member: {
    // Team Member: Standard access
    orders: { view: true, create: true, update: true, delete: false, export: false },
    shipments: { view: true, create: true, update: true, delete: false, track: true },
    products: { view: true, create: true, update: true, delete: false },
    customers: { view: true, create: true, update: false, delete: false },
    warehouses: { view: true },
    team: { view: true, invite: false, update: false, remove: false },
    settings: { view: false },
    analytics: { view: true },
  },

  viewer: {
    // Read-only access
    orders: { view: true, create: false, update: false, delete: false },
    shipments: { view: true, create: false, update: false, delete: false, track: true },
    products: { view: true, create: false, update: false, delete: false },
    customers: { view: true, create: false, update: false, delete: false },
    warehouses: { view: true },
    team: { view: true },
    settings: { view: false },
    analytics: { view: true, export: false },
  }
};
```

---

## 📋 IMPLEMENTATION PRIORITY MATRIX

| Priority | Issue # | Severity | Effort | Impact | Timeline |
|----------|---------|----------|--------|--------|----------|
| P0 | 1, 2, 3, 4 | CRITICAL | HIGH | BLOCKING | Week 1 |
| P0 | 5, 31, 34 | CRITICAL | MEDIUM | BLOCKING | Week 1 |
| P1 | 6, 7, 8, 9 | HIGH | MEDIUM | HIGH | Week 2 |
| P1 | 13, 20, 26, 30 | HIGH | HIGH | HIGH | Week 2 |
| P2 | 10-12, 14-18 | MEDIUM | LOW | MEDIUM | Week 3 |
| P2 | 21, 25, 27-29 | MEDIUM | MEDIUM | MEDIUM | Week 3 |
| P3 | 19, 22-24, 32-33 | LOW | LOW | LOW | Week 4+ |

---

## ✅ FINAL SUMMARY

### Issues Breakdown:
- **🔴 CRITICAL (4)**: Core auth flow broken
- **🟠 HIGH (11)**: Security & logic flaws
- **🟡 MEDIUM (15)**: Missing features/practices
- **🟢 LOW (5)**: Enhancements

### Your Implementation Status:
- ✅ Good foundation (50% complete)
- ⚠️ Major gaps in: auto-login, magic link, KYC, RBAC enforcement
- 🔒 Security baseline okay, but needs hardening

### Next Actions:
1. **This Week**: Fix 4 critical issues (auth flow basics)
2. **Week 2**: Fix 11 high-severity issues (security & RBAC)
3. **Week 3**: Medium issues (email, sessions, webhooks)
4. **Week 4+**: Nice-to-have features (2FA, profile tracking)

### Result After Fixes:
🎉 **Production-ready authentication system** with all security best practices
