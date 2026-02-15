import logger from '../../../../shared/logger/winston.logger';
import FeatureFlagService, { EvaluationContext } from '../system/feature-flag.service';

export const WALLET_AUTO_RECHARGE_FLAG_KEY = 'wallet_auto_recharge';

/**
 * Global gate for wallet auto-recharge.
 * Final decision = ENV kill switch AND DB feature-flag evaluation.
 *
 * Defaults to OFF for safety when either source is absent.
 */
export async function isWalletAutoRechargeFeatureEnabled(
    context: EvaluationContext = {}
): Promise<boolean> {
    const envEnabled = process.env.AUTO_RECHARGE_FEATURE_ENABLED === 'true';
    if (!envEnabled) {
        return false;
    }

    try {
        const dbEnabled = await FeatureFlagService.evaluate(
            WALLET_AUTO_RECHARGE_FLAG_KEY,
            context,
            false
        );
        return Boolean(dbEnabled);
    } catch (error) {
        logger.error('Failed to evaluate wallet auto-recharge feature flag', {
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}

