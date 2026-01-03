/**
 * AmazonOAuthService
 *
 * Handles Amazon SP-API authentication and store management.
 * Manages LWA (Login with Amazon) OAuth tokens and AWS credentials.
 *
 * Features:
 * - LWA OAuth token management
 * - Store CRUD operations
 * - Connection testing
 * - SQS notification subscription
 * - Auto-pause on repeated failures
 */

import { AmazonStore, IAmazonStore } from '../../../../infrastructure/database/mongoose/models';
import { AmazonClient } from '../../../../infrastructure/external/ecommerce/amazon/amazon.client';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

// Types
interface ConnectStoreParams {
    sellerId: string;
    marketplaceId: string;
    sellerName: string;
    sellerEmail?: string;
    lwaClientId: string;
    lwaClientSecret: string;
    lwaRefreshToken: string;
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
    roleArn: string;
    region: string;
    companyId: string;
    userId: string;
}

interface TestConnectionParams {
    lwaClientId: string;
    lwaClientSecret: string;
    lwaRefreshToken: string;
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
    region: string;
    marketplaceId: string;
}

/**
 * AmazonOAuthService - Static service for Amazon OAuth and store management
 */
export default class AmazonOAuthService {
    /**
     * Test connection to Amazon SP-API with provided credentials
     */
    static async testConnection(params: TestConnectionParams): Promise<boolean> {
        logger.info('Testing Amazon SP-API connection', {
            marketplaceId: params.marketplaceId,
            region: params.region,
        });

        try {
            const client = new AmazonClient({
                clientId: params.lwaClientId,
                clientSecret: params.lwaClientSecret,
                refreshToken: params.lwaRefreshToken,
                awsAccessKeyId: params.awsAccessKeyId,
                awsSecretAccessKey: params.awsSecretAccessKey,
                awsRegion: params.region,
                marketplace: AmazonOAuthService.getMarketplaceFromId(params.marketplaceId),
            });

            const success = await client.testConnection();

            if (success) {
                logger.info('Amazon SP-API connection test successful');
            } else {
                logger.warn('Amazon SP-API connection test failed');
            }

            return success;
        } catch (error) {
            logger.error('Amazon SP-API connection test error', { error });
            return false;
        }
    }

    /**
     * Connect a new Amazon store to Shipcrowd
     */
    static async connectStore(params: ConnectStoreParams): Promise<IAmazonStore> {
        logger.info('Connecting Amazon store', {
            sellerId: params.sellerId,
            marketplaceId: params.marketplaceId,
            companyId: params.companyId,
        });

        // Check for existing store with same seller ID
        const existingStore = await AmazonStore.findOne({
            companyId: params.companyId,
            sellerId: params.sellerId,
        });

        if (existingStore) {
            // Reactivate if previously uninstalled
            if (!existingStore.isActive) {
                logger.info('Reactivating existing Amazon store', { storeId: existingStore._id });

                existingStore.isActive = true;
                existingStore.lwaClientId = params.lwaClientId;
                existingStore.lwaClientSecret = params.lwaClientSecret;
                existingStore.lwaRefreshToken = params.lwaRefreshToken;
                existingStore.awsAccessKeyId = params.awsAccessKeyId;
                existingStore.awsSecretAccessKey = params.awsSecretAccessKey;
                existingStore.roleArn = params.roleArn;
                existingStore.region = params.region;
                existingStore.installedAt = new Date();
                existingStore.uninstalledAt = undefined;
                existingStore.errorCount = 0;
                existingStore.lastError = undefined;
                existingStore.syncStatus = 'active';

                await existingStore.save();
                return existingStore;
            }

            throw new AppError('Amazon store already connected for this seller ID', 'AMAZON_STORE_ALREADY_EXISTS', 409);
        }

        // Test connection before saving
        const connectionValid = await AmazonOAuthService.testConnection({
            lwaClientId: params.lwaClientId,
            lwaClientSecret: params.lwaClientSecret,
            lwaRefreshToken: params.lwaRefreshToken,
            awsAccessKeyId: params.awsAccessKeyId,
            awsSecretAccessKey: params.awsSecretAccessKey,
            region: params.region,
            marketplaceId: params.marketplaceId,
        });

        if (!connectionValid) {
            throw new AppError(
                'Failed to connect to Amazon SP-API. Please check your credentials.',
                'AMAZON_CONNECTION_FAILED',
                400
            );
        }

        // Create new store
        const store = new AmazonStore({
            companyId: params.companyId,
            createdBy: params.userId,
            sellerId: params.sellerId,
            marketplaceId: params.marketplaceId,
            sellerName: params.sellerName,
            sellerEmail: params.sellerEmail,
            lwaClientId: params.lwaClientId,
            lwaClientSecret: params.lwaClientSecret,
            lwaRefreshToken: params.lwaRefreshToken,
            awsAccessKeyId: params.awsAccessKeyId,
            awsSecretAccessKey: params.awsSecretAccessKey,
            roleArn: params.roleArn,
            region: params.region,
            isActive: true,
            isPaused: false,
            installedAt: new Date(),
            syncConfig: {
                orderSync: {
                    enabled: true,
                    autoSync: true,
                    syncInterval: 15,
                    syncStatus: 'IDLE',
                    errorCount: 0,
                },
                inventorySync: {
                    enabled: true,
                    autoSync: false,
                    syncDirection: 'ONE_WAY',
                    errorCount: 0,
                },
                webhooksEnabled: true,
            },
            stats: {
                totalOrdersSynced: 0,
                totalProductsMapped: 0,
                totalInventorySyncs: 0,
                webhooksReceived: 0,
            },
        });

        await store.save();

        logger.info('Amazon store connected successfully', { storeId: store._id });

        return store;
    }

    /**
     * Disconnect an Amazon store
     */
    static async disconnectStore(storeId: string): Promise<void> {
        logger.info('Disconnecting Amazon store', { storeId });

        const store = await AmazonStore.findById(storeId);

        if (!store) {
            throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
        }

        store.isActive = false;
        store.syncStatus = 'paused';
        store.uninstalledAt = new Date();

        await store.save();

        logger.info('Amazon store disconnected', { storeId });
    }

    /**
     * Refresh store connection with new credentials
     */
    static async refreshConnection(
        storeId: string,
        credentials: {
            lwaClientId: string;
            lwaClientSecret: string;
            lwaRefreshToken: string;
            awsAccessKeyId: string;
            awsSecretAccessKey: string;
            roleArn?: string;
        }
    ): Promise<void> {
        logger.info('Refreshing Amazon store connection', { storeId });

        const store = await AmazonStore.findById(storeId).select(
            '+lwaClientId +lwaClientSecret +lwaRefreshToken +awsAccessKeyId +awsSecretAccessKey'
        );

        if (!store) {
            throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
        }

        // Test new credentials
        const connectionValid = await AmazonOAuthService.testConnection({
            lwaClientId: credentials.lwaClientId,
            lwaClientSecret: credentials.lwaClientSecret,
            lwaRefreshToken: credentials.lwaRefreshToken,
            awsAccessKeyId: credentials.awsAccessKeyId,
            awsSecretAccessKey: credentials.awsSecretAccessKey,
            region: store.region,
            marketplaceId: store.marketplaceId,
        });

        if (!connectionValid) {
            throw new AppError('Failed to connect with new credentials', 'AMAZON_CONNECTION_FAILED', 400);
        }

        // Update credentials
        store.lwaClientId = credentials.lwaClientId;
        store.lwaClientSecret = credentials.lwaClientSecret;
        store.lwaRefreshToken = credentials.lwaRefreshToken;
        store.awsAccessKeyId = credentials.awsAccessKeyId;
        store.awsSecretAccessKey = credentials.awsSecretAccessKey;

        if (credentials.roleArn) {
            store.roleArn = credentials.roleArn;
        }

        // Reset error state
        store.errorCount = 0;
        store.lastError = undefined;
        store.syncStatus = 'active';

        await store.save();

        logger.info('Amazon store connection refreshed', { storeId });
    }

    /**
     * Get active stores for a company
     */
    static async getActiveStores(companyId: string): Promise<IAmazonStore[]> {
        return AmazonStore.find({
            companyId,
            isActive: true,
        }).sort({ createdAt: -1 });
    }

    /**
     * Get store by ID with credentials
     */
    static async getStoreWithCredentials(storeId: string): Promise<IAmazonStore | null> {
        return AmazonStore.findById(storeId).select(
            '+lwaClientId +lwaClientSecret +lwaRefreshToken +lwaAccessToken +awsAccessKeyId +awsSecretAccessKey'
        );
    }

    /**
     * Pause sync for a store
     */
    static async pauseSync(storeId: string): Promise<void> {
        logger.info('Pausing Amazon store sync', { storeId });

        const store = await AmazonStore.findById(storeId);

        if (!store) {
            throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
        }

        store.isPaused = true;
        store.syncStatus = 'paused';

        await store.save();

        logger.info('Amazon store sync paused', { storeId });
    }

    /**
     * Resume sync for a store
     */
    static async resumeSync(storeId: string): Promise<void> {
        logger.info('Resuming Amazon store sync', { storeId });

        const store = await AmazonStore.findById(storeId);

        if (!store) {
            throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
        }

        if (!store.isActive) {
            throw new AppError('Cannot resume sync for inactive store', 'AMAZON_STORE_INACTIVE', 400);
        }

        store.isPaused = false;
        store.syncStatus = 'active';

        await store.save();

        logger.info('Amazon store sync resumed', { storeId });
    }

    /**
     * Create Amazon client for a store
     */
    static async createClientForStore(storeId: string): Promise<AmazonClient> {
        const store = await AmazonOAuthService.getStoreWithCredentials(storeId);

        if (!store) {
            throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
        }

        if (!store.isActive) {
            throw new AppError('Amazon store is not active', 'AMAZON_STORE_INACTIVE', 400);
        }

        const lwaCredentials = store.decryptLwaCredentials();
        const awsCredentials = store.decryptAwsCredentials();

        return new AmazonClient({
            clientId: lwaCredentials.clientId,
            clientSecret: lwaCredentials.clientSecret,
            refreshToken: lwaCredentials.refreshToken,
            awsAccessKeyId: awsCredentials.accessKeyId,
            awsSecretAccessKey: awsCredentials.secretAccessKey,
            awsRegion: store.region,
            marketplace: AmazonOAuthService.getMarketplaceFromId(store.marketplaceId),
        });
    }

    /**
     * Record error for a store (auto-pause after 10 consecutive errors)
     */
    static async recordError(storeId: string, error: string): Promise<void> {
        const store = await AmazonStore.findById(storeId);

        if (!store) {
            return;
        }

        store.errorCount += 1;
        store.lastError = error;

        // Auto-pause after 10 consecutive errors
        if (store.errorCount >= 10) {
            store.isPaused = true;
            store.syncStatus = 'error';

            logger.warn('Amazon store auto-paused due to repeated errors', {
                storeId,
                errorCount: store.errorCount,
            });
        }

        await store.save();
    }

    /**
     * Reset error count for a store
     */
    static async resetErrorCount(storeId: string): Promise<void> {
        await AmazonStore.findByIdAndUpdate(storeId, {
            errorCount: 0,
            lastError: undefined,
        });
    }

    /**
     * Get marketplace enum from marketplace ID
     */
    private static getMarketplaceFromId(marketplaceId: string): 'NA' | 'EU' | 'FE' {
        // North America marketplaces
        const naMarketplaces = [
            'ATVPDKIKX0DER', // US
            'A2EUQ1WTGCTBG2', // Canada
            'A1AM78C64UM0Y8', // Mexico
            'A2Q3Y263D00KWC', // Brazil
        ];

        // European marketplaces
        const euMarketplaces = [
            'A1PA6795UKMFR9', // Germany
            'A1RKKUPIHCS9HS', // Spain
            'A13V1IB3VIYBER', // France
            'A1F83G8C2ARO7P', // UK
            'APJ6JRA9NG5V4', // Italy
            'A21TJRUUN4KGV', // India
            'A1805ISW7BS3AE', // Netherlands
            'A1C3SOZRARQ6R3', // Poland
            'A2NODRKZP88ZB9', // Sweden
            'ARBP9OOSHTCHU', // Egypt
            'A2VIGQ35RCS4UG', // UAE
            'A33AVAJ2PDY3EV', // Turkey
            'A17E79C6D8DWNP', // Saudi Arabia
            'A1PA6795UKMFR9', // Belgium
        ];

        // Far East marketplaces
        const feMarketplaces = [
            'A1VC38T7YXB528', // Japan
            'AAHKV2X7AFYLW', // China
            'A19VAU5U5O7RUS', // Singapore
            'A39IBJ37TRP1C6', // Australia
        ];

        if (naMarketplaces.includes(marketplaceId)) {
            return 'NA';
        }

        if (euMarketplaces.includes(marketplaceId)) {
            return 'EU';
        }

        if (feMarketplaces.includes(marketplaceId)) {
            return 'FE';
        }

        // Default to NA if unknown
        return 'NA';
    }
}
