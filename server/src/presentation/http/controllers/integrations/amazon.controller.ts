/**
 * AmazonController
 *
 * Handles Amazon SP-API store management, connection testing, and sync operations.
 *
 * Endpoints:
 * - POST /connect - Connect Amazon seller account
 * - GET /stores - List connected stores
 * - GET /stores/:id - Get store details
 * - DELETE /stores/:id - Disconnect store
 * - POST /stores/:id/test - Test connection
 * - POST /stores/:id/pause - Pause sync
 * - POST /stores/:id/resume - Resume sync
 * - POST /stores/:id/sync/orders - Trigger order sync
 */

import { NextFunction, Request, Response } from 'express';
import AmazonOAuthService from '../../../../core/application/services/amazon/amazon-oauth.service';
import AmazonOrderSyncService from '../../../../core/application/services/amazon/amazon-order-sync.service';
import { applyDefaultsToSettings, applyDefaultsToSyncConfig, toEcommerceStoreDTO } from '../../../../core/mappers/store.mapper';
import { AmazonStore, AmazonSyncLog } from '../../../../infrastructure/database/mongoose/models';
import { NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess } from '../../../../shared/utils/responseHelper';

export class AmazonController {
    /**
     * POST /integrations/amazon/connect
     *
     * Connect Amazon seller account
     */
    static async connect(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const credentials = req.body.credentials || req.body;
            const {
                sellerId,
                marketplaceId,
                sellerName,
                sellerEmail,
                lwaClientId,
                lwaClientSecret,
                lwaRefreshToken,
                awsAccessKeyId,
                awsSecretAccessKey,
                roleArn,
                region,
            } = credentials;

            const auth = guardChecks(req);
            requireCompanyContext(auth);

            // Validate required fields
            if (!sellerId) {
                throw new ValidationError('Seller ID is required');
            }

            if (!marketplaceId) {
                throw new ValidationError('Marketplace ID is required');
            }

            if (!lwaClientId || !lwaClientSecret || !lwaRefreshToken) {
                throw new ValidationError('LWA credentials are required (clientId, clientSecret, refreshToken)');
            }

            if (!awsAccessKeyId || !awsSecretAccessKey) {
                throw new ValidationError('AWS credentials are required (accessKeyId, secretAccessKey)');
            }

            if (!roleArn) {
                throw new ValidationError('IAM Role ARN is required');
            }

            // Connect Amazon seller account
            const store = await AmazonOAuthService.connectStore({
                sellerId,
                marketplaceId,
                sellerName: sellerName || `Amazon Store - ${sellerId}`,
                sellerEmail,
                lwaClientId,
                lwaClientSecret,
                lwaRefreshToken,
                awsAccessKeyId,
                awsSecretAccessKey,
                roleArn,
                region: region || 'eu-west-1', // Default to EU for India
                companyId: String(auth.companyId),
                userId: String(auth.userId),
            });

            logger.info('Amazon seller connected', {
                storeId: store._id,
                sellerId: store.sellerId,
                marketplaceId: store.marketplaceId,
                companyId: store.companyId,
                userId: auth.userId,
            });

            sendSuccess(res, {
                store: {
                    id: store._id,
                    sellerId: store.sellerId,
                    marketplaceId: store.marketplaceId,
                    sellerName: store.sellerName,
                    isActive: store.isActive,
                },
            }, 'Amazon seller account connected successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /integrations/amazon/stores
     *
     * List all connected Amazon stores for the company
     */
    static async listStores(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);

            const stores = await AmazonOAuthService.getActiveStores(String(auth.companyId));

            sendSuccess(res, {
                count: stores.length,
                stores: stores.map((store) => ({
                    ...toEcommerceStoreDTO(store, 'amazon'),
                    id: store._id,
                    sellerId: store.sellerId,
                    marketplaceId: store.marketplaceId,
                    sellerName: store.sellerName,
                    region: store.region,
                    isActive: store.isActive,
                    isPaused: store.isPaused,
                    syncStatus: store.syncStatus,
                    installedAt: store.installedAt,
                    lastSyncAt: store.lastSyncAt,
                    syncConfig: store.syncConfig,
                    settings: applyDefaultsToSettings(store.settings),
                    stats: store.stats,
                    errorCount: store.errorCount,
                    lastError: store.lastError,
                })),
            }, 'Amazon stores retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /integrations/amazon/stores/:id
     *
     * Get details of a specific store
     */
    static async getStore(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;

            const store = await AmazonStore.findOne({
                _id: id,
                companyId: auth.companyId,
            });

            if (!store) {
                throw new NotFoundError('Amazon store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
            }

            sendSuccess(res, {
                store: {
                    ...toEcommerceStoreDTO(store, 'amazon'),
                    id: store._id,
                    sellerId: store.sellerId,
                    marketplaceId: store.marketplaceId,
                    sellerName: store.sellerName,
                    sellerEmail: store.sellerEmail,
                    region: store.region,
                    isActive: store.isActive,
                    isPaused: store.isPaused,
                    syncStatus: store.syncStatus,
                    installedAt: store.installedAt,
                    lastSyncAt: store.lastSyncAt,
                    syncConfig: store.syncConfig,
                    settings: applyDefaultsToSettings(store.settings),
                    webhooks: store.webhooks,
                    stats: store.stats,
                    errorCount: store.errorCount,
                    lastError: store.lastError,
                },
            }, 'Amazon store details retrieved');
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /integrations/amazon/stores/:id
     *
     * Disconnect Amazon store
     */
    static async disconnectStore(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;

            // Verify ownership
            const store = await AmazonStore.findOne({
                _id: id,
                companyId: auth.companyId,
            });

            if (!store) {
                throw new NotFoundError('Amazon store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
            }

            // Disconnect store
            await AmazonOAuthService.disconnectStore(id);

            logger.info('Amazon store disconnected', {
                storeId: id,
                sellerId: store.sellerId,
                companyId: auth.companyId,
                userId: auth.userId,
            });

            sendSuccess(res, null, 'Amazon store disconnected successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /integrations/amazon/stores/:id/test
     *
     * Test connection to Amazon store
     */
    static async testConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;

            // Verify ownership
            const store = await AmazonStore.findById(id).select(
                '+lwaClientId +lwaClientSecret +lwaRefreshToken +awsAccessKeyId +awsSecretAccessKey'
            );

            if (!store || String(store.companyId) !== String(auth.companyId)) {
                throw new NotFoundError('Amazon store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
            }

            // Decrypt credentials and test
            const lwaCredentials = store.decryptLwaCredentials();
            const awsCredentials = store.decryptAwsCredentials();

            const isValid = await AmazonOAuthService.testConnection({
                lwaClientId: lwaCredentials.clientId,
                lwaClientSecret: lwaCredentials.clientSecret,
                lwaRefreshToken: lwaCredentials.refreshToken,
                awsAccessKeyId: awsCredentials.accessKeyId,
                awsSecretAccessKey: awsCredentials.secretAccessKey,
                region: store.region,
                marketplaceId: store.marketplaceId,
            });

            sendSuccess(res, {
                connected: isValid,
            }, isValid ? 'Connection is valid' : 'Connection failed');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Pre-connect credential test
     * POST /integrations/amazon/test
     */
    static async testConnectionCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const credentials = req.body.credentials || req.body;
            const {
                sellerId,
                marketplaceId,
                lwaClientId,
                lwaClientSecret,
                lwaRefreshToken,
                awsAccessKeyId,
                awsSecretAccessKey,
                region,
            } = credentials;

            if (!sellerId || !marketplaceId || !lwaClientId || !lwaClientSecret || !lwaRefreshToken || !awsAccessKeyId || !awsSecretAccessKey) {
                throw new ValidationError('Missing required Amazon credentials');
            }

            const connected = await AmazonOAuthService.testConnection({
                lwaClientId,
                lwaClientSecret,
                lwaRefreshToken,
                awsAccessKeyId,
                awsSecretAccessKey,
                region: region || 'eu-west-1',
                marketplaceId,
            });

            sendSuccess(res, {
                connected,
                storeName: sellerId ? `Amazon Store - ${sellerId}` : undefined,
                details: {
                    marketplaceId,
                    region: region || 'eu-west-1',
                },
            }, connected ? 'Connection is valid' : 'Connection failed');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update store settings
     * PATCH /integrations/amazon/stores/:id/settings
     */
    static async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;
            const { settings, syncConfig } = req.body;

            const store = await AmazonStore.findOne({
                _id: id,
                companyId: auth.companyId,
            });

            if (!store) {
                throw new NotFoundError('Amazon store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
            }

            if (settings) {
                store.settings = applyDefaultsToSettings({
                    ...(store.settings || {}),
                    ...settings,
                });
            }

            if (syncConfig) {
                store.syncConfig = applyDefaultsToSyncConfig({
                    ...(store.syncConfig || {}),
                    ...syncConfig,
                });
            }

            await store.save();

            sendSuccess(res, {
                store: {
                    ...toEcommerceStoreDTO(store, 'amazon'),
                    sellerId: store.sellerId,
                    marketplaceId: store.marketplaceId,
                    sellerName: store.sellerName,
                    region: store.region,
                    syncConfig: store.syncConfig,
                    settings: applyDefaultsToSettings(store.settings),
                    stats: store.stats,
                },
            }, 'Settings updated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /integrations/amazon/stores/:id/pause
     *
     * Pause sync for a store
     */
    static async pauseSync(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;

            // Verify ownership
            const store = await AmazonStore.findOne({
                _id: id,
                companyId: auth.companyId,
            });

            if (!store) {
                throw new NotFoundError('Amazon store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
            }

            await AmazonOAuthService.pauseSync(id);

            logger.info('Amazon store sync paused', {
                storeId: id,
                sellerId: store.sellerId,
                companyId: auth.companyId,
                userId: auth.userId,
            });

            sendSuccess(res, null, 'Sync paused successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /integrations/amazon/stores/:id/resume
     *
     * Resume sync for a store
     */
    static async resumeSync(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;

            // Verify ownership
            const store = await AmazonStore.findOne({
                _id: id,
                companyId: auth.companyId,
            });

            if (!store) {
                throw new NotFoundError('Amazon store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
            }

            await AmazonOAuthService.resumeSync(id);

            logger.info('Amazon store sync resumed', {
                storeId: id,
                sellerId: store.sellerId,
                companyId: auth.companyId,
                userId: auth.userId,
            });

            sendSuccess(res, null, 'Sync resumed successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /integrations/amazon/stores/:id/sync/orders
     *
     * Trigger manual order sync for a store
     */
    static async syncOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;
            const { fromDate, toDate, maxOrders } = req.body;

            // Verify ownership
            const store = await AmazonStore.findOne({
                _id: id,
                companyId: auth.companyId,
            });

            if (!store) {
                throw new NotFoundError('Amazon store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
            }

            // Trigger sync
            const result = await AmazonOrderSyncService.syncOrders(id, {
                fromDate: fromDate ? new Date(fromDate) : undefined,
                toDate: toDate ? new Date(toDate) : undefined,
                maxOrders: maxOrders ? parseInt(maxOrders, 10) : undefined,
            });

            logger.info('Amazon order sync completed', {
                storeId: id,
                ...result,
                userId: auth.userId,
            });

            sendSuccess(res, {
                result: {
                    itemsProcessed: result.itemsProcessed,
                    itemsSynced: result.itemsSynced,
                    itemsFailed: result.itemsFailed,
                    itemsSkipped: result.itemsSkipped,
                    errors: result.syncErrors.length > 0 ? result.syncErrors.slice(0, 10) : [],
                },
            }, 'Order sync completed');
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /integrations/amazon/stores/:id/sync/logs
     *
     * Get recent sync logs for a store
     */
    static async getSyncLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;
            const limit = Number(req.query.limit) || 50;

            const store = await AmazonStore.findOne({
                _id: id,
                companyId: auth.companyId,
            }).select('_id');

            if (!store) {
                throw new NotFoundError('Amazon store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
            }

            const logs = await (AmazonSyncLog as any).getRecentLogs(id, undefined, limit);

            sendSuccess(
                res,
                logs.map((log: any) => ({
                    _id: String(log._id),
                    integrationId: id,
                    syncId: String(log._id),
                    triggerType: log.metadata?.triggerType || (log.syncType === 'webhook' ? 'WEBHOOK' : 'SCHEDULED'),
                    status: log.status,
                    startedAt: log.startTime,
                    completedAt: log.endTime,
                    durationMs: log.duration,
                    ordersProcessed: log.itemsProcessed || 0,
                    ordersSuccess: log.itemsSynced || 0,
                    ordersFailed: log.itemsFailed || 0,
                    details: {
                        message: log.metadata?.message,
                        errors: log.syncErrors || [],
                    },
                })),
                'Amazon sync logs retrieved successfully'
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /integrations/amazon/stores/:id/refresh
     *
     * Refresh store credentials
     */
    static async refreshCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;
            const {
                lwaClientId,
                lwaClientSecret,
                lwaRefreshToken,
                awsAccessKeyId,
                awsSecretAccessKey,
                roleArn,
            } = req.body;

            // Verify ownership
            const store = await AmazonStore.findOne({
                _id: id,
                companyId: auth.companyId,
            });

            if (!store) {
                throw new NotFoundError('Amazon store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
            }

            // Validate required fields
            if (!lwaClientId || !lwaClientSecret || !lwaRefreshToken) {
                throw new ValidationError('LWA credentials are required');
            }

            if (!awsAccessKeyId || !awsSecretAccessKey) {
                throw new ValidationError('AWS credentials are required');
            }

            // Refresh connection
            await AmazonOAuthService.refreshConnection(id, {
                lwaClientId,
                lwaClientSecret,
                lwaRefreshToken,
                awsAccessKeyId,
                awsSecretAccessKey,
                roleArn,
            });

            logger.info('Amazon store credentials refreshed', {
                storeId: id,
                sellerId: store.sellerId,
                companyId: auth.companyId,
                userId: auth.userId,
            });

            sendSuccess(res, null, 'Credentials refreshed successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default AmazonController;
