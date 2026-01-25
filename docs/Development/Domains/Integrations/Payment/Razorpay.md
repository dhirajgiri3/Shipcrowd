# Razorpay Payment Gateway Integration

**Module:** Payment Processing
**Integration Type:** Third-Party Payment Gateway
**Provider:** Razorpay
**Implementation Priority:** Week 3
**Current Status:** 0% (Not Started)
**Target Completion:** Week 3, Day 3

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [SDK Installation & Setup](#sdk-installation--setup)
4. [Core API Endpoints](#core-api-endpoints)
5. [Payment Flow Architecture](#payment-flow-architecture)
6. [TypeScript Interfaces](#typescript-interfaces)
7. [Order Creation](#order-creation)
8. [Payment Verification](#payment-verification)
9. [Webhook Integration](#webhook-integration)
10. [Refund Management](#refund-management)
11. [Error Handling](#error-handling)
12. [Security Considerations](#security-considerations)
13. [Testing Strategy](#testing-strategy)
14. [Implementation Checklist](#implementation-checklist)

---

## Overview

### Purpose

Razorpay is India's leading payment gateway providing a unified interface for accepting payments via:
- Credit/Debit Cards (Visa, Mastercard, RuPay)
- UPI (Google Pay, PhonePe, Paytm)
- Net Banking (150+ banks)
- Wallets (Paytm, PhonePe, Amazon Pay, etc.)
- EMI options
- International cards

### Integration Points

**Shipcrowd Use Cases:**
1. **Prepaid Orders** - Accept online payments before shipment
2. **Wallet Recharge** - Top-up customer wallet balances
3. **COD to Prepaid Conversion** - Offer payment links for COD orders
4. **Security Deposits** - Collect refundable deposits for high-value shipments
5. **Subscription Billing** - Recurring payments for premium plans (future)

### Base URL

```
Production: https://api.razorpay.com/v1
Test Mode: https://api.razorpay.com/v1 (with test keys)
```

### Key Features

- **PCI DSS Compliant** - No card data touches your server
- **Instant Settlements** - Same-day/next-day settlements available
- **Smart Routing** - Automatic payment method optimization
- **Dashboard Analytics** - Real-time payment tracking and reports
- **Webhook Notifications** - Real-time event notifications
- **Test Mode** - Complete testing without actual money transfer

---

## Authentication

### API Keys

Razorpay uses **Basic Authentication** with API Key and Secret.

**Key Types:**
- **Test Keys** - For development/testing (prefix: `rzp_test_`)
- **Live Keys** - For production (prefix: `rzp_live_`)

### Obtaining Keys

1. Sign up at [razorpay.com](https://razorpay.com)
2. Complete KYC verification (for live keys)
3. Navigate to Dashboard → Settings → API Keys
4. Generate Test Keys (instant) and Live Keys (post-KYC)

### Key Structure

```typescript
interface RazorpayCredentials {
  keyId: string;      // rzp_test_1234567890abcd or rzp_live_1234567890abcd
  keySecret: string;  // 32-character secret key
}
```

### Authentication Header

All API requests use HTTP Basic Auth:

```typescript
const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
// Authorization: Basic cnpwX3Rlc3RfMTIzOjEyM...
```

### Storage Requirements

**Environment Variables (.env):**
```bash
# Razorpay Test Credentials
RAZORPAY_TEST_KEY_ID=rzp_test_1234567890abcd
RAZORPAY_TEST_KEY_SECRET=your_test_secret_key_here

# Razorpay Live Credentials
RAZORPAY_LIVE_KEY_ID=rzp_live_1234567890abcd
RAZORPAY_LIVE_KEY_SECRET=your_live_secret_key_here

# Webhook Secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# Mode Selection
RAZORPAY_MODE=test  # or 'live'
```

**Security Best Practices:**
- Store secrets in AWS Secrets Manager or similar vault
- Never commit secrets to version control
- Rotate keys every 6 months
- Use test keys in development/staging environments
- Restrict API key access via Razorpay Dashboard IP whitelisting

---

## SDK Installation & Setup

### Installation

```bash
npm install razorpay
npm install --save-dev @types/razorpay
```

**Package Details:**
- **Package:** `razorpay` (official Node.js SDK)
- **Version:** ^2.9.0 (latest stable)
- **TypeScript:** Community types via `@types/razorpay`

### SDK Initialization

```typescript
import Razorpay from 'razorpay';

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_MODE === 'live'
    ? process.env.RAZORPAY_LIVE_KEY_ID!
    : process.env.RAZORPAY_TEST_KEY_ID!,
  key_secret: process.env.RAZORPAY_MODE === 'live'
    ? process.env.RAZORPAY_LIVE_KEY_SECRET!
    : process.env.RAZORPAY_TEST_KEY_SECRET!,
});
```

### Service Pattern Implementation

**File:** `server/src/infrastructure/external/payment/razorpay/RazorpayService.ts`

```typescript
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { RazorpayError } from './RazorpayError';

export class RazorpayService {
  private razorpay: Razorpay;
  private isTestMode: boolean;

  constructor() {
    const mode = process.env.RAZORPAY_MODE || 'test';
    this.isTestMode = mode === 'test';

    this.razorpay = new Razorpay({
      key_id: this.isTestMode
        ? process.env.RAZORPAY_TEST_KEY_ID!
        : process.env.RAZORPAY_LIVE_KEY_ID!,
      key_secret: this.isTestMode
        ? process.env.RAZORPAY_TEST_KEY_SECRET!
        : process.env.RAZORPAY_LIVE_KEY_SECRET!,
    });
  }

  // Methods will be added in following sections
}
```

---

## Core API Endpoints

### 1. Orders API

**Purpose:** Create payment order (required before payment collection)

**Endpoint:** `POST /v1/orders`

**Why Orders?**
- Security: Validates amount on server side
- Prevents tampering: Client cannot modify payment amount
- Ties payment to order: Links payment_id with order_id

### 2. Payments API

**Endpoints:**
- `GET /v1/payments/:id` - Fetch payment details
- `POST /v1/payments/:id/capture` - Capture authorized payment
- `GET /v1/payments` - List all payments

### 3. Refunds API

**Endpoints:**
- `POST /v1/payments/:id/refund` - Create refund
- `GET /v1/refunds/:id` - Fetch refund details

### 4. Webhooks

**Endpoint:** Your server endpoint (e.g., `POST /api/v1/webhooks/razorpay`)

**Events:**
- `payment.authorized` - Payment authorized but not captured
- `payment.captured` - Payment successful
- `payment.failed` - Payment failed
- `refund.created` - Refund initiated
- `refund.processed` - Refund completed

---

## Payment Flow Architecture

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PAYMENT FLOW                                │
└─────────────────────────────────────────────────────────────────────┘

CLIENT (React)                SERVER (Node.js)              RAZORPAY
     │                              │                           │
     │  1. Initiate Payment         │                           │
     ├─────────────────────────────>│                           │
     │     POST /api/v1/orders      │                           │
     │                              │                           │
     │                              │  2. Create Razorpay Order │
     │                              ├──────────────────────────>│
     │                              │   POST /v1/orders         │
     │                              │                           │
     │                              │  3. Order Created         │
     │                              │<──────────────────────────┤
     │  4. Order Details            │   { order_id, amount }    │
     │<─────────────────────────────┤                           │
     │   { order_id, key_id }       │                           │
     │                              │                           │
     │  5. Open Razorpay Checkout   │                           │
     │──────────────────────────────────────────────────────────>│
     │   (Frontend SDK)             │                           │
     │                              │                           │
     │  6. User Pays                │                           │
     │<─────────────────────────────────────────────────────────>│
     │   (Payment Gateway UI)       │                           │
     │                              │                           │
     │  7. Payment Success Callback │                           │
     │<──────────────────────────────────────────────────────────┤
     │   { payment_id, signature }  │                           │
     │                              │                           │
     │  8. Verify Payment           │                           │
     ├─────────────────────────────>│                           │
     │   POST /api/v1/verify        │                           │
     │                              │                           │
     │                              │  9. Verify Signature      │
     │                              │   (HMAC SHA256)           │
     │                              │                           │
     │  10. Verification Result     │                           │
     │<─────────────────────────────┤                           │
     │                              │                           │
     │                              │  11. Webhook Notification │
     │                              │<──────────────────────────┤
     │                              │   payment.captured        │
     │                              │                           │
     │                              │  12. Update Order Status  │
     │                              │   (Database)              │
     │                              │                           │
```

### Flow Steps Explained

1. **Client Initiates Payment** - User clicks "Pay Now" button
2. **Server Creates Razorpay Order** - Validates amount, creates order
3. **Order ID Returned** - Server sends order_id and key_id to client
4. **Razorpay Checkout Opens** - Frontend SDK displays payment UI
5. **User Completes Payment** - Enters card/UPI details, authorizes payment
6. **Payment Success Callback** - Razorpay calls frontend success handler
7. **Server Verification** - Client sends payment details to server for verification
8. **Signature Validation** - Server validates using HMAC SHA256
9. **Database Update** - Update order/wallet status to 'paid'
10. **Webhook Confirmation** - Razorpay sends asynchronous webhook (backup verification)

---

## TypeScript Interfaces

### Order Interfaces

```typescript
/**
 * Razorpay Order Creation Request
 */
interface RazorpayOrderRequest {
  amount: number;           // Amount in smallest currency unit (paise for INR)
  currency: string;         // ISO 4217 currency code (e.g., 'INR')
  receipt: string;          // Unique receipt ID for your reference
  notes?: {                 // Custom key-value pairs
    [key: string]: string;
  };
  payment_capture?: 0 | 1;  // 1 = auto-capture, 0 = manual capture (default: 1)
}

/**
 * Razorpay Order Response
 */
interface RazorpayOrderResponse {
  id: string;               // Razorpay order ID (e.g., 'order_IluGWxBm9U8zJ8')
  entity: 'order';
  amount: number;           // Amount in paise
  amount_paid: number;      // Amount paid so far
  amount_due: number;       // Amount remaining
  currency: string;         // 'INR'
  receipt: string;          // Your receipt ID
  offer_id: string | null;
  status: 'created' | 'attempted' | 'paid';
  attempts: number;         // Number of payment attempts
  notes: {
    [key: string]: string;
  };
  created_at: number;       // Unix timestamp
}
```

### Payment Interfaces

```typescript
/**
 * Razorpay Payment Verification Request (from client)
 */
interface PaymentVerificationRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Razorpay Payment Object
 */
interface RazorpayPayment {
  id: string;                    // Payment ID (e.g., 'pay_IluGWxBm9U8zJ8')
  entity: 'payment';
  amount: number;                // Amount in paise
  currency: string;              // 'INR'
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id: string;              // Associated order ID
  invoice_id: string | null;
  international: boolean;        // International payment?
  method: 'card' | 'netbanking' | 'wallet' | 'emi' | 'upi';
  amount_refunded: number;       // Amount refunded in paise
  refund_status: 'null' | 'partial' | 'full';
  captured: boolean;             // Is payment captured?
  description: string | null;
  card_id: string | null;
  bank: string | null;
  wallet: string | null;
  vpa: string | null;            // UPI VPA
  email: string;
  contact: string;
  notes: {
    [key: string]: string;
  };
  fee: number;                   // Razorpay fee in paise
  tax: number;                   // Tax in paise
  error_code: string | null;
  error_description: string | null;
  error_source: string | null;
  error_step: string | null;
  error_reason: string | null;
  created_at: number;            // Unix timestamp
}
```

### Refund Interfaces

```typescript
/**
 * Razorpay Refund Request
 */
interface RazorpayRefundRequest {
  amount?: number;          // Amount to refund in paise (omit for full refund)
  speed?: 'normal' | 'optimum';  // Refund speed (default: 'normal')
  notes?: {
    [key: string]: string;
  };
  receipt?: string;
}

/**
 * Razorpay Refund Response
 */
interface RazorpayRefundResponse {
  id: string;               // Refund ID (e.g., 'rfnd_FP8QHiV938haTz')
  entity: 'refund';
  amount: number;           // Refunded amount in paise
  currency: string;         // 'INR'
  payment_id: string;       // Associated payment ID
  notes: {
    [key: string]: string;
  };
  receipt: string | null;
  acquirer_data: {
    arn: string | null;     // Acquirer Reference Number
  };
  created_at: number;       // Unix timestamp
  batch_id: string | null;
  status: 'pending' | 'processed' | 'failed';
  speed_processed: 'normal' | 'instant';
  speed_requested: 'normal' | 'optimum';
}
```

### Webhook Interfaces

```typescript
/**
 * Razorpay Webhook Event
 */
interface RazorpayWebhookEvent {
  entity: 'event';
  account_id: string;
  event:
    | 'payment.authorized'
    | 'payment.captured'
    | 'payment.failed'
    | 'refund.created'
    | 'refund.processed'
    | 'refund.failed'
    | 'order.paid';
  contains: ['payment'] | ['refund'];
  payload: {
    payment?: {
      entity: RazorpayPayment;
    };
    refund?: {
      entity: RazorpayRefundResponse;
    };
    order?: {
      entity: RazorpayOrderResponse;
    };
  };
  created_at: number;
}
```

---

## Order Creation

### Implementation

**File:** `server/src/infrastructure/external/payment/razorpay/RazorpayService.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';

export class RazorpayService {
  /**
   * Create Razorpay order for payment
   *
   * @param amount - Amount in INR (will be converted to paise)
   * @param metadata - Additional data to attach to order
   * @returns Razorpay order object
   */
  async createOrder(args: {
    amount: number;           // Amount in INR (e.g., 599.50)
    currency?: string;        // Default: 'INR'
    receipt?: string;         // Auto-generated if not provided
    notes?: {
      orderId?: string;       // Shipcrowd order ID
      userId?: string;        // Shipcrowd user ID
      purpose?: string;       // 'order_payment' | 'wallet_recharge'
      [key: string]: string | undefined;
    };
  }): Promise<RazorpayOrderResponse> {
    try {
      // Convert INR to paise (smallest unit)
      const amountInPaise = Math.round(args.amount * 100);

      // Validate amount
      if (amountInPaise < 100) {
        throw new RazorpayError('Minimum order amount is ₹1.00', 'INVALID_AMOUNT');
      }

      // Create order request
      const orderRequest: RazorpayOrderRequest = {
        amount: amountInPaise,
        currency: args.currency || 'INR',
        receipt: args.receipt || `rcpt_${uuidv4()}`,
        notes: args.notes || {},
        payment_capture: 1,  // Auto-capture payment
      };

      // Call Razorpay API
      const order = await this.razorpay.orders.create(orderRequest);

      return order as RazorpayOrderResponse;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Fetch order details by ID
   */
  async fetchOrder(orderId: string): Promise<RazorpayOrderResponse> {
    try {
      const order = await this.razorpay.orders.fetch(orderId);
      return order as RazorpayOrderResponse;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }
}
```

### Controller Implementation

**File:** `server/src/presentation/http/controllers/payment/payment.controller.ts`

```typescript
import { Request, Response } from 'express';
import { RazorpayService } from '../../../../infrastructure/external/payment/razorpay/RazorpayService';
import Order from '../../../../infrastructure/database/mongoose/models/Order';

export class PaymentController {
  private razorpayService: RazorpayService;

  constructor() {
    this.razorpayService = new RazorpayService();
  }

  /**
   * Create payment order
   * POST /api/v1/payment/create-order
   */
  async createPaymentOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, amount, purpose } = req.body;
      const userId = req.user?.id;

      // Validate Shipcrowd order exists
      const order = await Order.findById(orderId);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      // Verify amount matches order total
      if (Math.abs(amount - order.totals.total) > 0.01) {
        res.status(400).json({ error: 'Amount mismatch' });
        return;
      }

      // Create Razorpay order
      const razorpayOrder = await this.razorpayService.createOrder({
        amount,
        receipt: `order_${order.orderNumber}`,
        notes: {
          orderId: order._id.toString(),
          userId: userId.toString(),
          purpose: purpose || 'order_payment',
          orderNumber: order.orderNumber,
        },
      });

      // Return order details to frontend
      res.status(200).json({
        success: true,
        order: {
          razorpayOrderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          keyId: this.razorpayService.isTestMode
            ? process.env.RAZORPAY_TEST_KEY_ID
            : process.env.RAZORPAY_LIVE_KEY_ID,
        },
      });
    } catch (error: any) {
      console.error('Payment order creation failed:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
```

---

## Payment Verification

### Why Verification is Critical

**Security Threat:** Without server-side verification, malicious users could:
1. Bypass frontend and call success callback directly
2. Modify payment amount after checkout
3. Use fake payment IDs

**Solution:** Signature verification using HMAC SHA256

### Signature Generation Algorithm

```typescript
// Razorpay generates signature as:
const generatedSignature = crypto
  .createHmac('sha256', keySecret)
  .update(`${order_id}|${payment_id}`)
  .digest('hex');

// If generatedSignature === razorpay_signature, payment is authentic
```

### Implementation

**File:** `server/src/infrastructure/external/payment/razorpay/RazorpayService.ts`

```typescript
export class RazorpayService {
  /**
   * Verify payment signature
   * CRITICAL: Always verify on server side, never trust client
   *
   * @param orderId - Razorpay order ID
   * @param paymentId - Razorpay payment ID
   * @param signature - Signature from Razorpay callback
   * @returns true if signature is valid
   */
  verifyPaymentSignature(args: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    try {
      const keySecret = this.isTestMode
        ? process.env.RAZORPAY_TEST_KEY_SECRET!
        : process.env.RAZORPAY_LIVE_KEY_SECRET!;

      // Generate signature
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${args.orderId}|${args.paymentId}`)
        .digest('hex');

      // Constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(generatedSignature),
        Buffer.from(args.signature)
      );
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Fetch payment details from Razorpay
   */
  async fetchPayment(paymentId: string): Promise<RazorpayPayment> {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment as RazorpayPayment;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }
}
```

### Controller Implementation

```typescript
/**
 * Verify payment after successful checkout
 * POST /api/v1/payment/verify
 */
async verifyPayment(req: Request, res: Response): Promise<void> {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify signature
    const isValid = this.razorpayService.verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      res.status(400).json({
        success: false,
        error: 'Invalid payment signature',
      });
      return;
    }

    // Fetch payment details from Razorpay
    const payment = await this.razorpayService.fetchPayment(razorpay_payment_id);

    // Fetch Razorpay order
    const razorpayOrder = await this.razorpayService.fetchOrder(razorpay_order_id);

    // Extract Shipcrowd order ID from notes
    const ShipcrowdOrderId = razorpayOrder.notes.orderId;

    // Update order in database
    const order = await Order.findByIdAndUpdate(
      ShipcrowdOrderId,
      {
        paymentStatus: 'paid',
        'shippingDetails.paymentId': razorpay_payment_id,
        'shippingDetails.razorpayOrderId': razorpay_order_id,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        method: payment.method,
        amount: payment.amount / 100,  // Convert paise to INR
      },
      order: {
        id: order?._id,
        orderNumber: order?.orderNumber,
        paymentStatus: order?.paymentStatus,
      },
    });
  } catch (error: any) {
    console.error('Payment verification failed:', error);
    res.status(500).json({ error: error.message });
  }
}
```

---

## Webhook Integration

### Why Webhooks?

**Reasons:**
1. **Reliability** - User may close browser before callback completes
2. **Asynchronous Confirmation** - Backup verification mechanism
3. **Event Tracking** - Capture all payment lifecycle events
4. **Refund Notifications** - Get notified when refunds complete

### Webhook Setup (Razorpay Dashboard)

1. Login to Razorpay Dashboard
2. Navigate to **Settings → Webhooks**
3. Click **+ Create New Webhook**
4. Enter URL: `https://yourdomain.com/api/v1/webhooks/razorpay`
5. Select Events:
   - `payment.authorized`
   - `payment.captured`
   - `payment.failed`
   - `refund.created`
   - `refund.processed`
6. Enter Webhook Secret (generate strong random string)
7. Click **Create Webhook**

### Webhook Signature Verification

**CRITICAL:** Verify webhook signature to prevent fake webhooks

```typescript
/**
 * Verify webhook signature
 *
 * @param webhookBody - Raw request body (string)
 * @param signature - X-Razorpay-Signature header
 * @returns true if signature is valid
 */
verifyWebhookSignature(webhookBody: string, signature: string): boolean {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;

    const generatedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(webhookBody)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(generatedSignature),
      Buffer.from(signature)
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}
```

### Webhook Controller

**File:** `server/src/presentation/http/controllers/webhook/razorpay.webhook.controller.ts`

```typescript
import { Request, Response } from 'express';
import { RazorpayService } from '../../../../infrastructure/external/payment/razorpay/RazorpayService';
import Order from '../../../../infrastructure/database/mongoose/models/Order';

export class RazorpayWebhookController {
  private razorpayService: RazorpayService;

  constructor() {
    this.razorpayService = new RazorpayService();
  }

  /**
   * Handle Razorpay webhook events
   * POST /api/v1/webhooks/razorpay
   *
   * IMPORTANT: Use express.raw() middleware for this route to preserve raw body
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Get signature from header
      const signature = req.headers['x-razorpay-signature'] as string;

      if (!signature) {
        res.status(400).json({ error: 'Missing signature' });
        return;
      }

      // Verify signature
      const webhookBody = JSON.stringify(req.body);
      const isValid = this.razorpayService.verifyWebhookSignature(webhookBody, signature);

      if (!isValid) {
        console.error('Invalid webhook signature');
        res.status(400).json({ error: 'Invalid signature' });
        return;
      }

      // Parse event
      const event: RazorpayWebhookEvent = req.body;

      // Handle event based on type
      switch (event.event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(event);
          break;

        case 'payment.failed':
          await this.handlePaymentFailed(event);
          break;

        case 'refund.processed':
          await this.handleRefundProcessed(event);
          break;

        default:
          console.log(`Unhandled webhook event: ${event.event}`);
      }

      // Always respond with 200 to acknowledge receipt
      res.status(200).json({ status: 'ok' });
    } catch (error: any) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Internal error' });
    }
  }

  /**
   * Handle payment.captured event
   */
  private async handlePaymentCaptured(event: RazorpayWebhookEvent): Promise<void> {
    const payment = event.payload.payment?.entity;
    if (!payment) return;

    console.log(`Payment captured: ${payment.id}`);

    // Fetch order from notes
    const razorpayOrder = await this.razorpayService.fetchOrder(payment.order_id);
    const ShipcrowdOrderId = razorpayOrder.notes.orderId;

    // Update order status
    await Order.findByIdAndUpdate(ShipcrowdOrderId, {
      paymentStatus: 'paid',
      'shippingDetails.paymentId': payment.id,
    });

    // TODO: Trigger order fulfillment workflow
  }

  /**
   * Handle payment.failed event
   */
  private async handlePaymentFailed(event: RazorpayWebhookEvent): Promise<void> {
    const payment = event.payload.payment?.entity;
    if (!payment) return;

    console.log(`Payment failed: ${payment.id}, Reason: ${payment.error_description}`);

    // Update order status
    const razorpayOrder = await this.razorpayService.fetchOrder(payment.order_id);
    const ShipcrowdOrderId = razorpayOrder.notes.orderId;

    await Order.findByIdAndUpdate(ShipcrowdOrderId, {
      paymentStatus: 'failed',
    });

    // TODO: Send payment failure notification to user
  }

  /**
   * Handle refund.processed event
   */
  private async handleRefundProcessed(event: RazorpayWebhookEvent): Promise<void> {
    const refund = event.payload.refund?.entity;
    if (!refund) return;

    console.log(`Refund processed: ${refund.id}, Amount: ₹${refund.amount / 100}`);

    // Update order status
    const payment = await this.razorpayService.fetchPayment(refund.payment_id);
    const razorpayOrder = await this.razorpayService.fetchOrder(payment.order_id);
    const ShipcrowdOrderId = razorpayOrder.notes.orderId;

    await Order.findByIdAndUpdate(ShipcrowdOrderId, {
      paymentStatus: 'refunded',
    });

    // TODO: Update wallet balance if applicable
  }
}
```

### Webhook Route Configuration

**File:** `server/src/presentation/http/routes/v1/webhook/razorpay.routes.ts`

```typescript
import express, { Router } from 'express';
import { RazorpayWebhookController } from '../../../controllers/webhook/razorpay.webhook.controller';

const router: Router = express.Router();
const controller = new RazorpayWebhookController();

/**
 * IMPORTANT: Use express.raw() middleware to preserve raw body for signature verification
 * This must be configured BEFORE express.json() middleware
 */
router.post(
  '/razorpay',
  express.raw({ type: 'application/json' }),
  controller.handleWebhook.bind(controller)
);

export default router;
```

**CRITICAL:** Configure `express.raw()` middleware for webhook route BEFORE `express.json()`:

```typescript
// In server/src/index.ts or app configuration
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);
app.use(express.json());  // This comes AFTER webhook routes
```

---

## Refund Management

### Implementation

**File:** `server/src/infrastructure/external/payment/razorpay/RazorpayService.ts`

```typescript
export class RazorpayService {
  /**
   * Create refund for a payment
   *
   * @param paymentId - Razorpay payment ID
   * @param amount - Amount to refund in INR (omit for full refund)
   * @param notes - Additional metadata
   * @returns Refund object
   */
  async createRefund(args: {
    paymentId: string;
    amount?: number;        // Amount in INR (optional, omit for full refund)
    speed?: 'normal' | 'optimum';
    notes?: {
      reason?: string;
      [key: string]: string | undefined;
    };
  }): Promise<RazorpayRefundResponse> {
    try {
      const refundRequest: RazorpayRefundRequest = {
        speed: args.speed || 'normal',
        notes: args.notes || {},
      };

      // Add amount if partial refund
      if (args.amount) {
        refundRequest.amount = Math.round(args.amount * 100);  // Convert to paise
      }

      const refund = await this.razorpay.payments.refund(args.paymentId, refundRequest);

      return refund as RazorpayRefundResponse;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Fetch refund details
   */
  async fetchRefund(refundId: string): Promise<RazorpayRefundResponse> {
    try {
      const refund = await this.razorpay.refunds.fetch(refundId);
      return refund as RazorpayRefundResponse;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }
}
```

### Controller Implementation

```typescript
/**
 * Initiate refund
 * POST /api/v1/payment/refund
 */
async initiateRefund(req: Request, res: Response): Promise<void> {
  try {
    const { orderId, reason, amount } = req.body;
    const userId = req.user?.id;

    // Fetch order
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Verify user authorization
    if (order.companyId.toString() !== userId.toString()) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    // Verify payment exists
    const paymentId = order.shippingDetails.paymentId;
    if (!paymentId) {
      res.status(400).json({ error: 'No payment found for this order' });
      return;
    }

    // Create refund
    const refund = await this.razorpayService.createRefund({
      paymentId,
      amount,  // Omit for full refund
      notes: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        reason: reason || 'Customer request',
      },
    });

    // Update order status
    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: 'refunded',
    });

    res.status(200).json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
      },
    });
  } catch (error: any) {
    console.error('Refund creation failed:', error);
    res.status(500).json({ error: error.message });
  }
}
```

---

## Error Handling

### Razorpay Error Structure

```typescript
interface RazorpayAPIError {
  statusCode: number;
  error: {
    code: string;           // Error code (e.g., 'BAD_REQUEST_ERROR')
    description: string;    // Human-readable error
    source: string;         // 'business' | 'gateway' | 'internal'
    step: string;           // Where error occurred
    reason: string;         // Detailed reason
    metadata: {
      [key: string]: any;
    };
  };
}
```

### Common Error Codes

| Error Code | Status | Description | Action |
|------------|--------|-------------|--------|
| `BAD_REQUEST_ERROR` | 400 | Invalid request parameters | Validate input |
| `GATEWAY_ERROR` | 502 | Payment gateway error | Retry after delay |
| `SERVER_ERROR` | 500 | Razorpay server error | Retry with backoff |
| `INVALID_KEY_ERROR` | 401 | Invalid API key | Check credentials |
| `VALIDATION_ERROR` | 400 | Request validation failed | Fix request data |

### Error Handler Implementation

**File:** `server/src/infrastructure/external/payment/razorpay/RazorpayError.ts`

```typescript
export class RazorpayError extends Error {
  public code: string;
  public statusCode: number;
  public details: any;

  constructor(message: string, code: string = 'RAZORPAY_ERROR', statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'RazorpayError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}
```

**In RazorpayService.ts:**

```typescript
export class RazorpayService {
  private handleError(error: any): RazorpayError {
    if (error.statusCode) {
      // Razorpay API error
      return new RazorpayError(
        error.error?.description || 'Razorpay API error',
        error.error?.code || 'API_ERROR',
        error.statusCode,
        error.error
      );
    }

    // Unknown error
    return new RazorpayError(
      error.message || 'Unknown Razorpay error',
      'UNKNOWN_ERROR',
      500
    );
  }
}
```

---

## Security Considerations

### 1. Credential Storage

**Never Hardcode:**
```typescript
// ❌ NEVER DO THIS
const razorpay = new Razorpay({
  key_id: 'rzp_test_1234567890',
  key_secret: 'hardcoded_secret',
});
```

**Use Environment Variables:**
```typescript
// ✅ CORRECT
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});
```

**Best Practice:** Store in AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault

### 2. HTTPS Only

- **Production:** All payment endpoints MUST use HTTPS
- **Webhooks:** Razorpay requires HTTPS webhook URLs
- **Certificate:** Use valid SSL certificate (Let's Encrypt recommended)

### 3. Input Validation

```typescript
// Validate amount
if (amount < 1 || amount > 100000) {
  throw new Error('Amount must be between ₹1 and ₹100,000');
}

// Sanitize notes
const sanitizedNotes = {
  orderId: String(orderId).substring(0, 50),
  purpose: String(purpose).replace(/[^a-zA-Z0-9_]/g, ''),
};
```

### 4. Rate Limiting

```typescript
// Apply rate limit to payment endpoints
import rateLimit from 'express-rate-limit';

const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 requests per window
  message: 'Too many payment attempts, please try again later',
});

router.post('/create-order', paymentRateLimiter, controller.createPaymentOrder);
```

### 5. Log Sanitization

```typescript
// ❌ NEVER log sensitive data
console.log('Payment details:', { keySecret, cardNumber });

// ✅ Log only safe data
console.log('Payment created:', {
  orderId: order.id,
  amount: order.amount,
  // DO NOT log: key_secret, card details, CVV
});
```

### 6. Idempotency

**Problem:** User clicks "Pay" button multiple times → Multiple charges

**Solution:** Use receipt field as idempotency key

```typescript
// Razorpay automatically handles duplicate receipt IDs
const order = await razorpay.orders.create({
  amount: 50000,
  currency: 'INR',
  receipt: `order_${uniqueOrderNumber}`,  // Unique per Shipcrowd order
});
```

---

## Testing Strategy

### Test Mode vs Live Mode

| Feature | Test Mode | Live Mode |
|---------|-----------|-----------|
| **Keys** | `rzp_test_*` | `rzp_live_*` |
| **Money** | No actual transfer | Real money |
| **Cards** | Test cards only | Real cards |
| **Webhooks** | Works normally | Works normally |
| **Dashboard** | Separate test dashboard | Production dashboard |

### Test Cards

**Razorpay Test Cards (for Test Mode):**

| Card Number | CVV | Expiry | OTP | Result |
|-------------|-----|--------|-----|--------|
| 4111 1111 1111 1111 | 123 | Any future date | Any | Success |
| 5555 5555 5555 4444 | 123 | Any future date | Any | Success |
| 4012 0010 3714 1112 | 123 | Any future date | Any | Requires 3DS Auth |
| 4000 0000 0000 0002 | 123 | Any future date | Any | Card declined |

**Test UPI VPA:**
```
success@razorpay
failure@razorpay
```

### Unit Tests

**File:** `server/src/__tests__/services/razorpay.service.test.ts`

```typescript
import { RazorpayService } from '../../infrastructure/external/payment/razorpay/RazorpayService';

describe('RazorpayService', () => {
  let service: RazorpayService;

  beforeEach(() => {
    process.env.RAZORPAY_MODE = 'test';
    process.env.RAZORPAY_TEST_KEY_ID = 'rzp_test_123';
    process.env.RAZORPAY_TEST_KEY_SECRET = 'test_secret_123';
    service = new RazorpayService();
  });

  describe('createOrder', () => {
    it('should create order with valid amount', async () => {
      const order = await service.createOrder({
        amount: 599.50,
        notes: { orderId: 'test123' },
      });

      expect(order.amount).toBe(59950);  // Amount in paise
      expect(order.currency).toBe('INR');
      expect(order.status).toBe('created');
    });

    it('should reject amount below minimum', async () => {
      await expect(
        service.createOrder({ amount: 0.50 })
      ).rejects.toThrow('Minimum order amount is ₹1.00');
    });
  });

  describe('verifyPaymentSignature', () => {
    it('should verify valid signature', () => {
      const orderId = 'order_test123';
      const paymentId = 'pay_test123';

      // Generate valid signature
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_TEST_KEY_SECRET!)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const isValid = service.verifyPaymentSignature({
        orderId,
        paymentId,
        signature,
      });

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const isValid = service.verifyPaymentSignature({
        orderId: 'order_test123',
        paymentId: 'pay_test123',
        signature: 'invalid_signature',
      });

      expect(isValid).toBe(false);
    });
  });
});
```

### Integration Tests

**File:** `server/src/__tests__/integration/payment.test.ts`

```typescript
import request from 'supertest';
import app from '../../index';

describe('Payment Integration', () => {
  it('should create payment order', async () => {
    const response = await request(app)
      .post('/api/v1/payment/create-order')
      .send({
        orderId: 'test_order_123',
        amount: 599.50,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.order.razorpayOrderId).toBeDefined();
    expect(response.body.order.keyId).toMatch(/^rzp_test_/);
  });

  it('should verify payment with valid signature', async () => {
    // Create order first
    const orderRes = await request(app)
      .post('/api/v1/payment/create-order')
      .send({ orderId: 'test_order_123', amount: 599.50 });

    const { razorpayOrderId } = orderRes.body.order;
    const paymentId = 'pay_test123';

    // Generate signature
    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_TEST_KEY_SECRET!)
      .update(`${razorpayOrderId}|${paymentId}`)
      .digest('hex');

    // Verify payment
    const response = await request(app)
      .post('/api/v1/payment/verify')
      .send({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

### Manual Testing Checklist

- [ ] Create test order with ₹599.50 amount
- [ ] Complete payment using test card (4111 1111 1111 1111)
- [ ] Verify signature validation works
- [ ] Test payment failure scenario (use 4000 0000 0000 0002)
- [ ] Test UPI payment with `success@razorpay`
- [ ] Verify webhook signature validation
- [ ] Test full refund
- [ ] Test partial refund
- [ ] Verify order status updates correctly
- [ ] Test with invalid API keys (should fail gracefully)

---

## Implementation Checklist

### Week 3, Day 1: Setup & Infrastructure (4 hours)

- [ ] Install Razorpay SDK: `npm install razorpay`
- [ ] Install types: `npm install --save-dev @types/razorpay`
- [ ] Add environment variables to `.env.example`
- [ ] Create Razorpay test account
- [ ] Generate test API keys
- [ ] Set up webhook endpoint on Razorpay dashboard
- [ ] Create `RazorpayService.ts` class structure
- [ ] Create `RazorpayError.ts` custom error class
- [ ] Add TypeScript interfaces for all Razorpay types
- [ ] Configure `express.raw()` middleware for webhooks

### Week 3, Day 2: Core Implementation (6 hours)

- [ ] Implement `createOrder()` method
- [ ] Implement `verifyPaymentSignature()` method
- [ ] Implement `fetchPayment()` method
- [ ] Implement `createRefund()` method
- [ ] Create `PaymentController` with routes:
  - [ ] `POST /api/v1/payment/create-order`
  - [ ] `POST /api/v1/payment/verify`
  - [ ] `POST /api/v1/payment/refund`
- [ ] Create `RazorpayWebhookController`
- [ ] Implement webhook signature verification
- [ ] Implement webhook event handlers:
  - [ ] `payment.captured`
  - [ ] `payment.failed`
  - [ ] `refund.processed`
- [ ] Add error handling for all methods
- [ ] Add request validation using Zod schemas

### Week 3, Day 3: Testing & Documentation (4 hours)

- [ ] Write unit tests for `RazorpayService` (target: 80% coverage)
- [ ] Write integration tests for payment flow
- [ ] Write webhook integration tests
- [ ] Manual testing with Razorpay test cards
- [ ] Test UPI payment flow
- [ ] Test refund flow (full and partial)
- [ ] Test failure scenarios
- [ ] Add JSDoc comments to all public methods
- [ ] Update API documentation
- [ ] Create Postman collection for payment endpoints

### Week 3, Day 4: Security & Production Readiness (3 hours)

- [ ] Add rate limiting to payment endpoints
- [ ] Implement request logging (sanitized)
- [ ] Set up AWS Secrets Manager for production keys
- [ ] Add idempotency handling
- [ ] Configure CORS for payment routes
- [ ] Add CSRF protection
- [ ] Security audit of payment flow
- [ ] Penetration testing for signature bypass attempts
- [ ] Load testing for concurrent payments

### Week 3, Day 5: Frontend Integration & Launch (3 hours)

- [ ] Integrate Razorpay Checkout SDK in React frontend
- [ ] Implement payment initiation UI
- [ ] Implement payment success/failure handling
- [ ] Add payment status polling (for async updates)
- [ ] Test end-to-end payment flow
- [ ] Deploy to staging environment
- [ ] Complete KYC verification for live keys
- [ ] Switch to live mode
- [ ] Production deployment
- [ ] Monitor first 10 live transactions

---

## Future Enhancements

### Phase 2 (Week 8-10)

- [ ] Implement recurring payments (subscriptions)
- [ ] Add payment links (for COD to prepaid conversion)
- [ ] Implement QR code payments
- [ ] Add installment/EMI options
- [ ] Integrate Razorpay Route (split payments for multi-vendor)

### Phase 3 (Week 12-14)

- [ ] Implement smart collect (UPI auto-debit)
- [ ] Add payment analytics dashboard
- [ ] Implement automated refund policies
- [ ] Add fraud detection rules
- [ ] Integrate with accounting software (Tally, QuickBooks)

---

## Additional Resources

### Official Documentation

- [Razorpay API Documentation](https://razorpay.com/docs/api/)
- [Node.js Integration Guide](https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/)
- [Webhook Documentation](https://razorpay.com/docs/webhooks/)
- [Razorpay Postman Collection](https://www.postman.com/razorpaydev/razorpay-public-workspace/documentation/mfu7vaw/razorpay-apis)

### Community Resources

- [Razorpay GitHub](https://github.com/razorpay)
- [GeeksforGeeks Razorpay Tutorial](https://www.geeksforgeeks.org/node-js/razorpay-payment-integration-using-node-js/)
- [Medium: Complete Integration Guide](https://medium.com/@anujgupta5686/a-complete-guide-to-razorpay-payment-gateway-integration-from-scratch-to-verification-cc7ec4e1eac1)

### Support Channels

- **Email:** support@razorpay.com
- **Dashboard:** Help & Support section
- **Phone:** +91-80-61206183 (for KYC issues)
- **Status Page:** status.razorpay.com

---

**Document Version:** 1.0
**Last Updated:** 2025-01-XX
**Prepared By:** Claude Sonnet 4.5 (CANON Methodology)
**Review Status:** Ready for Implementation

---

**END OF DOCUMENT**
