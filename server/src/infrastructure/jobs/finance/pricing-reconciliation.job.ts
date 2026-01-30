/**
 * Pricing Reconciliation Job
 *
 * Daily job to reconcile calculated prices (PricingAudit) against
 * actual carrier invoices (Mock/Future Implementation).
 */

// @ts-ignore - node-cron doesn't have type declarations
import cron from 'node-cron';
import PricingAudit from '../../database/mongoose/models/finance/pricing-audit.model';
import logger from '../../../shared/logger/winston.logger';
import PricingMetricsService from '../../../core/application/services/metrics/pricing-metrics.service';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export class PricingReconciliationJob {

    /**
     * Run daily reconciliation
     */
    static async reconcileDaily(): Promise<void> {
        const now = new Date();
        const yesterday = new Date(now.getTime() - ONE_DAY_MS);

        const startOfDay = new Date(yesterday);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(yesterday);
        endOfDay.setHours(23, 59, 59, 999);

        logger.info(`[PricingReconciliation] Starting reconciliation for date: ${startOfDay.toISOString().split('T')[0]}`);

        // 1. Fetch Audit Logs
        const audits = await PricingAudit.find({
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        }).lean();

        if (audits.length === 0) {
            logger.info('[PricingReconciliation] No pricing audits found for yesterday.');
            return;
        }

        logger.info(`[PricingReconciliation] Found ${audits.length} audits to reconcile.`);

        // 2. Fetch Carrier Invoices (Mock)
        // In reality, this would query a CarrierInvoice model or fetch from API
        // const invoices = await CarrierInvoice.find({ date: ... });

        // 3. Compare (Placeholder Logic)
        let mismatchCount = 0;

        for (const audit of audits) {
            // Mock check: e.g. verify if price > 0 (Sanity check)
            if (audit.price <= 0) {
                logger.warn(`[PricingReconciliation] Zero price detected for audit ${audit.requestId}`);
                mismatchCount++;
                PricingMetricsService.incrementMismatchCount();
            }
        }

        if (mismatchCount > 0) {
            logger.warn(`[PricingReconciliation] Completed with ${mismatchCount} mismatches/anomalies.`);
            // Trigger Alerting (PagerDuty/Email)
        } else {
            logger.info('[PricingReconciliation] Completed successfully with no anomalies.');
        }
    }

    /**
     * Main execution wrapper
     */
    static async execute(): Promise<void> {
        const startTime = Date.now();
        try {
            await this.reconcileDaily();

            const duration = Date.now() - startTime;
            logger.info('[PricingReconciliation] Job finished', { durationMs: duration });

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('[PricingReconciliation] Job failed', {
                error: (error as Error).message,
                durationMs: duration
            });
        }
    }

    /**
     * Initialize Cron
     */
    static initialize(): void {
        // Run at 2:00 AM every day
        cron.schedule('0 2 * * *', async () => {
            await this.execute();
        });

        logger.info('Pricing Reconciliation Job initialized (0 2 * * *)');
    }
}
