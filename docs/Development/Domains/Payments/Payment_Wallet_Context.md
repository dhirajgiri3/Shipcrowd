# Payment & Wallet System Context

**Module:** Payment Processing & Balance Management
**Implementation Priority:** Week 3-4
**Current Status:** 50% Complete (Razorpay done, Wallet pending)
**Target Completion:** Week 4, Day 5

---

## Table of Contents

1. [Overview](#overview)
2. [Current Implementation Status](#current-implementation-status)
3. [Wallet Architecture](#wallet-architecture)
4. [Database Models](#database-models)
5. [Wallet Service](#wallet-service)
6. [Payment-Wallet Integration](#payment-wallet-integration)
7. [Shipment-Wallet Integration](#shipment-wallet-integration)
8. [API Endpoints](#api-endpoints)
9. [Transaction Flow](#transaction-flow)
10. [Race Condition Prevention](#race-condition-prevention)
11. [Low Balance Alerts](#low-balance-alerts)
12. [Testing Strategy](#testing-strategy)
13. [Implementation Roadmap](#implementation-roadmap)

---

## Overview

### Purpose

The Payment & Wallet System provides a unified financial management layer for Shipcrowd, handling:

1. **Payment Collection** - Accept prepaid payments via Razorpay
2. **Wallet Management** - Track company balances for shipping costs
3. **Transaction Tracking** - Immutable audit trail of all financial operations
4. **Balance Reservation** - Hold funds for pending shipments
5. **Automated Deductions** - Deduct shipping costs from wallet balance

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT & WALLET ECOSYSTEM                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Razorpay   │       │    Wallet    │       │   Shipment   │
│   Gateway    │──────>│   Service    │<──────│   Service    │
└──────────────┘       └──────────────┘       └──────────────┘
      │                       │                       │
      │                       │                       │
      v                       v                       v
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Payment    │       │  Transaction │       │   Balance    │
│    Model     │       │    Ledger    │       │   Reserve    │
└──────────────┘       └──────────────┘       └──────────────┘
```

---

## Current Implementation Status

### ✅ Completed (Week 3)

**Razorpay Payment Gateway Integration:**
- Payment order creation
- Payment capture and verification
- Webhook handling with signature verification
- Refund management
- Test mode and production configuration
- TypeScript interfaces for all API requests/responses
- Error handling with retry logic
- Documentation: [RAZORPAY_INTEGRATION.md](./Integrations/RAZORPAY_INTEGRATION.md)

**Models:**
- Payment model with Razorpay integration
- Payment transaction tracking

**Endpoints:**
- `POST /api/v1/payment/create-order` - Create Razorpay order
- `POST /api/v1/payment/verify` - Verify payment signature
- `POST /api/v1/payment/refund` - Initiate refund
- `POST /api/v1/webhooks/razorpay` - Handle Razorpay webhooks

### ❌ Pending (Week 4)

**Wallet System:**
- Wallet model (available/reserved/total balance tracking)
- WalletTransaction model (immutable ledger)
- WalletService (credit, debit, reserve, release operations)
- Optimistic locking for race condition prevention
- Low balance alerts
- Wallet-shipment integration
- Wallet-payment integration (credit on successful payment)

**Endpoints:**
- `GET /api/v1/wallet/balance` - Get wallet balance
- `GET /api/v1/wallet/transactions` - Transaction history
- `POST /api/v1/wallet/recharge` - Initiate wallet recharge
- `POST /api/v1/wallet/deduct` - Deduct balance (admin only)

---

## Wallet Architecture

### Core Concepts

**1. One Wallet Per Company**
Each company has a single wallet that tracks their shipping balance.

**2. Triple Balance System**
- **Available Balance** - Money ready to use
- **Reserved Balance** - Money held for pending shipments
- **Total Balance** - Available + Reserved

**3. Transaction Ledger**
Immutable record of all wallet operations with before/after snapshots.

**4. Optimistic Locking**
Prevents race conditions during concurrent balance updates using Mongoose version field (`__v`).

### Transaction Types

| Type | Description | Balance Impact |
|------|-------------|----------------|
| **CREDIT** | Add money to wallet | Available ↑ |
| **DEBIT** | Remove money from wallet | Available ↓ |
| **RESERVE** | Hold money for pending shipment | Available ↓, Reserved ↑ |
| **RELEASE** | Unlock reserved money | Available ↑, Reserved ↓ |

### Use Cases

**1. Wallet Recharge**
```
User pays ₹5,000 via Razorpay
→ Payment webhook received
→ CREDIT wallet with ₹5,000
→ Available: ₹5,000, Reserved: ₹0, Total: ₹5,000
```

**2. Shipment Creation**
```
Create shipment (estimated cost: ₹150)
→ RESERVE ₹150 from available balance
→ Available: ₹4,850, Reserved: ₹150, Total: ₹5,000
```

**3. Shipment Dispatch (Actual cost: ₹140)**
```
Shipment dispatched
→ DEBIT ₹140 from reserved balance
→ RELEASE ₹10 back to available balance
→ Available: ₹4,860, Reserved: ₹0, Total: ₹4,860
```

**4. Shipment Cancellation**
```
Shipment cancelled
→ RELEASE ₹150 back to available balance
→ Available: ₹5,000, Reserved: ₹0, Total: ₹5,000
```

---

## Database Models

### Wallet Model

**File:** `server/src/infrastructure/database/mongoose/models/Wallet.ts`

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface IWallet extends Document {
  companyId: mongoose.Types.ObjectId;
  availableBalance: number;  // Money ready to use
  reservedBalance: number;   // Money held for pending shipments
  totalBalance: number;      // Available + Reserved (computed)
  lowBalanceThreshold: number;  // Alert threshold (default: ₹1,000)
  lastTransactionAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  hasEnoughBalance(amount: number): boolean;
  isLowBalance(): boolean;
}

const WalletSchema = new Schema<IWallet>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      unique: true,  // One wallet per company
      index: true
    },
    availableBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    reservedBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    totalBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    lowBalanceThreshold: {
      type: Number,
      default: 1000  // ₹1,000 default
    },
    lastTransactionAt: Date
  },
  {
    timestamps: true
  }
);

// Pre-save hook to update totalBalance
WalletSchema.pre('save', function(next) {
  this.totalBalance = this.availableBalance + this.reservedBalance;
  next();
});

// Instance methods
WalletSchema.methods.hasEnoughBalance = function(amount: number): boolean {
  return this.availableBalance >= amount;
};

WalletSchema.methods.isLowBalance = function(): boolean {
  return this.availableBalance < this.lowBalanceThreshold;
};

// Indexes
WalletSchema.index({ availableBalance: 1 });  // For low balance queries

const Wallet = mongoose.model<IWallet>('Wallet', WalletSchema);
export default Wallet;
```

**Design Decisions:**
- `unique: true` on companyId ensures one wallet per company
- `min: 0` prevents negative balances
- Pre-save hook automatically updates totalBalance
- Indexed on availableBalance for efficient low-balance queries

---

### WalletTransaction Model

**File:** `server/src/infrastructure/database/mongoose/models/WalletTransaction.ts`

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface IWalletTransaction extends Document {
  walletId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  type: 'CREDIT' | 'DEBIT' | 'RESERVE' | 'RELEASE';
  amount: number;
  balanceBefore: {
    available: number;
    reserved: number;
    total: number;
  };
  balanceAfter: {
    available: number;
    reserved: number;
    total: number;
  };
  referenceType: 'PAYMENT' | 'SHIPMENT' | 'REFUND' | 'ADJUSTMENT' | 'MANUAL';
  referenceId?: mongoose.Types.ObjectId;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  initiatedBy?: mongoose.Types.ObjectId;  // User who initiated
  metadata?: Map<string, any>;
  createdAt: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    walletId: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
      index: true
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['CREDIT', 'DEBIT', 'RESERVE', 'RELEASE'],
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    balanceBefore: {
      available: { type: Number, required: true },
      reserved: { type: Number, required: true },
      total: { type: Number, required: true }
    },
    balanceAfter: {
      available: { type: Number, required: true },
      reserved: { type: Number, required: true },
      total: { type: Number, required: true }
    },
    referenceType: {
      type: String,
      enum: ['PAYMENT', 'SHIPMENT', 'REFUND', 'ADJUSTMENT', 'MANUAL'],
      required: true,
      index: true
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      index: true
    },
    description: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'failed'],
      default: 'completed',
      index: true
    },
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }  // Immutable - no updates
  }
);

// Compound indexes for common query patterns
WalletTransactionSchema.index({ walletId: 1, createdAt: -1 });  // Transaction history
WalletTransactionSchema.index({ companyId: 1, createdAt: -1 });  // Company transactions
WalletTransactionSchema.index({ referenceType: 1, referenceId: 1 });  // Lookup by reference

const WalletTransaction = mongoose.model<IWalletTransaction>('WalletTransaction', WalletTransactionSchema);
export default WalletTransaction;
```

**Design Decisions:**
- Immutable records (no updates, only creates)
- Balance snapshots (before/after) for complete audit trail
- Compound indexes for efficient querying
- Status field for future async operations
- Metadata field for extensibility

---

## Wallet Service

**File:** `server/src/core/application/services/wallet/wallet.service.ts`

```typescript
import Wallet, { IWallet } from '../../../../infrastructure/database/mongoose/models/Wallet';
import WalletTransaction from '../../../../infrastructure/database/mongoose/models/WalletTransaction';
import { updateWithOptimisticLocking, withTransaction } from '../../../../shared/utils/optimisticLocking';
import { InsufficientBalanceError } from '../../../../shared/errors/AppError';
import logger from '../../../../shared/logger/winston.logger';

export interface CreditWalletDTO {
  companyId: string;
  amount: number;
  referenceType: 'PAYMENT' | 'REFUND' | 'ADJUSTMENT' | 'MANUAL';
  referenceId?: string;
  description: string;
  initiatedBy?: string;
}

export interface DebitWalletDTO {
  companyId: string;
  amount: number;
  referenceType: 'SHIPMENT' | 'ADJUSTMENT' | 'MANUAL';
  referenceId?: string;
  description: string;
  initiatedBy?: string;
}

export interface ReserveBalanceDTO {
  companyId: string;
  amount: number;
  referenceType: 'SHIPMENT';
  referenceId: string;
  description: string;
  initiatedBy?: string;
}

export class WalletService {
  /**
   * Get or create wallet for a company
   */
  async getOrCreateWallet(companyId: string): Promise<IWallet> {
    let wallet = await Wallet.findOne({ companyId });

    if (!wallet) {
      wallet = await Wallet.create({
        companyId,
        availableBalance: 0,
        reservedBalance: 0,
        totalBalance: 0
      });
      logger.info(`Wallet created for company ${companyId}`);
    }

    return wallet;
  }

  /**
   * Credit wallet (add money)
   * Used for: Wallet recharge, refunds, manual adjustments
   */
  async creditWallet(data: CreditWalletDTO): Promise<WalletTransaction> {
    return withTransaction(async (session) => {
      const wallet = await this.getOrCreateWallet(data.companyId);

      // Capture balance before
      const balanceBefore = {
        available: wallet.availableBalance,
        reserved: wallet.reservedBalance,
        total: wallet.totalBalance
      };

      // Update wallet with optimistic locking
      const updatedWallet = await updateWithOptimisticLocking(
        Wallet,
        { _id: wallet._id },
        {
          $inc: { availableBalance: data.amount },
          lastTransactionAt: new Date()
        },
        { session }
      );

      // Create transaction record
      const transaction = await WalletTransaction.create([{
        walletId: wallet._id,
        companyId: data.companyId,
        type: 'CREDIT',
        amount: data.amount,
        balanceBefore,
        balanceAfter: {
          available: updatedWallet.availableBalance,
          reserved: updatedWallet.reservedBalance,
          total: updatedWallet.totalBalance
        },
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        description: data.description,
        status: 'completed',
        initiatedBy: data.initiatedBy
      }], { session });

      logger.info(`Wallet credited: ₹${data.amount} for company ${data.companyId}`);

      return transaction[0];
    });
  }

  /**
   * Debit wallet (remove money)
   * Used for: Shipment costs, manual adjustments
   */
  async debitWallet(data: DebitWalletDTO): Promise<WalletTransaction> {
    return withTransaction(async (session) => {
      const wallet = await this.getOrCreateWallet(data.companyId);

      // Check sufficient balance
      if (wallet.availableBalance < data.amount) {
        throw new InsufficientBalanceError(
          `Insufficient balance. Available: ₹${wallet.availableBalance}, Required: ₹${data.amount}`
        );
      }

      const balanceBefore = {
        available: wallet.availableBalance,
        reserved: wallet.reservedBalance,
        total: wallet.totalBalance
      };

      // Debit wallet
      const updatedWallet = await updateWithOptimisticLocking(
        Wallet,
        { _id: wallet._id },
        {
          $inc: { availableBalance: -data.amount },
          lastTransactionAt: new Date()
        },
        { session }
      );

      // Create transaction
      const transaction = await WalletTransaction.create([{
        walletId: wallet._id,
        companyId: data.companyId,
        type: 'DEBIT',
        amount: data.amount,
        balanceBefore,
        balanceAfter: {
          available: updatedWallet.availableBalance,
          reserved: updatedWallet.reservedBalance,
          total: updatedWallet.totalBalance
        },
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        description: data.description,
        status: 'completed',
        initiatedBy: data.initiatedBy
      }], { session });

      // Check low balance alert
      if (updatedWallet.isLowBalance()) {
        await this.sendLowBalanceAlert(updatedWallet);
      }

      logger.info(`Wallet debited: ₹${data.amount} for company ${data.companyId}`);

      return transaction[0];
    });
  }

  /**
   * Reserve balance (move from available to reserved)
   * Used for: Pending shipment creation
   */
  async reserveBalance(data: ReserveBalanceDTO): Promise<WalletTransaction> {
    return withTransaction(async (session) => {
      const wallet = await this.getOrCreateWallet(data.companyId);

      if (wallet.availableBalance < data.amount) {
        throw new InsufficientBalanceError('Insufficient balance to reserve');
      }

      const balanceBefore = {
        available: wallet.availableBalance,
        reserved: wallet.reservedBalance,
        total: wallet.totalBalance
      };

      // Move from available to reserved
      const updatedWallet = await updateWithOptimisticLocking(
        Wallet,
        { _id: wallet._id },
        {
          $inc: {
            availableBalance: -data.amount,
            reservedBalance: data.amount
          },
          lastTransactionAt: new Date()
        },
        { session }
      );

      const transaction = await WalletTransaction.create([{
        walletId: wallet._id,
        companyId: data.companyId,
        type: 'RESERVE',
        amount: data.amount,
        balanceBefore,
        balanceAfter: {
          available: updatedWallet.availableBalance,
          reserved: updatedWallet.reservedBalance,
          total: updatedWallet.totalBalance
        },
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        description: data.description,
        status: 'completed',
        initiatedBy: data.initiatedBy
      }], { session });

      return transaction[0];
    });
  }

  /**
   * Release reserved balance (move from reserved to available)
   * Used for: Shipment cancellation, overestimated costs
   */
  async releaseReservedBalance(data: ReserveBalanceDTO): Promise<WalletTransaction> {
    return withTransaction(async (session) => {
      const wallet = await this.getOrCreateWallet(data.companyId);

      if (wallet.reservedBalance < data.amount) {
        throw new ValidationError('Insufficient reserved balance');
      }

      const balanceBefore = {
        available: wallet.availableBalance,
        reserved: wallet.reservedBalance,
        total: wallet.totalBalance
      };

      // Move from reserved back to available
      const updatedWallet = await updateWithOptimisticLocking(
        Wallet,
        { _id: wallet._id },
        {
          $inc: {
            availableBalance: data.amount,
            reservedBalance: -data.amount
          },
          lastTransactionAt: new Date()
        },
        { session }
      );

      const transaction = await WalletTransaction.create([{
        walletId: wallet._id,
        companyId: data.companyId,
        type: 'RELEASE',
        amount: data.amount,
        balanceBefore,
        balanceAfter: {
          available: updatedWallet.availableBalance,
          reserved: updatedWallet.reservedBalance,
          total: updatedWallet.totalBalance
        },
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        description: data.description,
        status: 'completed',
        initiatedBy: data.initiatedBy
      }], { session });

      return transaction[0];
    });
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(companyId: string): Promise<{
    available: number;
    reserved: number;
    total: number;
    isLowBalance: boolean;
    lowBalanceThreshold: number;
  }> {
    const wallet = await this.getOrCreateWallet(companyId);

    return {
      available: wallet.availableBalance,
      reserved: wallet.reservedBalance,
      total: wallet.totalBalance,
      isLowBalance: wallet.isLowBalance(),
      lowBalanceThreshold: wallet.lowBalanceThreshold
    };
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    companyId: string,
    options: {
      page?: number;
      limit?: number;
      type?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    data: WalletTransaction[];
    total: number;
    page: number;
    pages: number;
  }> {
    const { page = 1, limit = 20, type, startDate, endDate } = options;

    const wallet = await this.getOrCreateWallet(companyId);

    const filter: any = { walletId: wallet._id };

    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const transactions = await WalletTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('initiatedBy', 'firstName lastName');

    const total = await WalletTransaction.countDocuments(filter);

    return {
      data: transactions,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * Send low balance alert
   */
  private async sendLowBalanceAlert(wallet: IWallet): Promise<void> {
    // TODO: Implement notification service integration
    logger.warn(`Low balance alert for company ${wallet.companyId}: ₹${wallet.availableBalance}`);
  }
}
```

---

## Payment-Wallet Integration

### Razorpay Webhook → Wallet Credit

**File:** `server/src/infrastructure/external/payment/razorpay/RazorpayWebhookHandler.ts`

```typescript
private async processPaymentSuccess(payment: Payment) {
  const purpose = payment.notes?.get('purpose');

  if (purpose === 'wallet_recharge') {
    // Credit wallet
    const amountInRupees = payment.amount / 100; // Convert paise to rupees

    await walletService.creditWallet({
      companyId: payment.companyId.toString(),
      amount: amountInRupees,
      referenceType: 'PAYMENT',
      referenceId: payment._id.toString(),
      description: `Wallet recharge via Razorpay (${payment.razorpayPaymentId})`,
      initiatedBy: payment.userId.toString()
    });

    logger.info(`Wallet credited: ₹${amountInRupees} for company ${payment.companyId}`);
  }
}
```

---

## Shipment-Wallet Integration

**File:** `server/src/core/application/services/shipping/shipment.service.ts`

```typescript
async createShipment(order: Order): Promise<Shipment> {
  // 1. Calculate estimated shipping cost
  const estimatedCost = await this.calculateShippingCost(order);

  // 2. Reserve balance in wallet
  await walletService.reserveBalance({
    companyId: order.companyId.toString(),
    amount: estimatedCost,
    referenceType: 'SHIPMENT',
    referenceId: order._id.toString(),
    description: `Reserve for shipment ${order.orderNumber}`
  });

  try {
    // 3. Create shipment with courier
    const shipment = await courierService.createShipment(order);

    // 4. Debit actual cost from reserved balance
    const actualCost = shipment.shippingCost || estimatedCost;

    await walletService.debitWallet({
      companyId: order.companyId.toString(),
      amount: actualCost,
      referenceType: 'SHIPMENT',
      referenceId: shipment._id.toString(),
      description: `Shipping cost for ${shipment.trackingNumber}`
    });

    // 5. Release difference if estimated > actual
    if (estimatedCost > actualCost) {
      await walletService.releaseReservedBalance({
        companyId: order.companyId.toString(),
        amount: estimatedCost - actualCost,
        referenceType: 'SHIPMENT',
        referenceId: shipment._id.toString(),
        description: `Release overestimated cost for ${shipment.trackingNumber}`
      });
    }

    return shipment;
  } catch (error) {
    // Rollback: Release reserved balance
    await walletService.releaseReservedBalance({
      companyId: order.companyId.toString(),
      amount: estimatedCost,
      referenceType: 'SHIPMENT',
      referenceId: order._id.toString(),
      description: `Rollback reservation for failed shipment`
    });

    throw error;
  }
}

async cancelShipment(shipmentId: string, reason: string): Promise<void> {
  const shipment = await Shipment.findById(shipmentId);

  // Cancel with courier
  await courierService.cancelShipment(shipment.trackingNumber, reason);

  // Credit back to wallet
  if (shipment.shippingCost && shipment.shippingCost > 0) {
    await walletService.creditWallet({
      companyId: shipment.companyId.toString(),
      amount: shipment.shippingCost,
      referenceType: 'SHIPMENT',
      referenceId: shipment._id.toString(),
      description: `Refund for cancelled shipment ${shipment.trackingNumber}`,
    });
  }

  // Update shipment status
  await Shipment.findByIdAndUpdate(shipmentId, {
    status: 'cancelled',
    cancellationReason: reason
  });
}
```

---

## API Endpoints

### 1. Get Wallet Balance

**Endpoint:** `GET /api/v1/wallet/balance`

**Response:**
```json
{
  "success": true,
  "data": {
    "available": 4850.50,
    "reserved": 150.00,
    "total": 5000.50,
    "isLowBalance": false,
    "lowBalanceThreshold": 1000
  }
}
```

### 2. Get Transaction History

**Endpoint:** `GET /api/v1/wallet/transactions`

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 20)
- `type` (string) - Filter by type (CREDIT, DEBIT, RESERVE, RELEASE)
- `startDate` (string) - Filter from date
- `endDate` (string) - Filter to date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "tx_123",
      "type": "CREDIT",
      "amount": 5000,
      "balanceBefore": {
        "available": 0,
        "reserved": 0,
        "total": 0
      },
      "balanceAfter": {
        "available": 5000,
        "reserved": 0,
        "total": 5000
      },
      "referenceType": "PAYMENT",
      "description": "Wallet recharge via Razorpay",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "pages": 3
}
```

### 3. Initiate Wallet Recharge

**Endpoint:** `POST /api/v1/wallet/recharge`

**Request:**
```json
{
  "amount": 5000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "razorpayOrderId": "order_ABC123",
    "amount": 500000,
    "currency": "INR",
    "keyId": "rzp_test_1234567890"
  }
}
```

### 4. Deduct Balance (Admin Only)

**Endpoint:** `POST /api/v1/wallet/deduct`

**Request:**
```json
{
  "companyId": "comp_123",
  "amount": 100,
  "reason": "Penalty for policy violation"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "tx_456",
    "amount": 100,
    "newBalance": {
      "available": 4900,
      "reserved": 0,
      "total": 4900
    }
  }
}
```

---

## Transaction Flow

### Complete Flow: Recharge → Shipment → Deduction

```
Step 1: Wallet Recharge
┌──────────────────────────────────────────────────────┐
│ User clicks "Recharge ₹5,000"                        │
│ ↓                                                    │
│ POST /api/v1/wallet/recharge                         │
│ ↓                                                    │
│ Create Razorpay order                                │
│ ↓                                                    │
│ User pays via Razorpay                               │
│ ↓                                                    │
│ Webhook: payment.captured                            │
│ ↓                                                    │
│ CREDIT wallet ₹5,000                                 │
│ ↓                                                    │
│ Balance: Available=₹5,000, Reserved=₹0, Total=₹5,000 │
└──────────────────────────────────────────────────────┘

Step 2: Shipment Creation
┌──────────────────────────────────────────────────────┐
│ Create shipment (estimated cost: ₹150)               │
│ ↓                                                    │
│ RESERVE ₹150                                         │
│ ↓                                                    │
│ Balance: Available=₹4,850, Reserved=₹150, Total=₹5,000│
└──────────────────────────────────────────────────────┘

Step 3: Shipment Dispatch
┌──────────────────────────────────────────────────────┐
│ Shipment dispatched (actual cost: ₹140)              │
│ ↓                                                    │
│ DEBIT ₹140                                           │
│ ↓                                                    │
│ RELEASE ₹10 (overestimation)                         │
│ ↓                                                    │
│ Balance: Available=₹4,860, Reserved=₹0, Total=₹4,860 │
└──────────────────────────────────────────────────────┘
```

---

## Race Condition Prevention

### Problem: Concurrent Balance Updates

**Scenario:**
```
Thread A: Deduct ₹100
Thread B: Deduct ₹200
Both read balance = ₹1,000

Thread A: Updates balance to ₹900
Thread B: Updates balance to ₹800 (overwrites Thread A)

Result: Only ₹200 deducted, ₹100 lost!
```

### Solution: Optimistic Locking

**File:** `server/src/shared/utils/optimisticLocking.ts`

```typescript
export async function updateWithOptimisticLocking<T>(
  Model: any,
  query: any,
  update: any,
  options: { session?: any; maxRetries?: number } = {}
): Promise<T> {
  const { session, maxRetries = 3 } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Find current document
    const doc = await Model.findOne(query).session(session);
    if (!doc) throw new Error('Document not found');

    const currentVersion = doc.__v;

    // Attempt update with version check
    const result = await Model.findOneAndUpdate(
      { ...query, __v: currentVersion },
      { ...update, $inc: { __v: 1 } },
      { new: true, session }
    );

    if (result) {
      return result;
    }

    // Version conflict - retry
    logger.warn(`Optimistic locking conflict, retrying (${attempt + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, 10 * (attempt + 1)));
  }

  throw new Error('Optimistic locking failed after retries');
}
```

---

## Low Balance Alerts

### Notification Trigger

```typescript
// In WalletService.debitWallet()
if (updatedWallet.isLowBalance()) {
  await this.sendLowBalanceAlert(updatedWallet);
}
```

### Alert Implementation

```typescript
private async sendLowBalanceAlert(wallet: IWallet): Promise<void> {
  // Get company admins
  const admins = await User.find({
    companyId: wallet.companyId,
    role: { $in: ['admin', 'owner'] }
  });

  // Send email notification
  await emailService.send({
    to: admins.map(a => a.email),
    subject: 'Low Wallet Balance Alert',
    template: 'low-balance-alert',
    data: {
      availableBalance: wallet.availableBalance,
      threshold: wallet.lowBalanceThreshold,
      rechargeUrl: `${process.env.BACKEND_URL}/wallet/recharge`
    }
  });

  // Send in-app notification
  await notificationService.create({
    companyId: wallet.companyId,
    type: 'LOW_BALANCE',
    message: `Wallet balance is low (₹${wallet.availableBalance}). Please recharge to avoid service interruption.`,
    severity: 'warning'
  });
}
```

---

## Testing Strategy

### Unit Tests

**File:** `server/src/__tests__/services/wallet.service.test.ts`

```typescript
describe('WalletService', () => {
  describe('creditWallet', () => {
    it('should credit wallet successfully', async () => {
      const wallet = await createTestWallet({ availableBalance: 1000 });

      await walletService.creditWallet({
        companyId: wallet.companyId.toString(),
        amount: 500,
        referenceType: 'PAYMENT',
        description: 'Test credit'
      });

      const updated = await Wallet.findById(wallet._id);
      expect(updated.availableBalance).toBe(1500);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent debits safely', async () => {
      const wallet = await createTestWallet({ availableBalance: 1000 });

      // 5 concurrent debits
      const debits = Array(5).fill(null).map(() =>
        walletService.debitWallet({
          companyId: wallet.companyId.toString(),
          amount: 100,
          referenceType: 'SHIPMENT',
          description: 'Test debit'
        })
      );

      await Promise.all(debits);

      const updated = await Wallet.findById(wallet._id);
      expect(updated.availableBalance).toBe(500); // 1000 - 5*100
    });
  });
});
```

---

## Implementation Roadmap

### Week 4, Day 1: Wallet Models (4 hours)

- [ ] Create Wallet model with triple balance system
- [ ] Create WalletTransaction model with balance snapshots
- [ ] Add indexes for efficient querying
- [ ] Write model unit tests

### Week 4, Day 2: Wallet Service (6 hours)

- [ ] Implement getOrCreateWallet()
- [ ] Implement creditWallet() with optimistic locking
- [ ] Implement debitWallet() with balance checks
- [ ] Implement reserveBalance()
- [ ] Implement releaseReservedBalance()
- [ ] Implement getWalletBalance()
- [ ] Implement getTransactionHistory()
- [ ] Write service unit tests (target: 80% coverage)

### Week 4, Day 3: Integrations (6 hours)

- [ ] Update Razorpay webhook to credit wallet
- [ ] Update ShipmentService to reserve/debit/release
- [ ] Add rollback logic for failed shipments
- [ ] Implement low balance alerts
- [ ] Write integration tests

### Week 4, Day 4: API & Testing (6 hours)

- [ ] Create WalletController
- [ ] Implement GET /api/v1/wallet/balance
- [ ] Implement GET /api/v1/wallet/transactions
- [ ] Implement POST /api/v1/wallet/recharge
- [ ] Implement POST /api/v1/wallet/deduct (admin)
- [ ] Add request validation schemas
- [ ] Write API integration tests

### Week 4, Day 5: Documentation & Polish (4 hours)

- [ ] Write API documentation
- [ ] Update context package (this document)
- [ ] Manual testing with full flow
- [ ] Load testing for concurrent operations
- [ ] Performance optimization

**Target:** 100% Wallet System completion by Week 4, Day 5

---

**Document Version:** 1.0
**Last Updated:** 2025-01-XX
**Prepared By:** Claude Sonnet 4.5 (CANON Methodology)
**Review Status:** Ready for Week 4 Implementation

---

**END OF DOCUMENT**
