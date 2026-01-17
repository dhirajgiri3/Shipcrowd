/**
 * Wallet API Types
 * 
 * Centralized type definitions for wallet-related API responses.
 * Matches backend schemas exactly from:
 * - /server/src/infrastructure/database/mongoose/models/finance/wallets/wallet-transaction.model.ts
 * - /server/src/presentation/http/controllers/finance/wallet.controller.ts
 */

// ==================== Wallet Balance ====================

export interface WalletBalance {
    balance: number;
    currency?: string;
    lastUpdated?: Date;
}

// ==================== Wallet Transaction ====================

export type TransactionType = 'credit' | 'debit';

export type TransactionReason =
    | 'recharge'
    | 'shipping_cost'
    | 'rto_charge'
    | 'cod_remittance'
    | 'refund'
    | 'other';

export type TransactionStatus = 'completed' | 'pending' | 'failed';

export interface WalletTransaction {
    _id: string;
    company: string;
    type: TransactionType;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    reason: TransactionReason;
    description: string;
    reference?: {
        type: string;
        id?: string;
        externalId?: string;
    };
    status: TransactionStatus;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}

// ==================== Filters & Pagination ====================

export interface TransactionFilters {
    type?: TransactionType;
    reason?: TransactionReason;
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
    page?: number;
    limit?: number;
}

export interface WalletPaginationMeta {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface WalletTransactionResponse {
    transactions: WalletTransaction[];
    pagination: WalletPaginationMeta;
}

// ==================== Wallet Statistics ====================

export interface WalletStats {
    totalCredits: number;
    totalDebits: number;
    netFlow: number;
    transactionCount: number;
    averageTransaction: number;
}

// ==================== Mutation Payloads ====================

export interface RechargeWalletPayload {
    amount: number;
    paymentId?: string;
}

export interface RechargeWalletResponse {
    transactionId: string;
    newBalance: number;
}

export interface WithdrawWalletPayload {
    amount: number;
    bankAccountId: string;
}

export interface TransferWalletPayload {
    fromType: string;
    toType: string;
    amount: number;
}
