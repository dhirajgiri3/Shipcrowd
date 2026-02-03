/**
 * Wallet API Client
 * Centralized service for all wallet-related operations
 */

import { apiClient } from '@/src/core/api/http';
import {
  WalletBalance,
  WalletTransactionResponse,
  WalletStats,
  TransactionFilters,
  RechargeWalletPayload
} from '@/src/types/api/finance';

export class WalletApiService {
  /**
   * Get wallet balance
   * GET /api/v1/finance/wallet/balance
   */
  async getBalance(): Promise<WalletBalance> {
    const response = await apiClient.get('/finance/wallet/balance');
    return response.data.data;
  }

  /**
   * Get transaction history
   * GET /api/v1/finance/wallet/transactions
   */
  async getTransactions(filters?: TransactionFilters): Promise<WalletTransactionResponse> {
    const response = await apiClient.get('/finance/wallet/transactions', { params: filters });
    // Transform backend "data" array to "transactions" key to match interface
    return {
      transactions: response.data.data,
      // @ts-ignore - pagination exists in API response but not typed in axios response wrapper yet
      pagination: response.data.pagination
    };
  }

  /**
   * Recharge wallet
   * POST /api/v1/finance/wallet/recharge
   */
  async rechargeWallet(data: RechargeWalletPayload): Promise<{ transactionId: string; newBalance: number }> {
    const response = await apiClient.post('/finance/wallet/recharge', data);
    return response.data.data;
  }

  /**
   * Get wallet statistics
   * GET /api/v1/finance/wallet/stats
   */
  async getStats(dateRange?: { startDate?: string; endDate?: string }): Promise<WalletStats> {
    const response = await apiClient.get('/finance/wallet/stats', { params: dateRange });
    return response.data.data;
  }

  /**
   * Get spending insights
   * GET /api/v1/finance/wallet/insights
   */
  async getSpendingInsights(): Promise<any> {
    const response = await apiClient.get('/finance/wallet/insights');
    return response.data.data;
  }

  /**
   * Get wallet trends
   * GET /api/v1/finance/wallet/trends
   */
  async getWalletTrends(): Promise<any> {
    const response = await apiClient.get('/finance/wallet/trends');
    return response.data.data;
  }

  /**
   * Get available balance (Calculated metric)
   * GET /api/v1/finance/wallet/available-balance
   */
  async getAvailableBalance(): Promise<any> {
    const response = await apiClient.get('/finance/wallet/available-balance');
    return response.data.data;
  }

  /**
   * Get cash flow forecast
   * GET /api/v1/finance/wallet/cash-flow-forecast
   */
  async getCashFlowForecast(): Promise<any> {
    const response = await apiClient.get('/finance/wallet/cash-flow-forecast');
    return response.data.data;
  }

  /**
   * Update low balance threshold
   * PUT /api/v1/finance/wallet/threshold
   */
  async updateLowBalanceThreshold(threshold: number): Promise<{ success: boolean }> {
    const response = await apiClient.put('/finance/wallet/threshold', { threshold });
    return response.data.data;
  }

  /**
   * Refund a transaction (Admin only)
   * POST /api/v1/finance/wallet/refund/:transactionId
   */
  async refundTransaction(transactionId: string, reason: string): Promise<{ transactionId: string; newBalance: number }> {
    const response = await apiClient.post(`/finance/wallet/refund/${transactionId}`, { reason });
    return response.data.data;
  }
}

export const walletApi = new WalletApiService();
export default walletApi;
