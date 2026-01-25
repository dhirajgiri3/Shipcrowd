# DeepVue KYC Verification API Integration

**Module:** Identity Verification (KYC)
**Integration Type:** Third-Party Verification Service
**Provider:** DeepVue Technologies
**Implementation Priority:** Phase 1 (Already Implemented - Enhancement Phase)
**Current Status:** 42% Complete (Core functionality working)
**Target Completion:** Week 4-5 (Enhancements & Testing)

---

## Table of Contents

1. [Overview](#overview)
2. [Current Implementation Status](#current-implementation-status)
3. [Authentication](#authentication)
4. [API Endpoints](#api-endpoints)
5. [TypeScript Interfaces](#typescript-interfaces)
6. [Verification Methods](#verification-methods)
7. [Data Storage & Encryption](#data-storage--encryption)
8. [Controller Implementation](#controller-implementation)
9. [Error Handling](#error-handling)
10. [Development Mode](#development-mode)
11. [Security Considerations](#security-considerations)
12. [Testing Strategy](#testing-strategy)
13. [Enhancement Opportunities](#enhancement-opportunities)
14. [Implementation Checklist](#implementation-checklist)

---

## Overview

### Purpose

DeepVue is a comprehensive KYC (Know Your Customer) verification service providing real-time verification for Indian identity and business documents. Shipcrowd uses DeepVue to verify:
- **PAN Card** - Personal identification
- **Aadhaar Card** - Government ID proof
- **GSTIN** - GST registration for businesses
- **Bank Account** - Account verification via penny drop
- **IFSC Code** - Bank branch validation

### Integration Points

**Shipcrowd Use Cases:**
1. **User Onboarding** - Verify individual users before account activation
2. **Business Verification** - Validate company GSTIN and business details
3. **Payment Setup** - Verify bank accounts before COD remittance
4. **Compliance** - Maintain KYC records for regulatory compliance
5. **Fraud Prevention** - Real-time identity verification to prevent fake accounts

### Base URL

```
Production: https://production.deepvue.tech/v1
```

### Key Features

- **Real-time Verification** - Instant results for most document types
- **Government Database Access** - Direct integration with UIDAI, GSTN, Income Tax databases
- **No Manual Review** - Automated verification reduces turnaround time
- **Secure Storage** - Encrypted storage of sensitive PII data
- **Development Mode** - Mock responses for testing without API calls

---

## Current Implementation Status

### What's Working (42% Complete)

**✅ Implemented Features:**

1. **Authentication System** (100%)
   - OAuth token management with auto-refresh
   - Token caching with 1-hour expiry
   - Secure credential storage via environment variables
   - File: [deepvue.service.ts:34-78](server/src/core/application/services/integrations/deepvue.service.ts#L34-L78)

2. **PAN Verification** (90%)
   - Basic PAN format validation
   - Real-time verification via DeepVue API
   - Response processing and data extraction
   - Storage in encrypted KYC model
   - File: [deepvue.service.ts:100-133](server/src/core/application/services/integrations/deepvue.service.ts#L100-L133)
   - Controller: [kyc.controller.ts:431-552](server/src/presentation/http/controllers/identity/kyc.controller.ts#L431-L552)

3. **Aadhaar Verification** (80%)
   - Basic Aadhaar validation (12-digit format)
   - One-step verification (no OTP required)
   - Returns masked data: age range, state, gender
   - File: [deepvue.service.ts:178-211](server/src/core/application/services/integrations/deepvue.service.ts#L178-L211)
   - Controller: [kyc.controller.ts:999-1112](server/src/presentation/http/controllers/identity/kyc.controller.ts#L999-L1112)

4. **GSTIN Verification** (85%)
   - GSTIN format validation (15-character GST number)
   - Business name, legal name extraction
   - Multiple address parsing
   - Business type and registration details
   - File: [deepvue.service.ts:306-338](server/src/core/application/services/integrations/deepvue.service.ts#L306-L338)
   - Controller: [kyc.controller.ts:560-750](server/src/presentation/http/controllers/identity/kyc.controller.ts#L560-L750)

5. **Bank Account Verification** (75%)
   - Account number validation (9-18 digits)
   - IFSC validation (11 characters, AAAA0XXXXXX format)
   - Penny drop verification
   - Account holder name matching
   - File: [deepvue.service.ts:584-648](server/src/core/application/services/integrations/deepvue.service.ts#L584-L648)
   - Controller: [kyc.controller.ts:756-898](server/src/presentation/http/controllers/identity/kyc.controller.ts#L756-L898)

6. **IFSC Verification** (100%)
   - IFSC format validation
   - Bank name, branch, address lookup
   - File: [deepvue.service.ts:742-772](server/src/core/application/services/integrations/deepvue.service.ts#L742-L772)
   - Controller: [kyc.controller.ts:1118-1171](server/src/presentation/http/controllers/identity/kyc.controller.ts#L1118-L1171)

7. **Data Encryption** (100%)
   - Field-level encryption for PAN, Aadhaar, Account Number
   - AES-256 encryption using mongoose-field-encryption plugin
   - File: [KYC.ts:213-223](server/src/infrastructure/database/mongoose/models/KYC.ts#L213-L223)

8. **Development Mode** (100%)
   - Mock responses for all verification types
   - Configurable via `DEEPVUE_DEV_MODE=true` env variable
   - File: [deepvue.mock.ts](server/src/core/application/services/integrations/mocks/deepvue.mock.ts)

### What's Missing (58% Remaining)

**❌ Pending Implementation:**

1. **Rate Limiting** (0%)
   - No rate limiting on KYC endpoints
   - Risk of API quota exhaustion
   - **Impact:** High - Could result in API bill overruns

2. **Caching** (0%)
   - No caching of verification results
   - Redundant API calls for same PAN/GSTIN
   - **Impact:** Medium - Wastes API credits and time

3. **Webhook Support** (0%)
   - No webhook handling for async verifications
   - All verifications are synchronous
   - **Impact:** Low - Current sync flow works fine

4. **Batch Verification** (0%)
   - No bulk verification API
   - One-by-one verification for multiple users
   - **Impact:** Medium - Slow onboarding for bulk imports

5. **Verification History** (0%)
   - No audit trail of verification attempts
   - Can't track failed verifications
   - **Impact:** Medium - Compliance and debugging issues

6. **Document OCR** (0%)
   - No automatic extraction from uploaded images
   - Users must manually type PAN/Aadhaar numbers
   - **Impact:** Low - Manual entry works but UX could improve

7. **Name Matching** (30%)
   - Basic name comparison exists but no fuzzy matching
   - Fails on minor spelling differences
   - **Impact:** Medium - False negatives in verification

8. **Comprehensive Testing** (20%)
   - Only basic unit tests exist
   - No integration tests with real API
   - No load testing
   - **Impact:** High - Production bugs possible

---

## Authentication

### OAuth 2.0 Token Flow

DeepVue uses OAuth 2.0 for authentication with client credentials grant.

**Endpoint:** `POST /v1/authorize`

**Request:**
```typescript
const formData = new URLSearchParams();
formData.append('client_id', DEEPVUE_CLIENT_ID);
formData.append('client_secret', DEEPVUE_API_KEY);

const response = await axios.post(
  'https://production.deepvue.tech/v1/authorize',
  formData.toString(),
  {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  }
);
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Token Management Implementation

**File:** [deepvue.service.ts:26-78](server/src/core/application/services/integrations/deepvue.service.ts#L26-L78)

```typescript
// In-memory token storage
let accessToken: string | null = null;
let tokenExpiryTime: number | null = null;

const getAccessToken = async (): Promise<string> => {
  // Check if we have a valid token
  if (accessToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
    return accessToken;
  }

  // Create form data for the request
  const formData = new URLSearchParams();
  formData.append('client_id', DEEPVUE_CLIENT_ID);
  formData.append('client_secret', DEEPVUE_API_KEY);

  // Make the API call to get a token
  const response = await axios.post(
    `${DEEPVUE_API_BASE_URL}/authorize`,
    formData.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  if (response.data && response.data.access_token) {
    accessToken = response.data.access_token;

    // Set token expiry time (default to 1 hour if not provided)
    const expiresIn = response.data.expires_in || 3600;
    tokenExpiryTime = Date.now() + (expiresIn * 1000);

    logger.info('DeepVue API token obtained successfully');
    return accessToken as string;
  }

  throw new Error('Failed to obtain access token from DeepVue API');
};
```

### Environment Variables

**.env Configuration:**
```bash
# DeepVue API Credentials
DEEPVUE_CLIENT_ID=your_client_id_here
DEEPVUE_API_KEY=your_api_key_here

# Development Mode (set to 'true' to use mock responses)
DEEPVUE_DEV_MODE=false

# PII Encryption Key (64+ hex characters)
ENCRYPTION_KEY=your_64_character_hex_encryption_key_here
```

**Generating Encryption Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## API Endpoints

### 1. PAN Verification

**Endpoint:** `GET /v1/verification/panbasic`

**Query Parameters:**
- `pan_number` (required) - 10-character PAN number (e.g., ABCDE1234F)
- `name` (optional) - Name to match against PAN record

**Request Example:**
```typescript
GET /v1/verification/panbasic?pan_number=ABCDE1234F&name=John+Doe
Authorization: Bearer {access_token}
x-api-key: {api_key}
```

**Response Example:**
```json
{
  "code": 200,
  "message": "PAN verification successful",
  "data": {
    "pan": "ABCDE1234F",
    "full_name": "JOHN DOE",
    "status": "VALID",
    "category": "Individual",
    "name_information": {
      "pan_name_cleaned": "John Doe"
    }
  },
  "transaction_id": "txn_1234567890abcdef"
}
```

### 2. Aadhaar Verification (Basic)

**Endpoint:** `GET /v1/verification/aadhaar`

**Query Parameters:**
- `aadhaar_number` (required) - 12-digit Aadhaar number

**Request Example:**
```typescript
GET /v1/verification/aadhaar?aadhaar_number=123456789012
Authorization: Bearer {access_token}
x-api-key: {api_key}
```

**Response Example:**
```json
{
  "code": 200,
  "message": "Aadhaar verified successfully",
  "data": {
    "aadhaar_number": "XXXX-XXXX-9012",
    "age_range": "20-30",
    "state": "Karnataka",
    "gender": "M",
    "last_digits": "9012",
    "is_mobile": true
  },
  "transaction_id": "txn_9876543210fedcba"
}
```

**Note:** Basic Aadhaar verification returns masked data only. Full details require OTP-based verification (not implemented).

### 3. GSTIN Verification

**Endpoint:** `GET /v1/verification/gstinlite`

**Query Parameters:**
- `gstin_number` (required) - 15-character GSTIN (e.g., 27AAAAA0000A1Z5)

**Request Example:**
```typescript
GET /v1/verification/gstinlite?gstin_number=27AAAAA0000A1Z5
Authorization: Bearer {access_token}
x-api-key: {api_key}
```

**Response Example:**
```json
{
  "code": 200,
  "message": "GSTIN verified successfully",
  "data": {
    "gstin": "27AAAAA0000A1Z5",
    "lgnm": "ABC PRIVATE LIMITED",
    "tradeNam": "ABC TRADERS",
    "sts": "Active",
    "dty": "Regular",
    "nba": ["Wholesale of computer hardware"],
    "rgdt": "2017-07-01",
    "lstupdt": "2024-01-15",
    "pradr": {
      "addr": {
        "bno": "123",
        "bnm": "Tech Park",
        "st": "MG Road",
        "loc": "Koramangala",
        "dst": "Bangalore",
        "stcd": "Karnataka",
        "pncd": "560095"
      },
      "ntr": "Office / Sale Office"
    }
  },
  "transaction_id": "txn_gst123456"
}
```

### 4. Bank Account Verification (Penny Drop)

**Endpoint:** `GET /v1/verification/bankaccount`

**Query Parameters:**
- `account_number` (required) - 9-18 digit account number
- `ifsc` (required) - 11-character IFSC code
- `name` (optional) - Account holder name for matching

**Request Example:**
```typescript
GET /v1/verification/bankaccount?account_number=1234567890&ifsc=SBIN0001234&name=John+Doe
Authorization: Bearer {access_token}
x-api-key: {api_key}
```

**Response Example:**
```json
{
  "code": 200,
  "message": "Bank account verified successfully",
  "data": {
    "account_exists": true,
    "name_at_bank": "JOHN DOE",
    "account_number": "1234567890",
    "ifsc": "SBIN0001234",
    "bank_name": "State Bank of India",
    "branch_name": "MG Road Branch",
    "utr": "UTR123456789",
    "amount_deposited": 1.00,
    "ifsc_verified": true,
    "name_information": {
      "name_at_bank_cleaned": "John Doe"
    },
    "timestamp": "2025-01-15T10:30:00Z"
  },
  "transaction_id": "txn_bank789"
}
```

**Note:** Penny drop deposits ₹1 to verify account existence. Amount is auto-refunded.

### 5. IFSC Verification

**Endpoint:** `GET /v1/verification/ifsc`

**Query Parameters:**
- `ifsc` (required) - 11-character IFSC code

**Request Example:**
```typescript
GET /v1/verification/ifsc?ifsc=SBIN0001234
Authorization: Bearer {access_token}
x-api-key: {api_key}
```

**Response Example:**
```json
{
  "code": 200,
  "message": "IFSC verification successful",
  "data": {
    "ifsc": "SBIN0001234",
    "bank_name": "State Bank of India",
    "branch": "MG Road Branch",
    "address": "123 MG Road, Bangalore, Karnataka - 560001",
    "city": "Bangalore",
    "state": "Karnataka"
  },
  "transaction_id": "txn_ifsc456"
}
```

---

## TypeScript Interfaces

### DeepVue Service Interfaces

**File:** Create `server/src/core/application/services/integrations/types/deepvue.types.ts`

```typescript
/**
 * DeepVue Authentication Response
 */
export interface DeepVueAuthResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;  // Seconds until expiry
}

/**
 * Base DeepVue API Response
 */
export interface DeepVueBaseResponse<T> {
  code: number;
  message: string;
  data: T;
  transaction_id: string;
}

/**
 * PAN Verification Response
 */
export interface PanVerificationData {
  pan: string;
  full_name: string;
  status: 'VALID' | 'INVALID';
  category: string;  // 'Individual', 'Company', 'HUF', etc.
  name_information?: {
    pan_name_cleaned: string;
  };
}

export interface PanVerificationResponse extends DeepVueBaseResponse<PanVerificationData> {}

/**
 * Aadhaar Verification Response (Basic)
 */
export interface AadhaarVerificationData {
  aadhaar_number: string;  // Masked: XXXX-XXXX-1234
  age_range: string;       // e.g., '20-30'
  state: string;           // e.g., 'Karnataka'
  gender: 'M' | 'F' | 'O';
  last_digits: string;     // Last 4 digits
  is_mobile: boolean;      // Mobile linked?
}

export interface AadhaarVerificationResponse extends DeepVueBaseResponse<AadhaarVerificationData> {}

/**
 * GSTIN Verification Response
 */
export interface GstinAddress {
  bno?: string;   // Building number
  bnm?: string;   // Building name
  flno?: string;  // Floor number
  st?: string;    // Street
  loc?: string;   // Locality
  dst?: string;   // District
  stcd?: string;  // State
  pncd?: string;  // PIN code
}

export interface GstinPrincipalAddress {
  addr: GstinAddress;
  ntr?: string;  // Nature of business
}

export interface GstinVerificationData {
  gstin: string;
  lgnm: string;           // Legal name
  tradeNam?: string;      // Trade name
  sts: string;            // Status ('Active', 'Cancelled', etc.)
  dty: string;            // Dealer type ('Regular', 'Composition', etc.)
  nba?: string[];         // Nature of business activities
  rgdt?: string;          // Registration date
  lstupdt?: string;       // Last updated date
  pradr: GstinPrincipalAddress;  // Principal address
  adadr?: GstinPrincipalAddress[];  // Additional addresses
}

export interface GstinVerificationResponse extends DeepVueBaseResponse<GstinVerificationData> {}

/**
 * Bank Account Verification Response
 */
export interface BankAccountVerificationData {
  account_exists: boolean;
  account_number: string;
  ifsc: string;
  name_at_bank: string;
  bank_name?: string;
  branch_name?: string;
  utr?: string;             // Unique Transaction Reference
  amount_deposited?: number;  // Penny drop amount (usually 1.00)
  ifsc_verified?: boolean;
  name_information?: {
    name_at_bank_cleaned: string;
  };
  timestamp?: string;
  message?: string;
}

export interface BankAccountVerificationResponse extends DeepVueBaseResponse<BankAccountVerificationData> {}

/**
 * IFSC Verification Response
 */
export interface IfscVerificationData {
  ifsc: string;
  bank_name: string;
  branch: string;
  address: string;
  city: string;
  state: string;
}

export interface IfscVerificationResponse extends DeepVueBaseResponse<IfscVerificationData> {}
```

### KYC Model Interfaces

**File:** [KYC.ts:7-67](server/src/infrastructure/database/mongoose/models/KYC.ts#L7-L67)

```typescript
export interface IKYC extends Document {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  status: 'pending' | 'verified' | 'rejected';
  documents: {
    pan?: {
      number: string;        // Encrypted
      image: string;
      verified: boolean;
      verifiedAt?: Date;
      verificationData?: any;
      name?: string;
    };
    aadhaar?: {
      number: string;        // Encrypted
      frontImage: string;
      backImage: string;
      verified: boolean;
      verifiedAt?: Date;
      verificationData?: any;
    };
    gstin?: {
      number: string;
      verified: boolean;
      verifiedAt?: Date;
      verificationData?: any;
      businessName?: string;
      legalName?: string;
      status?: string;
      registrationType?: string;
      businessType?: string[];
      addresses?: {
        type: string;
        address: string;
        businessNature?: string;
      }[];
      registrationDate?: string;
      lastUpdated?: string;
    };
    bankAccount?: {
      accountNumber: string;  // Encrypted
      ifscCode: string;
      accountHolderName: string;
      bankName: string;
      verified: boolean;
      verifiedAt?: Date;
      proofImage?: string;
      verificationData?: any;
    };
  };
  completionStatus: {
    personalKycComplete: boolean;
    companyInfoComplete: boolean;
    bankDetailsComplete: boolean;
    agreementComplete: boolean;
  };
  verificationNotes?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Verification Methods

### PAN Verification

**File:** [deepvue.service.ts:100-133](server/src/core/application/services/integrations/deepvue.service.ts#L100-L133)

```typescript
export const verifyPan = async (pan: string, name?: string): Promise<any> => {
  // If in development mode, return mock response
  if (DEEPVUE_DEV_MODE) {
    logger.info(`[DEV MODE] Using mock response for PAN verification: ${pan}`);
    return processPanResponse(mockPanResponse(pan, name));
  }

  const endpoint = '/verification/panbasic';

  const queryParams = new URLSearchParams();
  queryParams.append('pan_number', pan);
  if (name) {
    queryParams.append('name', name);
  }

  const apiInstance = await createDeepVueApiInstance();
  const response = await apiInstance.get(`${endpoint}?${queryParams.toString()}`);

  return processPanResponse(response.data);
};
```

**Response Processing:**
```typescript
export const processPanResponse = (responseData: any): any => {
  if (responseData.code === 200 && responseData.data) {
    const data = responseData.data;

    const panInfo = {
      pan: data.pan,
      name: data.full_name,
      status: data.status === 'VALID' ? 'valid' : 'invalid',
      category: data.category || '',
      nameClean: data.name_information?.pan_name_cleaned || data.full_name,
      valid: data.status === 'VALID',
    };

    return {
      status: 'success',
      data: panInfo,
      transactionId: responseData.transaction_id,
      rawResponse: responseData
    };
  }

  return responseData;
};
```

### Aadhaar Verification

**File:** [deepvue.service.ts:178-211](server/src/core/application/services/integrations/deepvue.service.ts#L178-L211)

```typescript
export const verifyAadhaar = async (aadhaar: string): Promise<any> => {
  if (DEEPVUE_DEV_MODE) {
    return processBasicAadhaarResponse(mockAadhaarResponse(aadhaar));
  }

  const endpoint = '/verification/aadhaar';

  const queryParams = new URLSearchParams();
  queryParams.append('aadhaar_number', aadhaar);

  const apiInstance = await createDeepVueApiInstance();
  const response = await apiInstance.get(`${endpoint}?${queryParams.toString()}`);

  return processBasicAadhaarResponse(response.data);
};
```

**Response Processing:**
```typescript
export const processBasicAadhaarResponse = (responseData: any): any => {
  if (responseData.code === 200 && responseData.data) {
    const data = responseData.data;

    return {
      status: 'success',
      message: responseData.message || 'Aadhaar verified successfully',
      data: {
        aadhaar_number: data.aadhaar_number || '',
        age_range: data.age_range || '',
        state: data.state || '',
        gender: data.gender || '',
        last_digits: data.last_digits || '',
        is_mobile: data.is_mobile || false,
        verified: true,
      },
      transactionId: responseData.transaction_id,
      rawResponse: responseData
    };
  }

  return responseData;
};
```

### GSTIN Verification

**File:** [deepvue.service.ts:306-513](server/src/core/application/services/integrations/deepvue.service.ts#L306-L513)

**Includes complex address parsing logic:**

```typescript
const extractAddresses = (data: any): any[] => {
  const addresses = [];

  // Principal place of business
  if (data.pradr && data.pradr.addr) {
    addresses.push({
      type: 'Principal',
      address: formatAddress(data.pradr.addr),
      businessNature: data.pradr.ntr || ''
    });
  }

  // Additional addresses
  if (data.adadr && Array.isArray(data.adadr)) {
    data.adadr.forEach((addrData: any, index: number) => {
      if (addrData.addr) {
        addresses.push({
          type: `Additional ${index + 1}`,
          address: formatAddress(addrData.addr),
          businessNature: addrData.ntr || ''
        });
      }
    });
  }

  return addresses;
};
```

---

## Data Storage & Encryption

### Field-Level Encryption

**File:** [KYC.ts:213-223](server/src/infrastructure/database/mongoose/models/KYC.ts#L213-L223)

```typescript
// Validate encryption key exists at startup
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 64) {
  throw new Error(
    '❌ ENCRYPTION_KEY must be set in .env file (64+ hex characters).\n' +
    '   Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

// Add field-level encryption plugin
KYCSchema.plugin(fieldEncryption, {
  fields: [
    'documents.pan.number',
    'documents.aadhaar.number',
    'documents.bankAccount.accountNumber'
  ],
  secret: process.env.ENCRYPTION_KEY!,
  saltGenerator: () => crypto.randomBytes(16).toString('hex'),
  encryptOnSave: true,   // Automatically encrypt on save
  decryptOnFind: true,   // Automatically decrypt on retrieval
});
```

**How It Works:**
- PAN, Aadhaar, and Bank Account numbers are automatically encrypted before saving to MongoDB
- Decryption happens automatically when documents are queried
- Uses AES-256-CBC encryption algorithm
- Each field gets unique salt for additional security
- Complies with GDPR, PCI-DSS, and IT Act 2000 regulations

---

## Controller Implementation

### PAN Verification Endpoint

**Route:** `POST /api/v1/kyc/verify-pan`

**File:** [kyc.controller.ts:431-552](server/src/presentation/http/controllers/identity/kyc.controller.ts#L431-L552)

```typescript
export const verifyPanCard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const { pan, name } = req.body;

  // Validate PAN format
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
    sendError(res, 'Invalid PAN format', 400, 'INVALID_PAN_FORMAT');
    return;
  }

  // Call DeepVue API
  const verificationResult = await deepvueService.verifyPan(pan, name);

  // Determine if valid
  const isValid = verificationResult.valid === true ||
    (verificationResult.data && verificationResult.data.valid === true) ||
    (verificationResult.status === 'success' && verificationResult.data && verificationResult.data.valid !== false);

  // Find or create KYC record
  let kyc = await KYC.findOne({ userId: user._id });

  // Update PAN details
  kyc.documents.pan = {
    number: pan,
    image: '',
    verified: isValid,
    verificationData: verificationResult,
    verifiedAt: new Date(),
    name: verificationResult.name || name,
  };

  // Check if personal KYC is complete
  if (kyc.documents.aadhaar && kyc.documents.aadhaar.verified && kyc.documents.pan.verified) {
    kyc.completionStatus.personalKycComplete = true;
  }

  await kyc.save();

  sendSuccess(res, {
    verified: isValid,
    data: verificationResult.data || verificationResult,
  }, 'PAN verification completed');
};
```

---

## Error Handling

### Common Error Scenarios

| Error Code | HTTP Status | Description | Action |
|------------|-------------|-------------|--------|
| `INVALID_TOKEN` | 401 | Access token expired | Refresh token and retry |
| `INVALID_CREDENTIALS` | 401 | Wrong client_id or api_key | Check environment variables |
| `INVALID_PAN_FORMAT` | 400 | PAN format validation failed | Return error to user |
| `PAN_NOT_FOUND` | 404 | PAN doesn't exist in IT database | Return error to user |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Wait and retry |
| `INSUFFICIENT_CREDITS` | 402 | API credits exhausted | Notify admin, halt verifications |
| `SERVICE_UNAVAILABLE` | 503 | DeepVue server down | Retry with exponential backoff |

### Error Handling Implementation

```typescript
try {
  const verificationResult = await deepvueService.verifyPan(pan, name);
  // ... process result
} catch (error) {
  logger.error('Error in DeepVue PAN verification:', error);

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;

    if (status === 401) {
      // Token expired, will auto-refresh on next call
      sendError(res, 'Authentication failed. Please try again.', 500, 'AUTH_FAILED');
    } else if (status === 429) {
      sendError(res, 'Rate limit exceeded. Please try again later.', 429, 'RATE_LIMIT');
    } else if (status === 402) {
      sendError(res, 'Verification service unavailable. Contact support.', 503, 'SERVICE_UNAVAILABLE');
    } else {
      sendError(res, 'PAN verification failed', 400, 'PAN_VERIFICATION_FAILED');
    }
  } else {
    sendError(res, 'Internal server error', 500, 'INTERNAL_ERROR');
  }
}
```

---

## Development Mode

### Enabling Mock Responses

**Environment Variable:**
```bash
DEEPVUE_DEV_MODE=true
```

**File:** [deepvue.service.ts:24](server/src/core/application/services/integrations/deepvue.service.ts#L24)

```typescript
const DEEPVUE_DEV_MODE = process.env.DEEPVUE_DEV_MODE === 'true';
```

### Mock Response Examples

**File:** [deepvue.mock.ts](server/src/core/application/services/integrations/mocks/deepvue.mock.ts)

```typescript
export const mockPanResponse = (pan: string, name?: string) => ({
  code: 200,
  message: 'PAN verification successful (MOCK)',
  data: {
    pan: pan,
    full_name: name || 'TEST USER',
    status: 'VALID',
    category: 'Individual',
    name_information: {
      pan_name_cleaned: name || 'Test User'
    }
  },
  transaction_id: `mock_txn_${Date.now()}`
});

export const mockAadhaarResponse = (aadhaar: string) => ({
  code: 200,
  message: 'Aadhaar verified successfully (MOCK)',
  data: {
    aadhaar_number: `XXXX-XXXX-${aadhaar.slice(-4)}`,
    age_range: '20-30',
    state: 'Karnataka',
    gender: 'M',
    last_digits: aadhaar.slice(-4),
    is_mobile: true
  },
  transaction_id: `mock_txn_${Date.now()}`
});
```

---

## Security Considerations

### 1. PII Data Protection

**Implemented:**
- ✅ AES-256 encryption for PAN, Aadhaar, Account Number
- ✅ Separate encryption salt per field
- ✅ Automatic encryption/decryption via Mongoose middleware
- ✅ Environment variable storage for encryption key

**Missing:**
- ❌ Encryption key rotation strategy
- ❌ Audit logging of PII access
- ❌ Data anonymization for analytics

### 2. API Credential Security

**Implemented:**
- ✅ Environment variable storage
- ✅ No hardcoded credentials

**Recommended:**
- ❌ Move to AWS Secrets Manager or HashiCorp Vault
- ❌ Implement credential rotation
- ❌ IP whitelisting on DeepVue dashboard

### 3. Input Validation

**Implemented:**
- ✅ PAN format: `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`
- ✅ Aadhaar format: `^\d{12}$`
- ✅ GSTIN format: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`
- ✅ IFSC format: `^[A-Z]{4}0[A-Z0-9]{6}$`
- ✅ Account number: `^\d{9,18}$`

### 4. Rate Limiting

**Missing:**
- ❌ No rate limiting on KYC endpoints
- ❌ No per-user verification limits

**Recommended Implementation:**
```typescript
import rateLimit from 'express-rate-limit';

const kycRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 verifications per window
  message: 'Too many verification attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/verify-pan', kycRateLimiter, verifyPanCard);
```

---

## Testing Strategy

### Unit Tests

**File:** Create `server/src/__tests__/services/deepvue.service.test.ts`

```typescript
import deepvueService from '../../core/application/services/integrations/deepvue.service';

describe('DeepVue Service', () => {
  beforeEach(() => {
    process.env.DEEPVUE_DEV_MODE = 'true';  // Use mock responses
  });

  describe('verifyPan', () => {
    it('should verify valid PAN', async () => {
      const result = await deepvueService.verifyPan('ABCDE1234F');

      expect(result.status).toBe('success');
      expect(result.data.pan).toBe('ABCDE1234F');
      expect(result.data.valid).toBe(true);
    });

    it('should return error for invalid PAN', async () => {
      const result = await deepvueService.verifyPan('INVALID123');

      expect(result.status).toBe('error');
    });
  });

  describe('verifyGstin', () => {
    it('should extract business addresses correctly', async () => {
      const result = await deepvueService.verifyGstin('27AAAAA0000A1Z5');

      expect(result.data.addresses).toBeDefined();
      expect(result.data.addresses.length).toBeGreaterThan(0);
      expect(result.data.addresses[0]).toHaveProperty('type');
      expect(result.data.addresses[0]).toHaveProperty('address');
    });
  });
});
```

### Integration Tests

**File:** Create `server/src/__tests__/integration/kyc.test.ts`

```typescript
import request from 'supertest';
import app from '../../index';

describe('KYC Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    // Login and get token
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    authToken = response.body.accessToken;
  });

  describe('POST /api/v1/kyc/verify-pan', () => {
    it('should verify PAN successfully', async () => {
      const response = await request(app)
        .post('/api/v1/kyc/verify-pan')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pan: 'ABCDE1234F',
          name: 'John Doe'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.verified).toBe(true);
    });

    it('should reject invalid PAN format', async () => {
      const response = await request(app)
        .post('/api/v1/kyc/verify-pan')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pan: 'INVALID' })
        .expect(400);

      expect(response.body.code).toBe('INVALID_PAN_FORMAT');
    });
  });
});
```

---

## Enhancement Opportunities

### 1. Implement Caching (Week 4)

**Problem:** Same PAN/GSTIN verified multiple times = wasted API credits

**Solution:**
```typescript
import NodeCache from 'node-cache';

const verificationCache = new NodeCache({ stdTTL: 86400 }); // 24 hours

export const verifyPanWithCache = async (pan: string): Promise<any> => {
  const cacheKey = `pan_${pan}`;
  const cached = verificationCache.get(cacheKey);

  if (cached) {
    logger.info(`[CACHE HIT] PAN verification for ${pan}`);
    return cached;
  }

  const result = await verifyPan(pan);
  verificationCache.set(cacheKey, result);

  return result;
};
```

### 2. Add Rate Limiting (Week 4)

See Security Considerations section above.

### 3. Implement Fuzzy Name Matching (Week 5)

**Problem:** "John Doe" vs "JOHN DOE" vs "John R. Doe" fail exact match

**Solution:**
```typescript
import { distance } from 'fastest-levenshtein';

const fuzzyNameMatch = (name1: string, name2: string, threshold: number = 0.8): boolean => {
  const clean1 = name1.toLowerCase().replace(/[^a-z]/g, '');
  const clean2 = name2.toLowerCase().replace(/[^a-z]/g, '');

  const maxLen = Math.max(clean1.length, clean2.length);
  const dist = distance(clean1, clean2);
  const similarity = 1 - (dist / maxLen);

  return similarity >= threshold;
};
```

### 4. Add Verification History Tracking (Week 5)

**Schema:**
```typescript
const VerificationHistorySchema = new Schema({
  userId: ObjectId,
  verificationType: String,  // 'pan' | 'aadhaar' | 'gstin' | 'bank'
  documentNumber: String,    // Encrypted
  status: String,            // 'success' | 'failed'
  transactionId: String,
  cost: Number,              // API credit cost
  errorCode: String,
  createdAt: Date
});
```

---

## Implementation Checklist

### Week 4: Enhancements (20 hours)

**Day 1: Caching Implementation (4 hours)**
- [ ] Install `node-cache` package
- [ ] Implement cache wrapper functions for all verification methods
- [ ] Add cache invalidation logic
- [ ] Add cache hit/miss metrics
- [ ] Test cache performance

**Day 2: Rate Limiting (4 hours)**
- [ ] Install `express-rate-limit` if not already present
- [ ] Configure rate limiters for each KYC endpoint
- [ ] Add per-user verification limits
- [ ] Implement Redis-based rate limiting (for multi-server)
- [ ] Test rate limit scenarios

**Day 3: Name Matching (4 hours)**
- [ ] Install `fastest-levenshtein` package
- [ ] Implement fuzzy name matching function
- [ ] Add name matching to PAN and bank verification
- [ ] Add similarity score to verification response
- [ ] Write unit tests for edge cases

**Day 4: Testing (4 hours)**
- [ ] Write unit tests for all verification methods (target: 90% coverage)
- [ ] Write integration tests for all KYC endpoints
- [ ] Manual testing with real DeepVue API (use test credentials)
- [ ] Load testing with 100 concurrent verifications
- [ ] Document test results

**Day 5: Monitoring & Docs (4 hours)**
- [ ] Add verification metrics (success rate, avg response time)
- [ ] Set up alerts for API failures
- [ ] Set up alerts for API credit threshold (< 100 credits)
- [ ] Update API documentation
- [ ] Create troubleshooting guide

### Week 5: Advanced Features (16 hours)

**Day 1-2: Verification History (8 hours)**
- [ ] Create VerificationHistory model
- [ ] Add middleware to log all verifications
- [ ] Create admin dashboard endpoint for history
- [ ] Add cost tracking per verification
- [ ] Add analytics queries (verification trends, success rates)

**Day 3: Batch Verification (4 hours)**
- [ ] Create bulk verification endpoint
- [ ] Implement async job queue (Bull or Agenda)
- [ ] Add progress tracking
- [ ] Test with 1000+ user batch

**Day 4: Security Audit (4 hours)**
- [ ] Review PII handling across codebase
- [ ] Implement audit logging for PII access
- [ ] Test encryption key rotation procedure
- [ ] Penetration testing for verification bypass
- [ ] Document security procedures

---

## Additional Resources

### Official Documentation

- [DeepVue API Documentation](https://production.deepvue.tech/docs)
- [DeepVue Dashboard](https://production.deepvue.tech/dashboard)

### Regulatory Compliance

- [UIDAI Aadhaar Authentication Guidelines](https://uidai.gov.in/ecosystem/authentication-devices-documents/aua-kua-documentation.html)
- [GSTN API Guidelines](https://www.gst.gov.in/)
- [IT Act 2000 - Data Protection](https://www.meity.gov.in/writereaddata/files/itbill2000.pdf)

### Internal References

- [KYC Model](server/src/infrastructure/database/mongoose/models/KYC.ts)
- [DeepVue Service](server/src/core/application/services/integrations/deepvue.service.ts)
- [KYC Controller](server/src/presentation/http/controllers/identity/kyc.controller.ts)
- [Mock Service](server/src/core/application/services/integrations/mocks/deepvue.mock.ts)

---

**Document Version:** 1.0
**Last Updated:** 2025-01-XX
**Prepared By:** Claude Sonnet 4.5 (CANON Methodology)
**Review Status:** Ready for Enhancement Implementation

---

**END OF DOCUMENT**
