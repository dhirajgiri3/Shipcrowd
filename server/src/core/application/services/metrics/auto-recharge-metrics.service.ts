/**
 * Auto-Recharge Metrics Service
 * Basic in-app monitoring for auto-recharge operations
 */

import logger from '../../../../shared/logger/winston.logger';
import { sendEmail } from '../communication/email.service';

interface MetricsSummary {
    totalAttempts: number;
    successCount: number;
    failureCount: number;
    failureReasons: Map<string, number>;
    totalVolume: number; // Total amount processed
    lastRunTime: Date | null;
    processedCompanies: Set<string>;
}

export class AutoRechargeMetricsService {
    private static instance: AutoRechargeMetricsService;
    private metrics: MetricsSummary;
    private dailyMetrics: MetricsSummary;
    private lastResetTime: Date;

    private constructor() {
        this.metrics = this.initializeMetrics();
        this.dailyMetrics = this.initializeMetrics();
        this.lastResetTime = new Date();

        // Reset daily metrics at midnight
        this.scheduleDailyReset();
    }

    static getInstance(): AutoRechargeMetricsService {
        if (!AutoRechargeMetricsService.instance) {
            AutoRechargeMetricsService.instance = new AutoRechargeMetricsService();
        }
        return AutoRechargeMetricsService.instance;
    }

    private initializeMetrics(): MetricsSummary {
        return {
            totalAttempts: 0,
            successCount: 0,
            failureCount: 0,
            failureReasons: new Map(),
            totalVolume: 0,
            lastRunTime: null,
            processedCompanies: new Set(),
        };
    }

    private scheduleDailyReset(): void {
        setInterval(() => {
            const now = new Date();
            const lastMidnight = new Date(now);
            lastMidnight.setHours(0, 0, 0, 0);

            if (this.lastResetTime < lastMidnight) {
                logger.info('Auto-Recharge Metrics: Resetting daily metrics', {
                    previousDay: this.dailyMetrics,
                });
                this.dailyMetrics = this.initializeMetrics();
                this.lastResetTime = now;
            }
        }, 3600000); // Check every hour
    }

    /**
     * Record an auto-recharge attempt
     */
    recordAttempt(companyId: string): void {
        this.metrics.totalAttempts++;
        this.metrics.lastRunTime = new Date();
        this.metrics.processedCompanies.add(companyId);

        this.dailyMetrics.totalAttempts++;
        this.dailyMetrics.processedCompanies.add(companyId);
    }

    /**
     * Record a successful auto-recharge
     */
    recordSuccess(companyId: string, amount: number): void {
        this.metrics.successCount++;
        this.metrics.totalVolume += amount;

        this.dailyMetrics.successCount++;
        this.dailyMetrics.totalVolume += amount;

        logger.debug('Auto-Recharge Metrics: Success recorded', {
            companyId,
            amount,
            todaySuccessRate: this.getDailySuccessRate(),
        });
    }

    /**
     * Record a failed auto-recharge
     */
    recordFailure(companyId: string, reason?: string): void {
        this.metrics.failureCount++;
        this.dailyMetrics.failureCount++;

        if (reason) {
            const normalizedReason = this.normalizeFailureReason(reason);
            this.metrics.failureReasons.set(
                normalizedReason,
                (this.metrics.failureReasons.get(normalizedReason) || 0) + 1
            );
            this.dailyMetrics.failureReasons.set(
                normalizedReason,
                (this.dailyMetrics.failureReasons.get(normalizedReason) || 0) + 1
            );
        }

        logger.debug('Auto-Recharge Metrics: Failure recorded', {
            companyId,
            reason,
            todayFailureRate: this.getDailyFailureRate(),
        });

        // Check if failure rate exceeds threshold
        this.checkFailureThreshold();
    }

    private normalizeFailureReason(reason: string): string {
        // Group similar errors
        if (reason.toLowerCase().includes('payment')) return 'Payment Error';
        if (reason.toLowerCase().includes('balance')) return 'Insufficient Balance';
        if (reason.toLowerCase().includes('limit')) return 'Limit Exceeded';
        if (reason.toLowerCase().includes('lock')) return 'Lock Acquisition Failed';
        return 'Other';
    }

    /**
     * Get daily success rate
     */
    getDailySuccessRate(): number {
        if (this.dailyMetrics.totalAttempts === 0) return 0;
        return (this.dailyMetrics.successCount / this.dailyMetrics.totalAttempts) * 100;
    }

    /**
     * Get daily failure rate
     */
    getDailyFailureRate(): number {
        if (this.dailyMetrics.totalAttempts === 0) return 0;
        return (this.dailyMetrics.failureCount / this.dailyMetrics.totalAttempts) * 100;
    }

    /**
     * Check if failure rate exceeds threshold and log warning
     */
    private checkFailureThreshold(): void {
        const failureRate = this.getDailyFailureRate();
        const FAILURE_THRESHOLD = 10; // 10% failure rate threshold

        if (failureRate > FAILURE_THRESHOLD && this.dailyMetrics.totalAttempts >= 10) {
            logger.warn('Auto-Recharge: High failure rate detected', {
                failureRate: `${failureRate.toFixed(2)}%`,
                totalAttempts: this.dailyMetrics.totalAttempts,
                failures: this.dailyMetrics.failureCount,
                topReasons: Array.from(this.dailyMetrics.failureReasons.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3),
            });

            // Trigger email alert to admins
            this.sendFailureAlert(failureRate, this.dailyMetrics.failureCount, Array.from(this.dailyMetrics.failureReasons.entries()));
        }
    }

    /**
     * Send email alert for high failure rate
     */
    private async sendFailureAlert(failureRate: number, failureCount: number, topReasons: [string, number][]): Promise<void> {
        try {
            const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'admin@shipcrowd.com';

            const reasonsHtml = topReasons
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([reason, count]) => `<li><strong>${reason}:</strong> ${count} failures</li>`)
                .join('');

            const html = `
                <h2>⚠️ Auto-Recharge Alert: High Failure Rate</h2>
                <p>The auto-recharge system is experiencing a high failure rate.</p>
                
                <h3>Current Status (Today)</h3>
                <ul>
                    <li><strong>Failure Rate:</strong> ${failureRate.toFixed(2)}%</li>
                    <li><strong>Total Failures:</strong> ${failureCount}</li>
                    <li><strong>Total Attempts:</strong> ${this.dailyMetrics.totalAttempts}</li>
                </ul>

                <h3>Top Failure Reasons</h3>
                <ul>
                    ${reasonsHtml}
                </ul>

                <p>Please check the system logs for more details.</p>
            `;

            await sendEmail(adminEmail, 'CRITICAL: Auto-Recharge High Failure Rate', html);
            logger.info('Auto-Recharge: Failure alert email sent', { adminEmail });
        } catch (error: any) {
            logger.error('Auto-Recharge: Failed to send alert email', { error: error.message });
        }
    }

    /**
     * Get current metrics summary
     */
    getSummary(): {
        allTime: any;
        today: any;
    } {
        return {
            allTime: {
                totalAttempts: this.metrics.totalAttempts,
                successCount: this.metrics.successCount,
                failureCount: this.metrics.failureCount,
                successRate: this.metrics.totalAttempts > 0
                    ? `${((this.metrics.successCount / this.metrics.totalAttempts) * 100).toFixed(2)}%`
                    : '0%',
                totalVolume: `₹${this.metrics.totalVolume.toFixed(2)}`,
                lastRun: this.metrics.lastRunTime,
                topFailureReasons: Array.from(this.metrics.failureReasons.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5),
            },
            today: {
                totalAttempts: this.dailyMetrics.totalAttempts,
                successCount: this.dailyMetrics.successCount,
                failureCount: this.dailyMetrics.failureCount,
                successRate: `${this.getDailySuccessRate().toFixed(2)}%`,
                totalVolume: `₹${this.dailyMetrics.totalVolume.toFixed(2)}`,
                uniqueCompanies: this.dailyMetrics.processedCompanies.size,
                topFailureReasons: Array.from(this.dailyMetrics.failureReasons.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5),
            },
        };
    }

    /**
     * Log metrics summary
     */
    logSummary(): void {
        const summary = this.getSummary();
        logger.info('Auto-Recharge Metrics Summary', summary);
    }
}

// Export singleton
export default AutoRechargeMetricsService.getInstance();
