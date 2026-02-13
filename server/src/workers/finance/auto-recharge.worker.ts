import { Company } from '../../infrastructure/database/mongoose/models';
import WalletService from '../../core/application/services/wallet/wallet.service';
import logger from '../../shared/logger/winston.logger';
import pMap from 'p-map';
import autoRechargeMetrics from '../../core/application/services/metrics/auto-recharge-metrics.service';
import { isWalletAutoRechargeFeatureEnabled } from '../../core/application/services/wallet/wallet-feature-flags';

/**
 * Auto-Recharge Worker
 * Periodically checks company wallets and triggers recharge if below threshold.
 * Runs on a distributed cron (ensure only one instance runs via lock or single-scheduler).
 */
export const autoRechargeWorker = async () => {
    const startTime = Date.now();
    let processed = 0, succeeded = 0, failed = 0;

    const featureEnabled = await isWalletAutoRechargeFeatureEnabled({
        environment: (process.env.NODE_ENV as any) || 'development',
    });
    if (!featureEnabled) {
        logger.info('Auto-Recharge Worker: Skipped because wallet_auto_recharge feature is disabled');
        return;
    }

    logger.info('Starting Auto-Recharge Worker...');

    try {
        // Find eligible companies
        // 1. Auto-recharge enabled
        // 2. Balance < Threshold
        // 3. Has payment method
        // 4. Not in cooldown (last attempt > 1 hour ago)

        // Note: $expr is used to compare two fields in the same document
        const BATCH_SIZE = 100;
        let page = 0;

        while (true) {
            const companies = await Company.find({
                'wallet.autoRecharge.enabled': true,
                isActive: true,
                isDeleted: false,
                $expr: { $lt: ['$wallet.balance', '$wallet.autoRecharge.threshold'] },
                // Cooldown check + Respect retry schedule:
                $or: [
                    // Never attempted before
                    { 'wallet.autoRecharge.lastAttempt': { $exists: false } },
                    // Cooldown passed (for successful or first attempts)
                    {
                        $and: [
                            {
                                'wallet.autoRecharge.lastAttempt': {
                                    $lt: new Date(Date.now() - 3600000) // 1 hour cooldown
                                }
                            },
                            // Either no failure or retry time has passed
                            {
                                $or: [
                                    { 'wallet.autoRecharge.lastFailure.nextRetryAt': { $exists: false } },
                                    { 'wallet.autoRecharge.lastFailure.nextRetryAt': { $lt: new Date() } }
                                ]
                            }
                        ]
                    }
                ]
            })
                .limit(BATCH_SIZE)
                .skip(page * BATCH_SIZE)
                .select('wallet _id name'); // Select only needed fields

            if (companies.length === 0) break;

            logger.info(`Processing batch ${page + 1}: ${companies.length} companies eligible for auto - recharge`);

            // Process concurrently
            const results = await pMap(
                companies,
                async (company: any) => {
                    const autoRecharge = company.wallet?.autoRecharge;

                    if (!autoRecharge?.amount || !autoRecharge?.paymentMethodId) {
                        logger.warn(`Skipping company ${company.name} (${company._id}): Missing amount or payment method`);
                        return { success: false };
                    }

                    // Update last attempt timestamp immediately to prevent rapid retries if process crashes
                    // (Though strict locking is handled in service, this is a quick optimization)
                    await Company.updateOne({ _id: company._id }, {
                        $set: { 'wallet.autoRecharge.lastAttempt': new Date() }
                    });

                    try {
                        // Record attempt
                        autoRechargeMetrics.recordAttempt(company._id.toString());

                        const result = await WalletService.processAutoRecharge(
                            company._id.toString(),
                            autoRecharge.amount,
                            autoRecharge.paymentMethodId
                        );

                        if (result.success) {
                            logger.info(`Auto - recharge SUCCESS for ${company.name}`, { companyId: company._id, amount: autoRecharge.amount });

                            // Record success
                            autoRechargeMetrics.recordSuccess(company._id.toString(), autoRecharge.amount);

                            return { success: true };
                        } else {
                            logger.warn(`Auto - recharge FAILED for ${company.name}`, { companyId: company._id, error: result.error });

                            // Record failure
                            autoRechargeMetrics.recordFailure(company._id.toString(), result.error);

                            // Calculate current retry count
                            const currentRetryCount = company.wallet?.autoRecharge?.lastFailure?.retryCount || 0;

                            // Implement exponential backoff: 1h -> 3h -> 6h -> 12h
                            const backoffHours = [1, 3, 6, 12];
                            const newRetryCount = currentRetryCount + 1;
                            const backoffIndex = Math.min(currentRetryCount, backoffHours.length - 1);
                            const retryDelay = backoffHours[backoffIndex] * 3600000; // Convert to ms
                            const nextRetryAt = new Date(Date.now() + retryDelay);

                            // Auto-disable after 4 consecutive failures
                            const shouldDisable = newRetryCount >= 4;

                            if (shouldDisable) {
                                logger.warn(`Auto - recharge auto - disabled after ${newRetryCount} failures`, {
                                    companyId: company._id,
                                    companyName: company.name
                                });
                            }

                            // Update failure metadata
                            await Company.updateOne({ _id: company._id }, {
                                $set: {
                                    'wallet.autoRecharge.enabled': !shouldDisable, // Disable if max retries reached
                                    'wallet.autoRecharge.lastFailure': {
                                        timestamp: new Date(),
                                        reason: result.error,
                                        retryCount: newRetryCount,
                                        nextRetryAt: shouldDisable ? undefined : nextRetryAt
                                    }
                                }
                            });

                            return { success: false, error: result.error };
                        }
                    } catch (err: any) {
                        logger.error(`Critical error processing company ${company._id} `, err);
                        return { success: false, error: err.message };
                    }
                },
                { concurrency: 5 } // Limit concurrency to avoid overloading
            );

            processed += companies.length;
            succeeded += results.filter(r => r.success).length;
            failed += results.filter(r => !r.success).length;

            page++;
        }

        const duration = Date.now() - startTime;
        logger.info('Auto-Recharge Worker Completed', {
            processed,
            succeeded,
            failed,
            duration: `${duration} ms`
        });

    } catch (error) {
        logger.error('Auto-Recharge Worker Failed', error);
        throw error;
    }
};
