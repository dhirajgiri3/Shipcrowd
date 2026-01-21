# AUTH & USER MODULE - Context Package
**Module:** Authentication & User Management
**Version:** 1.0
**Created:** December 26, 2025
**Status:** 80% Complete (Session 2 baseline)
**Priority:** P0 (Critical - Foundation Module)
**Dependencies:** None (standalone module)

---

## TABLE OF CONTENTS

1. [Module Overview](#1-module-overview)
2. [Current Implementation Status](#2-current-implementation-status)
3. [Database Models](#3-database-models)
4. [Services Layer](#4-services-layer)
5. [API Endpoints](#5-api-endpoints)
6. [Authentication Flow](#6-authentication-flow)
7. [Security Features](#7-security-features)
8. [Integration Points](#8-integration-points)
9. [Known Issues & Gaps](#9-known-issues--gaps)
10. [Testing Requirements](#10-testing-requirements)
11. [Future Enhancements](#11-future-enhancements)

---

## 1. MODULE OVERVIEW

### 1.1 Purpose

The Auth & User module handles all aspects of user authentication, authorization, session management, and user profile operations. It serves as the foundation security layer for the entire Helix platform.

### 1.2 Core Responsibilities

- **Authentication**: Email/password and Google OAuth sign-in
- **Authorization**: Role-based access control (RBAC)
- **Session Management**: JWT-based access/refresh tokens with persistent sessions
- **User Profile**: Comprehensive profile management with completion tracking
- **Security**: Password hashing, token encryption, account locking, audit logging
- **Email Operations**: Verification, password reset, email change workflows
- **Team Management**: Team invitations and role assignments

### 1.3 User Roles

```typescript
type UserRole = 'admin' | 'seller' | 'staff';

// Team roles (when user is part of a company)
type TeamRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
```

**Role Hierarchy:**
- **Admin**: Platform-level administrators (Helix staff)
- **Seller**: Business owners/primary accounts
- **Staff**: Team members with assigned roles

### 1.4 Key Features

**Implemented:**
- ✅ Email/password registration and login
- ✅ Google OAuth integration
- ✅ JWT access/refresh token system
- ✅ Session persistence with device tracking
- ✅ Email verification workflow
- ✅ Password reset workflow
- ✅ Password strength validation (zxcvbn)
- ✅ Account locking after failed attempts
- ✅ Profile management
- ✅ Email change workflow
- ✅ Password change with current password
- ✅ OAuth token encryption
- ✅ Refresh token hashing
- ✅ Audit logging for all security events
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Team invitation acceptance

**Missing:**
- ⚪ 2FA/MFA support (Week 12)
- ⚪ Security questions recovery (partially implemented)
- ⚪ Social login beyond Google (Week 13)
- ⚪ Device management dashboard (Week 14)

---

## 2. CURRENT IMPLEMENTATION STATUS

### 2.1 Completion Percentage

**Overall Module: 80%**

| Component | Status | Completion | Notes |
|-----------|--------|------------|-------|
| **Models** | ✅ Complete | 100% | User, Session models fully implemented |
| **Services** | ✅ Complete | 95% | OAuth, session, password services done |
| **Controllers** | ✅ Complete | 100% | All 15 auth endpoints implemented |
| **Routes** | ✅ Complete | 100% | All routes with middleware configured |
| **Middleware** | ✅ Complete | 100% | Auth, CSRF, rate limiting |
| **Tests** | 🟡 Partial | 40% | Unit tests for auth.service only |
| **Documentation** | ✅ Complete | 90% | API docs complete, examples needed |

### 2.2 File Inventory

**Models (2 files):**
- `server/src/infrastructure/database/mongoose/models/User.ts` (373 lines)
- `server/src/infrastructure/database/mongoose/models/Session.ts` (113 lines)

**Services (3 files):**
- `server/src/core/application/services/auth/oauth.service.ts` (200 lines)
- `server/src/core/application/services/auth/session.service.ts` (165 lines)
- `server/src/core/application/services/auth/password.service.ts` (122 lines)

**Controllers (1 file):**
- `server/src/presentation/http/controllers/auth/auth.controller.ts` (1,204 lines)

**Routes (1 file):**
- `server/src/presentation/http/routes/v1/auth/auth.routes.ts` (163 lines)

**Total Lines of Code: 2,340+**

---

## 3. DATABASE MODELS

### 3.1 User Model

**File:** `server/src/infrastructure/database/mongoose/models/User.ts`

#### 3.1.1 Schema Overview

```typescript
interface IUser extends Document {
  // Core Fields
  email: string;                    // Unique, lowercase, validated
  password: string;                 // Hashed with bcrypt (optional for OAuth)
  name: string;
  role: 'admin' | 'seller' | 'staff';
  companyId?: mongoose.Types.ObjectId;

  // Team Fields
  teamRole?: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
  teamStatus?: 'active' | 'invited' | 'suspended';

  // OAuth Fields
  googleId?: string;                // Google OAuth ID
  oauthProvider?: 'email' | 'google';
  isEmailVerified?: boolean;
  avatar?: string;

  // Profile Object
  profile: {
    phone?: string;
    avatar?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    bio?: string;
    website?: string;
    socialLinks?: {
      facebook?: string;
      twitter?: string;
      linkedin?: string;
      instagram?: string;
    };
    preferredLanguage?: string;
    preferredCurrency?: string;
    timezone?: string;
  };

  // Profile Completion Tracking
  profileCompletion?: {
    status: number;                  // 0-100 percentage
    requiredFieldsCompleted: boolean;
    lastUpdated: Date;
    nextPromptDate?: Date;
  };

  // Security Object
  security: {
    tokenVersion?: number;           // Incremented to invalidate all tokens
    verificationToken?: string;
    verificationTokenExpiry?: Date;
    resetToken?: string;
    resetTokenExpiry?: Date;
    lastLogin?: {
      timestamp: Date;
      ip: string;
      userAgent: string;
      success: boolean;
    };
    failedLoginAttempts?: number;
    lockUntil?: Date;                // Account lock timestamp
    recoveryOptions?: {
      securityQuestions?: {
        question1: string;
        answer1: string;             // Should be hashed (TODO)
        question2: string;
        answer2: string;
        question3: string;
        answer3: string;
        lastUpdated: Date;
      };
      backupEmail?: string;
      backupPhone?: string;
      recoveryKeys?: string[];       // Max 10 keys
      lastUpdated?: Date;
    };
  };

  // Pending Email Change
  pendingEmailChange?: {
    email: string;
    token: string;
    tokenExpiry: Date;
  };

  // OAuth Tokens (Encrypted)
  oauth?: {
    google?: {
      id: string;
      email?: string;
      name?: string;
      picture?: string;
      accessToken?: string;          // Encrypted with fieldEncryption
      refreshToken?: string;         // Encrypted with fieldEncryption
    };
  };

  // Account Status
  isActive: boolean;                 // Email verified, account active
  isDeleted: boolean;
  deactivationReason?: string;
  deletionReason?: string;
  scheduledDeletionDate?: Date;
  anonymized: boolean;               // GDPR anonymization flag

  // KYC Status
  kycStatus: {
    isComplete: boolean;
    lastUpdated?: Date;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}
```

#### 3.1.2 Indexes

```typescript
// Automatic indexes
UserSchema.index({ email: 1 }, { unique: true });

// Manual indexes
UserSchema.index({ companyId: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isDeleted: 1 });
UserSchema.index({ googleId: 1 });

// Token lookup indexes (sparse for performance)
UserSchema.index({ 'security.resetToken': 1 }, { sparse: true });
UserSchema.index({ 'security.verificationToken': 1 }, { sparse: true });
UserSchema.index({ 'pendingEmailChange.token': 1 }, { sparse: true });

// Compound indexes for common queries
UserSchema.index({ companyId: 1, teamRole: 1 });
UserSchema.index({ email: 1, isActive: 1 });
UserSchema.index({ companyId: 1, isDeleted: 1, createdAt: -1 });
UserSchema.index({ companyId: 1, teamStatus: 1 });
```

#### 3.1.3 Middleware & Plugins

**Pre-save Hook (Password Hashing):**
```typescript
UserSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
```

**Field Encryption Plugin (OAuth Tokens):**
```typescript
UserSchema.plugin(fieldEncryption, {
  fields: [
    'oauth.google.accessToken',
    'oauth.google.refreshToken'
  ],
  secret: process.env.ENCRYPTION_KEY!,
  saltGenerator: () => crypto.randomBytes(16).toString('hex'),
  encryptOnSave: true,
  decryptOnFind: true,
});
```

**Purpose:** Prevents account takeover if database is breached. Tokens are encrypted at rest using AES-256-CBC.

### 3.2 Session Model

**File:** `server/src/infrastructure/database/mongoose/models/Session.ts`

#### 3.2.1 Schema Overview

```typescript
interface ISession extends Document {
  userId: mongoose.Types.ObjectId;  // User reference
  refreshToken: string;              // Hashed refresh token
  userAgent: string;                 // Browser/app identifier
  ip: string;                        // Client IP address

  deviceInfo: {
    type?: 'desktop' | 'mobile' | 'tablet' | 'other';
    browser?: string;                // "Chrome 120.0"
    os?: string;                     // "macOS 14.0"
    deviceName?: string;             // "Apple MacBook Pro"
  };

  location?: {
    country?: string;
    city?: string;
    region?: string;
  };

  lastActive: Date;                  // Updated on token refresh
  expiresAt: Date;                   // Session expiration
  isRevoked: boolean;                // Logout/security action

  createdAt: Date;
  updatedAt: Date;

  // Methods
  compareRefreshToken(candidateToken: string): Promise<boolean>;
}
```

#### 3.2.2 Indexes

```typescript
SessionSchema.index({ userId: 1 });
SessionSchema.index({ isRevoked: 1 });
SessionSchema.index({ userId: 1, isRevoked: 1 });

// TTL index - automatically deletes expired sessions
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

#### 3.2.3 Middleware (Refresh Token Hashing)

```typescript
SessionSchema.pre('save', async function(next) {
  if (this.isModified('refreshToken')) {
    this.refreshToken = await bcrypt.hash(this.refreshToken, 12);
  }
  next();
});

SessionSchema.methods.compareRefreshToken = async function(
  candidateToken: string
): Promise<boolean> {
  return bcrypt.compare(candidateToken, this.refreshToken);
};
```

**Purpose:** Prevents session hijacking if database is breached. Refresh tokens are hashed like passwords.

---

## 4. SERVICES LAYER

### 4.1 OAuth Service

**File:** `server/src/core/application/services/auth/oauth.service.ts`

#### 4.1.1 Key Functions

**`configureGoogleStrategy()`**
- Configures Passport.js Google OAuth 2.0 strategy
- Handles user creation or account linking
- Updates last login information
- Creates audit logs for OAuth events

**Flow:**
1. Check if user exists with Google ID → return user
2. Check if user exists with email → link Google account
3. Create new user with Google profile data
4. Set `isEmailVerified = true` (Google emails are pre-verified)
5. Encrypt OAuth tokens using field encryption

**`generateAuthTokens(user)`**
- Generates JWT access token (15 minutes)
- Generates JWT refresh token (7 days or 30 days if "remember me")
- Returns `{ accessToken, refreshToken }`

#### 4.1.2 Google OAuth Flow

```
User clicks "Continue with Google"
         ↓
GET /auth/google
         ↓
Redirect to Google consent screen
         ↓
User approves → Google callback with code
         ↓
GET /auth/google/callback
         ↓
Passport verifies code with Google
         ↓
oauth.service.ts handles user creation/linking
         ↓
Generate JWT tokens
         ↓
Create session in database
         ↓
Redirect to frontend with tokens in cookies
```

### 4.2 Session Service

**File:** `server/src/core/application/services/auth/session.service.ts`

#### 4.2.1 Key Functions

**`createSession(userId, refreshToken, req, expiresAt)`**
- Parses user agent to extract device info (using `ua-parser-js`)
- Creates Session document with device tracking
- Returns created session

**`getUserSessions(userId)`**
- Returns all active (non-revoked, non-expired) sessions for a user
- Sorted by last active (most recent first)

**`revokeSession(sessionId, userId)`**
- Marks a specific session as revoked
- Used for "sign out from this device"

**`revokeAllSessions(userId, currentSessionId?)`**
- Revokes all sessions except the current one
- Used for "sign out from all devices" or security actions

**`updateSessionActivity(refreshToken)`**
- Updates `lastActive` timestamp
- Called on token refresh to track activity

**`validateSession(refreshToken)`**
- Verifies JWT refresh token
- Checks session exists and is valid
- Returns session or null

#### 4.2.2 Inactivity Timeout

**Implementation in `auth.controller.ts` refresh endpoint:**
```typescript
const INACTIVITY_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours
const lastActiveTime = session.lastActive?.getTime() || session.createdAt.getTime();
const timeSinceActive = Date.now() - lastActiveTime;

if (timeSinceActive > INACTIVITY_TIMEOUT_MS) {
  session.isRevoked = true;
  await session.save();
  // Return SESSION_TIMEOUT error
}
```

### 4.3 Password Service

**File:** `server/src/core/application/services/auth/password.service.ts`

#### 4.3.1 Password Requirements

```typescript
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  minScore: 2,                       // zxcvbn score 0-4
  requireLowercase: true,
  requireUppercase: true,
  requireNumber: true,
  requireSpecial: true,
};
```

#### 4.3.2 Key Functions

**`meetsMinimumRequirements(password)`**
- Validates against PASSWORD_REQUIREMENTS
- Returns `{ valid: boolean, errors: string[] }`

**`evaluatePasswordStrength(password, userInputs)`**
- Uses `zxcvbn` library for entropy-based strength check
- Checks against user inputs (email, name) to prevent weak passwords
- Returns `{ score: number, feedback: object, isStrong: boolean }`

**`getPasswordStrengthLabel(score)`**
- Converts score (0-4) to human-readable label
- "Very Weak" | "Weak" | "Fair" | "Good" | "Strong"

#### 4.3.3 Usage in Controllers

```typescript
// Registration validation
const registerSchema = z.object({
  password: z.string()
    .min(PASSWORD_REQUIREMENTS.minLength)
    .superRefine(passwordValidator),
});

// Password strength endpoint
const strength = evaluatePasswordStrength(password, [email, name]);
// Returns: { score: 3, feedback: {...}, isStrong: true }
```

---

## 5. API ENDPOINTS

### 5.1 Endpoint Summary

**Base Path:** `/api/v1/auth`

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| POST | `/register` | Public | 5 req/15min | Register new user |
| POST | `/login` | Public | 10 req/15min | Login with email/password |
| POST | `/refresh` | Public | - | Refresh access token |
| POST | `/logout` | Private | - | Logout current session |
| GET | `/me` | Private | - | Get current user |
| POST | `/verify-email` | Public | 5 req/hour | Verify email with token |
| POST | `/resend-verification` | Public | 3 req/hour | Resend verification email |
| POST | `/reset-password` | Public | 3 req/hour | Request password reset |
| POST | `/reset-password/confirm` | Public | 3 req/hour | Reset password with token |
| POST | `/check-password-strength` | Public | - | Check password strength |
| POST | `/set-password` | Private | - | Set password for OAuth users |
| POST | `/change-password` | Private | - | Change password |
| POST | `/change-email` | Private | - | Request email change |
| POST | `/verify-email-change` | Public | - | Verify email change |
| GET | `/google` | Public | - | Initiate Google OAuth |
| GET | `/google/callback` | Public | - | Google OAuth callback |

### 5.2 Detailed Endpoint Specifications

#### 5.2.1 POST /register

**Purpose:** Register a new user with email/password

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "role": "seller",               // Optional: admin|seller|staff
  "invitationToken": "abc123..."  // Optional: for team invites
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email to verify your account.",
  "data": {
    "companyId": "507f1f77bcf86cd799439011"  // If joined via invitation
  }
}
```

**Flow:**
1. Validate input with Zod
2. Check if email already exists → 409 error
3. Check if invitation token provided and valid
4. Generate verification token (32 bytes, hex)
5. Create user with `isActive: false`
6. Send verification email
7. Create audit log
8. Return success (201)

**Security:**
- CSRF protection enabled
- Rate limited: 5 requests per 15 minutes per IP
- Password validated against strength requirements
- Email verification required before login

#### 5.2.2 POST /login

**Purpose:** Authenticate user with email/password

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "rememberMe": false             // Optional: extends token expiry
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "user@example.com",
      "role": "seller",
      "companyId": "507f1f77bcf86cd799439012"
    }
  }
}
```

**Response Headers:**
```
Set-Cookie: accessToken=<jwt>; HttpOnly; Secure; SameSite=Lax; Max-Age=900
Set-Cookie: refreshToken=<jwt>; HttpOnly; Secure; SameSite=Lax; Max-Age=604800
```

**Flow:**
1. Validate input
2. Find user by email
3. Check account not locked (5 failed attempts = 30 min lock)
4. Check account is active and not deleted
5. Verify password
6. Reset failed login attempts
7. Generate JWT tokens (access: 15 min, refresh: 7 days or 30 days)
8. Create session with device info
9. Set httpOnly cookies
10. Create audit log
11. Return user data

**Security:**
- CSRF protection
- Rate limited: 10 requests per 15 minutes per IP
- Account locking after 5 failed attempts
- Audit logging for all login attempts
- Password comparison using bcrypt
- Tokens stored in httpOnly cookies

**Account Locking:**
```typescript
if (failedLoginAttempts >= 5) {
  lockUntil = now + 30 minutes;
  // Create audit log for account lock
}
```

#### 5.2.3 POST /refresh

**Purpose:** Refresh expired access token using refresh token

**Request:** No body required (refresh token from cookie)

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed",
  "data": null
}
```

**Response Headers:**
```
Set-Cookie: accessToken=<new_jwt>; HttpOnly; Secure; SameSite=Lax; Max-Age=900
Set-Cookie: refreshToken=<same_token>; HttpOnly; Secure; SameSite=Lax; Max-Age=604800
```

**Flow:**
1. Extract refresh token from cookie or body
2. Verify JWT signature and expiry
3. Find user and check tokenVersion matches
4. Find session and verify not revoked
5. Check inactivity timeout (8 hours)
6. Update session lastActive timestamp
7. Generate new access token
8. Return same refresh token (rotation not implemented)

**Inactivity Timeout:**
- If `lastActive > 8 hours ago` → revoke session, return 401

#### 5.2.4 POST /logout

**Purpose:** Logout current session

**Request:** No body (requires authentication)

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

**Flow:**
1. Clear access and refresh token cookies
2. Revoke refresh token in blacklist
3. Mark session as revoked in database
4. Create audit log
5. Return success

#### 5.2.5 GET /me

**Purpose:** Get current authenticated user details

**Response (200):**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "seller",
      "companyId": "507f1f77bcf86cd799439012",
      "profile": { ... },
      "kycStatus": { "isComplete": false }
      // No password field
    }
  }
}
```

**Flow:**
1. Get user ID from authenticated request
2. Find user by ID, exclude password
3. Return user object

#### 5.2.6 POST /verify-email

**Purpose:** Verify email address with token from email

**Request Body:**
```json
{
  "token": "a1b2c3d4e5f6..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": null
}
```

**Flow:**
1. Find user with matching token and non-expired tokenExpiry
2. Set `isActive: true`
3. Clear verification token and expiry
4. Create audit log
5. Return success

**Token Expiry:** 24 hours from generation

#### 5.2.7 POST /reset-password

**Purpose:** Request password reset link

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "If your email is registered, you will receive a password reset link"
}
```

**Flow:**
1. Find user by email (no error if not found - security)
2. Generate reset token (32 bytes, hex)
3. Set token expiry (1 hour)
4. Save user
5. Send password reset email
6. Create audit log
7. Return generic success message

**Security:** Generic response prevents email enumeration

#### 5.2.8 POST /reset-password/confirm

**Purpose:** Reset password using token from email

**Request Body:**
```json
{
  "token": "a1b2c3d4e5f6...",
  "password": "NewSecurePass456!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password has been reset successfully",
  "data": null
}
```

**Flow:**
1. Find user with matching token and non-expired tokenExpiry
2. Update password (will be hashed by pre-save hook)
3. Clear reset token and expiry
4. Increment tokenVersion (invalidates all sessions)
5. Create audit log
6. Return success

**Token Expiry:** 1 hour from generation

**Security:** All existing sessions are invalidated

#### 5.2.9 POST /change-password

**Purpose:** Change password for authenticated user

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass456!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully. Please login again with your new password.",
  "data": {
    "sessionInvalidated": true
  }
}
```

**Flow:**
1. Verify current password
2. Check new password is different
3. Update password
4. Increment tokenVersion
5. Revoke all sessions
6. Create audit log
7. Return success

**Security:**
- Requires current password verification
- Invalidates all sessions (user must re-login)
- Password strength validated

#### 5.2.10 POST /change-email

**Purpose:** Request email change (sends verification to new email)

**Request Body:**
```json
{
  "newEmail": "newemail@example.com",
  "password": "CurrentPass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Verification email sent to newemail@example.com. Please check your inbox to confirm the change.",
  "data": null
}
```

**Flow:**
1. Verify password
2. Check new email is different
3. Check new email not already in use
4. Generate verification token
5. Store in `pendingEmailChange` field
6. Send verification email to NEW email
7. Create audit log
8. Return success

**Security:**
- Requires password verification
- Pending change only, not immediate
- Token expires in 24 hours

#### 5.2.11 POST /verify-email-change

**Purpose:** Verify and complete email change

**Request Body:**
```json
{
  "token": "a1b2c3d4e5f6..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email changed successfully",
  "data": {
    "newEmail": "newemail@example.com"
  }
}
```

**Flow:**
1. Find user with matching pending email change token
2. Update email to pending email
3. Clear `pendingEmailChange` field
4. Create audit log
5. Return success

#### 5.2.12 GET /google

**Purpose:** Initiate Google OAuth flow

**Flow:**
1. Redirect to Google consent screen
2. Request scopes: `profile`, `email`
3. No session created (session: false)

#### 5.2.13 GET /google/callback

**Purpose:** Handle Google OAuth callback

**Flow:**
1. Passport verifies authorization code with Google
2. `oauth.service.ts` handles user creation/linking
3. Generate JWT tokens
4. Create session
5. Set httpOnly cookies
6. Redirect to frontend `/oauth-callback`

**Error Handling:**
- OAuth failure → redirect to `/login?error=google-auth-failed`
- Server error → redirect to `/login?error=server_error`

---

## 6. AUTHENTICATION FLOW

### 6.1 Email/Password Flow

```
┌─────────────────┐
│  User submits   │
│ email/password  │
└────────┬────────┘
         ↓
┌────────────────────┐
│ POST /auth/login   │
│ - Validate input   │
│ - Find user        │
│ - Check account    │
│   status/locks     │
└────────┬───────────┘
         ↓
┌────────────────────┐
│ Compare password   │
│ (bcrypt.compare)   │
└────────┬───────────┘
         ↓
    [Valid?]
         ├─ No → Increment failedLoginAttempts
         │       Lock if attempts >= 5
         │       Return 401
         │
         └─ Yes → Reset failedLoginAttempts
                  ↓
         ┌────────────────────┐
         │ Generate JWT tokens│
         │ - Access: 15 min   │
         │ - Refresh: 7 days  │
         └────────┬───────────┘
                  ↓
         ┌────────────────────┐
         │ Create Session     │
         │ - Device info      │
         │ - IP, User-Agent   │
         │ - Hash refresh tok │
         └────────┬───────────┘
                  ↓
         ┌────────────────────┐
         │ Set httpOnly       │
         │ cookies            │
         │ - accessToken      │
         │ - refreshToken     │
         └────────┬───────────┘
                  ↓
         ┌────────────────────┐
         │ Return user data   │
         │ (200 OK)           │
         └────────────────────┘
```

### 6.2 Google OAuth Flow

```
┌──────────────────┐
│ User clicks      │
│ "Continue with   │
│ Google"          │
└────────┬─────────┘
         ↓
┌─────────────────────┐
│ GET /auth/google    │
│ Passport redirects  │
│ to Google consent   │
└────────┬────────────┘
         ↓
┌─────────────────────┐
│ User approves       │
│ on Google           │
└────────┬────────────┘
         ↓
┌──────────────────────────┐
│ Google callback with     │
│ authorization code       │
└────────┬─────────────────┘
         ↓
┌──────────────────────────┐
│ GET /auth/google/callback│
│ Passport exchanges code  │
│ for profile              │
└────────┬─────────────────┘
         ↓
┌──────────────────────────┐
│ oauth.service.ts handles │
│ user creation/linking    │
│                          │
│ Check if user exists:    │
│ 1. By googleId           │
│ 2. By email (link)       │
│ 3. Create new user       │
└────────┬─────────────────┘
         ↓
┌──────────────────────────┐
│ Encrypt OAuth tokens     │
│ (fieldEncryption plugin) │
└────────┬─────────────────┘
         ↓
┌──────────────────────────┐
│ Generate JWT tokens      │
│ Create session           │
│ Set httpOnly cookies     │
└────────┬─────────────────┘
         ↓
┌──────────────────────────┐
│ Redirect to frontend     │
│ /oauth-callback          │
│ (cookies already set)    │
└──────────────────────────┘
```

### 6.3 Token Refresh Flow

```
┌─────────────────────┐
│ Access token        │
│ expired (15 min)    │
└────────┬────────────┘
         ↓
┌─────────────────────┐
│ Frontend sends      │
│ POST /auth/refresh  │
│ (refreshToken in    │
│  cookie)            │
└────────┬────────────┘
         ↓
┌─────────────────────┐
│ Verify JWT          │
│ signature & expiry  │
└────────┬────────────┘
         ↓
┌─────────────────────┐
│ Find user, check    │
│ tokenVersion        │
└────────┬────────────┘
         ↓
┌─────────────────────┐
│ Find session,       │
│ check not revoked   │
└────────┬────────────┘
         ↓
┌─────────────────────┐
│ Check inactivity    │
│ timeout (8 hours)   │
└────────┬────────────┘
         │
    [Active?]
         ├─ No → Revoke session
         │       Clear cookies
         │       Return 401 SESSION_TIMEOUT
         │
         └─ Yes → Update lastActive
                  Generate new accessToken
                  Keep same refreshToken
                  Set cookies
                  Return 200
```

### 6.4 Logout Flow

```
┌─────────────────────┐
│ User clicks logout  │
└────────┬────────────┘
         ↓
┌─────────────────────┐
│ POST /auth/logout   │
│ (authenticated)     │
└────────┬────────────┘
         ↓
┌─────────────────────┐
│ Clear cookies       │
│ - accessToken       │
│ - refreshToken      │
└────────┬────────────┘
         ↓
┌─────────────────────┐
│ Revoke refresh      │
│ token in blacklist  │
└────────┬────────────┘
         ↓
┌─────────────────────┐
│ Mark session as     │
│ revoked in DB       │
└────────┬────────────┘
         ↓
┌─────────────────────┐
│ Create audit log    │
└────────┬────────────┘
         ↓
┌─────────────────────┐
│ Return 200 OK       │
└─────────────────────┘
```

---

## 7. SECURITY FEATURES

### 7.1 Password Security

**Hashing:**
- Algorithm: **bcrypt**
- Salt rounds: **10** (User model), **12** (Session model)
- Pre-save hook automatically hashes passwords

**Strength Requirements:**
- Minimum length: 8 characters
- Requires: lowercase, uppercase, number, special character
- zxcvbn score minimum: 2 (on scale of 0-4)
- Checked against user inputs (email, name) to prevent weak passwords

**Storage:**
- Passwords NEVER stored in plain text
- NEVER logged or returned in API responses
- `select: false` in model (exclude by default)

### 7.2 Token Security

**Access Tokens (JWT):**
- Expiry: **15 minutes**
- Stored in httpOnly cookie
- Contains: `userId`, `role`, `companyId`
- Signed with `JWT_SECRET`

**Refresh Tokens (JWT):**
- Expiry: **7 days** (or 30 days if "remember me")
- Stored in httpOnly cookie
- Hashed in database (bcrypt, 12 rounds)
- Contains: `userId`, `tokenVersion`
- Signed with `JWT_REFRESH_SECRET`

**Token Versioning:**
- `security.tokenVersion` field in User model
- Incremented on:
  - Password change
  - Password reset
  - Security actions
- Invalidates all existing refresh tokens

**httpOnly Cookies:**
```typescript
res.cookie('accessToken', token, {
  httpOnly: true,              // Not accessible via JavaScript
  secure: NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax',            // CSRF protection
  maxAge: 15 * 60 * 1000      // 15 minutes
});
```

### 7.3 OAuth Token Encryption

**Implementation:**
- Plugin: `mongoose-field-encryption`
- Algorithm: AES-256-CBC
- Fields encrypted:
  - `oauth.google.accessToken`
  - `oauth.google.refreshToken`
- Encryption key: `process.env.ENCRYPTION_KEY` (32 bytes minimum)
- Salt: Random 16 bytes per document

**Purpose:**
- Prevents account takeover if database is breached
- Tokens encrypted at rest, decrypted on read
- Transparent to application code

### 7.4 Account Locking

**Trigger:**
- 5 failed login attempts

**Lock Duration:**
- 30 minutes

**Implementation:**
```typescript
if (failedLoginAttempts >= 5) {
  lockUntil = new Date(Date.now() + 30 * 60 * 1000);
}

// On login attempt
if (lockUntil && lockUntil > new Date()) {
  return 401 ACCOUNT_LOCKED;
}
```

**Reset:**
- Successful login resets `failedLoginAttempts` to 0
- Lock expires after 30 minutes

**Audit:**
- Account lock event logged in AuditLog
- Includes: IP, user agent, failed attempt count

### 7.5 CSRF Protection

**Implementation:**
- Middleware: `csrfProtection` (custom implementation)
- Enabled on state-changing endpoints:
  - `/register`
  - `/login`
  - `/reset-password`
  - `/reset-password/confirm`
  - `/resend-verification`
  - `/change-password`
  - `/change-email`

**Not Required:**
- OAuth callbacks (GET requests)
- `/refresh` (httpOnly cookie-based)
- `/logout` (httpOnly cookie-based)

### 7.6 Rate Limiting

**Configured Limiters:**

```typescript
// Login: 10 requests per 15 minutes
loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
});

// Registration: 5 requests per 15 minutes
registrationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
});

// Password reset: 3 requests per hour
passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
});

// Email verification: 5 requests per hour
emailVerificationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
});
```

**Purpose:**
- Prevent brute force attacks
- Prevent account enumeration
- Prevent spam registrations

### 7.7 Session Security

**Device Tracking:**
- User agent parsing (browser, OS, device type)
- IP address logging
- Device name extraction (if available)

**Inactivity Timeout:**
- **8 hours** of inactivity → session revoked
- `lastActive` timestamp updated on token refresh
- Enforced in `/refresh` endpoint

**Session Revocation:**
- Explicit logout
- Password change (all sessions)
- Password reset (all sessions)
- Security actions (all sessions)

**TTL Index:**
- Expired sessions automatically deleted from database
- `expiresAt` field with TTL index

### 7.8 Audit Logging

**All Security Events Logged:**
- User registration
- Login (success and failure)
- Logout
- Password reset request
- Password reset completion
- Password change
- Email change
- Email verification
- Account locking
- OAuth login
- Session creation/revocation

**Audit Log Fields:**
```typescript
{
  userId: ObjectId,
  companyId?: ObjectId,
  action: string,              // 'login', 'password_change', etc.
  resourceType: string,         // 'user', 'order', etc.
  resourceId: ObjectId,
  details: object,              // Event-specific data
  ip: string,
  userAgent: string,
  createdAt: Date
}
```

**Purpose:**
- Security monitoring
- Compliance (audit trail)
- Forensic analysis
- User activity tracking

---

## 8. INTEGRATION POINTS

### 8.1 Email Service

**Service:** SendGrid (via `email.service.ts`)

**Templates:**
- **Email Verification:** `sendVerificationEmail(email, name, token)`
- **Password Reset:** `sendPasswordResetEmail(email, name, token)`
- **Email Change Verification:** Uses `sendVerificationEmail()` with new email

**Environment Variables:**
```
SENDGRID_API_KEY=SG.xxx
FROM_EMAIL=noreply@Helix.com
VERIFICATION_URL=https://app.Helix.com/verify-email?token=
PASSWORD_RESET_URL=https://app.Helix.com/reset-password?token=
```

**Email Templates (SendGrid):**
- Template IDs stored in `email.service.ts`
- Dynamic data: `{{name}}`, `{{verificationUrl}}`, `{{resetUrl}}`

### 8.2 Audit Service

**Service:** `auditLog.middleware.ts`

**Function:**
```typescript
createAuditLog(
  userId: string,
  companyId: ObjectId | undefined,
  action: string,
  resourceType: string,
  resourceId: string,
  details: object,
  req: Request
)
```

**Used in:**
- All auth controller endpoints
- OAuth service
- Session service

**Storage:** MongoDB AuditLog collection

### 8.3 Team Module

**Integration:** Team invitations

**Models:**
- `TeamInvitation` model referenced in registration

**Flow:**
1. Team admin sends invitation with `teamRole`
2. Invitation token emailed to invitee
3. User registers with `invitationToken` in body
4. Registration controller:
   - Validates invitation token
   - Sets `companyId` from invitation
   - Sets `teamRole` from invitation
   - Marks invitation as `accepted`

**Fields Added to User:**
```typescript
{
  companyId: ObjectId,           // From invitation
  teamRole: 'admin' | 'manager' | 'member' | 'viewer',
  teamStatus: 'active'
}
```

### 8.4 Company Module

**Integration:** User-company relationship

**Reference:**
```typescript
User.companyId → Company._id
```

**Usage:**
- Access control (users can only access their company's data)
- Team management
- Subscription/billing association
- Multi-tenancy isolation

---

## 9. KNOWN ISSUES & GAPS

### 9.1 Critical Issues

**None** - All critical security features implemented

### 9.2 High Priority Gaps

**1. Security Questions Not Hashed** (Week 3)
- **Issue:** `security.recoveryOptions.securityQuestions.answer1/2/3` stored in plain text
- **Risk:** Database breach exposes answers
- **Fix:** Hash answers with bcrypt (same as passwords)
- **ETA:** Week 3

**2. No 2FA/MFA Support** (Week 12)
- **Issue:** Single-factor authentication only
- **Risk:** Compromised credentials = account takeover
- **Fix:** Implement TOTP (Google Authenticator) and SMS-based 2FA
- **ETA:** Week 12

**3. No Refresh Token Rotation** (Week 10)
- **Issue:** Same refresh token reused until expiry
- **Risk:** If refresh token leaked, valid until expiry
- **Fix:** Implement refresh token rotation (new token on each refresh)
- **ETA:** Week 10

### 9.3 Medium Priority Gaps

**4. No Device Management Dashboard** (Week 14)
- **Issue:** Users can't view/revoke sessions from UI
- **Current:** Only programmatic revocation
- **Fix:** Add `/sessions` endpoints and frontend UI
- **ETA:** Week 14

**5. No Social Login Beyond Google** (Week 13)
- **Issue:** Only Google OAuth supported
- **Requested:** Facebook, Apple, Microsoft
- **Fix:** Add Passport strategies for other providers
- **ETA:** Week 13

**6. Email Templates Not Branded** (Week 4)
- **Issue:** Default SendGrid templates
- **Fix:** Create custom HTML email templates with Helix branding
- **ETA:** Week 4

**7. No Account Recovery Without Email Access** (Week 11)
- **Issue:** If user loses email access, can't recover account
- **Partial:** Security questions implemented but not used
- **Fix:** Implement security questions flow + backup email/phone
- **ETA:** Week 11

### 9.4 Low Priority / Future Enhancements

**8. No Passwordless Login** (Week 15)
- Magic links or WebAuthn/FIDO2
- **ETA:** Week 15

**9. No IP Whitelist/Blacklist** (Week 16)
- Allow users to restrict login IPs
- **ETA:** Week 16

**10. No Login Notifications** (Week 6)
- Email/SMS notification on new device login
- **ETA:** Week 6

---

## 10. TESTING REQUIREMENTS

### 10.1 Current Test Coverage

**Overall Module: 40%**

**Existing Tests:**
- ✅ Unit tests for password service (11 test cases)
- ❌ No integration tests for auth endpoints
- ❌ No tests for session service
- ❌ No tests for OAuth service
- ❌ No tests for auth middleware

### 10.2 Required Unit Tests

**Password Service** ✅ Complete
- `meetsMinimumRequirements()`
- `evaluatePasswordStrength()`
- `getPasswordStrengthLabel()`

**Session Service** ⚪ Pending
- `createSession()`
- `getUserSessions()`
- `revokeSession()`
- `revokeAllSessions()`
- `updateSessionActivity()`
- `validateSession()`

**OAuth Service** ⚪ Pending
- `configureGoogleStrategy()` (complex, may need mocking)
- `generateAuthTokens()`

### 10.3 Required Integration Tests

**Authentication Endpoints** ⚪ Pending
- POST `/register`
  - Valid registration
  - Duplicate email
  - Invalid email format
  - Weak password
  - With invitation token
- POST `/login`
  - Valid credentials
  - Invalid credentials
  - Account not verified
  - Account locked (after 5 failed attempts)
  - OAuth-only account
- POST `/refresh`
  - Valid refresh token
  - Expired refresh token
  - Invalid token
  - Inactivity timeout
- POST `/logout`
  - Successful logout
  - Session revoked
- GET `/me`
  - Authenticated user
  - Unauthenticated user

**Email Verification** ⚪ Pending
- POST `/verify-email`
  - Valid token
  - Expired token
  - Invalid token
- POST `/resend-verification`
  - Existing user
  - Already verified user
  - Non-existent user

**Password Management** ⚪ Pending
- POST `/reset-password`
  - Valid email
  - Non-existent email
- POST `/reset-password/confirm`
  - Valid token
  - Expired token
  - Invalid token
- POST `/change-password`
  - Valid current password
  - Invalid current password
  - Same password
  - OAuth user without password

**Email Change** ⚪ Pending
- POST `/change-email`
  - Valid password
  - Invalid password
  - Email already in use
  - Same email
- POST `/verify-email-change`
  - Valid token
  - Expired token

**OAuth** ⚪ Pending
- GET `/google`
- GET `/google/callback`
  - New user creation
  - Existing user linking
  - Existing Google user

### 10.4 Test Data Requirements

**Factories Needed:**
- `userFactory()` - ✅ Exists (Session 1)
- `sessionFactory()` - ⚪ Create in Session 3
- `oauthUserFactory()` - ⚪ Create in Session 3

**Mock Services:**
- Email service (SendGrid) - Mock in tests
- Audit log service - Mock or use real DB
- Google OAuth - Mock Passport strategy

### 10.5 Coverage Target

**Week 1 Target:** 70%
**Week 16 Target:** 85%

**Priority:**
1. Integration tests for core auth flow (register, login, refresh, logout)
2. Unit tests for session service
3. Edge cases (account locking, expired tokens, etc.)
4. OAuth integration tests

---

## 11. FUTURE ENHANCEMENTS

### 11.1 Planned Features

**Week 6: Login Notifications**
- Email/SMS notification on new device login
- Configurable notification preferences
- "Was this you?" quick action link

**Week 10: Refresh Token Rotation**
- New refresh token on each refresh
- Invalidate old token immediately
- Detect token reuse (possible attack)

**Week 11: Account Recovery Improvements**
- Security questions flow
- Backup email verification
- Backup phone SMS verification
- Recovery key download

**Week 12: 2FA/MFA**
- TOTP (Time-based One-Time Password)
- SMS-based OTP
- Backup codes (10 single-use codes)
- 2FA enforcement for admin role

**Week 13: Additional Social Logins**
- Facebook Login
- Apple Sign In
- Microsoft Account
- GitHub (for developers)

**Week 14: Session Management Dashboard**
- View all active sessions
- Device info display
- Last active timestamp
- Revoke individual sessions
- "Sign out from all devices" button

**Week 15: Passwordless Login**
- Magic link via email
- WebAuthn/FIDO2 (biometric, security keys)

**Week 16: Advanced Security**
- IP whitelist/blacklist
- Login geolocation restrictions
- Unusual activity detection
- Session replay protection

### 11.2 API Versioning Plan

**Current:** `/api/v1/auth`

**Future (v2):**
- Breaking changes to token structure
- New authentication methods (passwordless)
- Enhanced session metadata

**Backward Compatibility:**
- v1 endpoints maintained for 6 months after v2 release
- Deprecation warnings in v1 responses

---

## APPENDIX: QUICK REFERENCE

### Environment Variables

```bash
# JWT
JWT_SECRET=<64-character-secret>
JWT_REFRESH_SECRET=<64-character-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=<32-byte-hex-string>

# Email
SENDGRID_API_KEY=SG.xxx
FROM_EMAIL=noreply@Helix.com
VERIFICATION_URL=https://app.Helix.com/verify-email?token=
PASSWORD_RESET_URL=https://app.Helix.com/reset-password?token=

# OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=http://localhost:5005/api/v1/auth/google/callback

# Frontend
CLIENT_URL=http://localhost:3000
```

### Common Commands

```bash
# Run auth tests
npm test -- auth

# Generate metrics
npx tsx scripts/generateMetrics.ts

# Check security audit
npm audit
```

### Key File Locations

```
server/src/infrastructure/database/mongoose/models/User.ts
server/src/infrastructure/database/mongoose/models/Session.ts
server/src/core/application/services/auth/oauth.service.ts
server/src/core/application/services/auth/session.service.ts
server/src/core/application/services/auth/password.service.ts
server/src/presentation/http/controllers/auth/auth.controller.ts
server/src/presentation/http/routes/v1/auth/auth.routes.ts
```

---

**Document End**
**Last Updated:** December 26, 2025
**Next Review:** Week 3 (Post-Velocity Integration)
