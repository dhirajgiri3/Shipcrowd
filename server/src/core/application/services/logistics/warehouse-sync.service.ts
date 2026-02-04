/**
 * Warehouse Sync Service
 * 
 * Centralized service for synchronizing warehouses with courier partners.
 * 
 * Features:
 * - Per-carrier sync status tracking
 * - Explicit idempotency checks (prevents duplicate pickup locations)
 * - Error classification for smart retry logic
 * - Graceful degradation on failures
 */

import mongoose from 'mongoose';
import { Warehouse, IWarehouse } from '../../../../infrastructure/database/mongoose/models';
import { CourierFactory } from '../courier/courier.factory';
import logger from '../../../../shared/logger/winston.logger';

export type SyncErrorType = 'NETWORK' | 'VALIDATION' | 'RATE_LIMIT' | 'UNKNOWN';

export interface SyncResult {
    carrier: string;
    success: boolean;
    warehouseId?: string;
    error?: {
        type: SyncErrorType;
        message: string;
    };
}

export interface SyncStatus {
    velocity?: {
        status: 'pending' | 'synced' | 'failed';
        warehouseId?: string;
        lastSyncedAt?: Date;
        error?: string;
    };
    delhivery?: {
        status: 'pending' | 'synced' | 'failed';
        warehouseId?: string;
        lastSyncedAt?: Date;
        error?: string;
    };
    ekart?: {
        status: 'pending' | 'synced' | 'failed';
        warehouseId?: string;
        lastSyncedAt?: Date;
        error?: string;
    };
}

export class WarehouseSyncService {
    /**
     * Sync warehouse with all enabled carriers
     * 
     * @param warehouse - Warehouse document to sync
     * @returns Array of sync results per carrier
     */
    static async syncWarehouse(warehouse: IWarehouse): Promise<SyncResult[]> {
        const results: SyncResult[] = [];

        // Phase A: Only Velocity
        // Phase B: Add Delhivery, Ekart
        const enabledCarriers = ['velocity', 'delhivery'];

        for (const carrier of enabledCarriers) {
            try {
                const result = await this.syncWithCarrier(warehouse, carrier as 'velocity');
                results.push(result);
            } catch (error) {
                logger.error(`Failed to sync warehouse with ${carrier}`, {
                    warehouseId: (warehouse._id as mongoose.Types.ObjectId).toString(),
                    error: error instanceof Error ? error.message : 'Unknown error'
                });

                results.push({
                    carrier,
                    success: false,
                    error: {
                        type: this.classifyError(error),
                        message: error instanceof Error ? error.message : 'Unknown error'
                    }
                });
            }
        }

        return results;
    }

    /**
     * Sync warehouse with specific carrier
     * 
     * CRITICAL: Includes idempotency check to prevent duplicate pickup locations
     * 
     * @param warehouse - Warehouse document
     * @param carrier - Carrier identifier
     * @returns Sync result
     */
    static async syncWithCarrier(
        warehouse: IWarehouse,
        carrier: 'velocity' | 'delhivery' | 'ekart'
    ): Promise<SyncResult> {
        // ✅ IDEMPOTENCY CHECK: Skip if already synced
        const existingId = warehouse.carrierDetails?.[carrier]?.warehouseId;
        if (existingId) {
            logger.info(`Warehouse already synced with ${carrier}, skipping`, {
                warehouseId: (warehouse._id as mongoose.Types.ObjectId).toString(),
                carrierWarehouseId: existingId
            });

            return {
                carrier,
                success: true,
                warehouseId: existingId
            };
        }

        // Get courier provider
        const provider = await CourierFactory.getProvider(
            carrier === 'velocity' ? 'velocity-shipfast' : carrier,
            warehouse.companyId
        );

        // Check if provider supports warehouse creation
        if (!provider.createWarehouse) {
            throw new Error(`${carrier} provider does not support warehouse creation`);
        }

        try {
            // Call carrier API
            const response = await provider.createWarehouse(warehouse);

            // Extract warehouse ID (different field names per carrier)
            const carrierWarehouseId = this.extractWarehouseId(response, carrier);

            // Update database with per-carrier status
            await Warehouse.findByIdAndUpdate(warehouse._id, {
                $set: {
                    [`carrierDetails.${carrier}`]: {
                        warehouseId: carrierWarehouseId,
                        status: 'synced',
                        lastSyncedAt: new Date(),
                        lastAttemptAt: new Date()
                    }
                }
            });

            logger.info(`Warehouse synced successfully with ${carrier}`, {
                warehouseId: (warehouse._id as mongoose.Types.ObjectId).toString(),
                carrierWarehouseId
            });

            return {
                carrier,
                success: true,
                warehouseId: carrierWarehouseId
            };
        } catch (error) {
            const errorType = this.classifyError(error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Update database with failure status
            await Warehouse.findByIdAndUpdate(warehouse._id, {
                $set: {
                    [`carrierDetails.${carrier}`]: {
                        status: 'failed',
                        lastAttemptAt: new Date(),
                        error: {
                            type: errorType,
                            message: errorMessage,
                            timestamp: new Date()
                        }
                    }
                }
            });

            logger.error(`Failed to sync warehouse with ${carrier}`, {
                warehouseId: (warehouse._id as mongoose.Types.ObjectId).toString(),
                errorType,
                errorMessage
            });

            // Queue for background retry (skip validation errors - they need manual fixing)
            if (errorType !== 'VALIDATION') {
                try {
                    const QueueManager = (await import('../../../../infrastructure/utilities/queue-manager.js')).default as any;
                    const jobId = `${(warehouse._id as mongoose.Types.ObjectId).toString()}-${carrier}`;

                    await QueueManager.addJob(
                        'warehouse-sync',
                        'sync-warehouse',
                        {
                            warehouseId: (warehouse._id as mongoose.Types.ObjectId).toString(),
                            carrier
                        },
                        {
                            jobId, // Deduplication
                            attempts: 3,
                            backoff: {
                                type: 'exponential',
                                delay: errorType === 'RATE_LIMIT' ? 60000 : 30000
                            },
                            removeOnComplete: true
                        }
                    );

                    logger.info('Warehouse sync queued for retry', {
                        warehouseId: (warehouse._id as mongoose.Types.ObjectId).toString(),
                        carrier,
                        errorType
                    });
                } catch (queueError) {
                    logger.error('Failed to queue warehouse sync retry', {
                        warehouseId: (warehouse._id as mongoose.Types.ObjectId).toString(),
                        carrier,
                        error: queueError instanceof Error ? queueError.message : 'Unknown error'
                    });
                }
            }

            throw error;
        }
    }

    /**
     * Retry sync for a specific warehouse and carrier (called by background job)
     * 
     * @param warehouseId - Warehouse ID
     * @param carrier - Carrier identifier
     * @returns Success status
     */
    static async retrySync(warehouseId: string, carrier: string): Promise<boolean> {
        const warehouse = await Warehouse.findById(warehouseId);

        if (!warehouse) {
            logger.error('Warehouse not found for retry', { warehouseId });
            return false;
        }

        try {
            await this.syncWithCarrier(warehouse, carrier as 'velocity' | 'delhivery' | 'ekart');
            return true;
        } catch (error) {
            logger.error('Retry sync failed', {
                warehouseId,
                carrier,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }

    /**
     * Get sync status for warehouse
     * 
     * @param warehouseId - Warehouse ID
     * @returns Per-carrier sync status
     */
    static async getSyncStatus(warehouseId: string): Promise<SyncStatus> {
        const warehouse = await Warehouse.findById(warehouseId).lean();

        if (!warehouse) {
            throw new Error('Warehouse not found');
        }

        return {
            velocity: warehouse.carrierDetails?.velocity
                ? {
                    status: warehouse.carrierDetails.velocity.status,
                    warehouseId: warehouse.carrierDetails.velocity.warehouseId,
                    lastSyncedAt: warehouse.carrierDetails.velocity.lastSyncedAt,
                    error: warehouse.carrierDetails.velocity.error?.message
                }
                : undefined,
            delhivery: warehouse.carrierDetails?.delhivery
                ? {
                    status: warehouse.carrierDetails.delhivery.status,
                    warehouseId: warehouse.carrierDetails.delhivery.warehouseId,
                    lastSyncedAt: warehouse.carrierDetails.delhivery.lastSyncedAt,
                    error: warehouse.carrierDetails.delhivery.error?.message
                }
                : undefined,
            ekart: warehouse.carrierDetails?.ekart
                ? {
                    status: warehouse.carrierDetails.ekart.status,
                    warehouseId: warehouse.carrierDetails.ekart.warehouseId,
                    lastSyncedAt: warehouse.carrierDetails.ekart.lastSyncedAt,
                    error: warehouse.carrierDetails.ekart.error?.message
                }
                : undefined
        };
    }

    /**
     * Classify error for smart retry logic
     * 
     * @param error - Error object
     * @returns Error type classification
     */
    private static classifyError(error: any): SyncErrorType {
        if (!error) return 'UNKNOWN';

        const message = error.message?.toLowerCase() || '';
        const statusCode = error.statusCode || error.status || 0;

        // Rate limit errors
        if (statusCode === 429 || message.includes('rate limit')) {
            return 'RATE_LIMIT';
        }

        // Validation errors (4xx except 429)
        if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
            return 'VALIDATION';
        }

        // Network errors
        if (
            message.includes('network') ||
            message.includes('timeout') ||
            message.includes('econnrefused') ||
            message.includes('enotfound') ||
            statusCode >= 500
        ) {
            return 'NETWORK';
        }

        return 'UNKNOWN';
    }

    /**
     * Extract warehouse ID from carrier response
     * (Different carriers use different field names)
     * 
     * @param response - Carrier API response
     * @param carrier - Carrier identifier
     * @returns Warehouse ID
     */
    private static extractWarehouseId(response: any, carrier: string): string {
        switch (carrier) {
            case 'velocity':
                return response.warehouse_id || response.id;
            case 'delhivery':
                return response.pickup_location_id || response.warehouse_id;
            case 'ekart':
                return response.hub_id || response.facility_id;
            default:
                throw new Error(`Unknown carrier: ${carrier}`);
        }
    }
}

export default WarehouseSyncService;
