/**
 * Mock Data Service
 * 
 * Generates realistic mock data for COD settlements and payout verifications.
 * Used when feature flags are set to mock mode (default).
 * 
 * This allows the system to function immediately while real APIs
 * are being integrated, with realistic simulation of success/failure scenarios.
 */

import { faker } from '@faker-js/faker';
import logger from '../../../../shared/logger/winston.logger';

export class MockDataService {
    /**
     * Generate mock Velocity settlement response
     * Simulates the response from Velocity API when checking settlement status
     * 
     * @param remittanceId - ID of the remittance to generate settlement for
     * @param amount - Amount being settled
     * @returns Mock settlement data object
     */
    static generateSettlement(remittanceId: string, amount: number) {
        // 95% success rate for settlements
        const isSuccessful = Math.random() < 0.95;

        const settlement = {
            settlementId: `VEL-SETTLE-${Date.now()}-${faker.string.alphanumeric(6).toUpperCase()}`,
            remittanceId,
            amount,
            status: isSuccessful ? 'settled' : 'pending',
            settledAt: isSuccessful ? new Date() : null,
            failureReason: isSuccessful ? null : 'Pending bank confirmation',
            utr: isSuccessful ? `UTR${faker.string.numeric(16)}` : null,
            bankReference: isSuccessful ? `BNK${faker.string.numeric(12)}` : null,
        };

        logger.debug('Generated mock Velocity settlement', {
            remittanceId,
            status: settlement.status,
            settlementId: settlement.settlementId,
        });

        return settlement;
    }

    /**
     * Generate mock Razorpay payout verification response
     * Simulates the response from Razorpay API when checking payout status
     * 
     * @param razorpayPayoutId - Razorpay payout ID to verify
     * @returns Mock payout status object
     */
    static generatePayoutStatus(razorpayPayoutId: string) {
        // Weighted random: 85% processed, 10% processing, 5% failed
        const statuses = ['processed', 'processing', 'failed'];
        const weights = [0.85, 0.10, 0.05];

        const random = Math.random();
        let status: string;

        if (random < weights[0]) {
            status = 'processed';
        } else if (random < weights[0] + weights[1]) {
            status = 'processing';
        } else {
            status = 'failed';
        }

        const payoutData = {
            id: razorpayPayoutId,
            status,
            utr: status === 'processed' ? `UTR${faker.string.numeric(16)}` : null,
            failure_reason: status === 'failed' ? this.getRandomFailureReason() : null,
            processed_at: status === 'processed' ? Math.floor(Date.now() / 1000) : null,
            created_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
            amount: Math.floor(Math.random() * 100000) + 1000, // Random amount for realism
            currency: 'INR',
        };

        logger.debug('Generated mock Razorpay payout status', {
            razorpayPayoutId,
            status: payoutData.status,
        });

        return payoutData;
    }

    /**
     * Get realistic failure reasons for failed payouts
     */
    private static getRandomFailureReason(): string {
        const reasons = [
            'Insufficient balance in Razorpay account',
            'Invalid beneficiary bank account',
            'Beneficiary bank account closed',
            'Daily transaction limit exceeded',
            'Bank server not responding',
        ];

        return reasons[Math.floor(Math.random() * reasons.length)];
    }

    /**
     * Simulate API latency/delay
     * Helps simulate realistic network conditions
     * 
     * @param ms - Milliseconds to delay (default from env or 2000ms)
     * @returns Promise that resolves after delay
     */
    static async simulateDelay(ms?: number): Promise<void> {
        const delay = ms || parseInt(process.env.MOCK_SETTLEMENT_DELAY_MS || '2000');

        logger.debug(`Simulating API delay: ${delay}ms`);

        return new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Generate mock bank transfer details
     * Used for settlement records
     */
    static generateBankTransferDetails() {
        return {
            utr: `UTR${faker.string.numeric(16)}`,
            bankReference: `BNK${faker.string.numeric(12)}`,
            transferredAt: new Date(),
            remarks: 'COD Settlement - Velocity',
        };
    }
}

export default MockDataService;
