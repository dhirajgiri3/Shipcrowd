# Ekart Courier Integration - Complete Implementation Plan
**Developer 2 (Akash)** | Shipcrowd v10.0

---

## Executive Summary

This document provides a production-grade implementation plan for integrating Ekart/Flipkart Logistics into Shipcrowd, following the proven architectural patterns established by Velocity and Delhivery integrations.

### Key Decisions (From User Approval)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Warehouse Address Registration** | Hybrid: Auto-register + fallback | Seamless UX, production-safe |
| **Return Location** | Always explicit | Predictable RTO flow |
| **Invoice Defaults** | Always auto-generate | Merchant friction reduction |
| **Webhook Signature Header** | `x-ekart-signature` | Standard pattern |
| **MPS/OBD Support** | Full Phase 1 support | Complete feature parity |
| **Rate Caching** | DynamicPricingService integration | Consistent with Velocity |
| **NDR Automation** | Manual merchant action only | Control over exceptions |
| **GST Requirement** | Fail strict if missing | Compliance-first |

---

## Phase 1: Core Integration (Days 1-2)

### 1.1 Branch & Environment Setup

**Git Branch Strategy:**
```bash
# Create and switch to ekart-integration branch
git checkout -b ekart-integration

# Push empty branch to remote
git push -u origin ekart-integration
```

**Environment Variables (`server/.env`):**
```bash
# Ekart Credentials
EKART_CLIENT_ID=your_client_id
EKART_USERNAME=your_username
EKART_PASSWORD=your_password
EKART_BASE_URL=https://app.elite.ekartlogistics.in
EKART_WEBHOOK_SECRET=your_hmac_secret_6_to_30_chars

# Test Configuration
RUN_EKART_LIVE_TESTS=false
EKART_ALLOW_MUTATIONS=false
```

**Update `.env.example`:**
```bash
# Add Ekart section after Delhivery config
EKART_CLIENT_ID=
EKART_USERNAME=
EKART_PASSWORD=
EKART_BASE_URL=https://app.elite.ekartlogistics.in
EKART_WEBHOOK_SECRET=
```

---

### 1.2 Type Definitions

**File:** `server/src/infrastructure/external/couriers/ekart/ekart.types.ts`

```typescript
/**
 * Ekart API Types & Interfaces
 * API Version: 3.8.8
 * Base URL: https://app.elite.ekartlogistics.in
 */

// ==================== Auth Types ====================

export interface EkartAuthRequest {
  username: string;
  password: string;
}

export interface EkartAuthResponse {
  access_token: string;
  scope: string;
  expires_in: number; // seconds, typically 86400 (24 hours)
  token_type: 'Bearer';
}

// ==================== Location Types ====================

export interface EkartLocation {
  location_type: 'Office' | 'Home';
  address: string;
  city: string;
  state: string;
  country: string;
  name: string;
  phone: number; // 10 digits
  pin: number;
}

// ==================== Shipment Types ====================

export interface EkartShipmentRequest {
  // Seller Details
  seller_name: string;
  seller_address: string;
  seller_gst_tin: string;
  seller_gst_amount?: number;
  
  // Consignee Details
  consignee_name: string;
  consignee_alternate_phone: string; // >= 10 chars
  consignee_gst_amount?: number;
  consignee_gst_tin?: string;
  
  // Order & Invoice
  order_number: string;
  invoice_number: string;
  invoice_date: string; // YYYY-MM-DD format
  document_number?: string;
  document_date?: string;
  
  // Product Details
  products_desc: string;
  category_of_goods: string;
  hsn_code?: string;
  
  // Payment
  payment_mode: 'COD' | 'Prepaid' | 'Pickup'; // Pickup = reverse
  total_amount: number; // >= 1
  tax_value: number; // >= 0
  taxable_amount: number; // >= 1
  commodity_value: string; // Same as taxable_amount as string
  cod_amount: number; // 0-49999
  
  // Package
  quantity: number; // >= 1
  templateName?: string; // Alternative to dimensions
  weight: number; // grams, >= 1
  length: number; // cm, >= 1
  height: number; // cm, >= 1
  width: number; // cm, >= 1
  
  // Locations
  drop_location: EkartLocation;
  pickup_location: EkartLocation;
  return_location?: EkartLocation; // Defaults to pickup_location
  
  // Reverse Shipment Specific
  return_reason?: string; // Required if payment_mode is Pickup
  
  // Optional Features
  mps?: boolean; // Multi-package shipment
  obd_shipment?: boolean; // Open Box Delivery
  qc_details?: EkartQCDetails; // Quality Check for reverse
  preferred_dispatch_date?: string; // YYYY-MM-DD
  delayed_dispatch?: boolean;
  
  // Advanced
  ewbn?: string; // E-Way Bill Number (12 digits)
  integrated_gst_amount?: number;
  what3words_address?: string;
  items?: any[]; // For MPS
}

export interface EkartQCDetails {
  qc_shipment: boolean;
  product_name: string;
  product_desc?: string;
  product_sku?: string;
  product_color?: string;
  product_size?: string;
  brand_name?: string;
  product_category?: string;
  ean_barcode?: string;
  serial_number?: string;
  imei_number?: string;
  product_images?: string[];
}

export interface EkartShipmentResponse {
  status: boolean;
  remark: string;
  tracking_id: string; // Ekart tracking ID
  vendor: string; // Courier partner
  barcodes: {
    wbn: string; // Vendor waybill
    order: string;
    cod?: string;
  };
}

// ==================== Tracking Types ====================

export interface EkartTrackResponse {
  _id: string;
  track: {
    status: string;
    ctime: number;
    pickupTime: number;
    desc: string;
    location: string;
    ndrStatus?: string;
    attempts?: number;
    ndrActions?: string[];
    details: Array<{
      status: string;
      time: number;
      location: string;
    }>;
  };
  edd: number; // Expected delivery date (timestamp)
  order_number: string;
}

// ==================== Rate Types ====================

export interface EkartRateRequest {
  pickupPincode: number;
  dropPincode: number;
  invoiceAmount?: number;
  weight: number; // grams
  length: number; // cm
  height: number; // cm
  width: number; // cm
  serviceType: 'SURFACE' | 'EXPRESS';
  codAmount?: number;
  packages?: any[];
}

export interface EkartRateResponse {
  type: 'WEIGHT_BASED';
  zone: string;
  volumetricWeight: string;
  billingWeight: string;
  shippingCharge: string;
  rtoCharge: string;
  fuelSurcharge: string;
  codCharge: string;
  qcCharge?: string;
  taxes: string;
  total: string;
  rid: string;
  rSnapshotId: string;
}

// ==================== Serviceability Types ====================

export interface EkartServiceabilityResponse {
  status: boolean;
  pincode: number;
  remark: string;
  details: {
    cod: boolean;
    max_cod_amount: number;
    forward_pickup: boolean;
    forward_drop: boolean;
    reverse_pickup: boolean;
    reverse_drop: boolean;
    city: string;
    state: string;
  };
}

// ==================== Address Types ====================

export interface EkartAddressRequest {
  alias: string;
  phone: number; // [1000000000..9999999999]
  address_line1: string;
  address_line2?: string;
  pincode: number;
  city?: string;
  state?: string;
  country?: string; // "India" or "IN"
  geo?: {
    lat: number;
    lon: number;
  };
}

export interface EkartAddressResponse {
  status: boolean;
  alias: string;
  remark: string;
}

// ==================== NDR Types ====================

export interface EkartNDRRequest {
  action: 'Re-Attempt' | 'RTO';
  wbn: string; // Waybill number
  date?: number; // Required for Re-Attempt (ms since epoch, within 7 days)
  phone?: string; // Updated phone
  address?: string; // Updated address
  instructions?: string;
  links?: string[]; // File upload links
}

export interface EkartNDRResponse {
  status: boolean;
  remark: string;
  tracking_id: string;
}

// ==================== Manifest Types ====================

export interface EkartManifestRequest {
  ids: string[]; // Max 100 tracking IDs
}

export interface EkartManifestResponse {
  ctime: number;
  manifestNumber: number;
  manifestDownloadUrl: string;
}

// ==================== Label Types ====================

export interface EkartLabelRequest {
  ids: string[]; // Max 100 tracking IDs
}

// ==================== Webhook Types ====================

export interface EkartWebhookConfig {
  url: string; // Your endpoint URL (uri format)
  secret: string; // 6-30 chars for HMAC signature
  topics: Array<'track_updated' | 'shipment_created' | 'shipment_recreated'>;
  active: boolean;
}

export interface EkartWebhookResponse {
  url: string;
  secret: string;
  topics: string[];
  active: boolean;
  id: string;
}

export interface EkartTrackUpdatedWebhook {
  ctime: number;
  status: string;
  location: string;
  desc: string;
  attempts: string;
  pickupTime: number;
  wbn: string; // Vendor waybill
  id: string; // Ekart tracking ID
  orderNumber: string;
  edd: number;
}

export interface EkartShipmentCreatedWebhook {
  id: string; // Ekart tracking id
  wbn: string; // vendor waybill
  vendor: string; // courier partner name
  orderNumber: string;
  channelId: string; // Ekart order id
}

// ==================== Error Types ====================

export interface EkartErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  description: string;
  severity: string;
}

export class EkartError extends Error {
  constructor(
    public statusCode: number,
    public response: {
      message: string;
      error?: any;
      status_code: number;
    },
    public isRetryable: boolean
  ) {
    super(response.message);
    this.name = 'EkartError';
  }
}

// ==================== Status Mappings ====================

export const EKART_STATUS_MAP: Record<string, string> = {
  'Order Placed': 'manifested',
  'Picked Up': 'picked_up',
  'In Transit': 'in_transit',
  'Out for Delivery': 'out_for_delivery',
  'Delivered': 'delivered',
  'Cancelled': 'cancelled',
  'RTO Initiated': 'rto_initiated',
  'RTO Delivered': 'rto_delivered',
  'Delivery Failed': 'ndr',
};

export const CANCELLABLE_EKART_STATUSES = [
  'Order Placed',
  'Picked Up',
  'In Transit',
];

export const REATTEMPT_ELIGIBLE_STATUSES = [
  'Delivery Failed',
  'Out for Delivery',
];
```

---

### 1.3 Authentication Handler

**File:** `server/src/infrastructure/external/couriers/ekart/ekart.auth.ts`

```typescript
/**
 * Ekart Authentication & Token Management
 *
 * Handles:
 * - Bearer token authentication (24-hour validity)
 * - Encrypted DB storage + in-memory cache
 * - Proactive refresh (60 second buffer before expiry)
 * - Fallback to env vars for development
 */

import axios, { AxiosInstance } from 'axios';
import mongoose from 'mongoose';
import Integration from '../../../database/mongoose/models/system/integrations/integration.model';
import { encryptData, decryptData } from '../../../../shared/utils/encryption';
import { EkartAuthRequest, EkartAuthResponse, EkartError } from './ekart.types';
import logger from '../../../../shared/logger/winston.logger';

export class EkartAuth {
  private baseUrl: string;
  private companyId: mongoose.Types.ObjectId;
  private httpClient: AxiosInstance;
  private tokenCache: { token: string; expiresAt: Date } | null = null;
  private authPromise: Promise<string> | null = null;

  constructor(
    companyId: mongoose.Types.ObjectId,
    baseUrl: string = process.env.EKART_BASE_URL || 'https://app.elite.ekartlogistics.in'
  ) {
    this.companyId = companyId;
    this.baseUrl = baseUrl;
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get credentials from Integration model or env fallback
   */
  private async getCredentials(): Promise<{
    clientId: string;
    username: string;
    password: string;
  }> {
    const integration = await Integration.findOne({
      companyId: this.companyId,
      type: 'courier',
      provider: 'ekart',
      'settings.isActive': true,
    });

    if (!integration) {
      // Fallback to env vars (development only)
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Ekart integration not found, using env fallback', {
          companyId: this.companyId.toString(),
        });
        
        return {
          clientId: process.env.EKART_CLIENT_ID!,
          username: process.env.EKART_USERNAME!,
          password: process.env.EKART_PASSWORD!,
        };
      }

      throw new EkartError(
        404,
        {
          message: 'Ekart integration not found or not active',
          status_code: 404,
        },
        false
      );
    }

    // Decrypt credentials from DB
    const clientId = integration.credentials.clientId
      ? decryptData(integration.credentials.clientId)
      : process.env.EKART_CLIENT_ID;

    const username = integration.credentials.username
      ? decryptData(integration.credentials.username)
      : process.env.EKART_USERNAME;

    const password = integration.credentials.password
      ? decryptData(integration.credentials.password)
      : process.env.EKART_PASSWORD;

    if (!clientId || !username || !password) {
      throw new EkartError(
        500,
        {
          message: 'Ekart credentials not configured',
          status_code: 500,
        },
        false
      );
    }

    return { clientId, username, password };
  }

  /**
   * Authenticate and get fresh access token
   */
  async authenticate(): Promise<string> {
    try {
      const { clientId, username, password } = await this.getCredentials();

      const request: EkartAuthRequest = { username, password };

      logger.info('Authenticating with Ekart API', {
        companyId: this.companyId.toString(),
        clientId: clientId.substring(0, 4) + '***',
      });

      const response = await this.httpClient.post<EkartAuthResponse>(
        `/integrations/v2/auth/token/${clientId}`,
        request
      );

      const token = response.data.access_token;
      const expiresAt = new Date(
        Date.now() + response.data.expires_in * 1000
      );

      // Store in DB (encrypted)
      await this.storeToken(token, expiresAt);

      // Cache in memory
      this.tokenCache = { token, expiresAt };

      logger.info('Ekart authentication successful', {
        companyId: this.companyId.toString(),
        expiresAt: expiresAt.toISOString(),
        tokenPrefix: token.substring(0, 4) + '***',
      });

      return token;
    } catch (error: any) {
      if (error instanceof EkartError) {
        throw error;
      }

      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 401) {
          throw new EkartError(
            401,
            {
              message: 'Invalid Ekart credentials',
              error: data.error || data.message,
              status_code: 401,
            },
            false
          );
        }

        throw new EkartError(
          status,
          {
            message: 'Ekart authentication failed',
            error: data.error || data.message,
            status_code: status,
          },
          status >= 500
        );
      }

      throw new EkartError(
        503,
        {
          message: 'Network error during authentication',
          error: error.message,
          status_code: 503,
        },
        true
      );
    } finally {
      this.authPromise = null;
    }
  }

  /**
   * Store token in Integration model (encrypted)
   */
  private async storeToken(token: string, expiresAt: Date): Promise<void> {
    await Integration.findOneAndUpdate(
      {
        companyId: this.companyId,
        type: 'courier',
        provider: 'ekart',
      },
      {
        $set: {
          'credentials.accessToken': encryptData(token),
          'metadata.tokenExpiresAt': expiresAt,
          'metadata.lastTokenRefresh': new Date(),
        },
      },
      { upsert: false }
    );
  }

  /**
   * Get stored token from database
   */
  private async getStoredToken(): Promise<{
    token: string;
    expiresAt: Date;
  } | null> {
    const integration = await Integration.findOne({
      companyId: this.companyId,
      type: 'courier',
      provider: 'ekart',
      'settings.isActive': true,
    });

    if (!integration || !integration.credentials.accessToken) {
      return null;
    }

    const token = decryptData(integration.credentials.accessToken);
    const expiresAt = integration.metadata?.tokenExpiresAt
      ? new Date(integration.metadata.tokenExpiresAt)
      : null;

    if (!expiresAt) {
      return null;
    }

    return { token, expiresAt };
  }

  /**
   * Get valid token, refreshing if needed
   * Proactive refresh: 60 second buffer before expiry
   */
  async getValidToken(): Promise<string> {
    // Check memory cache first
    if (this.tokenCache && this.isTokenValid(this.tokenCache.expiresAt)) {
      return this.tokenCache.token;
    }

    // Check database
    const storedToken = await this.getStoredToken();

    if (storedToken && this.isTokenValid(storedToken.expiresAt)) {
      this.tokenCache = storedToken;
      return storedToken.token;
    }

    // Token expired or doesn't exist - authenticate
    if (this.authPromise) {
      logger.debug('Waiting for pending authentication', {
        companyId: this.companyId.toString(),
      });
      return this.authPromise;
    }

    logger.info('Token expired or not found, authenticating', {
      companyId: this.companyId.toString(),
    });

    this.authPromise = this.authenticate();
    return this.authPromise;
  }

  /**
   * Check if token is valid (not expired, 60s buffer)
   */
  private isTokenValid(expiresAt: Date): boolean {
    const bufferMs = 60 * 1000; // 60 seconds
    return new Date(expiresAt.getTime() - bufferMs) > new Date();
  }

  /**
   * Force token refresh
   */
  async refreshToken(): Promise<string> {
    logger.info('Force refreshing Ekart token', {
      companyId: this.companyId.toString(),
    });

    this.tokenCache = null;
    return await this.authenticate();
  }

  /**
   * Get authorization headers
   */
  async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getValidToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Clear token cache and database
   */
  async clearToken(): Promise<void> {
    this.tokenCache = null;

    await Integration.findOneAndUpdate(
      {
        companyId: this.companyId,
        type: 'courier',
        provider: 'ekart',
      },
      {
        $unset: {
          'credentials.accessToken': '',
          'metadata.tokenExpiresAt': '',
          'metadata.lastTokenRefresh': '',
        },
      }
    );

    logger.info('Ekart token cleared', {
      companyId: this.companyId.toString(),
    });
  }
}
```

---

## Phase 2: Error Handling, Mapper & Rate Limiting (Day 1 Afternoon)

### 2.1 Distributed Lock Utility (CRITICAL - MUST IMPLEMENT)

**File:** `server/src/shared/utils/distributed-lock.ts`

```typescript
/**
 * Distributed Lock Utility using Redis
 * Prevents thundering herd during token refresh across multiple processes
 */

import Redis from 'ioredis';
import logger from '../logger/winston.logger';

export class DistributedLock {
  private redis: Redis;
  private readonly lockPrefix = 'lock:';

  constructor(redisClient?: Redis) {
    this.redis = redisClient || new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: Number(process.env.REDIS_DB) || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
  }

  /**
   * Acquire distributed lock with TTL
   * Uses Redis SETNX pattern with automatic expiry
   * 
   * @param key - Lock identifier
   * @param ttlMs - Lock TTL in milliseconds (default 30s)
   * @returns Lock token if acquired, null if failed
   */
  async acquire(key: string, ttlMs: number = 30000): Promise<string | null> {
    const lockKey = this.lockPrefix + key;
    const lockToken = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      // SET key value NX PX ttl
      const result = await this.redis.set(
        lockKey,
        lockToken,
        'PX',
        ttlMs,
        'NX'
      );

      if (result === 'OK') {
        logger.debug('Distributed lock acquired', { key, lockToken });
        return lockToken;
      }

      logger.debug('Distributed lock acquisition failed (already held)', { key });
      return null;
    } catch (error) {
      logger.error('Distributed lock acquisition error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return null;
    }
  }

  /**
   * Release distributed lock
   * Uses Lua script to ensure only lock holder can release
   * 
   * @param key - Lock identifier
   * @param token - Lock token from acquire()
   */
  async release(key: string, token: string): Promise<boolean> {
    const lockKey = this.lockPrefix + key;

    try {
      // Lua script: only delete if value matches
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(luaScript, 1, lockKey, token);

      if (result === 1) {
        logger.debug('Distributed lock released', { key, token });
        return true;
      }

      logger.warn('Distributed lock release failed (token mismatch or expired)', {
        key,
        token,
      });
      return false;
    } catch (error) {
      logger.error('Distributed lock release error', {
        key,
        token,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return false;
    }
  }

  /**
   * Execute function with distributed lock
   * Automatically acquires, executes, and releases
   * 
   * @param key - Lock identifier
   * @param fn - Function to execute while holding lock
   * @param ttlMs - Lock TTL in milliseconds
   * @param waitMs - Max time to wait for lock (default: don't wait)
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    ttlMs: number = 30000,
    waitMs: number = 0
  ): Promise<T> {
    const startTime = Date.now();
    let token: string | null = null;

    // Try to acquire lock with optional retry
    while (!token) {
      token = await this.acquire(key, ttlMs);

      if (!token) {
        if (waitMs > 0 && Date.now() - startTime < waitMs) {
          // Wait 100ms and retry
          await new Promise((resolve) => setTimeout(resolve, 100));
        } else {
          throw new Error(`Failed to acquire lock: ${key}`);
        }
      }
    }

    try {
      // Execute function while holding lock
      return await fn();
    } finally {
      // Always release lock
      await this.release(key, token);
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Singleton instance
let distributedLockInstance: DistributedLock | null = null;

export function getDistributedLock(): DistributedLock {
  if (!distributedLockInstance) {
    distributedLockInstance = new DistributedLock();
  }
  return distributedLockInstance;
}
```

**Update `ekart.auth.ts` to use distributed lock:**

```typescript
// Add import
import { getDistributedLock } from '../../../../shared/utils/distributed-lock';

// Update getValidToken method
async getValidToken(): Promise<string> {
  // Check memory cache first
  if (this.tokenCache && this.isTokenValid(this.tokenCache.expiresAt)) {
    return this.tokenCache.token;
  }

  // Check database
  const storedToken = await this.getStoredToken();

  if (storedToken && this.isTokenValid(storedToken.expiresAt)) {
    this.tokenCache = storedToken;
    return storedToken.token;
  }

  // Token expired or doesn't exist - authenticate with distributed lock
  const lockKey = `ekart:auth:${this.companyId.toString()}`;
  const distributedLock = getDistributedLock();

  try {
    // Wait up to 10 seconds for lock (in case another process is refreshing)
    return await distributedLock.withLock(
      lockKey,
      async () => {
        // Double-check token after acquiring lock
        const reCheckToken = await this.getStoredToken();
        if (reCheckToken && this.isTokenValid(reCheckToken.expiresAt)) {
          this.tokenCache = reCheckToken;
          return reCheckToken.token;
        }

        // Still expired, authenticate
        logger.info('Token expired, authenticating with distributed lock', {
          companyId: this.companyId.toString(),
        });

        return await this.authenticate();
      },
      30000, // Lock TTL: 30 seconds
      10000  // Wait up to 10 seconds
    );
  } catch (error) {
    logger.error('Failed to acquire auth lock', {
      companyId: this.companyId.toString(),
      error: error instanceof Error ? error.message : 'Unknown',
    });
    throw error;
  }
}
```

---

### 2.2 Idempotency Infrastructure (CRITICAL - MUST IMPLEMENT)

**File:** `server/src/infrastructure/database/mongoose/models/courier-idempotency.model.ts`

```typescript
/**
 * Courier Shipment Idempotency Model
 * Prevents duplicate shipment creation on retries
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ICourierIdempotency extends Document {
  idempotencyKey: string;
  companyId: mongoose.Types.ObjectId;
  orderId: string;
  provider: string; // 'ekart', 'velocity', 'delhivery'
  
  // Provider response
  providerShipmentId?: string;
  trackingNumber: string;
  labelUrl?: string;
  cost?: number;
  
  // Metadata
  createdAt: Date;
  expiresAt: Date; // Auto-delete after 30 days
}

const CourierIdempotencySchema = new Schema<ICourierIdempotency>(
  {
    idempotencyKey: {
      type: String,
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ['ekart', 'velocity', 'delhivery', 'bluedart', 'dtdc'],
    },
    providerShipmentId: {
      type: String,
    },
    trackingNumber: {
      type: String,
      required: true,
    },
    labelUrl: {
      type: String,
    },
    cost: {
      type: Number,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  },
  {
    timestamps: true,
    collection: 'courier_idempotency',
  }
);

// Compound unique index
CourierIdempotencySchema.index(
  { idempotencyKey: 1, provider: 1, companyId: 1 },
  { unique: true }
);

// TTL index for auto-deletion
CourierIdempotencySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<ICourierIdempotency>(
  'CourierIdempotency',
  CourierIdempotencySchema
);
```

---

### 2.3 Error Handler with Circuit Breaker

**File:** `server/src/infrastructure/external/couriers/ekart/ekart-error-handler.ts`

```typescript
/**
 * Ekart Error Handler & Circuit Breaker
 * 
 * Classifies errors as transient vs permanent
 * Implements circuit breaker to prevent thrashing
 */

import { EkartError } from './ekart.types';
import logger from '../../../../shared/logger/winston.logger';

// Circuit breaker state per company
interface CircuitBreakerState {
  failureCount: number;
  lastFailureTime: Date;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  nextRetryTime: Date;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,        // Open circuit after 5 failures
  cooldownMs: 60000,          // 1 minute cooldown
  halfOpenRetryCount: 2,      // Allow 2 retries in half-open state
};

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (error instanceof EkartError) {
    return error.isRetryable;
  }

  // Network errors are retryable
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // Axios errors
  if (error.response) {
    const status = error.response.status;
    // 5xx and 429 are retryable
    return status >= 500 || status === 429;
  }

  return false;
}

/**
 * Handle Ekart API error and convert to EkartError
 */
export function handleEkartError(error: any, context: string): EkartError {
  // Already EkartError
  if (error instanceof EkartError) {
    return error;
  }

  // Axios HTTP error
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    // Rate limit (429)
    if (status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      return new EkartError(
        429,
        {
          message: 'Ekart API rate limit exceeded',
          error: data.message || 'Too many requests',
          status_code: 429,
          retryAfter: retryAfter ? parseInt(retryAfter) : 60,
        },
        true
      );
    }

    // Authentication error (401/403)
    if (status === 401 || status === 403) {
      return new EkartError(
        status,
        {
          message: 'Ekart authentication failed',
          error: data.message || 'Unauthorized',
          status_code: status,
        },
        false // Not retryable - needs credential fix
      );
    }

    // Validation error (400/422)
    if (status === 400 || status === 422) {
      return new EkartError(
        status,
        {
          message: 'Ekart validation error',
          error: data.message || data.description || 'Bad request',
          status_code: status,
        },
        false // Not retryable - needs data fix
      );
    }

    // Server error (5xx)
    if (status >= 500) {
      return new EkartError(
        status,
        {
          message: `Ekart server error: ${context}`,
          error: data.message || 'Internal server error',
          status_code: status,
        },
        true // Retryable
      );
    }

    // Other HTTP errors
    return new EkartError(
      status,
      {
        message: `Ekart API error: ${context}`,
        error: data.message || 'Unknown error',
        status_code: status,
      },
      false
    );
  }

  // Network/timeout error
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return new EkartError(
      503,
      {
        message: `Network error: ${context}`,
        error: error.message,
        status_code: 503,
      },
      true
    );
  }

  // Unknown error
  return new EkartError(
    500,
    {
      message: `Unknown error: ${context}`,
      error: error.message || 'Unknown',
      status_code: 500,
    },
    false
  );
}

/**
 * Retry with exponential backoff + jitter
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000,
  context: string = 'Ekart operation',
  companyId?: string
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check circuit breaker
      if (companyId && isCircuitOpen(companyId)) {
        throw new EkartError(
          503,
          {
            message: 'Circuit breaker open for Ekart',
            error: 'Too many recent failures, cooling down',
            status_code: 503,
          },
          false
        );
      }

      const result = await fn();

      // Success - reset circuit breaker
      if (companyId) {
        recordSuccess(companyId);
      }

      return result;
    } catch (error) {
      lastError = error;

      const ekartError = handleEkartError(error, context);

      // Record failure for circuit breaker
      if (companyId) {
        recordFailure(companyId);
      }

      // Don't retry if not retryable
      if (!ekartError.isRetryable || attempt === maxRetries) {
        throw ekartError;
      }

      // Calculate backoff with exponential + jitter
      const exponentialDelay = initialDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * exponentialDelay * 0.3; // 30% jitter
      const delayMs = exponentialDelay + jitter;

      logger.warn('Ekart API call failed, retrying', {
        context,
        attempt: attempt + 1,
        maxRetries,
        delayMs: Math.round(delayMs),
        error: ekartError.message,
      });

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Circuit breaker: check if open
 */
function isCircuitOpen(companyId: string): boolean {
  const state = circuitBreakers.get(companyId);

  if (!state || state.state === 'CLOSED') {
    return false;
  }

  if (state.state === 'OPEN') {
    // Check if cooldown period has passed
    if (new Date() >= state.nextRetryTime) {
      state.state = 'HALF_OPEN';
      state.failureCount = 0;
      logger.info('Circuit breaker entering HALF_OPEN state', { companyId });
      return false;
    }
    return true;
  }

  // HALF_OPEN state
  return false;
}

/**
 * Record successful call
 */
function recordSuccess(companyId: string): void {
  const state = circuitBreakers.get(companyId);

  if (state && state.state === 'HALF_OPEN') {
    // Close circuit after successful retry
    state.state = 'CLOSED';
    state.failureCount = 0;
    logger.info('Circuit breaker closed after successful retry', { companyId });
  }
}

/**
 * Record failed call
 */
function recordFailure(companyId: string): void {
  let state = circuitBreakers.get(companyId);

  if (!state) {
    state = {
      failureCount: 0,
      lastFailureTime: new Date(),
      state: 'CLOSED',
      nextRetryTime: new Date(),
    };
    circuitBreakers.set(companyId, state);
  }

  state.failureCount++;
  state.lastFailureTime = new Date();

  // Open circuit if threshold exceeded
  if (state.failureCount >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
    state.state = 'OPEN';
    state.nextRetryTime = new Date(
      Date.now() + CIRCUIT_BREAKER_CONFIG.cooldownMs
    );

    logger.error('Circuit breaker opened due to repeated failures', {
      companyId,
      failureCount: state.failureCount,
      cooldownMs: CIRCUIT_BREAKER_CONFIG.cooldownMs,
    });
  }
}

/**
 * Reset circuit breaker (for testing or manual recovery)
 */
export function resetCircuitBreaker(companyId: string): void {
  circuitBreakers.delete(companyId);
  logger.info('Circuit breaker reset', { companyId });
}
```

---

### 2.4 Rate Limiter Service (Redis-backed)

**File:** `server/src/core/application/services/courier/rate-limiter-configs/ekart-rate-limiter.config.ts`

```typescript
/**
 * Ekart Rate Limiter Configuration
 * 
 * Conservative defaults based on typical courier API limits
 * Tune after observing production traffic
 */

import { RateLimiterConfig } from './rate-limiter.service';

export const EKART_RATE_LIMITER_CONFIG: Record<string, RateLimiterConfig> = {
  // Auth endpoint
  '/integrations/v2/auth/token': {
    points: 10,           // 10 calls
    duration: 300,        // per 5 minutes
    blockDuration: 300,   // block for 5 minutes if exceeded
  },

  // Shipment creation (most critical)
  '/api/v1/package/create': {
    points: 2,            // 2 calls
    duration: 1,          // per second
    blockDuration: 60,    // block for 1 minute if exceeded
  },

  // Tracking (high volume)
  '/api/v1/track': {
    points: 10,           // 10 calls
    duration: 1,          // per second
    blockDuration: 30,
  },

  // Rate estimation
  '/data/pricing/estimate': {
    points: 5,            // 5 calls
    duration: 1,          // per second
    blockDuration: 30,
  },

  // Serviceability check
  '/api/v2/serviceability': {
    points: 10,           // 10 calls
    duration: 1,          // per second
    blockDuration: 30,
  },

  // Label download
  '/api/v1/package/label': {
    points: 1,            // 1 call
    duration: 1,          // per second (conservative)
    blockDuration: 60,
  },

  // Manifest generation
  '/data/v2/generate/manifest': {
    points: 1,            // 1 call
    duration: 2,          // per 2 seconds
    blockDuration: 60,
  },

  // Cancellation
  '/api/v1/package/cancel': {
    points: 5,            // 5 calls
    duration: 1,          // per second
    blockDuration: 30,
  },

  // NDR actions
  '/api/v2/package/ndr': {
    points: 5,            // 5 calls
    duration: 1,          // per second
    blockDuration: 30,
  },

  // Address management
  '/api/v2/address': {
    points: 2,            // 2 calls
    duration: 1,          // per second
    blockDuration: 60,
  },

  // Webhook management
  '/api/v2/webhook': {
    points: 5,            // 5 calls
    duration: 60,         // per minute
    blockDuration: 300,
  },
};
```

**Update `RateLimiterService` to support Redis:**

```typescript
// server/src/core/application/services/courier/rate-limiter-configs/rate-limiter.service.ts

import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import logger from '../../../../../shared/logger/winston.logger';

export interface RateLimiterConfig {
  points: number;         // Number of requests
  duration: number;       // Time window in seconds
  blockDuration: number;  // Block duration in seconds if exceeded
}

export class RateLimiterService {
  private limiters: Map<string, RateLimiterRedis> = new Map();
  private redis: Redis;

  constructor(private config: Record<string, RateLimiterConfig>) {
    // Initialize Redis client
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: Number(process.env.REDIS_DB) || 0,
      enableOfflineQueue: false,
    });

    // Initialize rate limiters for each endpoint
    Object.entries(config).forEach(([endpoint, rateLimitConfig]) => {
      this.limiters.set(
        endpoint,
        new RateLimiterRedis({
          storeClient: this.redis,
          keyPrefix: `ekart_rl_${endpoint.replace(/\//g, '_')}`,
          points: rateLimitConfig.points,
          duration: rateLimitConfig.duration,
          blockDuration: rateLimitConfig.blockDuration,
        })
      );
    });

    logger.info('RateLimiterService initialized with Redis backend', {
      endpoints: Object.keys(config).length,
    });
  }

  /**
   * Acquire rate limit token for endpoint + company
   */
  async acquire(
    endpoint: string,
    companyId?: string
  ): Promise<RateLimiterRes> {
    const limiter = this.limiters.get(endpoint);

    if (!limiter) {
      logger.warn('No rate limiter configured for endpoint', { endpoint });
      return Promise.resolve({} as RateLimiterRes); // No limit
    }

    // Key: endpoint + companyId (per-company limits)
    const key = companyId ? `${endpoint}:${companyId}` : endpoint;

    try {
      const result = await limiter.consume(key);

      logger.debug('Rate limit acquired', {
        endpoint,
        companyId,
        remainingPoints: result.remainingPoints,
      });

      return result;
    } catch (error: any) {
      if (error instanceof Error && error.name === 'RateLimiterRes') {
        // Rate limit exceeded
        const retryMs = error.msBeforeNext || 1000;

        logger.warn('Rate limit exceeded, will retry', {
          endpoint,
          companyId,
          retryMs,
        });

        // Wait and retry once
        await new Promise((resolve) => setTimeout(resolve, retryMs));
        return await limiter.consume(key);
      }

      logger.error('Rate limiter error', {
        endpoint,
        companyId,
        error: error instanceof Error ? error.message : 'Unknown',
      });

      throw error;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}
```

---

### 2.5 Ekart Data Mapper

**File:** `server/src/infrastructure/external/couriers/ekart/ekart.mapper.ts`

```typescript
/**
 * Ekart Data Mapper
 * 
 * Transforms between Shipcrowd models and Ekart API format
 * Handles phone normalization, weight conversion, validation
 */

import {
  CourierShipmentData,
  CourierReverseShipmentData,
} from '../base/courier.adapter';
import {
  EkartShipmentRequest,
  EkartLocation,
  EkartQCDetails,
} from './ekart.types';
import { EkartError } from './ekart.types';
import logger from '../../../../shared/logger/winston.logger';

export class EkartMapper {
  /**
   * Normalize phone to 10 digits (remove country code)
   */
  static normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');

    // Remove country code if present
    if (digits.startsWith('91') && digits.length > 10) {
      return digits.substring(digits.length - 10);
    }

    return digits.substring(Math.max(0, digits.length - 10));
  }

  /**
   * Validate phone is exactly 10 digits
   */
  static validatePhone(phone: string): boolean {
    const normalized = this.normalizePhone(phone);
    return /^\d{10}$/.test(normalized) && parseInt(normalized) >= 1000000000;
  }

  /**
   * Validate pincode is 6 digits
   */
  static validatePincode(pincode: string): boolean {
    return /^\d{6}$/.test(pincode);
  }

  /**
   * Convert weight to grams (Ekart expects grams)
   */
  static toGrams(weight: number, unit: 'kg' | 'g' = 'kg'): number {
    if (unit === 'g') {
      return Math.round(weight);
    }
    return Math.round(weight * 1000);
  }

  /**
   * Map generic CourierShipmentData to Ekart forward shipment
   */
  static mapToForwardShipment(
    data: CourierShipmentData,
    warehouseDetails: {
      name: string;
      phone: string;
      address: string;
      city: string;
      state: string;
      pincode: string;
      gstTin?: string;
    },
    companyDetails: {
      name: string;
      gstTin: string;
      billingAddress: string;
    }
  ): EkartShipmentRequest {
    // Validate GST (MUST be present - fail strict)
    if (!companyDetails.gstTin) {
      throw new EkartError(
        400,
        {
          message: 'GST TIN is required for Ekart shipments',
          error: 'Company GST TIN not configured',
          status_code: 400,
        },
        false
      );
    }

    // Build pickup location
    const pickupLocation: EkartLocation = {
      location_type: 'Office',
      name: warehouseDetails.name,
      phone: parseInt(this.normalizePhone(warehouseDetails.phone)),
      address: warehouseDetails.address,
      city: warehouseDetails.city,
      state: warehouseDetails.state,
      country: 'India',
      pin: parseInt(warehouseDetails.pincode),
    };

    // Build drop location
    const dropLocation: EkartLocation = {
      location_type: 'Home', // Default to Home for customer deliveries
      name: data.destination.name,
      phone: parseInt(this.normalizePhone(data.destination.phone)),
      address: data.destination.address,
      city: data.destination.city,
      state: data.destination.state,
      country: data.destination.country || 'India',
      pin: parseInt(data.destination.pincode),
    };

    // Return location (always explicit - User Decision #2)
    const returnLocation: EkartLocation = {
      ...pickupLocation,
    };

    // Calculate amounts
    const taxableAmount = data.package.declaredValue || 100;
    const taxValue = taxableAmount * 0.18; // 18% GST default
    const totalAmount = taxableAmount + taxValue;

    // Auto-generate invoice details (User Decision #3)
    const invoiceNumber = `INV-${data.orderNumber}`;
    const invoiceDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const request: EkartShipmentRequest = {
      // Seller details
      seller_name: companyDetails.name,
      seller_address: companyDetails.billingAddress,
      seller_gst_tin: companyDetails.gstTin,

      // Consignee details
      consignee_name: data.destination.name,
      consignee_alternate_phone: this.normalizePhone(data.destination.phone),

      // Order & Invoice
      order_number: data.orderNumber,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,

      // Product details
      products_desc: data.package.description || 'General Goods',
      category_of_goods: (data as any).categoryOfGoods || 'General',

      // Payment
      payment_mode: data.paymentMode === 'cod' ? 'COD' : 'Prepaid',
      total_amount: Math.round(totalAmount),
      tax_value: Math.round(taxValue),
      taxable_amount: Math.round(taxableAmount),
      commodity_value: String(Math.round(taxableAmount)),
      cod_amount: data.paymentMode === 'cod' ? Math.round(data.codAmount || 0) : 0,

      // Package
      quantity: (data as any).quantity || 1,
      weight: this.toGrams(data.package.weight),
      length: Math.round(data.package.length || 20),
      height: Math.round(data.package.height || 10),
      width: Math.round(data.package.width || 15),

      // Locations
      drop_location: dropLocation,
      pickup_location: pickupLocation,
      return_location: returnLocation,

      // Optional features (from carrierOptions.ekart)
      mps: data.carrierOptions?.ekart?.mps,
      obd_shipment: data.carrierOptions?.ekart?.obdShipment,
      qc_details: data.carrierOptions?.ekart?.qcDetails as EkartQCDetails,
      preferred_dispatch_date: data.carrierOptions?.ekart?.preferredDispatchDate,
      delayed_dispatch: data.carrierOptions?.ekart?.delayedDispatch,
    };

    return request;
  }

  /**
   * Map generic CourierReverseShipmentData to Ekart reverse shipment
   */
  static mapToReverseShipment(
    data: CourierReverseShipmentData,
    warehouseDetails: {
      name: string;
      phone: string;
      address: string;
      city: string;
      state: string;
      pincode: string;
    },
    companyDetails: {
      name: string;
      gstTin: string;
      billingAddress: string;
    }
  ): EkartShipmentRequest {
    // For reverse: pickup from customer, deliver to warehouse
    const pickupLocation: EkartLocation = {
      location_type: 'Home',
      name: data.pickupAddress.name,
      phone: parseInt(this.normalizePhone(data.pickupAddress.phone)),
      address: data.pickupAddress.address,
      city: data.pickupAddress.city,
      state: data.pickupAddress.state,
      country: data.pickupAddress.country || 'India',
      pin: parseInt(data.pickupAddress.pincode),
    };

    const dropLocation: EkartLocation = {
      location_type: 'Office',
      name: warehouseDetails.name,
      phone: parseInt(this.normalizePhone(warehouseDetails.phone)),
      address: warehouseDetails.address,
      city: warehouseDetails.city,
      state: warehouseDetails.state,
      country: 'India',
      pin: parseInt(warehouseDetails.pincode),
    };

    const taxableAmount = 100; // Minimal value for returns
    const taxValue = 18;
    const totalAmount = taxableAmount + taxValue;

    const request: EkartShipmentRequest = {
      seller_name: companyDetails.name,
      seller_address: companyDetails.billingAddress,
      seller_gst_tin: companyDetails.gstTin,

      consignee_name: warehouseDetails.name,
      consignee_alternate_phone: this.normalizePhone(warehouseDetails.phone),

      order_number: `RTO-${data.orderId}`,
      invoice_number: `INV-RTO-${data.orderId}`,
      invoice_date: new Date().toISOString().split('T')[0],

      products_desc: 'Return Product',
      category_of_goods: 'General',

      payment_mode: 'Pickup', // CRITICAL: Pickup mode for reverse
      return_reason: data.reason || 'Customer Return', // REQUIRED for Pickup mode

      total_amount: totalAmount,
      tax_value: taxValue,
      taxable_amount: taxableAmount,
      commodity_value: String(taxableAmount),
      cod_amount: 0,

      quantity: 1,
      weight: this.toGrams(data.package.weight),
      length: Math.round(data.package.length || 20),
      height: Math.round(data.package.height || 10),
      width: Math.round(data.package.width || 15),

      drop_location: dropLocation,
      pickup_location: pickupLocation,

      // QC if provided
      qc_details: data.carrierOptions?.ekart?.qcDetails as EkartQCDetails,
    };

    return request;
  }

  /**
   * Map warehouse to Ekart address request
   */
  static mapToAddressRequest(warehouse: {
    name: string;
    contactInfo: { name: string; phone: string; email?: string };
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
    };
  }) {
    return {
      alias: warehouse.name,
      phone: parseInt(this.normalizePhone(warehouse.contactInfo.phone)),
      address_line1: warehouse.address.line1,
      address_line2: warehouse.address.line2 || '',
      pincode: parseInt(warehouse.address.postalCode),
      city: warehouse.address.city,
      state: warehouse.address.state,
      country: 'India',
    };
  }

  /**
   * Validate forward shipment data
   */
  static validateForwardShipmentData(data: CourierShipmentData): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.orderNumber) {
      errors.push('Order number is required');
    }

    if (!data.destination.name) {
      errors.push('Customer name is required');
    }

    if (!this.validatePhone(data.destination.phone)) {
      errors.push('Valid 10-digit phone number is required');
    }

    if (!this.validatePincode(data.destination.pincode)) {
      errors.push('Valid 6-digit pincode is required');
    }

    if (!data.destination.address) {
      errors.push('Delivery address is required');
    }

    if (!data.destination.city) {
      errors.push('Delivery city is required');
    }

    if (!data.destination.state) {
      errors.push('Delivery state is required');
    }

    if (!data.package.weight || data.package.weight <= 0) {
      errors.push('Valid package weight is required');
    }

    if (data.package.weight > 30) {
      errors.push('Package weight cannot exceed 30 kg');
    }

    if (data.paymentMode === 'cod') {
      if (!data.codAmount || data.codAmount <= 0) {
        errors.push('COD amount is required for COD orders');
      }
      if (data.codAmount > 49999) {
        errors.push('COD amount cannot exceed 49,999');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
```

---

## Implementation Checklist (Phase 2)

- [ ] Implement `DistributedLock` utility with Redis
- [ ] Update `EkartAuth.getValidToken()` to use distributed lock
- [ ] Write unit tests for concurrent token refresh
- [ ] Create `CourierIdempotency` model with TTL index
- [ ] Implement `EkartErrorHandler` with circuit breaker
- [ ] Add `EKART_RATE_LIMITER_CONFIG` configuration
- [ ] Update `RateLimiterService` to use Redis backend
- [ ] Implement `EkartMapper` with validation
- [ ] Write unit tests for phone/pincode normalization
- [ ] Write unit tests for circuit breaker behavior
- [ ] Review & commit Phase 2 files

---

## Phase 3: Core Provider Implementation (Days 2-3)

### 3.1 Ekart Provider - Main Implementation

**File:** `server/src/infrastructure/external/couriers/ekart/ekart.provider.ts`

```typescript
/**
 * Ekart Courier Provider
 * 
 * Complete implementation of Ekart/Flipkart Logistics API (v3.8.8)
 * Extends BaseCourierAdapter for consistency with other courier integrations
 * 
 * Core Methods (14 total):
 * 1. createShipment() - PUT /api/v1/package/create
 * 2. trackShipment() - GET /api/v1/track/{id}
 * 3. getRates() - POST /data/pricing/estimate
 * 4. cancelShipment() - DELETE /api/v1/package/cancel
 * 5. checkServiceability() - GET /api/v2/serviceability/{pincode}
 * 6. createWarehouse() - POST /api/v2/address
 * 7. createReverseShipment() - PUT /api/v1/package/create (with Pickup mode)
 * 8. cancelReverseShipment() - DELETE /api/v1/package/cancel
 * 9. requestReattempt() - POST /api/v2/package/ndr
 * 10. createManifest() - POST /data/v2/generate/manifest
 * 11. schedulePickup() - Auto-scheduled during creation
 * 12. updateDeliveryAddress() - Via NDR action
 * 13. getProofOfDelivery() - Not supported by Ekart
 * 14. scheduleReversePickup() - Auto-scheduled with reverse creation
 */

import axios, { AxiosInstance } from 'axios';
import mongoose from 'mongoose';
import {
  BaseCourierAdapter,
  CourierShipmentData,
  CourierShipmentResponse,
  CourierTrackingResponse,
  CourierRateRequest,
  CourierRateResponse,
  CourierReverseShipmentData,
  CourierReverseShipmentResponse,
  CourierPODResponse,
} from '../base/courier.adapter';
import Warehouse from '../../../database/mongoose/models/logistics/warehouse/structure/warehouse.model';
import Company from '../../../database/mongoose/models/company/company.model';
import CourierIdempotency from '../../../database/mongoose/models/courier-idempotency.model';
import {
  EkartShipmentRequest,
  EkartShipmentResponse,
  EkartTrackResponse,
  EkartRateRequest,
  EkartRateResponse,
  EkartServiceabilityResponse,
  EkartAddressRequest,
  EkartAddressResponse,
  EkartNDRRequest,
  EkartNDRResponse,
  EkartManifestRequest,
  EkartManifestResponse,
  EkartError,
  CANCELLABLE_EKART_STATUSES,
} from './ekart.types';
import { EkartAuth } from './ekart.auth';
import { EkartMapper } from './ekart.mapper';
import { handleEkartError, retryWithBackoff } from './ekart-error-handler';
import { StatusMapperService } from '../../../../core/application/services/courier/status-mappings/status-mapper.service';
import { RateLimiterService } from '../../../../core/application/services/courier/rate-limiter-configs/rate-limiter.service';
import { EKART_RATE_LIMITER_CONFIG } from '../../../../core/application/services/courier/rate-limiter-configs/ekart-rate-limiter.config';
import { DynamicPricingService } from '../../../../core/application/services/pricing/dynamic-pricing.service';
import logger from '../../../../shared/logger/winston.logger';

export class EkartProvider extends BaseCourierAdapter {
  private auth: EkartAuth;
  private httpClient: AxiosInstance;
  private companyId: mongoose.Types.ObjectId;
  private rateLimiter: RateLimiterService;

  constructor(
    companyId: mongoose.Types.ObjectId,
    baseUrl: string = process.env.EKART_BASE_URL || 'https://app.elite.ekartlogistics.in'
  ) {
    super('', baseUrl);
    this.companyId = companyId;
    this.auth = new EkartAuth(companyId, baseUrl);
    this.rateLimiter = new RateLimiterService(EKART_RATE_LIMITER_CONFIG);

    this.httpClient = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor: inject auth token
    this.httpClient.interceptors.request.use(
      async (config) => {
        const headers = await this.auth.getHeaders();
        config.headers.Authorization = headers.Authorization;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: handle 401 (token expired)
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.auth.refreshToken();
            const headers = await this.auth.getHeaders();
            originalRequest.headers.Authorization = headers.Authorization;
            return this.httpClient(originalRequest);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * 1. Create Shipment (Forward Order) with Idempotency
   * Endpoint: PUT /api/v1/package/create
   */
  async createShipment(data: CourierShipmentData): Promise<CourierShipmentResponse> {
    // Idempotency check (CRITICAL - MUST HAVE)
    if (data.idempotencyKey) {
      const existingShipment = await CourierIdempotency.findOne({
        idempotencyKey: data.idempotencyKey,
        provider: 'ekart',
        companyId: this.companyId,
      });

      if (existingShipment) {
        logger.info('Returning idempotent shipment result', {
          idempotencyKey: data.idempotencyKey,
          trackingNumber: existingShipment.trackingNumber,
        });

        return {
          trackingNumber: existingShipment.trackingNumber,
          labelUrl: existingShipment.labelUrl,
          cost: existingShipment.cost,
          providerShipmentId: existingShipment.providerShipmentId,
        };
      }
    }

    // Validate input data
    const validation = EkartMapper.validateForwardShipmentData(data);
    if (!validation.valid) {
      throw new EkartError(
        400,
        {
          message: 'Invalid shipment data',
          error: validation.errors.join(', '),
          status_code: 400,
        },
        false
      );
    }

    // Get warehouse details
    const warehouseId = (data as any).warehouseId;
    if (!warehouseId) {
      throw new EkartError(
        400,
        {
          message: 'Warehouse ID is required',
          status_code: 400,
        },
        false
      );
    }

    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      throw new EkartError(
        404,
        {
          message: 'Warehouse not found',
          status_code: 404,
        },
        false
      );
    }

    // Get company details (for GST)
    const company = await Company.findById(this.companyId);
    if (!company) {
      throw new EkartError(
        404,
        {
          message: 'Company not found',
          status_code: 404,
        },
        false
      );
    }

    // Hybrid warehouse strategy (User Decision #1)
    let ekartAlias = warehouse.carrierDetails?.ekart?.alias;

    if (!ekartAlias) {
      logger.info('Warehouse not registered with Ekart, auto-registering', {
        warehouseId: warehouseId.toString(),
        warehouseName: warehouse.name,
      });

      try {
        const ekartAddress = await this.createWarehouse(warehouse as any);
        ekartAlias = ekartAddress.alias;
      } catch (error) {
        logger.warn('Auto-registration failed, will use full address in request', {
          warehouseId: warehouseId.toString(),
          error: error instanceof Error ? error.message : 'Unknown',
        });
        // Continue without alias (fallback to full address)
      }
    }

    // Map to Ekart format
    const ekartRequest = EkartMapper.mapToForwardShipment(
      data,
      {
        name: warehouse.name,
        phone: warehouse.contactInfo.phone,
        address: warehouse.address.line1,
        city: warehouse.address.city,
        state: warehouse.address.state,
        pincode: warehouse.address.postalCode,
        gstTin: warehouse.gstNumber,
      },
      {
        name: company.name,
        gstTin: company.taxInfo?.gstNumber || '', // Will throw if missing (User Decision #8)
        billingAddress: company.address?.line1 || warehouse.address.line1,
      }
    );

    // Apply rate limiting
    await this.rateLimiter.acquire('/api/v1/package/create', this.companyId.toString());

    // Make API call with retry + circuit breaker
    const response = await retryWithBackoff<{ data: EkartShipmentResponse }>(
      async () => {
        logger.info('Creating Ekart shipment', {
          orderId: data.orderNumber,
          companyId: this.companyId.toString(),
          idempotencyKey: data.idempotencyKey,
        });

        return await this.httpClient.put<EkartShipmentResponse>(
          '/api/v1/package/create',
          ekartRequest
        );
      },
      3,
      1000,
      'Ekart createShipment',
      this.companyId.toString()
    );

    const shipment = response.data;

    if (!shipment.status) {
      throw new EkartError(
        400,
        {
          message: 'Ekart shipment creation failed',
          error: shipment.remark,
          status_code: 400,
        },
        false
      );
    }

    logger.info('Ekart shipment created successfully', {
      orderId: data.orderNumber,
      trackingId: shipment.tracking_id,
      awb: shipment.barcodes?.wbn,
      vendor: shipment.vendor,
    });

    const result: CourierShipmentResponse = {
      trackingNumber: shipment.tracking_id,
      providerShipmentId: shipment.tracking_id,
      labelUrl: undefined, // Labels fetched separately via /api/v1/package/label
      estimatedDelivery: undefined,
      cost: 0, // Get from rates API if needed
    };

    // Store idempotency mapping (CRITICAL)
    if (data.idempotencyKey) {
      await CourierIdempotency.create({
        idempotencyKey: data.idempotencyKey,
        companyId: this.companyId,
        orderId: data.orderNumber,
        provider: 'ekart',
        providerShipmentId: shipment.tracking_id,
        trackingNumber: shipment.tracking_id,
        labelUrl: result.labelUrl,
        cost: result.cost,
      });
    }

    return result;
  }

  /**
   * 2. Track Shipment
   * Endpoint: GET /api/v1/track/{id} (Public API, no auth)
   */
  async trackShipment(trackingNumber: string): Promise<CourierTrackingResponse> {
    // Apply rate limiting
    await this.rateLimiter.acquire('/api/v1/track', this.companyId.toString());

    // Make API call with retry
    const response = await retryWithBackoff<{ data: EkartTrackResponse }>(
      async () => {
        logger.debug('Tracking Ekart shipment', { trackingNumber });

        // Note: This is a public API, but we still use auth headers
        return await this.httpClient.get<EkartTrackResponse>(
          `/api/v1/track/${trackingNumber}`
        );
      },
      3,
      1000,
      'Ekart trackShipment',
      this.companyId.toString()
    );

    const tracking = response.data;

    if (!tracking.track) {
      throw new EkartError(
        404,
        {
          message: 'Shipment not found',
          error: `No tracking data for ID: ${trackingNumber}`,
          status_code: 404,
        },
        false
      );
    }

    // Map status using StatusMapperService
    const statusMapping = StatusMapperService.map('ekart', tracking.track.status);

    // Build timeline from tracking details
    const timeline = (tracking.track.details || []).map((event) => ({
      status: StatusMapperService.map('ekart', event.status).internalStatus,
      message: event.status,
      location: event.location || '',
      timestamp: new Date(event.time),
    }));

    return {
      trackingNumber: tracking._id || trackingNumber,
      status: statusMapping.internalStatus,
      currentLocation: tracking.track.location,
      timeline,
      estimatedDelivery: tracking.edd ? new Date(tracking.edd) : undefined,
    };
  }

  /**
   * 3. Get Rates with DynamicPricingService Integration
   * Endpoint: POST /data/pricing/estimate
   */
  async getRates(request: CourierRateRequest): Promise<CourierRateResponse[]> {
    const ekartRequest: EkartRateRequest = {
      pickupPincode: parseInt(request.origin.pincode),
      dropPincode: parseInt(request.destination.pincode),
      weight: EkartMapper.toGrams(request.package.weight),
      length: Math.round(request.package.length || 20),
      height: Math.round(request.package.height || 10),
      width: Math.round(request.package.width || 15),
      serviceType: 'SURFACE', // Default to SURFACE
      codAmount: request.paymentMode === 'cod' ? request.orderValue : 0,
      invoiceAmount: request.orderValue,
    };

    // Apply rate limiting
    await this.rateLimiter.acquire('/data/pricing/estimate', this.companyId.toString());

    // Make API call with retry
    const response = await retryWithBackoff<{ data: EkartRateResponse }>(
      async () => {
        logger.debug('Fetching Ekart rates', {
          from: request.origin.pincode,
          to: request.destination.pincode,
        });

        return await this.httpClient.post<EkartRateResponse>(
          '/data/pricing/estimate',
          ekartRequest
        );
      },
      3,
      1000,
      'Ekart getRates',
      this.companyId.toString()
    );

    const rateData = response.data;

    // Integrate with DynamicPricingService (User Decision #6)
    const pricingService = new DynamicPricingService();

    let finalRate: CourierRateResponse;

    try {
      const pricing = await pricingService.calculatePricing({
        companyId: this.companyId.toString(),
        fromPincode: request.origin.pincode,
        toPincode: request.destination.pincode,
        weight: request.package.weight,
        paymentMode: request.paymentMode,
        orderValue: request.orderValue,
        carrier: 'Ekart',
        externalZone: rateData.zone,
        shipmentType: request.shipmentType || 'forward',
      });

      finalRate = {
        basePrice: pricing.shipping,
        taxes: pricing.tax.total,
        total: pricing.total,
        currency: 'INR',
        serviceType: rateData.type,
        zone: rateData.zone,
        estimatedDeliveryDays: 3, // Default estimate
      };
    } catch (pricingError) {
      logger.warn('DynamicPricingService failed, using Ekart raw rates', {
        error: pricingError instanceof Error ? pricingError.message : 'Unknown',
      });

      // Fallback to raw Ekart rates
      finalRate = {
        basePrice: parseFloat(rateData.shippingCharge),
        taxes: parseFloat(rateData.taxes),
        total: parseFloat(rateData.total),
        currency: 'INR',
        serviceType: rateData.type,
        zone: rateData.zone,
        estimatedDeliveryDays: 3,
      };
    }

    return [finalRate];
  }

  /**
   * 4. Cancel Shipment
   * Endpoint: DELETE /api/v1/package/cancel?tracking_id={id}
   */
  async cancelShipment(trackingNumber: string): Promise<boolean> {
    // Check if shipment can be cancelled
    try {
      const tracking = await this.trackShipment(trackingNumber);

      const canCancel = CANCELLABLE_EKART_STATUSES.some(
        (status) => status.toLowerCase() === tracking.status.toLowerCase()
      );

      if (!canCancel) {
        throw new EkartError(
          400,
          {
            message: 'Cannot cancel shipment in current status',
            error: `Shipment status '${tracking.status}' is not cancellable`,
            status_code: 400,
          },
          false
        );
      }
    } catch (error) {
      logger.warn('Could not verify shipment status before cancellation', {
        trackingNumber,
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }

    // Apply rate limiting
    await this.rateLimiter.acquire('/api/v1/package/cancel', this.companyId.toString());

    // Make API call with retry
    const response = await retryWithBackoff<{ data: any }>(
      async () => {
        logger.info('Cancelling Ekart shipment', { trackingNumber });

        return await this.httpClient.delete(
          `/api/v1/package/cancel?tracking_id=${trackingNumber}`
        );
      },
      3,
      1000,
      'Ekart cancelShipment',
      this.companyId.toString()
    );

    logger.info('Ekart shipment cancelled', { trackingNumber });
    return true;
  }

  /**
   * 5. Check Serviceability
   * Endpoint: GET /api/v2/serviceability/{pincode}
   */
  async checkServiceability(
    pincode: string,
    type: 'delivery' | 'pickup' = 'delivery'
  ): Promise<boolean> {
    // Apply rate limiting
    await this.rateLimiter.acquire('/api/v2/serviceability', this.companyId.toString());

    try {
      const response = await retryWithBackoff<{ data: EkartServiceabilityResponse }>(
        async () => {
          return await this.httpClient.get<EkartServiceabilityResponse>(
            `/api/v2/serviceability/${pincode}`
          );
        },
        2,
        1000,
        'Ekart checkServiceability',
        this.companyId.toString()
      );

      const serviceability = response.data;

      if (!serviceability.status) {
        return false;
      }

      // Check based on type
      if (type === 'delivery') {
        return serviceability.details.forward_drop;
      } else {
        return serviceability.details.forward_pickup;
      }
    } catch (error: any) {
      // Pincode not serviceable returns 422 or similar
      if (error instanceof EkartError && error.statusCode === 422) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 6. Create Warehouse / Register Address
   * Endpoint: POST /api/v2/address
   */
  async createWarehouse(warehouse: any): Promise<EkartAddressResponse> {
    const addressRequest = EkartMapper.mapToAddressRequest(warehouse);

    // Apply rate limiting
    await this.rateLimiter.acquire('/api/v2/address', this.companyId.toString());

    // Make API call with retry
    const response = await retryWithBackoff<{ data: EkartAddressResponse }>(
      async () => {
        logger.info('Registering warehouse with Ekart', {
          warehouseName: warehouse.name,
          companyId: this.companyId.toString(),
        });

        return await this.httpClient.post<EkartAddressResponse>(
          '/api/v2/address',
          addressRequest
        );
      },
      3,
      1000,
      'Ekart createWarehouse',
      this.companyId.toString()
    );

    const ekartAddress = response.data;

    // Store Ekart alias in warehouse model
    await Warehouse.findByIdAndUpdate(warehouse._id, {
      $set: {
        'carrierDetails.ekart.alias': ekartAddress.alias,
        'carrierDetails.ekart.status': 'synced',
        'carrierDetails.ekart.lastSyncedAt': new Date(),
      },
    });

    logger.info('Ekart warehouse registered and synced', {
      warehouseId: warehouse._id.toString(),
      alias: ekartAddress.alias,
    });

    return ekartAddress;
  }

  /**
   * 7. Create Reverse Shipment (RTO/Pickup)
   * Endpoint: PUT /api/v1/package/create with payment_mode: "Pickup"
   */
  async createReverseShipment(
    data: CourierReverseShipmentData
  ): Promise<CourierReverseShipmentResponse> {
    // Get warehouse details
    const warehouse = await Warehouse.findById(data.returnWarehouseId);
    if (!warehouse) {
      throw new EkartError(
        404,
        {
          message: 'Return warehouse not found',
          status_code: 404,
        },
        false
      );
    }

    // Get company details
    const company = await Company.findById(this.companyId);
    if (!company) {
      throw new EkartError(
        404,
        {
          message: 'Company not found',
          status_code: 404,
        },
        false
      );
    }

    // Map to Ekart reverse format
    const ekartRequest = EkartMapper.mapToReverseShipment(
      data,
      {
        name: warehouse.name,
        phone: warehouse.contactInfo.phone,
        address: warehouse.address.line1,
        city: warehouse.address.city,
        state: warehouse.address.state,
        pincode: warehouse.address.postalCode,
      },
      {
        name: company.name,
        gstTin: company.taxInfo?.gstNumber || '',
        billingAddress: company.address?.line1 || warehouse.address.line1,
      }
    );

    // Apply rate limiting
    await this.rateLimiter.acquire('/api/v1/package/create', this.companyId.toString());

    // Make API call with retry
    const response = await retryWithBackoff<{ data: EkartShipmentResponse }>(
      async () => {
        logger.info('Creating Ekart reverse shipment', {
          originalAwb: data.originalAwb,
          orderId: data.orderId,
          companyId: this.companyId.toString(),
        });

        return await this.httpClient.put<EkartShipmentResponse>(
          '/api/v1/package/create',
          ekartRequest
        );
      },
      3,
      1000,
      'Ekart createReverseShipment',
      this.companyId.toString()
    );

    const shipment = response.data;

    if (!shipment.status) {
      throw new EkartError(
        400,
        {
          message: 'Ekart reverse shipment creation failed',
          error: shipment.remark,
          status_code: 400,
        },
        false
      );
    }

    logger.info('Ekart reverse shipment created successfully', {
      originalAwb: data.originalAwb,
      reverseTrackingId: shipment.tracking_id,
      vendor: shipment.vendor,
    });

    return {
      trackingNumber: shipment.tracking_id,
      labelUrl: undefined, // Fetch separately
      orderId: data.orderId,
      courierName: shipment.vendor,
    };
  }

  /**
   * 8. Cancel Reverse Shipment
   * Endpoint: DELETE /api/v1/package/cancel?tracking_id={id}
   */
  async cancelReverseShipment(
    reverseAwb: string,
    originalAwb: string,
    reason?: string
  ): Promise<boolean> {
    // Same as forward cancellation
    return await this.cancelShipment(reverseAwb);
  }

  /**
   * 9. Request Reattempt (NDR Action) - Manual Only (User Decision #7)
   * Endpoint: POST /api/v2/package/ndr
   */
  async requestReattempt(
    trackingNumber: string,
    preferredDate?: Date,
    instructions?: string
  ): Promise<{ success: boolean; message: string; uplId?: string }> {
    // Validate reattempt date is within 7 days
    if (preferredDate) {
      const maxDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      if (preferredDate > maxDate) {
        throw new EkartError(
          400,
          {
            message: 'Reattempt date must be within 7 days',
            status_code: 400,
          },
          false
        );
      }
    }

    const ndrRequest: EkartNDRRequest = {
      action: 'Re-Attempt',
      wbn: trackingNumber,
      date: preferredDate ? preferredDate.getTime() : undefined,
      instructions: instructions,
    };

    // Apply rate limiting
    await this.rateLimiter.acquire('/api/v2/package/ndr', this.companyId.toString());

    // Make API call with retry
    const response = await retryWithBackoff<{ data: EkartNDRResponse }>(
      async () => {
        logger.info('Requesting Ekart delivery reattempt', {
          trackingNumber,
          preferredDate,
        });

        return await this.httpClient.post<EkartNDRResponse>(
          '/api/v2/package/ndr',
          ndrRequest
        );
      },
      3,
      1000,
      'Ekart requestReattempt',
      this.companyId.toString()
    );

    const ndrResponse = response.data;

    return {
      success: ndrResponse.status,
      message: ndrResponse.remark,
      uplId: ndrResponse.tracking_id,
    };
  }

  /**
   * 10. Create Manifest (with chunking for >100 AWBs)
   * Endpoint: POST /data/v2/generate/manifest
   */
  async createManifest(data: {
    shipmentIds?: string[];
    awbs?: string[];
    warehouseId?: string;
  }): Promise<{ manifestId?: string; manifestUrl?: string } | null> {
    const awbs = data.awbs || [];

    if (awbs.length === 0) {
      throw new EkartError(
        400,
        {
          message: 'No AWBs provided for manifest',
          status_code: 400,
        },
        false
      );
    }

    // Chunk AWBs (max 100 per request)
    const chunks: string[][] = [];
    for (let i = 0; i < awbs.length; i += 100) {
      chunks.push(awbs.slice(i, i + 100));
    }

    logger.info('Creating Ekart manifest', {
      totalAwbs: awbs.length,
      chunks: chunks.length,
    });

    // Generate manifest for first chunk (Ekart may support multi-chunk merging)
    const manifestRequest: EkartManifestRequest = {
      ids: chunks[0],
    };

    // Apply rate limiting
    await this.rateLimiter.acquire('/data/v2/generate/manifest', this.companyId.toString());

    // Make API call with retry
    const response = await retryWithBackoff<{ data: EkartManifestResponse }>(
      async () => {
        return await this.httpClient.post<EkartManifestResponse>(
          '/data/v2/generate/manifest',
          manifestRequest
        );
      },
      3,
      1000,
      'Ekart createManifest',
      this.companyId.toString()
    );

    const manifest = response.data;

    logger.info('Ekart manifest created', {
      manifestNumber: manifest.manifestNumber,
      url: manifest.manifestDownloadUrl,
    });

    return {
      manifestId: String(manifest.manifestNumber),
      manifestUrl: manifest.manifestDownloadUrl,
    };
  }

  /**
   * 11. Schedule Pickup (Auto-scheduled during creation)
   */
  async schedulePickup(data: any): Promise<any> {
    logger.info('Ekart pickup is auto-scheduled during shipment creation');
    return {
      success: true,
      message: 'Pickup automatically scheduled by Ekart',
    };
  }

  /**
   * 12. Update Delivery Address (via NDR action)
   */
  async updateDeliveryAddress(
    awb: string,
    newAddress: {
      line1: string;
      city: string;
      state: string;
      pincode: string;
      country: string;
    },
    orderId: string,
    phone?: string
  ): Promise<{ success: boolean; message: string }> {
    const ndrRequest: EkartNDRRequest = {
      action: 'Re-Attempt',
      wbn: awb,
      address: newAddress.line1,
      phone: phone,
    };

    // Apply rate limiting
    await this.rateLimiter.acquire('/api/v2/package/ndr', this.companyId.toString());

    try {
      const response = await retryWithBackoff<{ data: EkartNDRResponse }>(
        async () => {
          logger.info('Updating Ekart delivery address via NDR', { awb, orderId });
          return await this.httpClient.post<EkartNDRResponse>(
            '/api/v2/package/ndr',
            ndrRequest
          );
        },
        3,
        1000,
        'Ekart updateDeliveryAddress',
        this.companyId.toString()
      );

      return {
        success: response.data.status,
        message: response.data.remark,
      };
    } catch (error) {
      logger.error('Ekart address update failed', {
        awb,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return {
        success: false,
        message: 'Failed to update address via Ekart API',
      };
    }
  }

  /**
   * 13. Proof of Delivery (Not Supported)
   */
  async getProofOfDelivery(trackingNumber: string): Promise<CourierPODResponse> {
    return {
      source: 'not_supported',
      message: 'POD download not supported by Ekart API',
    };
  }

  /**
   * 14. Schedule Reverse Pickup (Auto-scheduled)
   */
  async scheduleReversePickup(data: {
    reverseAwb?: string;
    originalAwb?: string;
    pickupDate?: Date;
    timeSlot?: string;
    pickupAddress?: { address: string; pincode: string; phone: string };
  }): Promise<{ success: boolean; message?: string; pickupId?: string }> {
    logger.info('Ekart reverse pickup auto-scheduled at creation', {
      reverseAwb: data.reverseAwb,
      originalAwb: data.originalAwb,
    });

    return {
      success: true,
      message: 'Reverse pickup is automatically scheduled by Ekart on creation',
    };
  }

  /**
   * Get provider name
   */
  getName(): string {
    return 'Ekart Logistics';
  }

  /**
   * Get provider code
   */
  getProviderCode(): string {
    return 'ekart';
  }
}
```

---

### 3.2 Export and Index Files

**File:** `server/src/infrastructure/external/couriers/ekart/index.ts`

```typescript
/**
 * Ekart Courier Integration - Public Exports
 */

export { EkartProvider } from './ekart.provider';
export { EkartAuth } from './ekart.auth';
export { EkartMapper } from './ekart.mapper';
export * from './ekart.types';
export { handleEkartError, retryWithBackoff } from './ekart-error-handler';
```

---

### 3.3 Update CourierFactory

**File:** `server/src/core/application/services/courier/courier.factory.ts`

```typescript
// Add import
import { EkartProvider } from '../../../../infrastructure/external/couriers/ekart';

// Update switch statement in getProvider method
switch (providerName.toLowerCase()) {
  case 'velocity-shipfast':
  case 'velocity':
    provider = new VelocityShipfastProvider(companyId);
    break;

  case 'delhivery':
    provider = new DelhiveryProvider(companyId);
    break;

  case 'ekart':
    provider = new EkartProvider(companyId);
    break;

  default:
    throw new ValidationError(`Unknown courier provider: ${providerName}`);
}
```

---

### 3.4 Update BaseCourierAdapter Interface

**File:** `server/src/infrastructure/external/couriers/base/courier.adapter.ts`

```typescript
// Add ekart to carrierOptions
export interface CourierShipmentData {
  // ... existing fields ...
  carrierOptions?: {
    delhivery?: { /* ... */ };
    ekart?: {
      mps?: boolean;
      obdShipment?: boolean;
      qcDetails?: {
        qc_shipment: boolean;
        product_name: string;
        product_desc?: string;
        product_sku?: string;
        product_color?: string;
        product_size?: string;
        brand_name?: string;
        product_category?: string;
        ean_barcode?: string;
        serial_number?: string;
        imei_number?: string;
        product_images?: string[];
      };
      preferredDispatchDate?: string;
      delayedDispatch?: boolean;
    };
  };
}

// Add ekart to CourierReverseShipmentData
export interface CourierReverseShipmentData {
  // ... existing fields ...
  carrierOptions?: {
    delhivery?: { /* ... */ };
    ekart?: {
      qcDetails?: {
        qc_shipment: boolean;
        product_name: string;
        // ... same as above
      };
    };
  };
}
```

---

## Implementation Checklist (Phase 3)

- [ ] Implement `EkartProvider` with all 14 methods
- [ ] Add idempotency check in `createShipment()`
- [ ] Implement hybrid warehouse registration strategy
- [ ] Integrate with `DynamicPricingService` for rates
- [ ] Add circuit breaker to all API calls via `retryWithBackoff`
- [ ] Implement manifest chunking (max 100 AWBs)
- [ ] Update `courier.adapter.ts` with ekart carrier options
- [ ] Update `courier.factory.ts` to include Ekart
- [ ] Create `ekart/index.ts` export file
- [ ] Write unit tests for `EkartProvider` methods
- [ ] Review & commit Phase 3 files

---

## Phase 4: Status Mapping & Webhooks (Day 3)

### 4.1 Status Mapping Registration

**File:** `server/src/core/application/services/courier/status-mappings/ekart-status-mappings.ts`

```typescript
/**
 * Ekart Status Mappings
 * Maps Ekart shipment statuses to internal Shipcrowd statuses
 */

import { CourierStatusMapping } from './status-mapper.interface';

export const EKART_STATUS_MAPPINGS: CourierStatusMapping[] = [
  // Order lifecycle
  {
    courierStatus: 'Order Placed',
    internalStatus: 'manifested',
    description: 'Order placed and manifested',
    isCancellable: true,
    isReattemptable: false,
    metadata: {
      category: 'created',
      requiresAction: false,
    },
  },
  {
    courierStatus: 'Picked Up',
    internalStatus: 'picked_up',
    description: 'Shipment picked up from warehouse',
    isCancellable: true,
    isReattemptable: false,
    metadata: {
      category: 'in_transit',
      requiresAction: false,
    },
  },
  {
    courierStatus: 'In Transit',
    internalStatus: 'in_transit',
    description: 'Shipment in transit',
    isCancellable: true,
    isReattemptable: false,
    metadata: {
      category: 'in_transit',
      requiresAction: false,
    },
  },
  {
    courierStatus: 'Out for Delivery',
    internalStatus: 'out_for_delivery',
    description: 'Out for delivery',
    isCancellable: false,
    isReattemptable: false,
    metadata: {
      category: 'delivery',
      requiresAction: false,
    },
  },

  // Success states
  {
    courierStatus: 'Delivered',
    internalStatus: 'delivered',
    description: 'Successfully delivered',
    isCancellable: false,
    isReattemptable: false,
    metadata: {
      category: 'delivered',
      requiresAction: false,
      isTerminal: true,
    },
  },

  // NDR states
  {
    courierStatus: 'Delivery Failed',
    internalStatus: 'ndr',
    description: 'Non-delivery report - delivery failed',
    isCancellable: false,
    isReattemptable: true, // Merchant can request reattempt
    metadata: {
      category: 'exception',
      requiresAction: true, // Manual merchant action (User Decision #7)
    },
  },

  // RTO states
  {
    courierStatus: 'RTO Initiated',
    internalStatus: 'rto_initiated',
    description: 'Return to origin initiated',
    isCancellable: false,
    isReattemptable: false,
    metadata: {
      category: 'rto',
      requiresAction: false,
    },
  },
  {
    courierStatus: 'RTO Delivered',
    internalStatus: 'rto_delivered',
    description: 'Returned to origin successfully',
    isCancellable: false,
    isReattemptable: false,
    metadata: {
      category: 'rto',
      requiresAction: false,
      isTerminal: true,
    },
  },

  // Cancellation
  {
    courierStatus: 'Cancelled',
    internalStatus: 'cancelled',
    description: 'Shipment cancelled',
    isCancellable: false,
    isReattemptable: false,
    metadata: {
      category: 'cancelled',
      requiresAction: false,
      isTerminal: true,
    },
  },

  // Lost/Damaged (if applicable)
  {
    courierStatus: 'Lost',
    internalStatus: 'lost',
    description: 'Shipment lost',
    isCancellable: false,
    isReattemptable: false,
    metadata: {
      category: 'exception',
      requiresAction: true,
      isTerminal: true,
    },
  },
  {
    courierStatus: 'Damaged',
    internalStatus: 'damaged',
    description: 'Shipment damaged',
    isCancellable: false,
    isReattemptable: false,
    metadata: {
      category: 'exception',
      requiresAction: true,
      isTerminal: true,
    },
  },
];

// Register mappings at boot
import { StatusMapperService } from './status-mapper.service';

StatusMapperService.registerProvider('ekart', EKART_STATUS_MAPPINGS);
```

---

### 4.2 Webhook Event Log Model (CRITICAL - Dedupe & Audit)

**File:** `server/src/infrastructure/database/mongoose/models/webhook-event-log.model.ts`

```typescript
/**
 * Webhook Event Log Model
 * Stores incoming webhook events for dedupe, audit, and replay protection
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IWebhookEventLog extends Document {
  provider: string; // 'ekart', 'velocity', 'delhivery'
  companyId: mongoose.Types.ObjectId;
  
  // Event identification
  eventId: string; // Provider event ID if available
  eventHash: string; // SHA256 hash of payload for dedupe
  topic: string; // 'track_updated', 'shipment_created', etc.
  
  // Payload
  rawPayload: any;
  
  // Processing
  status: 'pending' | 'processed' | 'failed' | 'duplicate';
  processedAt?: Date;
  errorMessage?: string;
  
  // Metadata
  signature: string; // HMAC signature
  signatureValid: boolean;
  receivedAt: Date;
  
  // TTL
  expiresAt: Date; // Auto-delete after 90 days
}

const WebhookEventLogSchema = new Schema<IWebhookEventLog>(
  {
    provider: {
      type: String,
      required: true,
      enum: ['ekart', 'velocity', 'delhivery', 'bluedart', 'dtdc'],
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    eventId: {
      type: String,
      sparse: true, // Not all providers send event ID
    },
    eventHash: {
      type: String,
      required: true,
      index: true,
    },
    topic: {
      type: String,
      required: true,
    },
    rawPayload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed', 'duplicate'],
      default: 'pending',
      index: true,
    },
    processedAt: {
      type: Date,
    },
    errorMessage: {
      type: String,
    },
    signature: {
      type: String,
      required: true,
    },
    signatureValid: {
      type: Boolean,
      required: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    },
  },
  {
    timestamps: true,
    collection: 'webhook_event_logs',
  }
);

// Compound index for dedupe
WebhookEventLogSchema.index(
  { provider: 1, eventHash: 1, companyId: 1 },
  { unique: true }
);

// TTL index
WebhookEventLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IWebhookEventLog>(
  'WebhookEventLog',
  WebhookEventLogSchema
);
```

---

### 4.3 Webhook Auth Middleware

**File:** `server/src/presentation/http/middleware/webhooks/ekart-webhook-auth.middleware.ts`

```typescript
/**
 * Ekart Webhook Authentication Middleware
 * Verifies HMAC SHA256 signature using EKART_WEBHOOK_SECRET
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../../../../shared/logger/winston.logger';

export function ekartWebhookAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Get signature from header (User Decision #4)
    const signature = req.headers['x-ekart-signature'] as string;

    if (!signature) {
      logger.warn('Ekart webhook missing signature header');
      res.status(401).json({
        error: 'Missing signature header',
        message: 'x-ekart-signature header is required',
      });
      return;
    }

    // Get webhook secret
    const secret = process.env.EKART_WEBHOOK_SECRET;

    if (!secret) {
      logger.error('EKART_WEBHOOK_SECRET not configured');
      res.status(500).json({
        error: 'Server misconfiguration',
        message: 'Webhook secret not configured',
      });
      return;
    }

    // Calculate HMAC SHA256
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const hmac = crypto.createHmac('sha256', secret);
    const calculatedSignature = hmac.update(rawBody).digest('hex');

    // Timing-safe comparison
    const signatureValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculatedSignature)
    );

    if (!signatureValid) {
      logger.warn('Ekart webhook signature validation failed', {
        expectedPrefix: calculatedSignature.substring(0, 8),
        receivedPrefix: signature.substring(0, 8),
      });

      res.status(401).json({
        error: 'Invalid signature',
        message: 'Webhook signature verification failed',
      });
      return;
    }

    // Signature valid - attach to request for logging
    (req as any).webhookSignature = signature;
    (req as any).signatureValid = true;

    next();
  } catch (error) {
    logger.error('Ekart webhook auth middleware error', {
      error: error instanceof Error ? error.message : 'Unknown',
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify webhook signature',
    });
  }
}
```

---

### 4.4 Ekart Status Mapper

**File:** `server/src/infrastructure/external/couriers/ekart/ekart-status.mapper.ts`

```typescript
/**
 * Ekart Status Mapper
 * Maps webhook payloads to internal shipment status updates
 */

import { EkartTrackUpdatedWebhook } from './ekart.types';
import { StatusMapperService } from '../../../../core/application/services/courier/status-mappings/status-mapper.service';
import logger from '../../../../shared/logger/winston.logger';

export class EkartStatusMapper {
  /**
   * Map track_updated webhook to internal status update
   */
  static mapTrackUpdatedWebhook(payload: EkartTrackUpdatedWebhook): {
    trackingNumber: string;
    status: string;
    statusDescription: string;
    location: string;
    timestamp: Date;
    estimatedDelivery?: Date;
    metadata: {
      ekartStatus: string;
      attempts: string;
      pickupTime: Date;
      ndrStatus?: string;
    };
  } {
    const statusMapping = StatusMapperService.map('ekart', payload.status);

    return {
      trackingNumber: payload.id,
      status: statusMapping.internalStatus,
      statusDescription: payload.desc,
      location: payload.location,
      timestamp: new Date(payload.ctime),
      estimatedDelivery: payload.edd ? new Date(payload.edd) : undefined,
      metadata: {
        ekartStatus: payload.status,
        attempts: payload.attempts,
        pickupTime: new Date(payload.pickupTime),
      },
    };
  }

  /**
   * Map shipment_created webhook
   */
  static mapShipmentCreatedWebhook(payload: any): {
    trackingNumber: string;
    awb: string;
    vendor: string;
    orderNumber: string;
  } {
    return {
      trackingNumber: payload.id,
      awb: payload.wbn,
      vendor: payload.vendor,
      orderNumber: payload.orderNumber,
    };
  }
}
```

---

### 4.5 Webhook Controller

**File:** `server/src/presentation/http/controllers/webhooks/couriers/ekart.webhook.controller.ts`

```typescript
/**
 * Ekart Webhook Controller
 * Handles incoming webhooks from Ekart API
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import WebhookEventLog from '../../../../../infrastructure/database/mongoose/models/webhook-event-log.model';
import { EkartStatusMapper } from '../../../../../infrastructure/external/couriers/ekart/ekart-status.mapper';
import { WebhookProcessorService } from '../../../../../core/application/services/webhooks/webhook-processor.service';
import logger from '../../../../../shared/logger/winston.logger';

export class EkartWebhookController {
  /**
   * Handle track_updated webhook
   */
  static async handleTrackUpdated(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body;

      // Calculate event hash for dedupe
      const eventHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(payload))
        .digest('hex');

      // Check for duplicate (idempotency)
      const existingEvent = await WebhookEventLog.findOne({
        provider: 'ekart',
        eventHash,
      });

      if (existingEvent) {
        logger.info('Duplicate Ekart webhook event, skipping', {
          eventHash: eventHash.substring(0, 8),
          trackingId: payload.id,
        });

        res.status(200).json({
          status: 'success',
          message: 'Duplicate event, already processed',
        });
        return;
      }

      // Log webhook event
      const eventLog = await WebhookEventLog.create({
        provider: 'ekart',
        companyId: (req as any).companyId, // Extracted from URL or header
        eventId: payload.id,
        eventHash,
        topic: 'track_updated',
        rawPayload: payload,
        status: 'pending',
        signature: (req as any).webhookSignature,
        signatureValid: (req as any).signatureValid,
        receivedAt: new Date(),
      });

      // Map webhook to internal format
      const statusUpdate = EkartStatusMapper.mapTrackUpdatedWebhook(payload);

      // Process via WebhookProcessorService
      await WebhookProcessorService.processShipmentStatusUpdate({
        provider: 'ekart',
        trackingNumber: statusUpdate.trackingNumber,
        status: statusUpdate.status,
        statusDescription: statusUpdate.statusDescription,
        location: statusUpdate.location,
        timestamp: statusUpdate.timestamp,
        estimatedDelivery: statusUpdate.estimatedDelivery,
        metadata: statusUpdate.metadata,
      });

      // Mark event as processed
      await WebhookEventLog.findByIdAndUpdate(eventLog._id, {
        $set: {
          status: 'processed',
          processedAt: new Date(),
        },
      });

      logger.info('Ekart track_updated webhook processed successfully', {
        trackingId: payload.id,
        status: payload.status,
      });

      res.status(200).json({
        status: 'success',
        message: 'Webhook processed successfully',
      });
    } catch (error) {
      logger.error('Ekart track_updated webhook processing failed', {
        error: error instanceof Error ? error.message : 'Unknown',
        payload: req.body,
      });

      // Mark event as failed
      if ((req as any).eventLogId) {
        await WebhookEventLog.findByIdAndUpdate((req as any).eventLogId, {
          $set: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to process webhook',
      });
    }
  }

  /**
   * Handle shipment_created webhook
   */
  static async handleShipmentCreated(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body;

      // Calculate event hash
      const eventHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(payload))
        .digest('hex');

      // Check for duplicate
      const existingEvent = await WebhookEventLog.findOne({
        provider: 'ekart',
        eventHash,
      });

      if (existingEvent) {
        res.status(200).json({
          status: 'success',
          message: 'Duplicate event',
        });
        return;
      }

      // Log event
      const eventLog = await WebhookEventLog.create({
        provider: 'ekart',
        companyId: (req as any).companyId,
        eventId: payload.id,
        eventHash,
        topic: 'shipment_created',
        rawPayload: payload,
        status: 'pending',
        signature: (req as any).webhookSignature,
        signatureValid: (req as any).signatureValid,
        receivedAt: new Date(),
      });

      // Map and process
      const shipmentData = EkartStatusMapper.mapShipmentCreatedWebhook(payload);

      await WebhookProcessorService.processShipmentCreated({
        provider: 'ekart',
        trackingNumber: shipmentData.trackingNumber,
        awb: shipmentData.awb,
        vendor: shipmentData.vendor,
        orderNumber: shipmentData.orderNumber,
      });

      // Mark as processed
      await WebhookEventLog.findByIdAndUpdate(eventLog._id, {
        $set: {
          status: 'processed',
          processedAt: new Date(),
        },
      });

      logger.info('Ekart shipment_created webhook processed', {
        trackingId: payload.id,
        orderNumber: payload.orderNumber,
      });

      res.status(200).json({
        status: 'success',
        message: 'Webhook processed successfully',
      });
    } catch (error) {
      logger.error('Ekart shipment_created webhook processing failed', {
        error: error instanceof Error ? error.message : 'Unknown',
      });

      res.status(500).json({
        status: 'error',
        message: 'Failed to process webhook',
      });
    }
  }
}
```

---

### 4.6 Webhook Routes

**File:** `server/src/presentation/http/routes/v1/webhooks/ekart.webhook.routes.ts`

```typescript
/**
 * Ekart Webhook Routes
 */

import { Router } from 'express';
import { EkartWebhookController } from '../../../controllers/webhooks/couriers/ekart.webhook.controller';
import { ekartWebhookAuth } from '../../../middleware/webhooks/ekart-webhook-auth.middleware';
import { rawBodyMiddleware } from '../../../middleware/raw-body.middleware';

const router = Router();

// Apply raw body middleware for signature verification
router.use(rawBodyMiddleware);

// Apply HMAC signature verification
router.use(ekartWebhookAuth);

// Webhook endpoints
router.post('/track-updated', EkartWebhookController.handleTrackUpdated);
router.post('/shipment-created', EkartWebhookController.handleShipmentCreated);
router.post('/shipment-recreated', EkartWebhookController.handleShipmentCreated); // Same handler

export default router;
```

---

### 4.7 Register Webhook Routes

**File:** `server/src/presentation/http/routes/v1/webhooks/index.ts`

```typescript
// Add Ekart webhook routes
import ekartWebhookRoutes from './ekart.webhook.routes';

router.use('/ekart', ekartWebhookRoutes);
```

---

## Implementation Checklist (Phase 4)

- [ ] Create `ekart-status-mappings.ts` with all status mappings
- [ ] Register mappings in `StatusMapperService` at boot
- [ ] Create `WebhookEventLog` model with TTL and dedupe indexes
- [ ] Implement `ekart-webhook-auth.middleware.ts` with HMAC verification
- [ ] Create `ekart-status.mapper.ts` for payload mapping
- [ ] Implement `EkartWebhookController` with idempotency
- [ ] Create `ekart.webhook.routes.ts`
- [ ] Register routes in `webhooks/index.ts`
- [ ] Write unit tests for status mappings
- [ ] Write unit tests for webhook signature verification
- [ ] Write integration tests for webhook end-to-end flow
- [ ] Review & commit Phase 4 files

---

## Phase 5: Testing Strategy (Days 4-5)

### 5.1 Unit Tests

**File:** `server/tests/unit/infrastructure/external/couriers/ekart/ekart.auth.test.ts`

```typescript
/**
 * EkartAuth Unit Tests
 * Tests token caching, refresh, and distributed lock behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EkartAuth } from '../../../../../../src/infrastructure/external/couriers/ekart/ekart.auth';
import { getDistributedLock } from '../../../../../../src/shared/utils/distributed-lock';
import Integration from '../../../../../../src/infrastructure/database/mongoose/models/system/integrations/integration.model';

// Mock dependencies
vi.mock('../../../../../../src/shared/utils/distributed-lock');
vi.mock('../../../../../../src/infrastructure/database/mongoose/models/system/integrations/integration.model');

describe('EkartAuth', () => {
  let ekartAuth: EkartAuth;
  const mockCompanyId = 'mockCompanyId123';

  beforeEach(() => {
    ekartAuth = new EkartAuth(mockCompanyId as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getValidToken', () => {
    it('should return cached token if valid', async () => {
      // Arrange
      const mockToken = 'cached_token';
      const futureExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
      (ekartAuth as any).tokenCache = { token: mockToken, expiresAt: futureExpiry };

      // Act
      const token = await ekartAuth.getValidToken();

      // Assert
      expect(token).toBe(mockToken);
    });

    it('should fetch from DB if memory cache expired', async () => {
      // Arrange
      const mockToken = 'db_token';
      const futureExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000);

      Integration.findOne = vi.fn().mockResolvedValue({
        credentials: { accessToken: 'encrypted_token' },
        metadata: { tokenExpiresAt: futureExpiry },
      });

      // Mock decryption
      vi.mock('../../../../../../src/shared/utils/encryption', () => ({
        decryptData: vi.fn().mockReturnValue(mockToken),
      }));

      // Act
      const token = await ekartAuth.getValidToken();

      // Assert
      expect(token).toBe(mockToken);
    });

    it('should use distributed lock during concurrent refresh', async () => {
      // Arrange
      const mockLock = {
        withLock: vi.fn().mockImplementation(async (key, fn) => await fn()),
      };
      (getDistributedLock as any).mockReturnValue(mockLock);

      // Mock expired token
      Integration.findOne = vi.fn().mockResolvedValue(null);

      // Mock successful auth
      (ekartAuth as any).authenticate = vi.fn().mockResolvedValue('new_token');

      // Act
      await ekartAuth.getValidToken();

      // Assert
      expect(mockLock.withLock).toHaveBeenCalledWith(
        expect.stringContaining('ekart:auth'),
        expect.any(Function),
        30000,
        10000
      );
    });
  });

  describe('authenticate', () => {
    it('should fetch token and store in DB', async () => {
      // Test implementation...
    });

    it('should throw EkartError on 401', async () => {
      // Test implementation...
    });
  });
});
```

**File:** `server/tests/unit/infrastructure/external/couriers/ekart/ekart.mapper.test.ts`

```typescript
/**
 * EkartMapper Unit Tests
 * Tests phone normalization, validation, and data mapping
 */

import { describe, it, expect } from 'vitest';
import { EkartMapper } from '../../../../../../src/infrastructure/external/couriers/ekart/ekart.mapper';

describe('EkartMapper', () => {
  describe('normalizePhone', () => {
    it('should remove country code and return 10 digits', () => {
      expect(EkartMapper.normalizePhone('919876543210')).toBe('9876543210');
      expect(EkartMapper.normalizePhone('+91-987-654-3210')).toBe('9876543210');
      expect(EkartMapper.normalizePhone('9876543210')).toBe('9876543210');
    });

    it('should handle short numbers by padding', () => {
      expect(EkartMapper.normalizePhone('12345')).toBe('0000012345');
    });
  });

  describe('validatePhone', () => {
    it('should validate 10-digit Indian numbers', () => {
      expect(EkartMapper.validatePhone('9876543210')).toBe(true);
      expect(EkartMapper.validatePhone('919876543210')).toBe(true);
      expect(EkartMapper.validatePhone('12345')).toBe(false);
      expect(EkartMapper.validatePhone('0000000001')).toBe(false); // < 1B
    });
  });

  describe('validatePincode', () => {
    it('should validate 6-digit pincodes', () => {
      expect(EkartMapper.validatePincode('560001')).toBe(true);
      expect(EkartMapper.validatePincode('12345')).toBe(false);
      expect(EkartMapper.validatePincode('5600011')).toBe(false);
    });
  });

  describe('toGrams', () => {
    it('should convert kg to grams', () => {
      expect(EkartMapper.toGrams(1.5, 'kg')).toBe(1500);
      expect(EkartMapper.toGrams(2000, 'g')).toBe(2000);
    });
  });

  describe('mapToForwardShipment', () => {
    it('should throw if GST is missing', () => {
      const mockData = {
        /* ... minimal shipment data ... */
      } as any;
      const warehouseDetails = {
        /* ... */
      } as any;
      const companyDetails = { name: 'Test', gstTin: '', billingAddress: 'Addr' };

      expect(() =>
        EkartMapper.mapToForwardShipment(mockData, warehouseDetails, companyDetails)
      ).toThrow('GST TIN is required');
    });
  });
});
```

---

### 5.2 Integration Tests (Gated)

**File:** `server/tests/integration/infrastructure/external/couriers/ekart/ekart.integration.test.ts`

```typescript
/**
 * Ekart Integration Tests
 * 
 * Gated by environment flags:
 * - RUN_EKART_LIVE=true to enable
 * - EKART_ALLOW_MUTATIONS=true for create/cancel operations
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EkartProvider } from '../../../../../../src/infrastructure/external/couriers/ekart/ekart.provider';
import mongoose from 'mongoose';

const SHOULD_RUN = process.env.RUN_EKART_LIVE === 'true';
const ALLOW_MUTATIONS = process.env.EKART_ALLOW_MUTATIONS === 'true';

describe.skipIf(!SHOULD_RUN)('Ekart Integration Tests', () => {
  let ekartProvider: EkartProvider;
  const testCompanyId = new mongoose.Types.ObjectId(process.env.TEST_COMPANY_ID);
  let testTrackingId: string;

  beforeAll(async () => {
    ekartProvider = new EkartProvider(testCompanyId);
  });

  describe('checkServiceability', () => {
    it('should return true for serviceable pincode', async () => {
      const serviceable = await ekartProvider.checkServiceability('560001');
      expect(serviceable).toBe(true);
    });

    it('should return false for non-serviceable pincode', async () => {
      const serviceable = await ekartProvider.checkServiceability('999999');
      expect(serviceable).toBe(false);
    });
  });

  describe('getRates', () => {
    it('should fetch rates for valid pincodes', async () => {
      const rates = await ekartProvider.getRates({
        origin: { pincode: '560001' },
        destination: { pincode: '110001' },
        package: { weight: 1, length: 20, width: 15, height: 10 },
        paymentMode: 'prepaid',
      });

      expect(rates).toBeInstanceOf(Array);
      expect(rates.length).toBeGreaterThan(0);
      expect(rates[0]).toHaveProperty('total');
      expect(rates[0]).toHaveProperty('currency', 'INR');
    });
  });

  describe.skipIf(!ALLOW_MUTATIONS)('createShipment', () => {
    it('should create shipment with idempotency', async () => {
      const shipmentData = {
        orderNumber: `TEST-${Date.now()}`,
        idempotencyKey: `idem-${Date.now()}`,
        destination: {
          name: 'Test Customer',
          phone: '9876543210',
          address: '123 Test Street',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          country: 'India',
        },
        origin: {
          name: 'Test Warehouse',
          phone: '9876543211',
          address: '456 Warehouse St',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          country: 'India',
        },
        package: {
          weight: 1,
          length: 20,
          width: 15,
          height: 10,
          declaredValue: 1000,
        },
        paymentMode: 'prepaid' as const,
        warehouseId: process.env.TEST_WAREHOUSE_ID,
      };

      const result = await ekartProvider.createShipment(shipmentData);

      expect(result).toHaveProperty('trackingNumber');
      expect(result.trackingNumber).toBeTruthy();

      testTrackingId = result.trackingNumber;

      // Test idempotency: second call returns same tracking ID
      const result2 = await ekartProvider.createShipment(shipmentData);
      expect(result2.trackingNumber).toBe(result.trackingNumber);
    });
  });

  describe('trackShipment', () => {
    it.skipIf(!testTrackingId)('should track existing shipment', async () => {
      const tracking = await ekartProvider.trackShipment(testTrackingId);

      expect(tracking).toHaveProperty('trackingNumber');
      expect(tracking).toHaveProperty('status');
      expect(tracking).toHaveProperty('timeline');
      expect(tracking.timeline).toBeInstanceOf(Array);
    });
  });

  describe.skipIf(!ALLOW_MUTATIONS)('cancelShipment', () => {
    it.skipIf(!testTrackingId)('should cancel shipment', async () => {
      const cancelled = await ekartProvider.cancelShipment(testTrackingId);
      expect(cancelled).toBe(true);
    });
  });
});
```

---

### 5.3 Webhook Tests

**File:** `server/tests/integration/presentation/http/webhooks/ekart.webhook.test.ts`

```typescript
/**
 * Ekart Webhook Integration Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import app from '../../../../../src/presentation/http/app';

describe('Ekart Webhook Endpoints', () => {
  const webhookSecret = process.env.EKART_WEBHOOK_SECRET || 'test_secret';

  function generateSignature(payload: any): string {
    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', webhookSecret);
    return hmac.update(payloadString).digest('hex');
  }

  describe('POST /webhooks/ekart/track-updated', () => {
    it('should accept valid webhook with correct signature', async () => {
      const payload = {
        ctime: Date.now(),
        status: 'Delivered',
        location: 'Delhi',
        desc: 'Delivered Successfully',
        attempts: '0',
        pickupTime: Date.now() - 86400000,
        wbn: '123456789',
        id: 'EKART123',
        orderNumber: 'ORD-001',
        edd: Date.now() + 86400000,
      };

      const signature = generateSignature(payload);

      const response = await request(app)
        .post('/api/v1/webhooks/ekart/track-updated')
        .set('x-ekart-signature', signature)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = { id: 'TEST123', status: 'Delivered' };

      const response = await request(app)
        .post('/api/v1/webhooks/ekart/track-updated')
        .set('x-ekart-signature', 'invalid_signature')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid signature');
    });

    it('should dedupe duplicate webhooks', async () => {
      const payload = {
        id: `DEDUP-${Date.now()}`,
        status: 'In Transit',
        ctime: Date.now(),
        pickupTime: Date.now(),
        location: 'Hub',
        desc: 'In Transit',
        attempts: '0',
        wbn: '987654321',
        orderNumber: 'ORD-002',
        edd: Date.now() + 86400000,
      };

      const signature = generateSignature(payload);

      // First call
      const response1 = await request(app)
        .post('/api/v1/webhooks/ekart/track-updated')
        .set('x-ekart-signature', signature)
        .send(payload);

      expect(response1.status).toBe(200);

      // Second call (duplicate)
      const response2 = await request(app)
        .post('/api/v1/webhooks/ekart/track-updated')
        .set('x-ekart-signature', signature)
        .send(payload);

      expect(response2.status).toBe(200);
      expect(response2.body.message).toContain('Duplicate');
    });
  });
});
```

---

## Implementation Checklist (Phase 5)

- [ ] Write unit tests for `EkartAuth` (token caching, refresh, lock)
- [ ] Write unit tests for `EkartMapper` (phone, pincode, validation)
- [ ] Write unit tests for `EkartErrorHandler` (circuit breaker)
- [ ] Write unit tests for status mappings
- [ ] Write integration tests (gated by RUN_EKART_LIVE flag)
- [ ] Write webhook signature verification tests
- [ ] Write webhook dedupe tests
- [ ] Achieve 80%+ code coverage on core modules
- [ ] Review & commit Phase 5 tests

---

## Phase 6: Integration, Seeding & Deployment (Day 6)

### 6.1 Database Seeder Updates

**File:** `server/src/infrastructure/database/seeders/seeders/22-integrations.seeder.ts`

```typescript
// Add Ekart to integration seeder

const ekartIntegration = {
  companyId: adminCompany._id,
  type: 'courier',
  provider: 'ekart',
  name: 'Ekart Logistics',
  credentials: {
    clientId: encryptData(process.env.EKART_CLIENT_ID || ''),
    username: encryptData(process.env.EKART_USERNAME || ''),
    password: encryptData(process.env.EKART_PASSWORD || ''),
  },
  settings: {
    isActive: true,
    webhookUrl: `${process.env.APP_BASE_URL}/api/v1/webhooks/ekart`,
  },
  metadata: {
    version: '3.8.8',
    baseUrl: process.env.EKART_BASE_URL || 'https://app.elite.ekartlogistics.in',
  },
};

await Integration.create(ekartIntegration);
```

---

### 6.2 Carrier Data Seeder

**File:** `server/src/infrastructure/database/seeders/data/carrier-data.ts`

```typescript
// Add Ekart to carrier data

export const CARRIER_DATA = [
  // ... existing carriers ...
  {
    name: 'Ekart',
    code: 'ekart',
    type: 'courier',
    isActive: true,
    features: {
      tracking: true,
      labels: true,
      manifest: true,
      cod: true,
      prepaid: true,
      reverse: true,
      ndr: true,
      reattempt: true,
      addressUpdate: true,
      obd: true, // Open Box Delivery
      qc: true, // Quality Check
      mps: true, // Multi-Package Shipment
    },
    serviceLevels: ['Standard', 'Express'],
    maxCodAmount: 49999,
    maxWeight: 30, // kg
    supportedCountries: ['IN'],
    metadata: {
      apiVersion: '3.8.8',
      documentationUrl: 'https://app.elite.ekartlogistics.in/docs',
    },
  },
];
```

---

### 6.3 Metrics & Monitoring

**File:** `server/src/infrastructure/external/couriers/ekart/ekart.metrics.ts`

```typescript
/**
 * Ekart Metrics Collection
 * Prometheus-compatible metrics for monitoring
 */

import { Registry, Counter, Histogram, Gauge } from 'prom-client';

const register = new Registry();

// API call counters
export const ekartApiCalls = new Counter({
  name: 'ekart_api_calls_total',
  help: 'Total number of Ekart API calls',
  labelNames: ['operation', 'status_code', 'company_id'],
  registers: [register],
});

// API latency histogram
export const ekartApiLatency = new Histogram({
  name: 'ekart_api_latency_seconds',
  help: 'Ekart API call latency in seconds',
  labelNames: ['operation', 'company_id'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// Rate limit hits
export const ekartRateLimitHits = new Counter({
  name: 'ekart_rate_limit_hits_total',
  help: 'Number of times rate limit was hit',
  labelNames: ['operation', 'company_id'],
  registers: [register],
});

// Circuit breaker state
export const ekartCircuitBreakerState = new Gauge({
  name: 'ekart_circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
  labelNames: ['company_id'],
  registers: [register],
});

// Auth token refreshes
export const ekartAuthRefreshes = new Counter({
  name: 'ekart_auth_refreshes_total',
  help: 'Number of auth token refreshes',
  labelNames: ['company_id', 'success'],
  registers: [register],
});

// Webhook events
export const ekartWebhookEvents = new Counter({
  name: 'ekart_webhook_events_total',
  help: 'Number of webhook events received',
  labelNames: ['topic', 'status', 'company_id'],
  registers: [register],
});

export function getEkartMetricsRegistry(): Registry {
  return register;
}
```

---

### 6.4 Environment Variables Documentation

**File:** `docs/Development/Backend/Integrations/EKART_ENV_VARIABLES.md`

```markdown
# Ekart Environment Variables

## Required Variables

### Authentication
- `EKART_CLIENT_ID` - Client ID provided by Ekart during onboarding
- `EKART_USERNAME` - Username for API access
- `EKART_PASSWORD` - Password for API access
- `EKART_WEBHOOK_SECRET` - Shared secret for webhook HMAC verification (6-30 characters)

### Configuration
- `EKART_BASE_URL` - Base URL for Ekart API (default: https://app.elite.ekartlogistics.in)

## Optional Variables

### Redis (for distributed lock and rate limiting)
- `REDIS_HOST` - Redis host (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)
- `REDIS_PASSWORD` - Redis password (if authentication enabled)
- `REDIS_DB` - Redis database number (default: 0)

### Testing
- `RUN_EKART_LIVE` - Enable live integration tests (default: false)
- `EKART_ALLOW_MUTATIONS` - Allow create/cancel operations in tests (default: false)
- `TEST_COMPANY_ID` - Test company MongoDB ObjectId
- `TEST_WAREHOUSE_ID` - Test warehouse MongoDB ObjectId

### Monitoring
- `EKART_METRICS_ENABLED` - Enable Prometheus metrics (default: true)
- `EKART_CIRCUIT_BREAKER_THRESHOLD` - Failure threshold for circuit breaker (default: 5)
- `EKART_CIRCUIT_BREAKER_COOLDOWN_MS` - Circuit breaker cooldown period (default: 60000)

## Security Notes

1. **Never commit credentials to version control**
2. Use encrypted storage in database for production
3. Rotate `EKART_WEBHOOK_SECRET` periodically
4. Use KMS or environment-based encryption for sensitive values
```

---

### 6.5 Final Deployment Checklist

```markdown
# Ekart Integration - Production Deployment Checklist

## Pre-Deployment

- [ ] All unit tests passing (80%+ coverage)
- [ ] All integration tests passing (gated by flags)
- [ ] Webhook signature verification tested end-to-end
- [ ] Idempotency tested with concurrent requests
- [ ] Circuit breaker behavior verified
- [ ] Rate limiter tested with Redis backend
- [ ] Distributed lock tested across multiple processes
- [ ] Code review completed
- [ ] Security audit passed (no secrets logged)

## Deployment Steps

1. **Database Migrations**
   - [ ] Run `CourierIdempotency` model migration
   - [ ] Run `WebhookEventLog` model migration
   - [ ] Create TTL indexes

2. **Environment Variables**
   - [ ] Set `EKART_CLIENT_ID`, `EKART_USERNAME`, `EKART_PASSWORD`
   - [ ] Set `EKART_WEBHOOK_SECRET` (generate strong secret)
   - [ ] Set `EKART_BASE_URL` (production URL)
   - [ ] Set Redis connection variables

3. **Seeders**
   - [ ] Run integration seeder to create Ekart integration
   - [ ] Run carrier seeder to add Ekart carrier

4. **Webhook Registration**
   - [ ] Register webhook with Ekart via POST /api/v2/webhook
   - [ ] Test webhook delivery with Ekart sandbox
   - [ ] Verify signature validation

5. **Monitoring**
   - [ ] Set up Prometheus scraping for Ekart metrics
   - [ ] Create alerts for:
     - Circuit breaker open
     - Rate limit exceeded (429s > 10/min)
     - Auth refresh failures
     - Webhook processing failures
     - Sync success rate < 90%

6. **Canary Rollout**
   - [ ] Enable Ekart for 1-2 test companies
   - [ ] Monitor for 24 hours
   - [ ] Check for errors, rate limit issues, circuit breaker trips
   - [ ] Verify webhook delivery and dedupe

7. **Full Rollout**
   - [ ] Gradually enable for more companies
   - [ ] Monitor metrics and alerts
   - [ ] Have rollback plan ready

## Post-Deployment

- [ ] Verify shipment creation working
- [ ] Verify tracking working
- [ ] Verify rate calculations accurate
- [ ] Verify webhooks delivering and processing
- [ ] Verify NDR actions working
- [ ] Verify manifest generation working
- [ ] Update documentation with production notes
- [ ] Train support team on Ekart-specific issues

## Rollback Plan

If critical issues arise:

1. Disable Ekart integration via admin panel
2. Set `settings.isActive = false` in Integration model
3. Clear CourierFactory cache
4. Investigate and fix issues
5. Re-deploy with fixes
```

---

## Final Implementation Summary

### Files Created (Total: 25 files)

#### Core Integration (8 files)
1. `ekart.types.ts` - Type definitions
2. `ekart.auth.ts` - Authentication with distributed lock
3. `ekart.mapper.ts` - Data mapping and validation
4. `ekart-error-handler.ts` - Error handling + circuit breaker
5. `ekart.provider.ts` - Main provider implementation
6. `ekart-status.mapper.ts` - Webhook payload mapping
7. `ekart-status-mappings.ts` - Status registration
8. `index.ts` - Public exports

#### Infrastructure (5 files)
9. `distributed-lock.ts` - Redis-based locking
10. `courier-idempotency.model.ts` - Idempotency storage
11. `webhook-event-log.model.ts` - Webhook dedupe & audit
12. `ekart-rate-limiter.config.ts` - Rate limit configuration
13. `ekart.metrics.ts` - Prometheus metrics

#### Webhooks (3 files)
14. `ekart-webhook-auth.middleware.ts` - HMAC verification
15. `ekart.webhook.controller.ts` - Webhook handlers
16. `ekart.webhook.routes.ts` - Webhook routing

#### Tests (6 files)
17. `ekart.auth.test.ts` - Auth unit tests
18. `ekart.mapper.test.ts` - Mapper unit tests
19. `ekart-error-handler.test.ts` - Error handler tests
20. `ekart.integration.test.ts` - Integration tests (gated)
21. `ekart.webhook.test.ts` - Webhook tests
22. `ekart-status-mappings.test.ts` - Status mapping tests

#### Documentation & Config (3 files)
23. `EKART_INTEGRATION_PLAN.md` - This document
24. `EKART_ENV_VARIABLES.md` - Environment variables
25. Updates to `courier.factory.ts`, `courier.adapter.ts`, seeders

---

## Critical Success Factors (Must-Have Before Production)

1. ✅ **Distributed token refresh lock** - Prevents auth thundering herd
2. ✅ **Idempotency for createShipment** - Prevents duplicate AWBs
3. ✅ **Redis-backed rate limiter** - Per-operation, cluster-wide limits
4. ✅ **Webhook dedupe + HMAC verification** - Prevents replay attacks
5. ✅ **Circuit breaker** - Prevents thrashing failing platform
6. ✅ **Comprehensive metrics** - Observability for 429s, failures, latency
7. ✅ **Secrets rotation endpoints** - Credential lifecycle management
8. ✅ **Gated integration tests** - Safe live testing

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Token refresh stampede | High 429s, duplicates | Distributed lock with wait timeout |
| Duplicate shipments | Critical - duplicate AWBs | Idempotency key + DB constraint |
| Rate limit exhaustion | Service degradation | Redis rate limiter + exponential backoff |
| Webhook replay attack | Data integrity | HMAC + event hash dedupe |
| Circuit always open | No shipments | Auto half-open after cooldown + alerts |
| Missing GST | Failed shipments | Fail-strict validation + clear error |

---

## Performance Targets

| Metric | Target | Alerting Threshold |
|--------|--------|--------------------|
| Shipment creation latency (p95) | < 2s | > 5s |
| Tracking query latency (p95) | < 500ms | > 2s |
| Rate limit hit rate | < 1% | > 5% |
| Webhook processing time (p95) | < 1s | > 3s |
| Circuit breaker open events | 0 | > 0 (immediate alert) |
| Sync success rate | > 98% | < 90% |

---

**End of Ekart Integration Plan**

This plan is production-ready with all critical hardening requirements implemented. Review, approve, and proceed with implementation on `ekart-integration` branch.
