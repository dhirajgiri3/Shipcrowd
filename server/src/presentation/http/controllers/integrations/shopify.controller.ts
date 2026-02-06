import { Request, Response, NextFunction } from 'express';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import ShopifyOAuthService from '../../../../core/application/services/shopify/shopify-oauth.service';
import ShopifyFulfillmentService from '../../../../core/application/services/shopify/shopify-fulfillment.service';
import ShopifyOrderSyncService from '../../../../core/application/services/shopify/shopify-order-sync.service';
import { ShopifyStore, SyncLog } from '../../../../infrastructure/database/mongoose/models';
import { ValidationError, NotFoundError, AuthenticationError, AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { sendSuccess, sendCreated } from '../../../../shared/utils/responseHelper';
import logger from '../../../../shared/logger/winston.logger';
import { toEcommerceStoreDTO, applyDefaultsToSettings } from '../../../../core/mappers/store.mapper';

/**
 * ShopifyController
 *
 * Handles Shopify OAuth installation, store management, and connection testing.
 *
 * Endpoints:
 * - GET /install - Initiate OAuth flow
 * - GET /callback - Handle OAuth callback
 * - GET /stores - List connected stores
 * - DELETE /stores/:id - Disconnect store
 * - POST /stores/:id/test - Test connection
 * - POST /stores/:id/pause - Pause sync
 * - POST /stores/:id/resume - Resume sync
 */

export class ShopifyController {

  /**
   * GET /integrations/shopify/install
   *
   * Initiate Shopify OAuth installation flow
   *
   * Query params:
   * - shop: Shopify store domain (e.g., example.myshopify.com)
   */
  static async install(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { shop } = req.query;

      if (!shop || typeof shop !== 'string') {
        throw new ValidationError('Shop parameter is required');
      }

      // Generate OAuth install URL
      const installUrl = ShopifyOAuthService.generateInstallUrl({
        shop,
        companyId: auth.companyId,
      });

      logger.info('Shopify install initiated', {
        shop,
        companyId: auth.companyId,
        userId: auth.userId,
      });

      sendSuccess(res, { installUrl }, 'Redirecting to Shopify for authorization');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /integrations/shopify/callback
   *
   * Handle OAuth callback from Shopify
   *
   * Query params:
   * - shop: Shopify store domain
   * - code: Authorization code
   * - hmac: HMAC signature
   * - state: CSRF protection state
   * - timestamp: Request timestamp
   */
  static async callback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shop, code, hmac, state, timestamp } = req.query;

      if (!shop || !code || !hmac || !state || !timestamp) {
        throw new ValidationError('Missing required OAuth parameters');
      }

      // Handle callback and install store
      const store = await ShopifyOAuthService.handleCallback(req.query);

      logger.info('Shopify OAuth completed', {
        storeId: store._id,
        shop: store.shopDomain,
        companyId: store.companyId,
      });

      // Redirect to frontend success page
      const redirectUrl = `${process.env.FRONTEND_URL}/seller/integrations/shopify/setup?status=success&store=${store.shopDomain}&storeId=${store._id}&step=3`;
      res.redirect(redirectUrl);
    } catch (error) {
      logger.error('Shopify OAuth callback failed', { error });

      // Redirect to frontend error page
      const errorMessage = error instanceof AppError ? error.message : 'Installation failed';
      const redirectUrl = `${process.env.FRONTEND_URL}/seller/integrations/shopify/setup?status=error&message=${encodeURIComponent(errorMessage)}`;
      res.redirect(redirectUrl);
    }
  }

  /**
   * GET /integrations/shopify/stores
   *
   * List all connected Shopify stores for the company
   */
  static async listStores(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);

      const stores = await ShopifyOAuthService.getActiveStores(auth.companyId);

      sendSuccess(res, {
        count: stores.length,
        stores: stores.map((store) => ({
          ...toEcommerceStoreDTO(store, 'shopify'),
          shopDomain: store.shopDomain,
          shopName: store.shopName,
          shopEmail: store.shopEmail,
          shopCountry: store.shopCountry,
          shopCurrency: store.shopCurrency,
          shopPlan: store.shopPlan,
          scope: store.scope,
          stats: store.stats,
          syncConfig: store.syncConfig,
          settings: applyDefaultsToSettings(store.settings),
          activeWebhooksCount: store.webhooks.filter((w) => w.isActive).length,
        })),
      }, 'Stores retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /integrations/shopify/stores/:id
   *
   * Get details of a specific store
   */
  static async getStore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { id } = req.params;

      const store = await ShopifyStore.findOne({
        _id: id,
        companyId: auth.companyId,
      });

      if (!store) {
        throw new NotFoundError('Shopify store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      // Fetch recent sync logs
      const logs = await SyncLog.find({ storeId: id })
        .sort({ createdAt: -1 })
        .limit(10);

      // Refresh stats if needed
      const stats = store.stats || {
        ordersSynced: 0,
        syncSuccessRate: 100,
        lastSyncDuration: 0,
        lastSyncAt: undefined
      };

      sendSuccess(res, {
        store: {
          ...toEcommerceStoreDTO(store, 'shopify'),
          shopDomain: store.shopDomain,
          shopName: store.shopName,
          shopEmail: store.shopEmail,
          shopCountry: store.shopCountry,
          shopCurrency: store.shopCurrency,
          shopPlan: store.shopPlan,
          scope: store.scope,
          syncConfig: store.syncConfig,
          settings: applyDefaultsToSettings(store.settings),
          webhooks: store.webhooks,
          stats: {
            ...stats,
            lastSyncAt: logs[0]?.startedAt || store.stats?.lastSyncAt
          },
        },
        recentLogs: logs
      }, 'Store details retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /integrations/shopify/stores/:id/sync/logs
   *
   * Get paginated sync logs
   */
  static async getSyncLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const store = await ShopifyStore.findOne({ _id: id, companyId: auth.companyId });
      if (!store) {
        throw new NotFoundError('Shopify store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      const logs = await SyncLog.find({ storeId: id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await SyncLog.countDocuments({ storeId: id });

      sendSuccess(res, {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }, 'Sync logs retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /integrations/shopify/stores/:id
   *
   * Disconnect Shopify store and unregister webhooks
   */
  static async disconnectStore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { id } = req.params;

      // Verify ownership
      const store = await ShopifyStore.findOne({
        _id: id,
        companyId: auth.companyId,
      });

      if (!store) {
        throw new NotFoundError('Shopify store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      // Disconnect store
      await ShopifyOAuthService.disconnectStore(id);

      logger.info('Store disconnected', {
        storeId: id,
        shop: store.shopDomain,
        companyId: auth.companyId,
        userId: auth.userId,
      });

      sendSuccess(res, null, 'Store disconnected successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /integrations/shopify/stores/:id/settings
   *
   * Update store settings
   */
  static async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { id } = req.params;
      const { settings } = req.body;

      // Verify ownership
      const store = await ShopifyStore.findOne({ _id: id, companyId: auth.companyId }) as any;

      if (!store) {
        throw new NotFoundError('Shopify store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      // Update settings
      if (settings) {
        store.settings = {
          ...store.settings,
          ...settings,
        };
      }

      await store.save();

      logger.info('Store settings updated', {
        storeId: id,
        companyId: auth.companyId,
        userId: auth.userId,
      });

      sendSuccess(res, { store }, 'Settings updated successfully');
    } catch (error) {
      next(error);
    }
  }


  /**
   * POST /integrations/shopify/stores/:id/test
   *
   * Test connection to Shopify store
   */
  static async testConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { id } = req.params;

      // Verify ownership
      const store = await ShopifyStore.findOne({
        _id: id,
        companyId: auth.companyId,
      });

      if (!store) {
        throw new NotFoundError('Shopify store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      // Test connection
      const isValid = await ShopifyOAuthService.refreshConnection(id);

      sendSuccess(res, { connected: isValid }, isValid ? 'Connection is valid' : 'Connection failed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /integrations/shopify/stores/:id/pause
   *
   * Pause sync for a store
   */
  static async pauseSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { id } = req.params;

      // Verify ownership
      const store = await ShopifyStore.findOne({
        _id: id,
        companyId: auth.companyId,
      });

      if (!store) {
        throw new NotFoundError('Shopify store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      await ShopifyOAuthService.togglePauseSync(id, true);

      logger.info('Store sync paused', {
        storeId: id,
        shop: store.shopDomain,
        companyId: auth.companyId,
        userId: auth.userId,
      });

      sendSuccess(res, null, 'Sync paused successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /integrations/shopify/stores/:id/resume
   *
   * Resume sync for a store
   */
  static async resumeSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { id } = req.params;

      // Verify ownership
      const store = await ShopifyStore.findOne({
        _id: id,
        companyId: auth.companyId,
      });

      if (!store) {
        throw new NotFoundError('Shopify store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      await ShopifyOAuthService.togglePauseSync(id, false);

      logger.info('Store sync resumed', {
        storeId: id,
        shop: store.shopDomain,
        companyId: auth.companyId,
        userId: auth.userId,
      });

      sendSuccess(res, null, 'Sync resumed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /integrations/shopify/stores/:storeId/orders/:orderId/fulfill
   *
   * Create fulfillment for Shopify order
   */
  static async createFulfillment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { storeId, orderId } = req.params;
      const { trackingNumber, trackingCompany, trackingUrl, notifyCustomer } = req.body;

      // Validate store access
      const store = await ShopifyStore.findOne({ _id: storeId, companyId: auth.companyId });

      if (!store) {
        throw new NotFoundError('Shopify store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      // Create fulfillment via service
      const fulfillment = await ShopifyFulfillmentService.createFulfillment(orderId, {
        awbNumber: trackingNumber,
        courierName: trackingCompany,
        trackingUrl,
        notifyCustomer: notifyCustomer ?? true,
      });

      logger.info('Shopify fulfillment created', {
        storeId,
        orderId,
        fulfillmentId: fulfillment?.id,
        companyId: auth.companyId,
      });

      sendCreated(res, { fulfillment }, 'Fulfillment created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /integrations/shopify/stores/:storeId/fulfillments/:fulfillmentId
   *
   * Update tracking information for existing fulfillment
   */
  static async updateFulfillmentTracking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { storeId, orderId } = req.params;
      const { trackingNumber, trackingCompany, trackingUrl } = req.body;

      // Validate store access
      const store = await ShopifyStore.findOne({ _id: storeId, companyId: auth.companyId });

      if (!store) {
        throw new NotFoundError('Shopify store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      // Update fulfillment tracking
      const updatedFulfillment = await ShopifyFulfillmentService.updateTracking(orderId, {
        awbNumber: trackingNumber,
        courierName: trackingCompany,
        trackingUrl,
      });

      logger.info('Shopify fulfillment tracking updated', {
        storeId,
        orderId,
        companyId: auth.companyId,
      });

      sendSuccess(res, { fulfillment: updatedFulfillment }, 'Tracking information updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /integrations/shopify/stores/:id/sync/orders
   *
   * Manually trigger order synchronization
   */
  static async syncOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { id: storeId } = req.params;
      const { sinceDate } = req.body;

      // Validate store access
      const store = await ShopifyStore.findOne({ _id: storeId, companyId: auth.companyId });

      if (!store) {
        throw new NotFoundError('Shopify store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      // Check if sync is paused
      if (store.isPaused) {
        throw new AppError('Order sync is paused for this store', ErrorCode.BIZ_INVALID_STATE, 400);
      }

      logger.info('Manual order sync initiated', {
        storeId,
        companyId: auth.companyId,
        sinceDate,
      });

      // Trigger sync (async process)
      const syncResult = await ShopifyOrderSyncService.syncOrders(
        storeId,
        sinceDate ? new Date(sinceDate) : undefined
      );

      sendSuccess(res, {
        itemsProcessed: syncResult.itemsProcessed,
        itemsSynced: syncResult.itemsSynced,
        itemsFailed: syncResult.itemsFailed,
        itemsSkipped: syncResult.itemsSkipped,
        errors: syncResult.syncErrors,
      }, 'Order synchronization completed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /integrations/shopify/stores/:id/sync/fulfillments
   *
   * Sync fulfillment status for pending orders
   */
  static async syncPendingFulfillments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { id: storeId } = req.params;

      // Validate store access
      const store = await ShopifyStore.findOne({ _id: storeId, companyId: auth.companyId });

      if (!store) {
        throw new NotFoundError('Shopify store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      logger.info('Pending fulfillments sync initiated', {
        storeId,
        companyId: auth.companyId,
      });

      // Sync pending fulfillments
      const fulfillmentCount = await ShopifyFulfillmentService.syncPendingFulfillments(storeId);

      sendSuccess(res, { fulfillmentsSynced: fulfillmentCount }, 'Fulfillment synchronization completed');
    } catch (error) {
      next(error);
    }
  }
}

export default ShopifyController;
