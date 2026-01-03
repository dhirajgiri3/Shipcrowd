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
 * - POST /stores/:id/sync-orders - Trigger order sync
 */

import { Request, Response, NextFunction } from 'express';
import AmazonOAuthService from '../../../../core/application/services/amazon/amazon-oauth.service';
import AmazonOrderSyncService from '../../../../core/application/services/amazon/amazon-order-sync.service';
import { AmazonStore } from '../../../../infrastructure/database/mongoose/models';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

export class AmazonController {
    /**
     * POST /integrations/amazon/connect
     *
     * Connect Amazon seller account
     */
    static async connect(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
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
            } = req.body;

            const companyId = req.user?.companyId;
            const userId = req.user?._id;

            // Validate required fields
            if (!sellerId) {
                throw new AppError('Seller ID is required', 'AMAZON_SELLER_ID_REQUIRED', 400);
            }

            if (!marketplaceId) {
                throw new AppError('Marketplace ID is required', 'AMAZON_MARKETPLACE_ID_REQUIRED', 400);
            }

            if (!lwaClientId || !lwaClientSecret || !lwaRefreshToken) {
                throw new AppError(
                    'LWA credentials are required (clientId, clientSecret, refreshToken)',
                    'AMAZON_LWA_CREDENTIALS_REQUIRED',
                    400
                );
            }

            if (!awsAccessKeyId || !awsSecretAccessKey) {
                throw new AppError(
                    'AWS credentials are required (accessKeyId, secretAccessKey)',
                    'AMAZON_AWS_CREDENTIALS_REQUIRED',
                    400
                );
            }

            if (!roleArn) {
                throw new AppError('IAM Role ARN is required', 'AMAZON_ROLE_ARN_REQUIRED', 400);
            }

            if (!companyId) {
                throw new AppError('Company ID not found in request', 'AUTH_COMPANY_REQUIRED', 401);
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
                companyId: String(companyId),
                userId: String(userId),
            });

            logger.info('Amazon seller connected', {
                storeId: store._id,
                sellerId: store.sellerId,
                marketplaceId: store.marketplaceId,
                companyId: store.companyId,
                userId,
            });

            res.json({
                success: true,
                store: {
                    id: store._id,
                    sellerId: store.sellerId,
                    marketplaceId: store.marketplaceId,
                    sellerName: store.sellerName,
                    isActive: store.isActive,
                },
                message: 'Amazon seller account connected successfully',
            });
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
            const companyId = req.user?.companyId;

            if (!companyId) {
                throw new AppError('Company ID not found in request', 'AUTH_COMPANY_REQUIRED', 401);
            }

            const stores = await AmazonOAuthService.getActiveStores(String(companyId));

            res.json({
                success: true,
                count: stores.length,
                stores: stores.map((store) => ({
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
                    stats: store.stats,
                    errorCount: store.errorCount,
                    lastError: store.lastError,
                })),
            });
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
            const { id } = req.params;
            const companyId = req.user?.companyId;

            const store = await AmazonStore.findOne({
                _id: id,
                companyId,
            });

            if (!store) {
                throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
            }

            res.json({
                success: true,
                store: {
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
                    webhooks: store.webhooks,
                    stats: store.stats,
                    errorCount: store.errorCount,
                    lastError: store.lastError,
                },
            });
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
            const { id } = req.params;
            const companyId = req.user?.companyId;

            // Verify ownership
            const store = await AmazonStore.findOne({
                _id: id,
                companyId,
            });

            if (!store) {
                throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
            }

            // Disconnect store
            await AmazonOAuthService.disconnectStore(id);

            logger.info('Amazon store disconnected', {
                storeId: id,
                sellerId: store.sellerId,
                companyId,
                userId: req.user?._id,
            });

            res.json({
                success: true,
                message: 'Amazon store disconnected successfully',
            });
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
            const { id } = req.params;
            const companyId = req.user?.companyId;

            // Verify ownership
            const store = await AmazonStore.findById(id).select(
                '+lwaClientId +lwaClientSecret +lwaRefreshToken +awsAccessKeyId +awsSecretAccessKey'
            );

            if (!store || String(store.companyId) !== String(companyId)) {
                throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
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

            res.json({
                success: true,
                connected: isValid,
                message: isValid ? 'Connection is valid' : 'Connection failed',
            });
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
            const { id } = req.params;
            const companyId = req.user?.companyId;

            // Verify ownership
            const store = await AmazonStore.findOne({
                _id: id,
                companyId,
            });

            if (!store) {
                throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
            }

            await AmazonOAuthService.pauseSync(id);

            logger.info('Amazon store sync paused', {
                storeId: id,
                sellerId: store.sellerId,
                companyId,
                userId: req.user?._id,
            });

            res.json({
                success: true,
                message: 'Sync paused successfully',
            });
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
            const { id } = req.params;
            const companyId = req.user?.companyId;

            // Verify ownership
            const store = await AmazonStore.findOne({
                _id: id,
                companyId,
            });

            if (!store) {
                throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
            }

            await AmazonOAuthService.resumeSync(id);

            logger.info('Amazon store sync resumed', {
                storeId: id,
                sellerId: store.sellerId,
                companyId,
                userId: req.user?._id,
            });

            res.json({
                success: true,
                message: 'Sync resumed successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /integrations/amazon/stores/:id/sync-orders
     *
     * Trigger manual order sync for a store
     */
    static async syncOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { fromDate, toDate, maxOrders } = req.body;
            const companyId = req.user?.companyId;

            // Verify ownership
            const store = await AmazonStore.findOne({
                _id: id,
                companyId,
            });

            if (!store) {
                throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
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
                userId: req.user?._id,
            });

            res.json({
                success: true,
                message: 'Order sync completed',
                result: {
                    itemsProcessed: result.itemsProcessed,
                    itemsSynced: result.itemsSynced,
                    itemsFailed: result.itemsFailed,
                    itemsSkipped: result.itemsSkipped,
                    errors: result.syncErrors.length > 0 ? result.syncErrors.slice(0, 10) : [],
                },
            });
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
            const { id } = req.params;
            const {
                lwaClientId,
                lwaClientSecret,
                lwaRefreshToken,
                awsAccessKeyId,
                awsSecretAccessKey,
                roleArn,
            } = req.body;
            const companyId = req.user?.companyId;

            // Verify ownership
            const store = await AmazonStore.findOne({
                _id: id,
                companyId,
            });

            if (!store) {
                throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
            }

            // Validate required fields
            if (!lwaClientId || !lwaClientSecret || !lwaRefreshToken) {
                throw new AppError(
                    'LWA credentials are required',
                    'AMAZON_LWA_CREDENTIALS_REQUIRED',
                    400
                );
            }

            if (!awsAccessKeyId || !awsSecretAccessKey) {
                throw new AppError(
                    'AWS credentials are required',
                    'AMAZON_AWS_CREDENTIALS_REQUIRED',
                    400
                );
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
                companyId,
                userId: req.user?._id,
            });

            res.json({
                success: true,
                message: 'Credentials refreshed successfully',
            });
        } catch (error) {
            next(error);
        }
    }
}

export default AmazonController;
