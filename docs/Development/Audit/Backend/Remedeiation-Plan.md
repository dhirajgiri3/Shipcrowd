# Shipcrowd Backend: Complete Remediation Plan

**Created**: 2026-01-08
**Status**: READY FOR EXECUTION
**Organization**: By Risk Severity (Security → Race Conditions → Architecture)
**Estimated Total Effort**: 120-150 hours
**Breaking Changes**: Yes (with migration guide)

---

## Executive Summary

This plan addresses **47 critical issues** across your backend codebase, organized by risk severity:

- **🔴 CRITICAL SECURITY** (5 issues) - Unencrypted credentials, plain text secrets
- **🟠 COMPILATION ERRORS** (4 issues) - Missing controller methods causing server crash
- **🟡 TYPE SAFETY** (14 issues) - Request vs AuthRequest mismatches
- **🔵 RACE CONDITIONS** (2 issues) - Order/Shipment concurrent update vulnerabilities
- **🟣 CLEAN ARCHITECTURE** (15+ issues) - HTTP concerns in services, logger fragmentation
- **🟤 DATABASE OPTIMIZATION** (7+ issues) - Missing/redundant indexes

**Strategy**: Fix issues sequentially, with each phase building on the previous. Comprehensive testing coverage will be added after fixes are complete to ensure all changes work correctly.

---

## PHASE 1: CRITICAL SECURITY VULNERABILITIES (Priority: IMMEDIATE)

**Estimated Time**: 8-10 hours
**Risk**: HIGH - Data breach if exploited
**Dependencies**: None
**Breaking Changes**: None (backward compatible)

### 🔴 Issue 1.1: Unencrypted OAuth Credentials in Company Model

**File**: `server/src/infrastructure/database/mongoose/models/organization/core/company.model.ts`
**Lines**: 116-127
**Impact**: Shopify/WooCommerce access tokens stored in plain text

#### Current Code (VULNERABLE):
```typescript
integrations: {
  shopify: {
    shopDomain: String,
    accessToken: String,  // ❌ PLAIN TEXT
    scope: String,
    lastSyncAt: Date,
  },
  woocommerce: {
    siteUrl: String,
    consumerKey: String,     // ❌ PLAIN TEXT
    consumerSecret: String,  // ❌ PLAIN TEXT
    lastSyncAt: Date,
  },
}
```

#### Fix Steps:

**Step 1**: Import fieldEncryption plugin (after other imports, around line 8):
```typescript
import mongoose, { Schema, Document } from 'mongoose';
import fieldEncryption from 'mongoose-field-encryption';
import crypto from 'crypto';
```

**Step 2**: Validate encryption key exists (before schema definition, around line 15):
```typescript
// Encryption key validation
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 64) {
  throw new Error(
    '❌ ENCRYPTION_KEY must be set in .env file (64+ hex characters).\n' +
    '   Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}
```

**Step 3**: Apply encryption plugin (after schema definition, before export, around line 250):
```typescript
// Apply field encryption to sensitive integration credentials
CompanySchema.plugin(fieldEncryption, {
  fields: [
    'integrations.shopify.accessToken',
    'integrations.woocommerce.consumerKey',
    'integrations.woocommerce.consumerSecret',
  ],
  secret: process.env.ENCRYPTION_KEY!,
  saltGenerator: () => crypto.randomBytes(16).toString('hex'),
  encryptOnSave: true,
  decryptOnFind: true,
});
```

**Verification**:
```bash
# 1. Start MongoDB shell
mongosh Shipcrowd

# 2. Check encrypted field (should see encrypted data)
db.companies.findOne({ 'integrations.shopify.accessToken': { $exists: true } })

# 3. Check from Node.js (should see decrypted data)
node -e "require('./src/infrastructure/database/mongoose/connection').then(() => {
  const Company = require('./src/infrastructure/database/mongoose/models/organization/core/company.model').default;
  Company.findOne({ 'integrations.shopify.accessToken': { $exists: true } })
    .then(c => console.log('Decrypted:', c.integrations.shopify.accessToken))
    .then(() => process.exit(0));
});"
```

---

### 🔴 Issue 1.2: Unencrypted Credentials in Integration Model

**File**: `server/src/infrastructure/database/mongoose/models/system/integrations/integration.model.ts`
**Lines**: 56-66
**Impact**: ALL courier/payment/marketplace credentials in plain text

#### Current Code (VULNERABLE):
```typescript
credentials: {
  apiKey: String,        // ❌ PLAIN TEXT
  apiSecret: String,     // ❌ PLAIN TEXT
  username: String,      // ❌ PLAIN TEXT
  password: String,      // ❌ PLAIN TEXT
  accessToken: String,   // ❌ PLAIN TEXT
  refreshToken: String,  // ❌ PLAIN TEXT
  accountId: String,
  clientId: String,      // ❌ PLAIN TEXT
  clientSecret: String,  // ❌ PLAIN TEXT
  webhookSecret: String, // ❌ PLAIN TEXT
}
```

#### Fix Steps:

**Step 1**: Import fieldEncryption plugin:
```typescript
import fieldEncryption from 'mongoose-field-encryption';
import crypto from 'crypto';
```

**Step 2**: Add encryption key validation (before schema):
```typescript
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 64) {
  throw new Error('❌ ENCRYPTION_KEY must be set in .env file (64+ hex characters).');
}
```

**Step 3**: Apply encryption to ALL credential fields:
```typescript
// Apply field encryption to all sensitive credentials
IntegrationSchema.plugin(fieldEncryption, {
  fields: [
    'credentials.apiKey',
    'credentials.apiSecret',
    'credentials.username',
    'credentials.password',
    'credentials.accessToken',
    'credentials.refreshToken',
    'credentials.clientId',
    'credentials.clientSecret',
    'credentials.webhookSecret',
  ],
  secret: process.env.ENCRYPTION_KEY!,
  saltGenerator: () => crypto.randomBytes(16).toString('hex'),
  encryptOnSave: true,
  decryptOnFind: true,
});
```

**Note**: `accountId` is NOT encrypted as it's not a credential (just an identifier).

**Verification**:
```bash
# Check encrypted storage
db.integrations.findOne({ 'credentials.apiKey': { $exists: true } })
# Should see: credentials.__enc_apiKey, credentials.__enc_apiKey_d (encrypted fields)
```

---

### 🔴 Issue 1.3: Security Question Answers in Plain Text

**File**: `server/src/infrastructure/database/mongoose/models/iam/users/user.model.ts`
**Lines**: 64-76
**Impact**: Account recovery vulnerability

#### Current Code (VULNERABLE):
```typescript
recoveryOptions?: {
  securityQuestions?: {
    question1: string;
    answer1: string;  // ❌ PLAIN TEXT
    question2: string;
    answer2: string;  // ❌ PLAIN TEXT
    question3: string;
    answer3: string;  // ❌ PLAIN TEXT
    lastUpdated: Date;
  };
}
```

#### Fix Steps:

**Step 1**: Create security question answer hashing method (add after password comparison method, around line 366):
```typescript
/**
 * Hash security question answer
 * @param answer - Plain text answer
 * @returns Hashed answer
 */
UserSchema.methods.hashSecurityAnswer = async function(answer: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(answer.toLowerCase().trim(), salt);
};

/**
 * Compare security question answer
 * @param candidateAnswer - Plain text answer to verify
 * @param hashedAnswer - Hashed answer from database
 * @returns True if match
 */
UserSchema.methods.compareSecurityAnswer = async function(
  candidateAnswer: string,
  hashedAnswer: string
): Promise<boolean> {
  return bcrypt.compare(candidateAnswer.toLowerCase().trim(), hashedAnswer);
};
```

**Step 2**: Add pre-save hook to hash answers (add before existing pre-save hook, around line 345):
```typescript
// Pre-save hook: Hash security question answers if modified
UserSchema.pre('save', async function(next) {
  if (this.security?.recoveryOptions?.securityQuestions) {
    const questions = this.security.recoveryOptions.securityQuestions;

    // Check if answers were modified (detect plain text answers)
    if (this.isModified('security.recoveryOptions.securityQuestions.answer1')) {
      questions.answer1 = await bcrypt.hash(
        questions.answer1.toLowerCase().trim(),
        12
      );
    }
    if (this.isModified('security.recoveryOptions.securityQuestions.answer2')) {
      questions.answer2 = await bcrypt.hash(
        questions.answer2.toLowerCase().trim(),
        12
      );
    }
    if (this.isModified('security.recoveryOptions.securityQuestions.answer3')) {
      questions.answer3 = await bcrypt.hash(
        questions.answer3.toLowerCase().trim(),
        12
      );
    }
  }
  next();
});
```

**Step 3**: Update comment in schema definition (line 64):
```typescript
recoveryOptions?: {
  securityQuestions?: {
    question1: string;
    answer1: string;  // ✅ Hashed with bcrypt (12 rounds) - see pre-save hook
    question2: string;
    answer2: string;  // ✅ Hashed with bcrypt (12 rounds)
    question3: string;
    answer3: string;  // ✅ Hashed with bcrypt (12 rounds)
    lastUpdated: Date;
  };
```

**Migration Script**: Create `server/scripts/migrate-security-answers.ts`:
```typescript
/**
 * MIGRATION: Hash existing security question answers
 * Run once: npx tsx server/scripts/migrate-security-answers.ts
 */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../src/infrastructure/database/mongoose/models/iam/users/user.model';

async function migrateSecurityAnswers() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const users = await User.find({
    'security.recoveryOptions.securityQuestions': { $exists: true }
  });

  console.log(`Found ${users.length} users with security questions`);

  for (const user of users) {
    const questions = user.security?.recoveryOptions?.securityQuestions;
    if (!questions) continue;

    // Check if already hashed (bcrypt hashes start with $2b$)
    const isHashed = (answer: string) => answer.startsWith('$2b$');

    let modified = false;
    if (!isHashed(questions.answer1)) {
      questions.answer1 = await bcrypt.hash(questions.answer1.toLowerCase().trim(), 12);
      modified = true;
    }
    if (!isHashed(questions.answer2)) {
      questions.answer2 = await bcrypt.hash(questions.answer2.toLowerCase().trim(), 12);
      modified = true;
    }
    if (!isHashed(questions.answer3)) {
      questions.answer3 = await bcrypt.hash(questions.answer3.toLowerCase().trim(), 12);
      modified = true;
    }

    if (modified) {
      await user.save();
      console.log(`✅ Migrated user ${user.email}`);
    }
  }

  console.log('Migration complete');
  process.exit(0);
}

migrateSecurityAnswers().catch(console.error);
```

**Verification**:
```bash
# Run migration
npx tsx server/scripts/migrate-security-answers.ts

# Verify hashes
node -e "require('./src/infrastructure/database/mongoose/connection').then(() => {
  const User = require('./src/infrastructure/database/mongoose/models/iam/users/user.model').default;
  User.findOne({ 'security.recoveryOptions.securityQuestions': { $exists: true } })
    .then(u => {
      console.log('Answer 1 starts with $2b$:', u.security.recoveryOptions.securityQuestions.answer1.startsWith('$2b$'));
    })
    .then(() => process.exit(0));
});"
```

---

### 🔴 Issue 1.4: Recovery Token Not Hashed

**File**: `server/src/infrastructure/database/mongoose/models/auth/recovery-token.model.ts`
**Lines**: 10 (comment), 35 (token field)
**Impact**: Password reset tokens vulnerable if database breached

#### Current Code (VULNERABLE):
```typescript
// Comment says: "Token is hashed with SHA-256 for security"
// But actual code:
const recoveryTokenSchema = new Schema<IRecoveryToken>({
  token: {
    type: String,
    required: true,
    unique: true
  },  // ❌ NOT HASHED
```

#### Fix Steps:

**Step 1**: Add crypto import:
```typescript
import crypto from 'crypto';
```

**Step 2**: Create token hashing method:
```typescript
/**
 * Hash recovery token with SHA-256
 * @param plainToken - Plain text token
 * @returns Hashed token (hex string)
 */
recoveryTokenSchema.statics.hashToken = function(plainToken: string): string {
  return crypto.createHash('sha256').update(plainToken).digest('hex');
};
```

**Step 3**: Add pre-save hook to hash tokens (before export):
```typescript
// Pre-save hook: Hash token if new or modified
recoveryTokenSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('token')) {
    // Only hash if not already hashed (SHA-256 hex = 64 characters)
    if (this.token.length !== 64 || !/^[a-f0-9]+$/.test(this.token)) {
      this.token = crypto.createHash('sha256').update(this.token).digest('hex');
    }
  }
  next();
});
```

**Step 4**: Update service usage (search for `RecoveryToken.create` or `.save()`):

Example in password reset service:
```typescript
// BEFORE
const plainToken = crypto.randomBytes(32).toString('hex');
await RecoveryToken.create({ userId, token: plainToken, ... });
return plainToken; // Send this in email

// AFTER (NO CHANGE NEEDED - pre-save hook handles it)
const plainToken = crypto.randomBytes(32).toString('hex');
await RecoveryToken.create({ userId, token: plainToken, ... }); // Will be hashed
return plainToken; // Still send plain token in email

// When verifying:
// BEFORE
const recovery = await RecoveryToken.findOne({ token: plainToken });

// AFTER
const hashedToken = RecoveryToken.hashToken(plainToken);
const recovery = await RecoveryToken.findOne({ token: hashedToken });
```

**Step 5**: Update all recovery token lookups across codebase:

Search for: `RecoveryToken.findOne({ token:`

Replace with:
```typescript
const hashedToken = RecoveryToken.hashToken(plainToken);
const recovery = await RecoveryToken.findOne({ token: hashedToken });
```

**Files to update**:
- `server/src/core/application/services/auth/password.service.ts` (password reset verification)
- `server/src/presentation/http/controllers/auth/auth.controller.ts` (reset confirmation)

**Migration Script**: Create `server/scripts/migrate-recovery-tokens.ts`:
```typescript
/**
 * MIGRATION: Hash existing recovery tokens
 * WARNING: This will invalidate all existing password reset links
 * Run once: npx tsx server/scripts/migrate-recovery-tokens.ts
 */
import mongoose from 'mongoose';
import crypto from 'crypto';
import RecoveryToken from '../src/infrastructure/database/mongoose/models/auth/recovery-token.model';

async function migrateTokens() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const tokens = await RecoveryToken.find({});
  console.log(`Found ${tokens.length} recovery tokens`);

  // Delete all existing tokens (they'll be invalid anyway after hashing)
  await RecoveryToken.deleteMany({});
  console.log('✅ Deleted all existing recovery tokens (users will need to request new password reset)');

  console.log('Migration complete');
  process.exit(0);
}

migrateTokens().catch(console.error);
```

**Verification**:
```bash
# Run migration (invalidates existing tokens)
npx tsx server/scripts/migrate-recovery-tokens.ts

# Test: Request new password reset
curl -X POST http://localhost:5005/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Check database - token should be 64 hex characters
db.recoverytokens.findOne()
# token should match: /^[a-f0-9]{64}$/
```

---

### 🔴 Issue 1.5: Encryption Key Fallbacks

**Files**: Multiple marketplace store models
**Impact**: Uses insecure fallback if ENCRYPTION_KEY missing

#### Files Affected:
- `server/src/infrastructure/database/mongoose/models/marketplaces/shopify/shopify-store.model.ts` (line 226)
- Similar patterns in WooCommerce, Amazon, Flipkart store models

#### Current Code (VULNERABLE):
```typescript
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '00000000000000000000000000000000';
// ❌ Insecure fallback!
```

#### Fix Steps:

**Step 1**: Replace fallback with error throw:
```typescript
// BEFORE
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '00000000000000000000000000000000';

// AFTER
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 64) {
  throw new Error(
    '❌ ENCRYPTION_KEY must be set in .env file (64+ hex characters).\n' +
    '   Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
```

**Step 2**: Verify .env has encryption key:
```bash
# Check .env file
grep ENCRYPTION_KEY .env

# If missing, generate new key
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
echo "ENCRYPTION_KEY=<generated_key>" >> .env
```

**Step 3**: Update all marketplace store models:
- `shopify-store.model.ts`
- `woocommerce-store.model.ts`
- `amazon-store.model.ts`
- `flipkart-store.model.ts`

**Verification**:
```bash
# Test: Start server without ENCRYPTION_KEY
unset ENCRYPTION_KEY
npm run dev
# Should throw error and refuse to start

# Test: Start with valid key
export ENCRYPTION_KEY=<64_hex_chars>
npm run dev
# Should start successfully
```

---

### ✅ Phase 1 Completion Checklist

- [ ] Issue 1.1: Company model credentials encrypted
- [ ] Issue 1.2: Integration model credentials encrypted
- [ ] Issue 1.3: Security answers hashed
- [ ] Issue 1.4: Recovery tokens hashed
- [ ] Issue 1.5: Encryption fallbacks removed
- [ ] Migration scripts executed
- [ ] Verification tests passed
- [ ] .env file has valid ENCRYPTION_KEY

**Deployment Notes**:
- Run migration scripts on staging first
- Notify users that existing password reset links will be invalidated
- Monitor error logs for decryption failures (indicates corrupted data)
- Consider adding encryption key rotation mechanism in future

---

## PHASE 2: COMPILATION ERRORS (Priority: CRITICAL)

**Estimated Time**: 4-6 hours
**Risk**: HIGH - Server won't start
**Dependencies**: None
**Breaking Changes**: None (adding missing methods)

### 🟠 Issue 2.1: Missing Shopify Controller Methods

**File**: `server/src/presentation/http/controllers/integrations/shopify.controller.ts`
**Routes File**: `server/src/presentation/http/routes/v1/integrations/shopify.routes.ts`
**Impact**: 4 routes defined but methods don't exist

#### Missing Methods:
1. `createFulfillment` (line 86-89 in routes)
2. `updateFulfillmentTracking` (line 93-98 in routes)
3. `syncOrders` (line 101-106 in routes)
4. `syncPendingFulfillments` (line 109-114 in routes)

#### Implementation Strategy:

These methods should delegate to service layer. Based on codebase patterns:

**Step 1**: Add missing imports at top of controller:
```typescript
import ShopifyOrderSyncService from '../../../../core/application/services/shopify/shopify-order-sync.service';
import ShopifyFulfillmentService from '../../../../core/application/services/shopify/shopify-fulfillment.service';
import logger from '../../../../shared/logger/winston.logger';
```

**Step 2**: Implement `createFulfillment` method (add after `resumeSync` method, around line 354):
```typescript
/**
 * POST /api/v1/integrations/shopify/stores/:storeId/orders/:orderId/fulfill
 * Create fulfillment for Shopify order
 */
static async createFulfillment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId;
    const { storeId, orderId } = req.params;
    const { trackingNumber, trackingCompany, trackingUrl, notifyCustomer } = req.body;

    if (!companyId) {
      throw new AppError('Company ID not found', 'UNAUTHORIZED', 401);
    }

    // Validate store access
    const ShopifyStore = require('../../../../infrastructure/database/mongoose/models/shopify-store.model').default;
    const store = await ShopifyStore.findOne({ _id: storeId, company: companyId });

    if (!store) {
      throw new AppError('Store not found or access denied', 'STORE_NOT_FOUND', 404);
    }

    // Create fulfillment via service
    const fulfillment = await ShopifyFulfillmentService.createFulfillment({
      storeId,
      orderId,
      trackingNumber,
      trackingCompany,
      trackingUrl,
      notifyCustomer: notifyCustomer ?? true,
    });

    logger.info('Shopify fulfillment created', {
      storeId,
      orderId,
      fulfillmentId: fulfillment.id,
      companyId,
    });

    res.status(201).json({
      success: true,
      message: 'Fulfillment created successfully',
      data: { fulfillment },
    });
  } catch (error) {
    next(error);
  }
}
```

**Step 3**: Implement `updateFulfillmentTracking` method:
```typescript
/**
 * PUT /api/v1/integrations/shopify/stores/:storeId/fulfillments/:fulfillmentId
 * Update tracking information for existing fulfillment
 */
static async updateFulfillmentTracking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId;
    const { storeId, fulfillmentId } = req.params;
    const { trackingNumber, trackingCompany, trackingUrl } = req.body;

    if (!companyId) {
      throw new AppError('Company ID not found', 'UNAUTHORIZED', 401);
    }

    // Validate store access
    const ShopifyStore = require('../../../../infrastructure/database/mongoose/models/shopify-store.model').default;
    const store = await ShopifyStore.findOne({ _id: storeId, company: companyId });

    if (!store) {
      throw new AppError('Store not found or access denied', 'STORE_NOT_FOUND', 404);
    }

    // Update fulfillment tracking
    const updatedFulfillment = await ShopifyFulfillmentService.updateTracking({
      storeId,
      fulfillmentId,
      trackingNumber,
      trackingCompany,
      trackingUrl,
    });

    logger.info('Shopify fulfillment tracking updated', {
      storeId,
      fulfillmentId,
      companyId,
    });

    res.json({
      success: true,
      message: 'Tracking information updated successfully',
      data: { fulfillment: updatedFulfillment },
    });
  } catch (error) {
    next(error);
  }
}
```

**Step 4**: Implement `syncOrders` method:
```typescript
/**
 * POST /api/v1/integrations/shopify/stores/:id/sync/orders
 * Manually trigger order synchronization
 */
static async syncOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId;
    const { id: storeId } = req.params;
    const { sinceDate, limit } = req.body;

    if (!companyId) {
      throw new AppError('Company ID not found', 'UNAUTHORIZED', 401);
    }

    // Validate store access
    const ShopifyStore = require('../../../../infrastructure/database/mongoose/models/shopify-store.model').default;
    const store = await ShopifyStore.findOne({ _id: storeId, company: companyId });

    if (!store) {
      throw new AppError('Store not found or access denied', 'STORE_NOT_FOUND', 404);
    }

    // Check if sync is paused
    if (store.syncSettings?.paused) {
      throw new AppError('Order sync is paused for this store', 'SYNC_PAUSED', 400);
    }

    logger.info('Manual order sync initiated', {
      storeId,
      companyId,
      sinceDate,
    });

    // Trigger sync (async process)
    const syncResult = await ShopifyOrderSyncService.syncOrders(
      storeId,
      sinceDate ? new Date(sinceDate) : undefined,
      limit
    );

    res.json({
      success: true,
      message: 'Order synchronization completed',
      data: {
        itemsProcessed: syncResult.itemsProcessed,
        itemsCreated: syncResult.itemsCreated,
        itemsUpdated: syncResult.itemsUpdated,
        itemsFailed: syncResult.itemsFailed,
        errors: syncResult.errors,
      },
    });
  } catch (error) {
    next(error);
  }
}
```

**Step 5**: Implement `syncPendingFulfillments` method:
```typescript
/**
 * POST /api/v1/integrations/shopify/stores/:id/sync/fulfillments
 * Sync fulfillment status for pending orders
 */
static async syncPendingFulfillments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId;
    const { id: storeId } = req.params;

    if (!companyId) {
      throw new AppError('Company ID not found', 'UNAUTHORIZED', 401);
    }

    // Validate store access
    const ShopifyStore = require('../../../../infrastructure/database/mongoose/models/shopify-store.model').default;
    const store = await ShopifyStore.findOne({ _id: storeId, company: companyId });

    if (!store) {
      throw new AppError('Store not found or access denied', 'STORE_NOT_FOUND', 404);
    }

    logger.info('Pending fulfillments sync initiated', {
      storeId,
      companyId,
    });

    // Sync pending fulfillments
    const syncResult = await ShopifyFulfillmentService.syncPendingFulfillments(storeId);

    res.json({
      success: true,
      message: 'Fulfillment synchronization completed',
      data: {
        ordersChecked: syncResult.ordersChecked,
        fulfillmentsCreated: syncResult.fulfillmentsCreated,
        fulfillmentsUpdated: syncResult.fulfillmentsUpdated,
        errors: syncResult.errors,
      },
    });
  } catch (error) {
    next(error);
  }
}
```

**Step 6**: Export new methods (update export statement at bottom):
```typescript
export default ShopifyController;
```

**Note**: Service methods (`ShopifyFulfillmentService`, `ShopifyOrderSyncService`) are assumed to exist based on analysis. If they don't exist, we'll need to implement them or remove these routes.

**Verification**:
```bash
# 1. Check TypeScript compilation
npm run build
# Should compile without errors

# 2. Start server
npm run dev
# Should start without crashing

# 3. Test endpoints (requires valid Shopify store)
curl -X POST http://localhost:5005/api/v1/integrations/shopify/stores/:id/sync/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"sinceDate":"2025-01-01"}'
```

---

### ✅ Phase 2 Completion Checklist

- [ ] Shopify controller: `createFulfillment` implemented
- [ ] Shopify controller: `updateFulfillmentTracking` implemented
- [ ] Shopify controller: `syncOrders` implemented
- [ ] Shopify controller: `syncPendingFulfillments` implemented
- [ ] TypeScript compiles without errors
- [ ] Server starts successfully
- [ ] Routes accessible (401 if not authenticated)

---

## PHASE 3: TYPE SAFETY VIOLATIONS (Priority: HIGH)

**Estimated Time**: 6-8 hours
**Risk**: MEDIUM - Runtime type errors, no autocomplete
**Dependencies**: Phase 2 complete
**Breaking Changes**: None (controller signatures only)

### 🟡 Issue 3.1: Request vs AuthRequest Type Mismatches

**Impact**: 14 controllers access `req.user` without proper typing

#### Affected Controllers:
1. `shopify.controller.ts` (9 violations)
2. `woocommerce.controller.ts` (14 violations)
3. `amazon.controller.ts` (9 violations)
4. `flipkart.controller.ts` (7 violations)
5. `product-mapping.controller.ts` (9 violations)
6. `amazon-product-mapping.controller.ts` (similar)
7. `flipkart-product-mapping.controller.ts` (similar)
8. `integrations.controller.ts` (1 violation)
9. `commission/*.controller.ts` (multiple)
10. `rto/rto.controller.ts`
11. `ndr/ndr.controller.ts`
12-14. (Other integration controllers)

#### Fix Strategy:

**Step 1**: Create AuthRequest type centralization (if not already exists):

File: `server/src/types/express.ts` (create if missing):
```typescript
import { Request } from 'express';
import { Types } from 'mongoose';

/**
 * Authenticated request with user context
 * Used by all routes that require authentication
 */
export interface AuthRequest extends Request {
  user?: {
    _id: string | Types.ObjectId;
    email: string;
    name: string;
    role: 'admin' | 'seller' | 'staff';
    companyId?: string | Types.ObjectId;
    teamRole?: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
    teamStatus?: 'active' | 'invited' | 'suspended';
  };
}
```

**Step 2**: Batch fix all integration controllers:

**Example: shopify.controller.ts**

Find and replace:
```typescript
// BEFORE (9 occurrences)
static async install(req: Request, res: Response, next: NextFunction): Promise<void>
static async callback(req: Request, res: Response, next: NextFunction): Promise<void>
// ... all methods

// AFTER
static async install(req: AuthRequest, res: Response, next: NextFunction): Promise<void>
static async callback(req: AuthRequest, res: Response, next: NextFunction): Promise<void>
// ... all methods
```

Add import at top:
```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../../../types/express';  // ADD THIS
```

**Automated Fix Script**: Create `server/scripts/fix-auth-request-types.sh`:
```bash
#!/bin/bash
# Fix Request -> AuthRequest in all controllers

FILES=(
  "server/src/presentation/http/controllers/integrations/shopify.controller.ts"
  "server/src/presentation/http/controllers/integrations/woocommerce.controller.ts"
  "server/src/presentation/http/controllers/integrations/amazon.controller.ts"
  "server/src/presentation/http/controllers/integrations/flipkart.controller.ts"
  "server/src/presentation/http/controllers/integrations/product-mapping.controller.ts"
  "server/src/presentation/http/controllers/integrations/amazon-product-mapping.controller.ts"
  "server/src/presentation/http/controllers/integrations/flipkart-product-mapping.controller.ts"
  "server/src/presentation/http/controllers/integrations/integrations.controller.ts"
  "server/src/presentation/http/controllers/commission/commission-analytics.controller.ts"
  "server/src/presentation/http/controllers/commission/sales-representative.controller.ts"
  "server/src/presentation/http/controllers/commission/payout.controller.ts"
  "server/src/presentation/http/controllers/commission/commission-rule.controller.ts"
  "server/src/presentation/http/controllers/commission/commission-transaction.controller.ts"
  "server/src/presentation/http/controllers/rto/rto.controller.ts"
  "server/src/presentation/http/controllers/ndr/ndr.controller.ts"
)

for file in "${FILES[@]}"; do
  echo "Processing $file..."

  # Add AuthRequest import if missing
  if ! grep -q "AuthRequest" "$file"; then
    sed -i '' "1a\\
import { AuthRequest } from '../../../../types/express';
" "$file"
  fi

  # Replace req: Request with req: AuthRequest (but not Request from express)
  sed -i '' 's/\(req: \)Request\(, res: Response\)/\1AuthRequest\2/g' "$file"

  echo "✅ Fixed $file"
done

echo "Done! Run 'npm run build' to verify."
```

**Step 3**: Run script and verify:
```bash
chmod +x server/scripts/fix-auth-request-types.sh
./server/scripts/fix-auth-request-types.sh

# Verify compilation
npm run build

# Check specific file
grep "req: AuthRequest" server/src/presentation/http/controllers/integrations/shopify.controller.ts
# Should see all method signatures updated
```

**Step 4**: Fix any remaining controllers manually:

Search for: `req.user` in all controller files
Check if signature uses `Request` instead of `AuthRequest`

**Verification**:
```bash
# 1. TypeScript should show no errors
npm run build

# 2. IDE autocomplete should work
# Open controller file, type "req.user." and verify autocomplete shows:
# - _id, email, name, role, companyId, teamRole, teamStatus

# 3. No TypeScript warnings in IDE
code server/src/presentation/http/controllers/integrations/shopify.controller.ts
# Should see no red squiggles under req.user
```

---

### ✅ Phase 3 Completion Checklist

- [ ] AuthRequest type defined in `types/express.ts`
- [ ] All 14+ controllers updated to use AuthRequest
- [ ] Import statements added
- [ ] TypeScript compiles without errors
- [ ] IDE autocomplete works for req.user
- [ ] No `Property 'user' does not exist on type 'Request'` errors

---

## PHASE 4: RACE CONDITIONS (Priority: HIGH)

**Estimated Time**: 8-10 hours
**Risk**: MEDIUM - Data corruption under concurrent load
**Dependencies**: Phase 3 complete
**Breaking Changes**: Yes (service method signatures change)

### 🔵 Issue 4.1: Order Model Race Condition

**File**: `server/src/infrastructure/database/mongoose/models/orders/core/order.model.ts`
**Lines**: 7-15 (documented but not fixed)
**Impact**: Concurrent status updates overwrite each other

#### Current Issue:
```typescript
/**
 * CONCURRENCY WARNING:
 * This model is vulnerable to race conditions during concurrent status updates.
 * Multiple requests updating currentStatus simultaneously can overwrite each other.
 */
```

#### Fix Strategy: Optimistic Locking with `__v` (Version Field)

**Step 1**: Enable optimistic concurrency in schema (add around line 295):
```typescript
const OrderSchema = new Schema<IOrder>(
  {
    // ... all fields ...
  },
  {
    timestamps: true,
    optimisticConcurrency: true  // ✅ ADD THIS - enables version checking
  }
);
```

**Step 2**: Update OrderService status update method:

File: `server/src/core/application/services/shipping/order.service.ts`

Find: `updateOrderStatus` method (around line 209)

Replace with:
```typescript
/**
 * Update order status with optimistic locking
 * @throws AppError if concurrent modification detected or invalid transition
 */
static async updateOrderStatus(args: {
  orderId: string;
  currentStatus: string;
  newStatus: string;
  currentVersion: number;  // ✅ NEW: Required for optimistic locking
  userId: string;
  comment?: string;
}): Promise<{
  success: boolean;
  order?: IOrder;
  error?: string;
  code?: string;
}> {
  const { orderId, currentStatus, newStatus, currentVersion, userId, comment } = args;

  try {
    // 1. Validate status transition
    const { valid, message } = validateStatusTransition(
      currentStatus,
      newStatus,
      ORDER_STATUS_TRANSITIONS
    );

    if (!valid) {
      return {
        success: false,
        error: message,
        code: 'INVALID_STATUS_TRANSITION',
      };
    }

    // 2. Create status history entry
    const statusEntry = {
      status: newStatus,
      timestamp: new Date(),
      comment: comment || undefined,
      updatedBy: new mongoose.Types.ObjectId(userId),
    };

    // 3. Atomic update with version check (optimistic locking)
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        __v: currentVersion  // ✅ VERSION CHECK: Only update if version matches
      },
      {
        $set: { currentStatus: newStatus },
        $push: { statusHistory: statusEntry },
        $inc: { __v: 1 },  // ✅ INCREMENT VERSION
      },
      {
        new: true,  // Return updated document
        runValidators: true
      }
    );

    // 4. Check if update succeeded
    if (!updatedOrder) {
      // No document matched = version mismatch = concurrent modification
      logger.warn('Concurrent modification detected', {
        orderId,
        expectedVersion: currentVersion,
        attemptedStatus: newStatus,
      });

      return {
        success: false,
        error: 'Order was updated by another process. Please refresh and retry.',
        code: 'CONCURRENT_MODIFICATION',
      };
    }

    // 5. Success
    logger.info('Order status updated', {
      orderId,
      oldStatus: currentStatus,
      newStatus,
      version: updatedOrder.__v,
    });

    return {
      success: true,
      order: updatedOrder,
    };

  } catch (error: any) {
    logger.error('Error updating order status:', error);
    return {
      success: false,
      error: 'Failed to update order status',
      code: 'UPDATE_FAILED',
    };
  }
}
```

**Step 3**: Update controller to handle version conflicts:

File: `server/src/presentation/http/controllers/shipping/order.controller.ts`

Find: Order update endpoint handler (around line 180)

Update to:
```typescript
export const updateOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = guardChecks(req, res);
    if (!auth) return;

    const { orderId } = req.params;

    // ... validation ...

    const order = await Order.findOne({ _id: orderId, companyId: auth.companyId, isDeleted: false });
    if (!order) {
      sendError(res, 'Order not found', 404, 'ORDER_NOT_FOUND');
      return;
    }

    // ✅ CAPTURE CURRENT VERSION
    const currentVersion = order.__v;

    // If status is being updated
    if (validation.data.currentStatus && validation.data.currentStatus !== order.currentStatus) {
      const result = await OrderService.updateOrderStatus({
        orderId: String(order._id),
        currentStatus: order.currentStatus,
        newStatus: validation.data.currentStatus,
        currentVersion,  // ✅ PASS VERSION
        userId: auth.userId,
        comment: validation.data.statusComment,
      });

      if (!result.success) {
        if (result.code === 'CONCURRENT_MODIFICATION') {
          // ✅ SPECIAL HANDLING FOR CONCURRENT MODIFICATION
          sendError(
            res,
            'The order was updated by another user. Please refresh and try again.',
            409,  // 409 Conflict
            'CONCURRENT_MODIFICATION'
          );
          return;
        } else {
          // Invalid transition or other error
          sendError(res, result.error || 'Status update failed', 400, result.code || 'STATUS_UPDATE_FAILED');
          return;
        }
      }

      // Use updated order from result
      Object.assign(order, result.order);
    }

    // ... rest of update logic ...

    sendSuccess(res, { order }, 'Order updated successfully');

  } catch (error) {
    next(error);
  }
};
```

**Step 4**: Update client-side handling (frontend guidance):

Create documentation: `docs/API-Concurrency-Handling.md`:
```markdown
# API Concurrency Handling

## Order Status Updates

Order status updates use **optimistic locking** to prevent race conditions.

### How It Works:

1. Fetch order with current version:
   ```javascript
   const order = await getOrder(orderId);
   console.log(order.__v); // e.g., 5
   ```

2. Update order, passing current version:
   ```javascript
   const response = await updateOrder(orderId, {
     currentStatus: 'shipped',
     __v: order.__v  // Include version
   });
   ```

3. Handle 409 Conflict (concurrent modification):
   ```javascript
   if (response.status === 409) {
     // Another user/process updated the order
     // Refresh order and retry
     const freshOrder = await getOrder(orderId);
     // Show user: "Order was updated. Please review and try again."
   }
   ```

### Best Practices:

- Always include `__v` when updating orders
- Show user-friendly message on 409 errors
- Automatically retry once (with fresh data)
- Log concurrent modification events for monitoring
```

**Verification**:
```bash
# Test concurrent updates
# Terminal 1: Start server
npm run dev

# Terminal 2: Concurrent update script
node -e "
const axios = require('axios');
const token = 'YOUR_AUTH_TOKEN';
const orderId = 'YOUR_ORDER_ID';

// Simulate 2 concurrent updates
Promise.all([
  axios.patch(\`http://localhost:5005/api/v1/orders/\${orderId}\`,
    { currentStatus: 'processing', __v: 0 },
    { headers: { Authorization: \`Bearer \${token}\` } }
  ),
  axios.patch(\`http://localhost:5005/api/v1/orders/\${orderId}\`,
    { currentStatus: 'ready_to_ship', __v: 0 },
    { headers: { Authorization: \`Bearer \${token}\` } }
  ),
])
.then(results => {
  console.log('Result 1:', results[0].status);
  console.log('Result 2:', results[1].status);
  // One should succeed (200), one should fail (409)
})
.catch(err => console.error('Error:', err.response?.status, err.response?.data));
"

# Expected: One 200 OK, one 409 Conflict
```

---

### 🔵 Issue 4.2: Shipment Model Race Condition

**File**: `server/src/infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model.ts`
**Impact**: Same as Order model - carrier webhooks can race

#### Fix Steps:

**Step 1**: Enable optimistic concurrency (around line 470):
```typescript
const ShipmentSchema = new Schema<IShipment>(
  {
    // ... all fields ...
  },
  {
    timestamps: true,
    optimisticConcurrency: true  // ✅ ADD THIS
  }
);
```

**Step 2**: Update ShipmentService status update method:

File: `server/src/core/application/services/shipping/shipment.service.ts`

Find: Status update method (likely around line 200-300)

Apply same pattern as Order model:
```typescript
/**
 * Update shipment status with optimistic locking
 * @param shipmentId - Shipment ID
 * @param currentVersion - Current __v value for optimistic locking
 * @param newStatus - New status
 * @param trackingEvent - Tracking event data
 * @returns Updated shipment or error
 */
static async updateShipmentStatus(args: {
  shipmentId: string;
  currentVersion: number;  // ✅ ADD THIS
  newStatus: string;
  trackingEvent: {
    status: string;
    timestamp: Date;
    location?: string;
    description?: string;
    metadata?: any;
  };
}): Promise<{
  success: boolean;
  shipment?: IShipment;
  error?: string;
  code?: string;
}> {
  const { shipmentId, currentVersion, newStatus, trackingEvent } = args;

  try {
    // Atomic update with version check
    const updatedShipment = await Shipment.findOneAndUpdate(
      {
        _id: shipmentId,
        __v: currentVersion  // ✅ VERSION CHECK
      },
      {
        $set: { currentStatus: newStatus },
        $push: { trackingEvents: trackingEvent },
        $inc: { __v: 1 },  // ✅ INCREMENT
      },
      { new: true, runValidators: true }
    );

    if (!updatedShipment) {
      logger.warn('Concurrent shipment update detected', {
        shipmentId,
        expectedVersion: currentVersion,
      });

      return {
        success: false,
        error: 'Shipment was updated by another process.',
        code: 'CONCURRENT_MODIFICATION',
      };
    }

    logger.info('Shipment status updated', {
      shipmentId,
      newStatus,
      version: updatedShipment.__v,
    });

    return { success: true, shipment: updatedShipment };

  } catch (error: any) {
    logger.error('Error updating shipment status:', error);
    return {
      success: false,
      error: 'Failed to update shipment status',
      code: 'UPDATE_FAILED',
    };
  }
}
```

**Step 3**: Update webhook handlers:

File: `server/src/presentation/http/controllers/webhooks/*.webhook.controller.ts`

Example: Carrier webhook handling:
```typescript
// BEFORE
export const handleCarrierWebhook = async (req: Request, res: Response, next: NextFunction) => {
  const { shipmentId, status, timestamp } = req.body;

  const shipment = await Shipment.findById(shipmentId);
  shipment.currentStatus = status;
  await shipment.save();  // ❌ RACE CONDITION

  res.json({ success: true });
};

// AFTER
export const handleCarrierWebhook = async (req: Request, res: Response, next: NextFunction) => {
  const { shipmentId, status, timestamp, location, description } = req.body;

  // Fetch current shipment with version
  const shipment = await Shipment.findById(shipmentId);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  // Update with optimistic locking
  const result = await ShipmentService.updateShipmentStatus({
    shipmentId: String(shipment._id),
    currentVersion: shipment.__v,  // ✅ PASS VERSION
    newStatus: status,
    trackingEvent: {
      status,
      timestamp: new Date(timestamp),
      location,
      description,
      metadata: req.body,
    },
  });

  if (!result.success) {
    if (result.code === 'CONCURRENT_MODIFICATION') {
      // Retry once with fresh data
      const freshShipment = await Shipment.findById(shipmentId);
      if (freshShipment) {
        const retryResult = await ShipmentService.updateShipmentStatus({
          shipmentId: String(freshShipment._id),
          currentVersion: freshShipment.__v,
          newStatus: status,
          trackingEvent: {
            status,
            timestamp: new Date(timestamp),
            location,
            description,
            metadata: req.body,
          },
        });

        if (retryResult.success) {
          return res.json({ success: true, retried: true });
        }
      }
    }

    return res.status(409).json({
      error: result.error,
      code: result.code
    });
  }

  res.json({ success: true });
};
```

**Verification**:
```bash
# Simulate concurrent carrier webhooks
# Terminal 1: Send webhook 1
curl -X POST http://localhost:5005/api/v1/webhooks/carrier \
  -H "Content-Type: application/json" \
  -d '{"shipmentId":"SHIP123","status":"in_transit","timestamp":"2026-01-08T10:00:00Z"}'

# Terminal 2: Send webhook 2 (same shipment, immediately after)
curl -X POST http://localhost:5005/api/v1/webhooks/carrier \
  -H "Content-Type: application/json" \
  -d '{"shipmentId":"SHIP123","status":"out_for_delivery","timestamp":"2026-01-08T10:00:01Z"}'

# Both should succeed (second may retry)
# Check database - both status updates should be in tracking history
```

---

### 🔵 Issue 4.3: Session Limit Race Condition

**File**: `server/src/core/application/services/auth/session.service.ts`
**Lines**: 38-76
**Impact**: Concurrent logins can exceed MAX_CONCURRENT_SESSIONS

#### Current Code (Vulnerable):
```typescript
const sessions = await Session.find({ userId, expiresAt: { $gt: new Date() } });

if (sessions.length >= MAX_CONCURRENT_SESSIONS) {
  for (const session of sessionsToTerminate) {
    await session.deleteOne();  // ❌ NOT ATOMIC
  }
}
```

#### Fix with Transaction:
```typescript
/**
 * Enforce session limit with transaction
 * @param userId - User ID
 * @param newSessionId - Optional new session ID to exclude from deletion
 */
static async enforceSessionLimit(
  userId: string,
  newSessionId?: string
): Promise<void> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Lock user's sessions (sort by lastActive, oldest first)
    const sessions = await Session.find({
      userId,
      expiresAt: { $gt: new Date() },
      isRevoked: false,
    })
    .sort({ lastActive: 1 })  // Oldest first
    .session(session);  // ✅ IN TRANSACTION

    // 2. Check if limit exceeded
    const MAX_CONCURRENT_SESSIONS = 5;
    const activeCount = newSessionId ? sessions.length + 1 : sessions.length;

    if (activeCount > MAX_CONCURRENT_SESSIONS) {
      const excessCount = activeCount - MAX_CONCURRENT_SESSIONS;
      const sessionsToTerminate = sessions.slice(0, excessCount);

      // 3. Atomic deletion
      const sessionIdsToDelete = sessionsToTerminate.map(s => s._id);
      await Session.updateMany(
        { _id: { $in: sessionIdsToDelete } },
        { $set: { isRevoked: true } },
        { session }  // ✅ IN TRANSACTION
      );

      logger.info('Excess sessions terminated', {
        userId,
        terminatedCount: excessCount,
      });
    }

    // 4. Commit transaction
    await session.commitTransaction();

  } catch (error) {
    await session.abortTransaction();
    logger.error('Error enforcing session limit:', error);
    throw error;
  } finally {
    session.endSession();
  }
}
```

**Update createSession to use transaction**:
```typescript
export const createSession = async (
  userId: string,
  refreshToken: string,
  metadata: { ip: string; userAgent: string },
  expiresAt: Date
): Promise<ISession> => {
  // 1. Enforce session limit FIRST (with transaction)
  await enforceSessionLimit(userId);

  // 2. Create new session
  const session = new Session({
    userId,
    refreshToken,  // Will be hashed by pre-save hook
    ip: metadata.ip,
    userAgent: metadata.userAgent,
    deviceInfo: parseUserAgent(metadata.userAgent),
    expiresAt,
    lastActive: new Date(),
  });

  await session.save();

  logger.info('Session created', { userId, sessionId: session._id });

  return session;
};
```

**Verification**:
```bash
# Simulate 10 concurrent logins (should only keep 5 sessions)
for i in {1..10}; do
  curl -X POST http://localhost:5005/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"password"}' &
done
wait

# Check session count
node -e "
const Session = require('./src/infrastructure/database/mongoose/models/iam/users/session.model').default;
Session.countDocuments({ userId: 'USER_ID', isRevoked: false })
  .then(count => console.log('Active sessions:', count))
  .then(() => process.exit(0));
"
# Should output: Active sessions: 5
```

---

### ✅ Phase 4 Completion Checklist

- [ ] Order model: `optimisticConcurrency: true` enabled
- [ ] OrderService: `updateOrderStatus` uses version checking
- [ ] Order controller: Handles 409 Conflict errors
- [ ] Shipment model: `optimisticConcurrency: true` enabled
- [ ] ShipmentService: `updateShipmentStatus` uses version checking
- [ ] Webhook handlers: Retry logic for concurrent updates
- [ ] Session service: Transaction-based session limit enforcement
- [ ] API documentation: Concurrency handling guide created
- [ ] Frontend guidance: 409 error handling documented
- [ ] Verification tests: Concurrent update tests passed

**Migration Notes**:
- No database migration needed (Mongoose auto-adds `__v` field)
- Existing documents will have `__v: 0` automatically
- Frontend must include `__v` in update requests (add to API docs)
- Monitor 409 error rate in production (should be rare)

---

## PHASE 5: CLEAN ARCHITECTURE VIOLATIONS (Priority: MEDIUM)

**Estimated Time**: 20-25 hours
**Risk**: LOW - Technical debt, maintainability
**Dependencies**: Phases 1-4 complete
**Breaking Changes**: Yes (service signatures change significantly)

### 🟣 Issue 5.1: HTTP Objects in Service Layer

**Impact**: Services tightly coupled to Express, not framework-agnostic

#### Affected Services:
1. `oauth.service.ts` - Accepts `req: any` from Passport
2. `session.service.ts` - Accepts `req: Request`
3. `account.service.ts` - Accepts optional `req?: Request`

#### Fix Strategy: Extract Metadata, Remove HTTP Dependencies

---

#### **5.1.1: OAuth Service**

**File**: `server/src/core/application/services/auth/oauth.service.ts`
**Lines**: 36, 46-51, 92-97

**Current Code (Violates Clean Architecture)**:
```typescript
async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
  user.security.lastLogin = {
    ip: req.ip || 'unknown',              // ❌ HTTP CONCERN
    userAgent: req.headers['user-agent']   // ❌ HTTP CONCERN
  };
}
```

**Fix - Extract Metadata Interface**:

**Step 1**: Define metadata interface in service:
```typescript
/**
 * Request metadata extracted from HTTP layer
 * Used to populate audit fields without coupling to Express
 */
interface RequestMetadata {
  ip: string;
  userAgent: string;
  origin?: string;
}
```

**Step 2**: Update passport strategy callback:

**BEFORE**:
```typescript
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      passReqToCallback: true,  // ❌ Passes Express request
    },
    async (req: any, accessToken, refreshToken, profile, done) => {
      // ... uses req.ip, req.headers ...
    }
  )
);
```

**AFTER**:
```typescript
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      passReqToCallback: true,  // Still needed, but we'll extract metadata
    },
    async (req: any, accessToken, refreshToken, profile, done) => {
      try {
        // ✅ EXTRACT METADATA at boundary (controller/passport)
        const metadata: RequestMetadata = {
          ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          origin: req.headers['origin'],
        };

        // ✅ CALL PURE BUSINESS LOGIC
        const result = await OAuthService.handleGoogleAuth({
          accessToken,
          refreshToken,
          profile,
          metadata,  // Pass metadata object, not req
        });

        done(null, result.user);
      } catch (error) {
        done(error, false);
      }
    }
  )
);
```

**Step 3**: Create pure business logic method:
```typescript
/**
 * Handle Google OAuth authentication (framework-agnostic)
 * @param args - OAuth data and metadata
 * @returns Authenticated user
 */
static async handleGoogleAuth(args: {
  accessToken: string;
  refreshToken: string;
  profile: any;  // TODO: Type this properly
  metadata: RequestMetadata;
}): Promise<{ user: IUser }> {
  const { accessToken, refreshToken, profile, metadata } = args;

  // Existing OAuth logic, but using metadata instead of req
  // ...

  // Update last login
  user.security.lastLogin = {
    ip: metadata.ip,           // ✅ NO HTTP DEPENDENCY
    userAgent: metadata.userAgent,
    timestamp: new Date(),
    success: true,
  };

  await user.save();

  // Create audit log
  await createAuditLog(
    String(user._id),
    user.companyId,
    'google_oauth_login',
    'user',
    String(user._id),
    { ip: metadata.ip, userAgent: metadata.userAgent },
    null  // ✅ NO REQUEST OBJECT
  );

  return { user };
}
```

**Verification**:
```bash
# Test Google OAuth still works
# 1. Visit http://localhost:5005/api/v1/auth/google
# 2. Authorize on Google
# 3. Should redirect back with auth cookies
# 4. Check database - lastLogin should have IP and user agent
```

---

#### **5.1.2: Session Service**

**File**: `server/src/core/application/services/auth/session.service.ts`
**Lines**: 83-120

**Current Signature (Violates Clean Architecture)**:
```typescript
export const createSession = async (
  userId: string,
  refreshToken: string,
  req: Request,  // ❌ EXPRESS DEPENDENCY
  expiresAt: Date
): Promise<ISession>
```

**Fix - Use Metadata Object**:

**Step 1**: Update service signature:
```typescript
/**
 * Request metadata for session creation
 */
interface SessionMetadata {
  ip: string;
  userAgent: string;
  origin?: string;
}

/**
 * Create new session (framework-agnostic)
 * @param userId - User ID
 * @param refreshToken - JWT refresh token (will be hashed)
 * @param metadata - Request metadata (IP, user agent)
 * @param expiresAt - Session expiration date
 * @returns Created session
 */
export const createSession = async (
  userId: string,
  refreshToken: string,
  metadata: SessionMetadata,  // ✅ METADATA OBJECT
  expiresAt: Date
): Promise<ISession> => {
  // Enforce session limit
  await enforceSessionLimit(userId);

  // Parse user agent
  const deviceInfo = parseUserAgent(metadata.userAgent);

  // Create session
  const session = new Session({
    userId,
    refreshToken,  // Will be hashed by pre-save hook
    ip: metadata.ip,
    userAgent: metadata.userAgent,
    deviceInfo,
    expiresAt,
    lastActive: new Date(),
  });

  await session.save();

  logger.info('Session created', {
    userId,
    sessionId: session._id,
    deviceType: deviceInfo.type,
  });

  return session;
};
```

**Step 2**: Update all callers (auth controller):

**File**: `server/src/presentation/http/controllers/auth/auth.controller.ts`

Find: Login endpoint (around line 250)

**BEFORE**:
```typescript
const session = await createSession(
  String(user._id),
  refreshToken,
  req,  // ❌ PASSES EXPRESS REQUEST
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
);
```

**AFTER**:
```typescript
// ✅ EXTRACT METADATA at HTTP boundary
const metadata: SessionMetadata = {
  ip: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
  userAgent: req.headers['user-agent'] || 'unknown',
  origin: req.headers['origin'],
};

const session = await createSession(
  String(user._id),
  refreshToken,
  metadata,  // ✅ PASS METADATA OBJECT
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
);
```

**Step 3**: Update other session service methods similarly:

- `updateSessionActivity()` - likely doesn't need req
- `getUserSessions()` - no req needed
- `revokeSession()` - no req needed

**Verification**:
```bash
# Test login creates session with correct metadata
curl -X POST http://localhost:5005/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: Test-Client/1.0" \
  -d '{"email":"test@example.com","password":"password"}'

# Check session in database
db.sessions.findOne({}, { ip: 1, userAgent: 1, deviceInfo: 1 })
# Should have: ip, userAgent, parsed deviceInfo
```

---

#### **5.1.3: Account Service**

**File**: `server/src/core/application/services/auth/account.service.ts`
**Multiple functions with optional `req?: Request`**

**Functions to Fix**:
- `deactivateAccount(userId, reason, req?)`
- `permanentlyDeleteAccount(userId, req?)`
- Others that use req for audit logging

**Fix Strategy**: Same as above - extract metadata

**Example**:

**BEFORE**:
```typescript
export const deactivateAccount = async (
  userId: string,
  reason: string,
  req?: Request  // ❌ OPTIONAL REQUEST
): Promise<boolean> => {
  // ... deactivation logic ...

  if (req) {
    await createAuditLog(userId, undefined, 'account_deactivated', 'user', userId, { reason }, req);
  }

  return true;
};
```

**AFTER**:
```typescript
interface AuditMetadata {
  ip?: string;
  userAgent?: string;
}

export const deactivateAccount = async (
  userId: string,
  reason: string,
  auditMetadata?: AuditMetadata  // ✅ METADATA OBJECT
): Promise<boolean> => {
  // ... deactivation logic ...

  if (auditMetadata) {
    await createAuditLog(
      userId,
      undefined,
      'account_deactivated',
      'user',
      userId,
      { reason, ip: auditMetadata.ip, userAgent: auditMetadata.userAgent },
      null  // ✅ NO REQUEST
    );
  }

  return true;
};
```

**Update Audit Log Helper**:

File: `server/src/presentation/http/middleware/system/audit-log.middleware.ts`

Update `createAuditLog` signature to accept metadata instead of req:
```typescript
export async function createAuditLog(
  userId: string,
  companyId: mongoose.Types.ObjectId | undefined,
  action: string,
  resourceType: string,
  resourceId: string,
  details: any,
  metadata?: { ip?: string; userAgent?: string }  // ✅ OPTIONAL METADATA
): Promise<void> {
  try {
    await AuditLog.create({
      userId: new mongoose.Types.ObjectId(userId),
      companyId,
      action,
      resource: resourceType,
      resourceId: new mongoose.Types.ObjectId(resourceId),
      details,
      ip: metadata?.ip || 'unknown',
      userAgent: metadata?.userAgent || 'unknown',
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error('Failed to create audit log:', error);
    // Don't throw - audit failure shouldn't break business logic
  }
}
```

**Verification**:
```bash
# Test account deactivation
curl -X POST http://localhost:5005/api/v1/users/me/deactivate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Testing"}'

# Check audit log
db.auditlogs.findOne({ action: 'account_deactivated' }, { ip: 1, userAgent: 1 })
# Should have IP and user agent from metadata
```

---

### 🟣 Issue 5.2: Logger Fragmentation

**Impact**: 6 controllers create custom winston loggers instead of using shared logger

#### Files Creating Custom Loggers:
1. `integrations/flipkart-product-mapping.controller.ts`
2. `integrations/flipkart.controller.ts`
3. `integrations/product-mapping.controller.ts`
4. `integrations/shopify.controller.ts`
5. `webhooks/flipkart.webhook.controller.ts`
6. `webhooks/shopify.webhook.controller.ts`

**Current Anti-Pattern**:
```typescript
export class ShopifyController {
  private static logger = winston.createLogger({  // ❌ CREATES NEW LOGGER
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
  });
}
```

**Fix - Use Shared Logger**:

**Step 1**: Remove custom logger creation:
```typescript
// REMOVE THIS
private static logger = winston.createLogger({...});
```

**Step 2**: Import shared logger:
```typescript
import logger from '../../../../shared/logger/winston.logger';
```

**Step 3**: Replace all `this.logger` with `logger`:
```typescript
// BEFORE
this.logger.info('Shopify install initiated', {...});
this.logger.error('Error:', error);

// AFTER
logger.info('Shopify install initiated', {...});
logger.error('Error:', error);
```

**Automated Fix Script**: Create `server/scripts/fix-logger-imports.sh`:
```bash
#!/bin/bash
# Replace custom winston loggers with shared logger import

FILES=(
  "server/src/presentation/http/controllers/integrations/flipkart-product-mapping.controller.ts"
  "server/src/presentation/http/controllers/integrations/flipkart.controller.ts"
  "server/src/presentation/http/controllers/integrations/product-mapping.controller.ts"
  "server/src/presentation/http/controllers/integrations/shopify.controller.ts"
  "server/src/presentation/http/controllers/webhooks/flipkart.webhook.controller.ts"
  "server/src/presentation/http/controllers/webhooks/shopify.webhook.controller.ts"
)

for file in "${FILES[@]}"; do
  echo "Processing $file..."

  # Remove custom logger creation
  sed -i '' '/private static logger = winston.createLogger/,/});/d' "$file"

  # Add shared logger import (after other imports)
  if ! grep -q "winston.logger" "$file"; then
    sed -i '' "s|^import.*winston.*|import logger from '../../../../shared/logger/winston.logger';|" "$file"
  fi

  # Replace this.logger with logger
  sed -i '' 's/this\.logger\./logger\./g' "$file"

  # Remove winston import if no longer needed
  if ! grep -q "winston\." "$file"; then
    sed -i '' '/^import.*winston.*from.*winston/d' "$file"
  fi

  echo "✅ Fixed $file"
done

echo "Done!"
```

**Verification**:
```bash
chmod +x server/scripts/fix-logger-imports.sh
./server/scripts/fix-logger-imports.sh

# Verify no custom logger creation remains
grep -r "winston.createLogger" server/src/presentation/http/controllers/
# Should return no results

# Verify shared logger imported
grep -r "from.*winston.logger" server/src/presentation/http/controllers/
# Should show imports in all affected files
```

---

### 🟣 Issue 5.3: Controllers Creating Infrastructure Dependencies

**Pattern**: Controllers creating logger instances violates Dependency Inversion Principle

**Already Fixed by 5.2** - Once logger fragmentation is resolved, this issue is also resolved.

**Additional Check**: Ensure no other infrastructure dependencies created in controllers:

```bash
# Check for other infrastructure creation patterns
grep -r "new winston\|new Redis\|new AWS\|mongoose.connect" server/src/presentation/http/controllers/
# Should return no results (all infrastructure should be in infrastructure layer)
```

---

### 🟣 Issue 5.4: Require() Instead of Import

**Impact**: 7+ controllers use CommonJS `require()` instead of ES6 `import`

#### Files Affected:
- `shopify.controller.ts` (2 occurrences)
- `flipkart.controller.ts` (5 occurrences)
- `product-mapping.controller.ts` (6 occurrences)

**Current Anti-Pattern**:
```typescript
const ShopifyStore = require('../../../../infrastructure/database/mongoose/models/shopify-store.model').default;
```

**Fix - Convert to ES6 Import**:

**Step 1**: Replace require with import at top of file:
```typescript
// BEFORE (line 169)
const ShopifyStore = require('../../../../infrastructure/database/mongoose/models/shopify-store.model').default;

// AFTER (add to imports at top)
import ShopifyStore from '../../../../infrastructure/database/mongoose/models/shopify-store.model';
```

**Automated Fix Script**: Create `server/scripts/fix-require-statements.sh`:
```bash
#!/bin/bash
# Convert require() to import statements

FILES=(
  "server/src/presentation/http/controllers/integrations/shopify.controller.ts"
  "server/src/presentation/http/controllers/integrations/flipkart.controller.ts"
  "server/src/presentation/http/controllers/integrations/product-mapping.controller.ts"
  "server/src/presentation/http/controllers/integrations/amazon-product-mapping.controller.ts"
  "server/src/presentation/http/controllers/integrations/flipkart-product-mapping.controller.ts"
)

for file in "${FILES[@]}"; do
  echo "Processing $file..."

  # Extract all require statements
  requires=$(grep -E "const .* = require\(" "$file" | sed "s/.*const \(.*\) = require('\(.*\)').*/\1|\2/")

  # Convert each require to import
  while IFS='|' read -r varname path; do
    if [[ -n "$varname" ]]; then
      # Remove .default if present
      varname_clean=$(echo "$varname" | sed 's/\.default//')

      # Remove require line
      sed -i '' "/const ${varname} = require/d" "$file"

      # Add import at top (after other imports)
      import_line="import ${varname_clean} from '${path}';"

      # Insert after last import
      sed -i '' "/^import/a\\
${import_line}
" "$file"
    fi
  done <<< "$requires"

  echo "✅ Fixed $file"
done

echo "Done! Verify with: npm run build"
```

**Manual Verification for Each File**:

Example for `shopify.controller.ts`:

**BEFORE**:
```typescript
// Line 169
const ShopifyStore = require('../../../../infrastructure/database/mongoose/models/shopify-store.model').default;

// Line 214
const ShopifyStore = require('../../../../infrastructure/database/mongoose/models/shopify-store.model').default;
```

**AFTER**:
```typescript
// Top of file (after other imports)
import ShopifyStore from '../../../../infrastructure/database/mongoose/models/marketplaces/shopify/shopify-store.model';

// Lines 169, 214 - remove require statements
```

**Verification**:
```bash
chmod +x server/scripts/fix-require-statements.sh
./server/scripts/fix-require-statements.sh

# Check no require() remains in controllers
grep -r "require(" server/src/presentation/http/controllers/
# Should return no results

# Verify TypeScript compiles
npm run build
```

---

### 🟣 Issue 5.5: Dynamic Imports in WooCommerce Controller

**File**: `server/src/presentation/http/controllers/integrations/woocommerce.controller.ts`
**Lines**: 550, 611, 665

**Current Anti-Pattern**:
```typescript
const { WooCommerceFulfillmentService } = await import('../../../../core/application/services/woocommerce/index.js');
// ❌ REPEATED 3 TIMES
```

**Fix - Top-Level Import**:

**Step 1**: Remove dynamic imports:
```typescript
// DELETE LINES 550, 611, 665
```

**Step 2**: Add static import at top:
```typescript
import { WooCommerceFulfillmentService } from '../../../../core/application/services/woocommerce/index';
```

**Step 3**: Update barrel export if needed:

File: `server/src/core/application/services/woocommerce/index.ts`

Ensure it exports:
```typescript
export { default as WooCommerceFulfillmentService } from './woocommerce-fulfillment.service';
export { default as WooCommerceOAuthService } from './woocommerce-oauth.service';
export { default as WooCommerceOrderSyncService } from './woocommerce-order-sync.service';
// ... other exports
```

**Verification**:
```bash
# Check no dynamic imports remain
grep -n "await import(" server/src/presentation/http/controllers/integrations/woocommerce.controller.ts
# Should return no results

# Verify compilation
npm run build
```

---

### ✅ Phase 5 Completion Checklist

- [ ] OAuth service: No HTTP objects, uses metadata
- [ ] Session service: No HTTP objects, uses metadata
- [ ] Account service: No HTTP objects, uses metadata
- [ ] Audit log helper: Accepts metadata instead of req
- [ ] All controllers: Use shared logger
- [ ] All controllers: No custom winston logger creation
- [ ] All controllers: ES6 imports (no require())
- [ ] WooCommerce: No dynamic imports
- [ ] Verification: TypeScript compiles
- [ ] Verification: Server starts
- [ ] Verification: Login flow works end-to-end

**Migration Guide**: Create `docs/MIGRATION_GUIDE_PHASE_5.md`:
```markdown
# Phase 5 Migration Guide: Clean Architecture Refactoring

## Breaking Changes

### 1. Service Method Signatures Changed

#### OAuth Service
**Before**:
```typescript
// Passport strategy directly used req
```

**After**:
```typescript
OAuthService.handleGoogleAuth({
  accessToken,
  refreshToken,
  profile,
  metadata: { ip, userAgent, origin }
});
```

#### Session Service
**Before**:
```typescript
createSession(userId, token, req, expiresAt)
```

**After**:
```typescript
createSession(userId, token, { ip, userAgent }, expiresAt)
```

#### Account Service
**Before**:
```typescript
deactivateAccount(userId, reason, req)
```

**After**:
```typescript
deactivateAccount(userId, reason, { ip, userAgent })
```

### 2. Audit Log Helper

**Before**:
```typescript
createAuditLog(userId, companyId, action, type, id, details, req)
```

**After**:
```typescript
createAuditLog(userId, companyId, action, type, id, details, { ip, userAgent })
```

## Migration Steps

1. Update all service calls in controllers to extract metadata first
2. Update any external code calling these services
3. No database migration needed

## Benefits

- Services are now framework-agnostic (can test without Express)
- Easier unit testing (no need to mock Express request)
- Can switch web frameworks without changing business logic
- Cleaner dependency graph
```

---

## PHASE 6: DATABASE OPTIMIZATION (Priority: MEDIUM)

**Estimated Time**: 10-12 hours
**Risk**: LOW - Performance improvements
**Dependencies**: Phase 5 complete
**Breaking Changes**: None (index additions/removals)

### 🟤 Issue 6.1: Redundant Indexes

**Impact**: Slower writes, wasted storage

#### Indexes to Remove:

**1. User Model - Redundant Email Index**

File: `server/src/infrastructure/database/mongoose/models/iam/users/user.model.ts`
Line: 315

**Remove**:
```typescript
UserSchema.index({ email: 1, isActive: 1 });  // ❌ REDUNDANT
```

**Reason**: `email` already has unique index (line 303), which can be used for `{ email: 1, isActive: 1 }` queries.

**Impact Analysis**:
```javascript
// Query: db.users.find({ email: 'x@y.com', isActive: true })
// With { email: 1 } unique: Scans 1 doc, filters isActive in memory - Fast
// With { email: 1, isActive: 1 }: Scans 1 doc directly - Marginally faster
// Trade-off: Extra index slows down all user inserts/updates
// Verdict: Remove compound index, keep unique email index
```

**Fix**:
```bash
# Remove from code (line 315)
# Then drop index in MongoDB
mongosh Shipcrowd
db.users.dropIndex({ email: 1, isActive: 1 })
```

**2. RecoveryToken Model - Overlapping Indexes**

File: `server/src/infrastructure/database/mongoose/models/auth/recovery-token.model.ts`
Lines: 66-73

**Current**:
```typescript
RecoveryTokenSchema.index({ token: 1 }, { unique: true });  // ✅ KEEP
RecoveryTokenSchema.index({ userId: 1 });                   // ✅ KEEP
RecoveryTokenSchema.index({ token: 1, expiresAt: 1, usedAt: 1 });  // ❌ REDUNDANT
```

**Analysis**:
- Token is unique, so `{ token: 1, expiresAt: 1, usedAt: 1 }` doesn't help
- Query by token uses unique index
- No query needs compound index

**Remove**:
```bash
db.recoverytokens.dropIndex({ token: 1, expiresAt: 1, usedAt: 1 })
```

---

### 🟤 Issue 6.2: Missing Indexes

**Impact**: Slow queries, poor dashboard performance

#### Indexes to Add:

**1. Company Model - Suspension Check Index**

File: `server/src/infrastructure/database/mongoose/models/organization/core/company.model.ts`

**Add**:
```typescript
// After existing indexes (around line 270)
CompanySchema.index({ isSuspended: 1 });  // ✅ ADD - Used by auth middleware
```

**Reason**: Auth middleware checks `isSuspended` on every request (Feature #27).

**Verification**:
```javascript
// Enable profiling
db.setProfilingLevel(2);

// Make authenticated request
// Check slow queries
db.system.profile.find({ ns: 'Shipcrowd.companies', millis: { $gt: 10 } })

// Should use index after adding
```

**2. Order Model - Warehouse Allocation Index**

File: `server/src/infrastructure/database/mongoose/models/orders/core/order.model.ts`

**Add**:
```typescript
// After existing indexes (around line 310)
OrderSchema.index({ warehouseId: 1, currentStatus: 1 });  // ✅ ADD - Warehouse dashboard
```

**Reason**: Warehouse dashboard queries: "Show pending orders for this warehouse"

**Query Example**:
```javascript
db.orders.find({
  warehouseId: ObjectId('...'),
  currentStatus: 'pending'
}).sort({ createdAt: -1 })
// Will use { warehouseId: 1, currentStatus: 1 } index
```

**3. Shipment Model - Carrier Dashboard Index**

File: `server/src/infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model.ts`

**Add**:
```typescript
// After existing indexes (around line 440)
ShipmentSchema.index({ carrier: 1, currentStatus: 1, createdAt: -1 });  // ✅ ADD - Carrier performance
```

**Reason**: Carrier performance dashboard: "Show in-transit shipments by carrier"

**4. Session Model - Active Sessions Query**

File: `server/src/infrastructure/database/mongoose/models/iam/users/session.model.ts`

**Add**:
```typescript
// After existing indexes (around line 118)
SessionSchema.index({ userId: 1, expiresAt: 1, isRevoked: 1 });  // ✅ ADD - Active sessions
```

**Reason**: Frequently queries active sessions: `{ userId, expiresAt: { $gt: now }, isRevoked: false }`

**5. AuditLog Model - Resource Audit Trail**

File: `server/src/infrastructure/database/mongoose/models/system/audit/audit-log.model.ts`

**Add**:
```typescript
// After existing indexes (around line 92)
AuditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });  // ✅ ADD - Resource history
```

**Reason**: Resource audit trail: "Show all changes to this order"

**6. WalletTransaction Model - Transaction History Pagination**

File: `server/src/infrastructure/database/mongoose/models/finance/wallets/wallet-transaction.model.ts`

**Add**:
```typescript
// After existing indexes (around line 150)
WalletTransactionSchema.index({ company: 1, status: 1, createdAt: -1 });  // ✅ ADD - History pagination
```

**Reason**: Transaction history with status filter

**7. CommissionTransaction Model - Approval Queue**

File: `server/src/infrastructure/database/mongoose/models/finance/commission/commission-transaction.model.ts`

**Add**:
```typescript
// After existing indexes (around line 160)
CommissionTransactionSchema.index({ status: 1, approvedAt: -1 });  // ✅ ADD - Approval queue sorting
```

**Reason**: Admin approval queue: "Show pending commissions ordered by submission date"

---

### 🟤 Issue 6.3: Duplicate Index Warning (From Logs)

**Warning**:
```
(node:27359) [MONGOOSE] Warning: Duplicate schema index on {"expiresAt":1} found.
```

**Analysis**: Seen in logs, need to identify which model.

**Fix Script**: Create `server/scripts/find-duplicate-indexes.ts`:
```typescript
/**
 * Find duplicate indexes across all Mongoose models
 */
import mongoose from 'mongoose';
import * as models from '../src/infrastructure/database/mongoose/models';

async function findDuplicateIndexes() {
  await mongoose.connect(process.env.MONGODB_URI!);

  for (const [modelName, Model] of Object.entries(models)) {
    console.log(`\nChecking ${modelName}...`);

    const indexes = Model.schema.indexes();
    const indexKeys = indexes.map(idx => JSON.stringify(idx[0]));

    // Find duplicates
    const seen = new Set();
    const duplicates: string[] = [];

    for (const key of indexKeys) {
      if (seen.has(key)) {
        duplicates.push(key);
      }
      seen.add(key);
    }

    if (duplicates.length > 0) {
      console.log(`  ❌ DUPLICATE INDEXES:`);
      duplicates.forEach(dup => console.log(`    ${dup}`));
    } else {
      console.log(`  ✅ No duplicates`);
    }
  }

  process.exit(0);
}

findDuplicateIndexes().catch(console.error);
```

**Run**:
```bash
npx tsx server/scripts/find-duplicate-indexes.ts
```

**Fix**: Once identified, remove duplicate index definition from model.

---

### ✅ Phase 6 Completion Checklist

- [ ] Redundant indexes removed (User, RecoveryToken)
- [ ] Missing indexes added (7 indexes across 7 models)
- [ ] Duplicate index warning investigated and fixed
- [ ] Index creation verified in MongoDB
- [ ] Query performance tested with `explain()`
- [ ] Profiling enabled to monitor slow queries
- [ ] Documentation updated with index strategy

**Index Addition Script**: Create `server/scripts/add-missing-indexes.ts`:
```typescript
/**
 * Add all missing indexes to database
 * Run once after deploying model changes
 */
import mongoose from 'mongoose';

async function addIndexes() {
  await mongoose.connect(process.env.MONGODB_URI!);

  console.log('Creating indexes...');

  // Load all models (triggers index creation)
  await import('../src/infrastructure/database/mongoose/models');

  // Force index creation
  await mongoose.connection.syncIndexes();

  console.log('✅ All indexes created');
  process.exit(0);
}

addIndexes().catch(console.error);
```

---

## PHASE 7: VALIDATION & ERROR STANDARDIZATION (Priority: LOW)

**Estimated Time**: 15-18 hours
**Risk**: LOW - Code quality
**Dependencies**: Phases 1-6 complete
**Breaking Changes**: None (internal refactoring)

### 📝 Issue 7.1: Missing Zod Schemas for Integration Endpoints

**Impact**: Inconsistent validation, security gaps

#### Schemas to Create:

File: `server/src/shared/validation/integration-schemas.ts` (create new):

```typescript
import { z } from 'zod';

/**
 * Shopify Integration Schemas
 */
export const shopifyInstallSchema = z.object({
  shop: z.string()
    .regex(/^[a-z0-9-]+\.myshopify\.com$/, 'Invalid Shopify domain format')
    .describe('Shopify store domain'),
});

export const shopifyCreateFulfillmentSchema = z.object({
  trackingNumber: z.string().min(1).max(100),
  trackingCompany: z.string().min(1).max(50),
  trackingUrl: z.string().url().optional(),
  notifyCustomer: z.boolean().optional().default(true),
  lineItems: z.array(z.object({
    id: z.string(),
    quantity: z.number().int().positive(),
  })).optional(),
});

/**
 * WooCommerce Integration Schemas
 */
export const woocommerceInstallSchema = z.object({
  storeUrl: z.string()
    .url('Invalid WooCommerce store URL')
    .regex(/^https?:\/\/.+/, 'Must be http or https'),
  consumerKey: z.string()
    .min(20, 'Consumer key too short')
    .max(100, 'Consumer key too long'),
  consumerSecret: z.string()
    .min(20, 'Consumer secret too short')
    .max(100, 'Consumer secret too long'),
  storeName: z.string().min(1).max(100).optional(),
});

/**
 * Amazon SP-API Integration Schemas
 */
export const amazonConnectSchema = z.object({
  sellerId: z.string()
    .regex(/^[A-Z0-9]{13,14}$/, 'Invalid Amazon Seller ID format'),
  marketplaceId: z.string()
    .regex(/^[A-Z0-9]{13,14}$/, 'Invalid Marketplace ID format'),
  region: z.enum(['NA', 'EU', 'FE'], {
    errorMap: () => ({ message: 'Region must be NA, EU, or FE' })
  }),
  awsAccessKey: z.string().min(16).max(128),
  awsSecretKey: z.string().min(32).max(128),
  roleArn: z.string()
    .regex(/^arn:aws:iam::\d{12}:role\/.+$/, 'Invalid AWS Role ARN'),
  appId: z.string().min(1),
  lwaClientId: z.string().min(1),
  lwaClientSecret: z.string().min(1),
});

/**
 * Flipkart Integration Schemas
 */
export const flipkartConnectSchema = z.object({
  appId: z.string().min(1).max(100),
  appSecret: z.string().min(16).max(128),
  sellerId: z.string()
    .regex(/^[A-Z0-9]{24}$/, 'Invalid Flipkart Seller ID'),
});

/**
 * Product Mapping Schemas
 */
export const productMappingCreateSchema = z.object({
  internalSku: z.string().min(1).max(100),
  platformProductId: z.string().min(1).max(100),
  platformVariantId: z.string().min(1).max(100).optional(),
  platform: z.enum(['shopify', 'woocommerce', 'amazon', 'flipkart']),
  syncInventory: z.boolean().optional().default(true),
  syncPrice: z.boolean().optional().default(false),
});

export const productMappingUpdateSchema = z.object({
  platformProductId: z.string().min(1).max(100).optional(),
  platformVariantId: z.string().min(1).max(100).optional(),
  syncInventory: z.boolean().optional(),
  syncPrice: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
```

#### Apply Schemas to Controllers:

**Example: Shopify Controller**

**BEFORE** (Line 42):
```typescript
if (!shop || typeof shop !== 'string') {
  throw new AppError('Shop parameter is required', 'ERROR_CODE', 400);
}
```

**AFTER**:
```typescript
import { shopifyInstallSchema } from '../../../../shared/validation/integration-schemas';

// ... in install method:
const validation = shopifyInstallSchema.safeParse(req.body);
if (!validation.success) {
  const errors = validation.error.errors.map(err => ({
    code: 'VALIDATION_ERROR',
    message: err.message,
    field: err.path.join('.'),
  }));
  sendValidationError(res, errors);
  return;
}

const { shop } = validation.data;
```

**Repeat for all integration endpoints** (est. 8 hours of work).

---

### 📝 Issue 7.2: Error Code Standardization

**Impact**: Inconsistent API error responses

**Solution**: Create error code enum

File: `server/src/shared/errors/error-codes.ts` (create new):

```typescript
/**
 * Standardized error codes for API responses
 * Format: DOMAIN_SPECIFIC_ERROR
 */
export enum ErrorCode {
  // Generic
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  // Authentication
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_NOT_VERIFIED = 'ACCOUNT_NOT_VERIFIED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',

  // Authorization
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  COMPANY_SUSPENDED = 'COMPANY_SUSPENDED',
  COMPANY_ACCESS_DENIED = 'COMPANY_ACCESS_DENIED',

  // Concurrency
  CONCURRENT_MODIFICATION = 'CONCURRENT_MODIFICATION',
  OPTIMISTIC_LOCK_FAILED = 'OPTIMISTIC_LOCK_FAILED',

  // Orders
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  ORDER_NUMBER_GENERATION_FAILED = 'ORDER_NUMBER_GENERATION_FAILED',
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',

  // Shipments
  SHIPMENT_NOT_FOUND = 'SHIPMENT_NOT_FOUND',
  CARRIER_NOT_AVAILABLE = 'CARRIER_NOT_AVAILABLE',
  TRACKING_UPDATE_FAILED = 'TRACKING_UPDATE_FAILED',

  // Integrations
  SHOPIFY_SHOP_REQUIRED = 'SHOPIFY_SHOP_REQUIRED',
  SHOPIFY_AUTH_FAILED = 'SHOPIFY_AUTH_FAILED',
  STORE_NOT_FOUND = 'STORE_NOT_FOUND',
  STORE_DISCONNECTED = 'STORE_DISCONNECTED',
  WEBHOOK_VERIFICATION_FAILED = 'WEBHOOK_VERIFICATION_FAILED',

  // Amazon SP-API
  AMAZON_SELLER_ID_REQUIRED = 'AMAZON_SELLER_ID_REQUIRED',
  AMAZON_MARKETPLACE_ID_REQUIRED = 'AMAZON_MARKETPLACE_ID_REQUIRED',
  AMAZON_AUTH_FAILED = 'AMAZON_AUTH_FAILED',

  // Wallet
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',

  // Commission
  COMMISSION_RULE_NOT_FOUND = 'COMMISSION_RULE_NOT_FOUND',
  COMMISSION_ALREADY_PAID = 'COMMISSION_ALREADY_PAID',
}
```

**Usage**:
```typescript
import { ErrorCode } from '../../../../shared/errors/error-codes';

// BEFORE
throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);

// AFTER
throw new AppError('Store not found', ErrorCode.STORE_NOT_FOUND, 404);
```

**Benefit**: TypeScript autocomplete, refactoring safety, consistency.

---

### ✅ Phase 7 Completion Checklist

- [ ] Integration schemas created (Shopify, WooCommerce, Amazon, Flipkart)
- [ ] Product mapping schemas created
- [ ] All integration controllers updated to use schemas
- [ ] Inline validation removed
- [ ] Error code enum created
- [ ] All controllers updated to use error code enum
- [ ] Validation error format standardized
- [ ] API documentation updated with error codes

---

## PHASE 8: TESTING INFRASTRUCTURE (Priority: LOW)

**Estimated Time**: 25-30 hours
**Risk**: LOW - Quality assurance
**Dependencies**: All phases complete
**Breaking Changes**: None (new code only)

### ✅ Testing Strategy

**Approach**: Fix-first, test-after strategy (as approved by user)

#### Test Coverage Goals:

| Category | Target Coverage | Priority |
|----------|----------------|----------|
| Security fixes (Phase 1) | 95%+ | Critical |
| Race conditions (Phase 4) | 90%+ | Critical |
| Services layer | 75%+ | High |
| Controllers | 60%+ | Medium |
| Integration flows | 80%+ | High |

#### Tests to Write:

**1. Phase 1 Security Tests** (Highest Priority):

File: `server/tests/unit/security/encryption.test.ts`:
```typescript
describe('Field Encryption', () => {
  it('should encrypt Company integration credentials', async () => {
    const company = await Company.create({
      name: 'Test Co',
      integrations: {
        shopify: {
          shopDomain: 'test.myshopify.com',
          accessToken: 'plain_token_12345',
        }
      }
    });

    // Check database - should be encrypted
    const raw = await mongoose.connection.db
      .collection('companies')
      .findOne({ _id: company._id });

    expect(raw.integrations.shopify.accessToken).toContain('__enc_');
    expect(raw.integrations.shopify.accessToken).not.toBe('plain_token_12345');

    // Check Mongoose - should be decrypted
    expect(company.integrations.shopify.accessToken).toBe('plain_token_12345');
  });

  it('should hash security question answers', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'password',
      security: {
        recoveryOptions: {
          securityQuestions: {
            question1: 'What is your pet name?',
            answer1: 'Fluffy',
            question2: 'What city were you born?',
            answer2: 'Mumbai',
            question3: 'What is your favorite color?',
            answer3: 'Blue',
          }
        }
      }
    });

    // Answers should be hashed
    expect(user.security.recoveryOptions!.securityQuestions!.answer1).toMatch(/^\$2b\$/);
    expect(user.security.recoveryOptions!.securityQuestions!.answer2).toMatch(/^\$2b\$/);

    // Should be able to compare
    const isMatch = await user.compareSecurityAnswer('fluffy', user.security.recoveryOptions!.securityQuestions!.answer1);
    expect(isMatch).toBe(true);
  });

  it('should hash recovery tokens with SHA-256', async () => {
    const plainToken = 'recovery_token_12345';
    const token = await RecoveryToken.create({
      userId: new ObjectId(),
      token: plainToken,
      expiresAt: new Date(Date.now() + 3600000),
      type: 'password_reset',
    });

    // Token should be hashed (64 hex chars)
    expect(token.token).toHaveLength(64);
    expect(token.token).toMatch(/^[a-f0-9]{64}$/);
    expect(token.token).not.toBe(plainToken);

    // Should be able to find by hashed token
    const hashedToken = RecoveryToken.hashToken(plainToken);
    const found = await RecoveryToken.findOne({ token: hashedToken });
    expect(found).toBeTruthy();
  });
});
```

**2. Phase 4 Concurrency Tests** (Critical):

File: `server/tests/integration/concurrency/order-race-condition.test.ts`:
```typescript
describe('Order Race Condition', () => {
  it('should prevent concurrent status updates', async () => {
    // Create order
    const order = await Order.create({
      orderNumber: 'TEST-001',
      companyId: testCompany._id,
      customerInfo: { ... },
      products: [ ... ],
      currentStatus: 'pending',
    });

    const currentVersion = order.__v;

    // Simulate 2 concurrent updates
    const [result1, result2] = await Promise.allSettled([
      OrderService.updateOrderStatus({
        orderId: String(order._id),
        currentStatus: 'pending',
        newStatus: 'processing',
        currentVersion,
        userId: testUser._id,
      }),
      OrderService.updateOrderStatus({
        orderId: String(order._id),
        currentStatus: 'pending',
        newStatus: 'ready_to_ship',
        currentVersion,
        userId: testUser._id,
      }),
    ]);

    // One should succeed, one should fail with CONCURRENT_MODIFICATION
    const results = [result1, result2].map(r => r.status === 'fulfilled' ? r.value : null);
    const successCount = results.filter(r => r?.success).length;
    const concurrentFailCount = results.filter(r => r?.code === 'CONCURRENT_MODIFICATION').length;

    expect(successCount).toBe(1);
    expect(concurrentFailCount).toBe(1);

    // Verify final state
    const finalOrder = await Order.findById(order._id);
    expect(finalOrder!.__v).toBe(currentVersion + 1);
  });
});
```

**3. Integration Tests** (High Priority):

File: `server/tests/integration/auth/login-flow.test.ts`:
```typescript
describe('Login Flow', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toBeDefined();

    // Check cookies
    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some(c => c.startsWith('accessToken='))).toBe(true);
    expect(cookies.some(c => c.startsWith('refreshToken='))).toBe(true);
  });

  it('should enforce session limit', async () => {
    // Login 10 times
    const promises = Array.from({ length: 10 }, () =>
      request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'password' })
    );

    await Promise.all(promises);

    // Check active sessions (should be max 5)
    const sessions = await Session.countDocuments({
      userId: testUser._id,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    expect(sessions).toBe(5);
  });
});
```

**4. Service Layer Tests**:

File: `server/tests/unit/services/session.service.test.ts`:
```typescript
describe('SessionService', () => {
  it('should create session without HTTP dependency', async () => {
    const metadata: SessionMetadata = {
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0 ...',
    };

    const session = await createSession(
      testUser._id,
      'refresh_token_xyz',
      metadata,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    expect(session).toBeDefined();
    expect(session.userId.toString()).toBe(testUser._id);
    expect(session.ip).toBe('192.168.1.1');
    expect(session.deviceInfo).toBeDefined();
  });
});
```

---

### Test Infrastructure Setup:

**1. Test Database**:
```typescript
// tests/setup/testDatabase.ts
export async function setupTestDatabase() {
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  return mongoServer;
}

export async function teardownTestDatabase(mongoServer: MongoMemoryServer) {
  await mongoose.disconnect();
  await mongoServer.stop();
}

export async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}
```

**2. Test Factories**:
```typescript
// tests/fixtures/userFactory.ts
export function createTestUser(overrides?: Partial<IUser>) {
  return User.create({
    email: `test-${Date.now()}@example.com`,
    password: 'SecurePass123!',
    name: 'Test User',
    role: 'seller',
    ...overrides,
  });
}

// tests/fixtures/orderFactory.ts
export function createTestOrder(companyId: ObjectId, overrides?: Partial<IOrder>) {
  return Order.create({
    orderNumber: `TEST-${Date.now()}`,
    companyId,
    customerInfo: {
      name: 'John Doe',
      phone: '9876543210',
      address: {
        line1: '123 Test St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
      }
    },
    products: [{
      name: 'Test Product',
      quantity: 1,
      price: 100,
    }],
    ...overrides,
  });
}
```

---

### ✅ Phase 8 Completion Checklist

- [ ] Test infrastructure setup (MongoDB Memory Server, factories)
- [ ] Security tests written (encryption, hashing)
- [ ] Concurrency tests written (order, shipment race conditions)
- [ ] Session limit test written
- [ ] Service layer tests (no HTTP dependencies)
- [ ] Integration tests (auth flow, order lifecycle)
- [ ] All tests passing
- [ ] Coverage reports generated
- [ ] CI/CD integration (GitHub Actions)

**Estimated Test Count**: 80-100 tests total

---

## FINAL VERIFICATION & DEPLOYMENT

### Pre-Deployment Checklist:

**Code Quality**:
- [ ] All TypeScript compilation errors resolved
- [ ] No ESLint errors
- [ ] All tests passing (Phase 8)
- [ ] Code review completed

**Database**:
- [ ] Migration scripts executed (encryption, recovery tokens, security answers)
- [ ] Indexes created (Phase 6)
- [ ] Redundant indexes dropped
- [ ] Database backup taken

**Security**:
- [ ] .env has valid ENCRYPTION_KEY (64+ hex chars)
- [ ] All credentials encrypted in database
- [ ] Security answers hashed
- [ ] Recovery tokens hashed
- [ ] No insecure fallbacks

**Performance**:
- [ ] Optimistic locking enabled (Order, Shipment)
- [ ] Session limit enforcement with transactions
- [ ] Indexes optimized
- [ ] Slow query monitoring enabled

**Documentation**:
- [ ] API documentation updated (concurrency handling)
- [ ] Migration guides written (Phase 5)
- [ ] Error code documentation
- [ ] Frontend integration guide (409 errors)

### Deployment Steps:

**1. Staging Deployment**:
```bash
# 1. Run migrations on staging database
npx tsx server/scripts/migrate-security-answers.ts
npx tsx server/scripts/migrate-recovery-tokens.ts

# 2. Add missing indexes
npx tsx server/scripts/add-missing-indexes.ts

# 3. Deploy code
git push staging main

# 4. Monitor logs for errors
tail -f logs/error.log

# 5. Run smoke tests
npm run test:integration
```

**2. Production Deployment** (after staging validation):
```bash
# 1. Database backup
mongodump --uri="$PROD_MONGO_URI" --out=backup-$(date +%Y%m%d)

# 2. Run migrations in production
npx tsx server/scripts/migrate-security-answers.ts
npx tsx server/scripts/migrate-recovery-tokens.ts
npx tsx server/scripts/add-missing-indexes.ts

# 3. Deploy code (zero-downtime)
pm2 deploy production

# 4. Monitor error rates
# Check Sentry/NewRelic/CloudWatch

# 5. Rollback plan ready
# Keep previous deployment artifact
```

**3. Post-Deployment Monitoring**:
```bash
# Monitor 409 errors (concurrent modifications)
grep "CONCURRENT_MODIFICATION" logs/app.log | wc -l

# Monitor encryption errors
grep "decryption failed" logs/error.log

# Monitor slow queries
db.setProfilingLevel(1, { slowms: 100 });
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 }).limit(10);

# Check session count (should not exceed 5 per user)
db.sessions.aggregate([
  { $match: { isRevoked: false, expiresAt: { $gt: new Date() } } },
  { $group: { _id: '$userId', count: { $sum: 1 } } },
  { $match: { count: { $gt: 5 } } }
]);
```

---

## ESTIMATED TIMELINE

| Phase | Description | Effort | Cumulative |
|-------|-------------|--------|------------|
| **Phase 1** | Critical Security | 8-10h | 10h |
| **Phase 2** | Compilation Errors | 4-6h | 16h |
| **Phase 3** | Type Safety | 6-8h | 24h |
| **Phase 4** | Race Conditions | 8-10h | 34h |
| **Phase 5** | Clean Architecture | 20-25h | 59h |
| **Phase 6** | Database Optimization | 10-12h | 71h |
| **Phase 7** | Validation & Errors | 15-18h | 89h |
| **Phase 8** | Testing | 25-30h | 119h |
| **Review** | Code review, docs | 10h | 129h |
| **Deployment** | Staging + production | 6h | 135h |

**Total Estimated Effort**: **135-150 hours** (~4-5 weeks for 1 developer, ~2-3 weeks for 2 developers)

---

## SUCCESS CRITERIA

### Phase 1 Success:
- ✅ All credentials encrypted in database
- ✅ No plain text secrets in any model
- ✅ Server refuses to start without valid ENCRYPTION_KEY
- ✅ Migration scripts executed successfully

### Phase 4 Success:
- ✅ Concurrent order updates return 409 (not data corruption)
- ✅ Multiple simultaneous logins respect 5-session limit
- ✅ No race conditions in shipment webhook handling

### Phase 5 Success:
- ✅ No HTTP objects (Request) in service layer
- ✅ All controllers use shared logger
- ✅ No require() statements in TypeScript files
- ✅ Services are framework-agnostic (testable without Express)

### Overall Success:
- ✅ Server compiles without TypeScript errors
- ✅ Server starts successfully
- ✅ All existing functionality works
- ✅ New security measures active
- ✅ Performance improved (faster queries via indexes)
- ✅ Test coverage >70%

---

## RISK MITIGATION

### Risk 1: Data Migration Failures
**Mitigation**:
- Test migrations on staging first
- Keep backup before production migration
- Migration scripts are idempotent (can run multiple times)
- Rollback plan: Restore from backup

### Risk 2: Frontend Breaking Changes
**Mitigation**:
- Phase 4 changes require frontend updates (include `__v` in requests)
- Provide migration guide to frontend team
- Backend validates but doesn't require `__v` initially (grace period)
- Frontend deploys after backend is stable

### Risk 3: Performance Regression
**Mitigation**:
- Monitor query performance before/after index changes
- Load testing on staging
- Rollback indexes if performance degrades
- Optimistic locking adds minimal overhead (version check is fast)

---

## NOTES & ASSUMPTIONS

**Assumptions**:
1. You have database backup strategy in place
2. Staging environment mirrors production
3. Frontend team can coordinate on Phase 4 changes
4. Services referenced (ShopifyFulfillmentService, etc.) exist or will be created

**Dependencies**:
- `mongoose-field-encryption` npm package (already installed)
- MongoDB 4.0+ (supports transactions)
- Node.js 18+ (for native crypto)

**Breaking Changes Summary**:
- Phase 4: Frontend must include `__v` in order/shipment updates
- Phase 5: Service method signatures change (internal only if frontend uses REST API)

---

**END OF REMEDIATION PLAN**

This plan is ready for execution. Proceed phase by phase, verifying each phase's checklist before moving to the next.
