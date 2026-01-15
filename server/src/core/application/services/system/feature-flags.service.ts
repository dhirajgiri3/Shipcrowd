/**
 * Feature Flag Service
 * 
 * Centralized feature flag management for toggling between mock and real APIs.
 * This allows the system to work immediately with mock data while being ready
 * to switch to real API calls when integrations are complete.
 * 
 * Usage:
 * - Set USE_REAL_VELOCITY_API=true in .env when Velocity settlement API is ready
 * - Set USE_REAL_RAZORPAY_API=true in .env when Razorpay payout verification is ready
 */

import logger from '../../../../shared/logger/winston.logger';

export class FeatureFlagService {
    /**
     * Check if real Velocity API should be used for COD settlements
     * @returns boolean - true if real API should be called
     */
    static useRealVelocityAPI(): boolean {
        const useReal = process.env.USE_REAL_VELOCITY_API === 'true';

        if (useReal) {
            logger.info('Feature flag: Using REAL Velocity API for settlements');
        } else {
            logger.debug('Feature flag: Using MOCK mode for Velocity settlements');
        }

        return useReal;
    }

    /**
     * Check if real Razorpay payout verification should be used
     * @returns boolean - true if real API should be called
     */
    static useRealRazorpayAPI(): boolean {
        const useReal = process.env.USE_REAL_RAZORPAY_API === 'true';

        if (useReal) {
            logger.info('Feature flag: Using REAL Razorpay API for payout verification');
        } else {
            logger.debug('Feature flag: Using MOCK mode for Razorpay verification');
        }

        return useReal;
    }

    /**
     * Get mock configuration settings
     * @returns object with mock behavior settings
     */
    static getMockConfig() {
        const config = {
            settlementDelayMs: parseInt(process.env.MOCK_SETTLEMENT_DELAY_MS || '2000'),
            payoutSuccessRate: parseFloat(process.env.MOCK_PAYOUT_SUCCESS_RATE || '0.95'),
        };

        logger.debug('Mock configuration loaded', config);

        return config;
    }

    /**
     * Get all feature flags status (for debugging/admin dashboard)
     * @returns object with all feature flag states
     */
    static getAllFlags() {
        return {
            useRealVelocityAPI: this.useRealVelocityAPI(),
            useRealRazorpayAPI: this.useRealRazorpayAPI(),
            mockConfig: this.getMockConfig(),
            environment: process.env.NODE_ENV || 'development',
        };
    }
}

export default FeatureFlagService;
