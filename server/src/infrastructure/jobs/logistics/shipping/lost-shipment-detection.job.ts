/**
 * Lost Shipment Detection Job
 *
 * Background job to detect and alert on shipments stuck in non-terminal statuses for >14 days.
 * Automatically refreshes tracking and creates alerts for operations team.
 */

import { Job } from 'bullmq';
import mongoose from 'mongoose';
import { CourierFactory } from '../../../../core/application/services/courier/courier.factory';
import logger from '../../../../shared/logger/winston.logger';
import { Shipment } from '../../../database/mongoose/models';
import QueueManager from '../../../utilities/queue-manager';

interface LostShipmentJobData {
    type: 'detect_lost' | 'refresh_tracking';
    shipmentId?: string;
}

interface LostShipmentAlert {
    shipmentId: string;
    awb: string;
    currentStatus: string;
    daysStuck: number;
    lastUpdate: Date;
    companyId: string;
}

export class LostShipmentDetectionJob {
    private static readonly QUEUE_NAME = 'lost-shipment-detection';
    private static readonly STUCK_THRESHOLD_DAYS = 14;

    // Non-terminal statuses that indicate shipment is still in transit
    private static readonly NON_TERMINAL_STATUSES = [
        'in_transit',
        'out_for_delivery',
        'ndr_pending',
        'pickup_scheduled',
        'picked_up',
        'rto_in_transit'
    ];

    /**
     * Initialize the job worker
     */
    static async initialize(): Promise<void> {
        await QueueManager.registerWorker({
            queueName: this.QUEUE_NAME,
            processor: this.processJob.bind(this),
            concurrency: 3,
        });

        logger.info('Lost shipment detection worker initialized');
    }

    /**
     * Process job
     */
    private static async processJob(job: Job<LostShipmentJobData>): Promise<any> {
        const { type, shipmentId } = job.data;

        logger.info('Processing lost shipment detection job', {
            jobId: job.id,
            type,
            shipmentId,
        });

        try {
            switch (type) {
                case 'detect_lost':
                    return await this.detectLostShipments();

                case 'refresh_tracking':
                    if (!shipmentId) {
                        throw new Error('shipmentId required for refresh_tracking');
                    }
                    return await this.refreshShipmentTracking(shipmentId);

                default:
                    logger.warn('Unknown job type', { type });
                    return { success: false };
            }
        } catch (error: any) {
            logger.error('Lost shipment detection job failed', {
                jobId: job.id,
                type,
                error: error.message,
            });

            throw error;
        }
    }

    /**
     * Detect shipments stuck in non-terminal statuses for >14 days
     */
    private static async detectLostShipments(): Promise<{
        detected: number;
        alerts: LostShipmentAlert[];
    }> {
        const threshold = new Date(Date.now() - this.STUCK_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

        logger.info('Running lost shipment detection', {
            threshold: threshold.toISOString(),
            statuses: this.NON_TERMINAL_STATUSES,
        });

        // Find shipments stuck in non-terminal statuses
        const stuckShipments = await Shipment.find({
            currentStatus: { $in: this.NON_TERMINAL_STATUSES },
            createdAt: { $lt: threshold },
            'flags.potentiallyLost': { $ne: true },
            isDeleted: false,
        })
            .select('trackingNumber currentStatus createdAt updatedAt companyId carrier')
            .limit(100) // Process in batches
            .lean();

        logger.info(`Found ${stuckShipments.length} potentially lost shipments`);

        const alerts: LostShipmentAlert[] = [];
        const now = new Date();
        const updateOps: any[] = [];

        for (const shipment of stuckShipments) {
            try {
                const daysStuck = Math.floor(
                    (Date.now() - new Date(shipment.createdAt).getTime()) / (24 * 60 * 60 * 1000)
                );

                updateOps.push({
                    updateOne: {
                        filter: { _id: shipment._id },
                        update: {
                            $set: {
                                'flags.potentiallyLost': true,
                                'flags.potentiallyLostAt': now,
                                'flags.daysStuck': daysStuck,
                            },
                        },
                    },
                });

                const alert: LostShipmentAlert = {
                    shipmentId: shipment._id.toString(),
                    awb: shipment.trackingNumber,
                    currentStatus: shipment.currentStatus,
                    daysStuck,
                    lastUpdate: shipment.updatedAt,
                    companyId: shipment.companyId.toString(),
                };

                alerts.push(alert);

                // Queue tracking refresh
                await this.queueTrackingRefresh(shipment._id.toString());

                logger.info('Shipment marked as potentially lost', {
                    awb: shipment.trackingNumber,
                    daysStuck,
                    currentStatus: shipment.currentStatus,
                });
            } catch (error: any) {
                logger.error('Failed to process stuck shipment', {
                    shipmentId: shipment._id,
                    error: error.message,
                });
            }
        }

        if (updateOps.length > 0) {
            await Shipment.bulkWrite(updateOps);
        }

        // Send consolidated alert to ops team
        if (alerts.length > 0) {
            await this.sendOpsAlert(alerts);
        }

        return {
            detected: alerts.length,
            alerts,
        };
    }

    /**
     * Refresh tracking for a specific shipment
     */
    private static async refreshShipmentTracking(shipmentId: string): Promise<{
        success: boolean;
        statusChanged: boolean;
        newStatus?: string;
    }> {
        try {
            const shipment = await Shipment.findById(shipmentId);

            if (!shipment) {
                logger.warn('Shipment not found for tracking refresh', { shipmentId });
                return { success: false, statusChanged: false };
            }

            logger.info('Refreshing tracking for potentially lost shipment', {
                shipmentId,
                awb: shipment.trackingNumber,
                carrier: shipment.carrier,
            });

            // Get courier provider (resolve service types like "surface" to velocity)
            const { CarrierNormalizationService } = await import('../../../../core/application/services/shipping/carrier-normalization.service');
            const { default: CourierProviderRegistry } = await import('../../../../core/application/services/courier/courier-provider-registry');
            const rawCarrier = shipment.carrier || 'velocity-shipfast';
            const providerCarrier = CarrierNormalizationService.resolveCarrierForProviderLookup(rawCarrier)
                || CourierProviderRegistry.getIntegrationProvider(rawCarrier)
                || rawCarrier;

            const provider = await CourierFactory.getProvider(
                providerCarrier,
                shipment.companyId as unknown as mongoose.Types.ObjectId
            );

            // Fetch latest tracking
            const tracking = await provider.trackShipment(shipment.trackingNumber);

            const previousStatus = shipment.currentStatus;
            const newStatus = tracking.status;

            // Update shipment if status changed
            if (newStatus !== previousStatus) {
                await Shipment.findByIdAndUpdate(shipmentId, {
                    $set: {
                        currentStatus: newStatus,
                        'flags.trackingRefreshedAt': new Date(),
                    },
                });

                logger.info('Shipment status updated after tracking refresh', {
                    shipmentId,
                    awb: shipment.trackingNumber,
                    previousStatus,
                    newStatus,
                });

                // If shipment is now in terminal status, clear lost flag
                if (!this.NON_TERMINAL_STATUSES.includes(newStatus)) {
                    await Shipment.findByIdAndUpdate(shipmentId, {
                        $set: {
                            'flags.potentiallyLost': false,
                            'flags.resolvedAt': new Date(),
                        },
                    });
                }

                return { success: true, statusChanged: true, newStatus };
            }

            return { success: true, statusChanged: false };
        } catch (error: any) {
            logger.error('Failed to refresh shipment tracking', {
                shipmentId,
                error: error.message,
            });

            return { success: false, statusChanged: false };
        }
    }

    /**
     * Send consolidated alert to operations team
     */
    private static async sendOpsAlert(alerts: LostShipmentAlert[]): Promise<void> {
        try {
            // Import notification service dynamically
            const { default: EmailService } = await import(
                '../../../../core/application/services/communication/email.service.js'
            );

            const alertSummary = alerts
                .map(
                    (alert) =>
                        `- AWB: ${alert.awb} | Status: ${alert.currentStatus} | Stuck for: ${alert.daysStuck} days`
                )
                .join('\n');

            const subject = `⚠️ Lost Shipment Alert: ${alerts.length} shipments stuck for >14 days`;
            const htmlContent = `
                <h2>Lost Shipment Detection Alert</h2>
                <p>The following shipments have been stuck in transit for more than 14 days:</p>
                <pre>${alertSummary}</pre>
                <p><strong>Action Required:</strong></p>
                <ul>
                    <li>Review shipment details in admin dashboard</li>
                    <li>Contact courier for investigation</li>
                    <li>Notify customers if necessary</li>
                </ul>
                <p>Tracking has been automatically refreshed for all flagged shipments.</p>
            `;

            // Send to ops email (from environment variable)
            const opsEmail = process.env.OPS_ALERT_EMAIL || 'ops@shipcrowd.com';

            await EmailService.sendEmail(
                opsEmail,
                subject,
                htmlContent,
                `Lost Shipment Alert: ${alerts.length} shipments detected`
            );

            logger.info('Lost shipment alert sent to ops team', {
                alertCount: alerts.length,
                recipient: opsEmail,
            });
        } catch (error: any) {
            logger.error('Failed to send ops alert', {
                error: error.message,
                alertCount: alerts.length,
            });
        }
    }

    /**
     * Queue tracking refresh for a shipment
     */
    private static async queueTrackingRefresh(shipmentId: string): Promise<void> {
        await QueueManager.addJob(
            this.QUEUE_NAME,
            `refresh-tracking-${shipmentId}`,
            {
                type: 'refresh_tracking',
                shipmentId,
            },
            {
                delay: 5000, // 5 second delay to avoid rate limiting
                removeOnComplete: true,
            }
        );
    }

    /**
     * Queue daily detection job
     */
    static async queueDailyDetection(): Promise<void> {
        await QueueManager.addJob(
            this.QUEUE_NAME,
            `daily-detection-${new Date().toISOString().slice(0, 10)}`,
            { type: 'detect_lost' },
            {
                jobId: `lost-detection-${new Date().toISOString().slice(0, 10)}`,
                removeOnComplete: true,
            }
        );

        logger.info('Daily lost shipment detection job queued');
    }

    /**
     * Get lost shipment statistics
     */
    static async getStatistics(): Promise<{
        totalLost: number;
        byStatus: Record<string, number>;
        byCarrier: Record<string, number>;
        avgDaysStuck: number;
    }> {
        const lostShipments = await Shipment.find({
            'flags.potentiallyLost': true,
            isDeleted: false,
        })
            .select('currentStatus carrier flags.daysStuck')
            .lean();

        const byStatus: Record<string, number> = {};
        const byCarrier: Record<string, number> = {};
        let totalDays = 0;

        for (const shipment of lostShipments) {
            // Count by status
            byStatus[shipment.currentStatus] = (byStatus[shipment.currentStatus] || 0) + 1;

            // Count by carrier
            const carrier = shipment.carrier || 'unknown';
            byCarrier[carrier] = (byCarrier[carrier] || 0) + 1;

            // Sum days stuck
            totalDays += (shipment as any).flags?.daysStuck || 0;
        }

        return {
            totalLost: lostShipments.length,
            byStatus,
            byCarrier,
            avgDaysStuck: lostShipments.length > 0 ? Math.round(totalDays / lostShipments.length) : 0,
        };
    }
}

export default LostShipmentDetectionJob;
