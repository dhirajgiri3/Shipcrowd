/**
 * WooCommerce Controller
 *
 * Handles WooCommerce store management API endpoints:
 * - Store installation (connect new store)
 * - List connected stores
 * - Get store details
 * - Test connection
 * - Disconnect store
 * - Pause/resume sync
 * - Refresh credentials
 */

import { Request, Response, NextFunction } from 'express';
import WooCommerceOAuthService from '../../../../core/application/services/woocommerce/woocommerce-oauth.service';
import { WooCommerceStore } from '../../../../infrastructure/database/mongoose/models';
import WooCommerceOrderSyncJob from '../../../../infrastructure/jobs/marketplaces/woocommerce/woocommerce-order-sync.job';
import { ValidationError, NotFoundError, AuthenticationError, AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { sendSuccess, sendCreated } from '../../../../shared/utils/responseHelper';
import logger from '../../../../shared/logger/winston.logger';

export default class WooCommerceController {
  /**
   * Install WooCommerce store
   * POST /api/v1/integrations/woocommerce/install
   *
   * Body:
   * {
   *   "storeUrl": "https://example.com",
   *   "consumerKey": "ck_...",
   *   "consumerSecret": "cs_...",
   *   "storeName": "My Store" (optional)
   * }
   */
  static async installStore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { storeUrl, consumerKey, consumerSecret, storeName } = req.body;
      const companyId = req.user?.companyId;

      // Validation
      if (!storeUrl || !consumerKey || !consumerSecret) {
        throw new ValidationError('Store URL, consumer key, and consumer secret are required');
      }

      if (!companyId) {
        throw new AuthenticationError('Company ID not found in request', ErrorCode.AUTH_REQUIRED);
      }

      // Validate store URL format
      let normalizedUrl = storeUrl.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = `https://${normalizedUrl}`;
      }

      // Install store
      const store = await WooCommerceOAuthService.installStore({
        companyId,
        storeUrl: normalizedUrl,
        consumerKey,
        consumerSecret,
        storeName,
      });

      logger.info('WooCommerce store installed via API', {
        storeId: store._id,
        companyId,
        userId: req.user?._id,
      });

      sendCreated(res, {
        store: {
          id: store._id,
          storeUrl: store.storeUrl,
          storeName: store.storeName,
          currency: store.currency,
          isActive: store.isActive,
          webhooksRegistered: store.webhooks.length,
          installedAt: store.installedAt,
        },
      }, 'WooCommerce store connected successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * List connected WooCommerce stores
   * GET /api/v1/integrations/woocommerce/stores
   */
  static async listStores(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user?.companyId;

      if (!companyId) {
        throw new AppError('Company ID not found in request', 'UNAUTHORIZED', 401);
      }

      const stores = await WooCommerceOAuthService.getActiveStores(companyId);

      sendSuccess(res, {
        count: stores.length,
        stores: stores.map((store) => ({
          id: store._id,
          storeUrl: store.storeUrl,
          storeName: store.storeName,
          currency: store.currency,
          wcVersion: store.wcVersion,
          isActive: store.isActive,
          isPaused: store.isPaused,
          installedAt: store.installedAt,
          syncConfig: store.syncConfig,
          stats: store.stats,
          activeWebhooksCount: store.webhooks.filter((w: any) => w.isActive).length,
        })),
      }, 'WooCommerce stores retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get store details
   * GET /api/v1/integrations/woocommerce/stores/:id
   */
  static async getStoreDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      if (!companyId) {
        throw new AuthenticationError('Company ID not found in request', ErrorCode.AUTH_REQUIRED);
      }

      const store = await WooCommerceStore.findOne({
        _id: id,
        companyId,
      }).select('-consumerKey -consumerSecret');

      if (!store) {
        throw new NotFoundError('WooCommerce store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      sendSuccess(res, {
        store: {
          id: store._id,
          storeUrl: store.storeUrl,
          storeName: store.storeName,
          apiVersion: store.apiVersion,
          wpVersion: store.wpVersion,
          wcVersion: store.wcVersion,
          currency: store.currency,
          timezone: store.timezone,
          isActive: store.isActive,
          isPaused: store.isPaused,
          installedAt: store.installedAt,
          uninstalledAt: store.uninstalledAt,
          syncConfig: store.syncConfig,
          stats: store.stats,
          webhooks: store.webhooks.map((webhook: any) => ({
            topic: webhook.topic,
            address: webhook.address,
            isActive: webhook.isActive,
            createdAt: webhook.createdAt,
            lastDeliveryAt: webhook.lastDeliveryAt,
          })),
        },
      }, 'WooCommerce store details retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test WooCommerce store connection
   * POST /api/v1/integrations/woocommerce/stores/:id/test
   */
  static async testConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      if (!companyId) {
        throw new AuthenticationError('Company ID not found in request', ErrorCode.AUTH_REQUIRED);
      }

      const store = await WooCommerceStore.findOne({
        _id: id,
        companyId,
      });

      if (!store) {
        throw new NotFoundError('WooCommerce store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      // Test connection
      const connected = await WooCommerceOAuthService.testConnection(
        store.storeUrl,
        store.decryptConsumerKey(),
        store.decryptConsumerSecret()
      );

      sendSuccess(res, {
        connected,
      }, connected ? 'Connection is valid' : 'Connection failed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disconnect WooCommerce store
   * DELETE /api/v1/integrations/woocommerce/stores/:id
   */
  static async disconnectStore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      if (!companyId) {
        throw new AppError('Company ID not found in request', 'UNAUTHORIZED', 401);
      }

      // Verify ownership
      const store = await WooCommerceStore.findOne({
        _id: id,
        companyId,
      });

      if (!store) {
        throw new AppError('WooCommerce store not found', 'WOOCOMMERCE_STORE_NOT_FOUND', 404);
      }

      // Disconnect store
      await WooCommerceOAuthService.disconnectStore(id);

      logger.info('WooCommerce store disconnected via API', {
        storeId: id,
        companyId,
        userId: req.user?._id,
      });

      sendSuccess(res, null, 'WooCommerce store disconnected successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Pause sync for a store
   * POST /api/v1/integrations/woocommerce/stores/:id/pause
   */
  static async pauseSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      if (!companyId) {
        throw new AppError('Company ID not found in request', 'UNAUTHORIZED', 401);
      }

      // Verify ownership
      const store = await WooCommerceStore.findOne({
        _id: id,
        companyId,
      });

      if (!store) {
        throw new AppError('WooCommerce store not found', 'WOOCOMMERCE_STORE_NOT_FOUND', 404);
      }

      // Pause sync
      await WooCommerceOAuthService.pauseSync(id);

      logger.info('WooCommerce sync paused via API', {
        storeId: id,
        companyId,
        userId: req.user?._id,
      });

      sendSuccess(res, null, 'Sync paused successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resume sync for a store
   * POST /api/v1/integrations/woocommerce/stores/:id/resume
   */
  static async resumeSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      if (!companyId) {
        throw new AppError('Company ID not found in request', 'UNAUTHORIZED', 401);
      }

      // Verify ownership
      const store = await WooCommerceStore.findOne({
        _id: id,
        companyId,
      });

      if (!store) {
        throw new AppError('WooCommerce store not found', 'WOOCOMMERCE_STORE_NOT_FOUND', 404);
      }

      // Resume sync
      await WooCommerceOAuthService.resumeSync(id);

      logger.info('WooCommerce sync resumed via API', {
        storeId: id,
        companyId,
        userId: req.user?._id,
      });

      sendSuccess(res, null, 'Sync resumed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh store credentials
   * PUT /api/v1/integrations/woocommerce/stores/:id/credentials
   *
   * Body:
   * {
   *   "consumerKey": "ck_...",
   *   "consumerSecret": "cs_..."
   * }
   */
  static async refreshCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { consumerKey, consumerSecret } = req.body;
      const companyId = req.user?.companyId;

      if (!companyId) {
        throw new AuthenticationError('Company ID not found in request', ErrorCode.AUTH_REQUIRED);
      }

      if (!consumerKey || !consumerSecret) {
        throw new ValidationError('Consumer key and consumer secret are required');
      }

      // Verify ownership
      const store = await WooCommerceStore.findOne({
        _id: id,
        companyId,
      });

      if (!store) {
        throw new AppError('WooCommerce store not found', 'WOOCOMMERCE_STORE_NOT_FOUND', 404);
      }

      // Refresh credentials
      await WooCommerceOAuthService.refreshConnection(id, consumerKey, consumerSecret);

      logger.info('WooCommerce credentials refreshed via API', {
        storeId: id,
        companyId,
        userId: req.user?._id,
      });

      sendSuccess(res, null, 'Credentials updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Re-register webhooks for a store
   * POST /api/v1/integrations/woocommerce/stores/:id/webhooks/register
   */
  static async registerWebhooks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      if (!companyId) {
        throw new AppError('Company ID not found in request', 'UNAUTHORIZED', 401);
      }

      // Verify ownership
      const store = await WooCommerceStore.findOne({
        _id: id,
        companyId,
      });

      if (!store) {
        throw new AppError('WooCommerce store not found', 'WOOCOMMERCE_STORE_NOT_FOUND', 404);
      }

      // Register webhooks
      const results = await WooCommerceOAuthService.registerWebhooks(id);

      const successCount = results.filter((r) => r.success).length;

      logger.info('WooCommerce webhooks registered via API', {
        storeId: id,
        companyId,
        userId: req.user?._id,
        success: successCount,
        total: results.length,
      });

      sendSuccess(res, {
        message: `Registered ${successCount} out of ${results.length} webhooks`,
        results: results.map((r) => ({
          topic: r.topic,
          success: r.success,
          error: r.error,
        })),
      }, 'Webhooks processed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Trigger manual order sync
   * POST /api/v1/integrations/woocommerce/stores/:id/sync/orders
   *
   * Body (optional):
   * {
   *   "hoursBack": 24 (sync orders from last N hours)
   * }
   */
  static async syncOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { hoursBack } = req.body;
      const companyId = req.user?.companyId;

      if (!companyId) {
        throw new AppError('Company ID not found in request', 'UNAUTHORIZED', 401);
      }

      // Verify ownership
      const store = await WooCommerceStore.findOne({
        _id: id,
        companyId,
      });

      if (!store) {
        throw new AppError('WooCommerce store not found', 'WOOCOMMERCE_STORE_NOT_FOUND', 404);
      }

      // Trigger manual sync
      const jobId = await WooCommerceOrderSyncJob.triggerManualSync(id, hoursBack);

      logger.info('WooCommerce manual order sync triggered via API', {
        storeId: id,
        companyId,
        userId: req.user?._id,
        jobId,
        hoursBack,
      });

      sendSuccess(res, { jobId }, 'Order sync queued successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order sync job status
   * GET /api/v1/integrations/woocommerce/sync/jobs/:jobId
   */
  static async getSyncJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId } = req.params;

      const status = await WooCommerceOrderSyncJob.getJobStatus(jobId);

      if (!status) {
        throw new NotFoundError('Job', ErrorCode.RES_NOT_FOUND);
      }

      sendSuccess(res, { job: status }, 'Job status retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/integrations/woocommerce/stores/:storeId/orders/:orderId/status
   * Update order status in WooCommerce (mark as shipped/completed)
   */
  static async updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { storeId, orderId } = req.params;
      const { status, awbNumber, courierName, trackingUrl } = req.body;
      const companyId = req.user?.companyId;

      if (!status) {
        throw new ValidationError('Status is required');
      }

      if (!companyId) {
        throw new AuthenticationError('Company ID not found in request', ErrorCode.AUTH_REQUIRED);
      }

      // Verify store ownership
      const store = await WooCommerceStore.findOne({
        _id: storeId,
        companyId,
      });

      if (!store) {
        throw new NotFoundError('WooCommerce store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      // Import fulfillment service from barrel export
      const { WooCommerceFulfillmentService } = await import('../../../../core/application/services/woocommerce/index.js');

      // Update order status
      const trackingInfo = (awbNumber && courierName) ? {
        awbNumber,
        courierName,
        trackingUrl,
      } : undefined;

      await WooCommerceFulfillmentService.updateOrderStatus(
        orderId,
        status,
        trackingInfo
      );

      logger.info('WooCommerce order status updated via API', {
        storeId,
        orderId,
        status,
        companyId,
        userId: req.user?._id,
      });

      sendSuccess(res, null, `Order status updated to ${status} in WooCommerce`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/integrations/woocommerce/stores/:storeId/orders/:orderId/tracking
   * Add tracking note to WooCommerce order
   */
  static async addTrackingNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { storeId, orderId } = req.params;
      const { awbNumber, courierName, trackingUrl, customerNote } = req.body;
      const companyId = req.user?.companyId;

      if (!awbNumber || !courierName) {
        throw new ValidationError('AWB number and courier name are required');
      }

      if (!companyId) {
        throw new AuthenticationError('Company ID not found in request', ErrorCode.AUTH_REQUIRED);
      }

      // Verify store ownership
      const store = await WooCommerceStore.findOne({
        _id: storeId,
        companyId,
      });

      if (!store) {
        throw new NotFoundError('WooCommerce store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      // Import fulfillment service from barrel export
      const { WooCommerceFulfillmentService } = await import('../../../../core/application/services/woocommerce/index.js');

      // Add tracking note
      await WooCommerceFulfillmentService.addTrackingNote(
        orderId,
        {
          awbNumber,
          courierName,
          trackingUrl,
        },
        customerNote !== false
      );

      logger.info('WooCommerce tracking note added via API', {
        storeId,
        orderId,
        awbNumber,
        companyId,
        userId: req.user?._id,
      });

      sendSuccess(res, null, 'Tracking note added to order');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/integrations/woocommerce/stores/:id/sync/fulfillments
   * Sync pending status updates to WooCommerce (bulk)
   */
  static async syncPendingUpdates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      if (!companyId) {
        throw new AuthenticationError('Company ID not found in request', ErrorCode.AUTH_REQUIRED);
      }

      // Verify store ownership
      const store = await WooCommerceStore.findOne({
        _id: id,
        companyId,
      });

      if (!store) {
        throw new NotFoundError('WooCommerce store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      // Import fulfillment service from barrel export
      const { WooCommerceFulfillmentService } = await import('../../../../core/application/services/woocommerce/index.js');

      // Sync pending updates
      const syncedCount = await WooCommerceFulfillmentService.syncPendingUpdates(id);

      logger.info('WooCommerce pending updates synced via API', {
        storeId: id,
        companyId,
        userId: req.user?._id,
        syncedCount,
      });

      sendSuccess(res, {
        syncedCount,
      }, `Synced ${syncedCount} orders to WooCommerce`);
    } catch (error) {
      next(error);
    }
  }
}
