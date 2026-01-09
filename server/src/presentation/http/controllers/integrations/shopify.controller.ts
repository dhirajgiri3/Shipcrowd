import { Request, Response, NextFunction } from 'express';
import ShopifyOAuthService from '../../../../core/application/services/shopify/shopify-oauth.service';
import ShopifyFulfillmentService from '../../../../core/application/services/shopify/shopify-fulfillment.service';
import ShopifyOrderSyncService from '../../../../core/application/services/shopify/shopify-order-sync.service';
import ShopifyStore from '../../../../infrastructure/database/mongoose/models/marketplaces/shopify/shopify-store.model';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

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
      const { shop } = req.query;
      const companyId = req.user?.companyId;

      if (!shop || typeof shop !== 'string') {
        throw new AppError('Shop parameter is required', 'ERROR_CODE', 400);
      }

      if (!companyId) {
        throw new AppError('Company ID not found in request', 'ERROR_CODE', 401);
      }

      // Generate OAuth install URL
      const installUrl = ShopifyOAuthService.generateInstallUrl({
        shop,
        companyId,
      });

      logger.info('Shopify install initiated', {
        shop,
        companyId,
        userId: req.user?._id,
      });

      res.json({
        success: true,
        installUrl,
        message: 'Redirecting to Shopify for authorization',
      });
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
        throw new AppError('Missing required OAuth parameters', 'ERROR_CODE', 400);
      }

      // Handle callback and install store
      const store = await ShopifyOAuthService.handleCallback({
        shop: shop as string,
        code: code as string,
        hmac: hmac as string,
        state: state as string,
        timestamp: timestamp as string,
        companyId: '', // Will be extracted from state
      });

      logger.info('Shopify OAuth completed', {
        storeId: store._id,
        shop: store.shopDomain,
        companyId: store.companyId,
      });

      // Redirect to frontend success page
      const redirectUrl = `${process.env.FRONTEND_URL}/settings/integrations/shopify?status=success&store=${store.shopDomain}`;
      res.redirect(redirectUrl);
    } catch (error) {
      logger.error('Shopify OAuth callback failed', { error });

      // Redirect to frontend error page
      const errorMessage = error instanceof AppError ? error.message : 'Installation failed';
      const redirectUrl = `${process.env.FRONTEND_URL}/settings/integrations/shopify?status=error&message=${encodeURIComponent(errorMessage)}`;
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
      const companyId = req.user?.companyId;

      if (!companyId) {
        throw new AppError('Company ID not found in request', 'ERROR_CODE', 401);
      }

      const stores = await ShopifyOAuthService.getActiveStores(companyId);

      res.json({
        success: true,
        count: stores.length,
        stores: stores.map((store) => ({
          id: store._id,
          shopDomain: store.shopDomain,
          shopName: store.shopName,
          shopEmail: store.shopEmail,
          shopCountry: store.shopCountry,
          shopCurrency: store.shopCurrency,
          shopPlan: store.shopPlan,
          isActive: store.isActive,
          isPaused: store.isPaused,
          installedAt: store.installedAt,
          syncConfig: store.syncConfig,
          stats: store.stats,
          activeWebhooksCount: store.webhooks.filter((w) => w.isActive).length,
        })),
      });
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
      const { id } = req.params;
      const companyId = req.user?.companyId;

      const store = await ShopifyStore.findOne({
        _id: id,
        companyId,
      });

      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      res.json({
        success: true,
        store: {
          id: store._id,
          shopDomain: store.shopDomain,
          shopName: store.shopName,
          shopEmail: store.shopEmail,
          shopCountry: store.shopCountry,
          shopCurrency: store.shopCurrency,
          shopPlan: store.shopPlan,
          scope: store.scope,
          isActive: store.isActive,
          isPaused: store.isPaused,
          installedAt: store.installedAt,
          syncConfig: store.syncConfig,
          webhooks: store.webhooks,
          stats: store.stats,
        },
      });
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
      const { id } = req.params;
      const companyId = req.user?.companyId;

      // Verify ownership
      const ShopifyStore = require('../../../../infrastructure/database/mongoose/models/shopify-store.model').default;
      const store = await ShopifyStore.findOne({
        _id: id,
        companyId,
      });

      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      // Disconnect store
      await ShopifyOAuthService.disconnectStore(id);

      logger.info('Store disconnected', {
        storeId: id,
        shop: store.shopDomain,
        companyId,
        userId: req.user?._id,
      });

      res.json({
        success: true,
        message: 'Store disconnected successfully',
      });
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
      const { id } = req.params;
      const companyId = req.user?.companyId;

      // Verify ownership
      const ShopifyStore = require('../../../../infrastructure/database/mongoose/models/shopify-store.model').default;
      const store = await ShopifyStore.findOne({
        _id: id,
        companyId,
      });

      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      // Test connection
      const isValid = await ShopifyOAuthService.refreshConnection(id);

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
   * POST /integrations/shopify/stores/:id/pause
   *
   * Pause sync for a store
   */
  static async pauseSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      // Verify ownership
      const ShopifyStore = require('../../../../infrastructure/database/mongoose/models/shopify-store.model').default;
      const store = await ShopifyStore.findOne({
        _id: id,
        companyId,
      });

      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      await ShopifyOAuthService.togglePauseSync(id, true);

      logger.info('Store sync paused', {
        storeId: id,
        shop: store.shopDomain,
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
   * POST /integrations/shopify/stores/:id/resume
   *
   * Resume sync for a store
   */
  static async resumeSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      // Verify ownership
      const store = await ShopifyStore.findOne({
        _id: id,
        companyId,
      });

      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      await ShopifyOAuthService.togglePauseSync(id, false);

      logger.info('Store sync resumed', {
        storeId: id,
        shop: store.shopDomain,
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
   * POST /integrations/shopify/stores/:storeId/orders/:orderId/fulfill
   *
   * Create fulfillment for Shopify order
   */
  static async createFulfillment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const { storeId, orderId } = req.params;
      const { trackingNumber, trackingCompany, trackingUrl, notifyCustomer } = req.body;

      if (!companyId) {
        throw new AppError('Company ID not found', 'UNAUTHORIZED', 401);
      }

      // Validate store access
      const store = await ShopifyStore.findOne({ _id: storeId, companyId });

      if (!store) {
        throw new AppError('Store not found or access denied', 'STORE_NOT_FOUND', 404);
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
        companyId,
      });

      res.status(201).json({
        success: true,
        message: 'Fulfillment created successfully',
        data: { fulfillment },
      });
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
      const companyId = req.user?.companyId;
      const { storeId, orderId } = req.params;
      const { trackingNumber, trackingCompany, trackingUrl } = req.body;

      if (!companyId) {
        throw new AppError('Company ID not found', 'UNAUTHORIZED', 401);
      }

      // Validate store access
      const store = await ShopifyStore.findOne({ _id: storeId, companyId });

      if (!store) {
        throw new AppError('Store not found or access denied', 'STORE_NOT_FOUND', 404);
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
        companyId,
      });

      res.json({
        success: true,
        message: 'Tracking information updated successfully',
        data: { fulfillment: updatedFulfillment },
      });
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
      const companyId = req.user?.companyId;
      const { id: storeId } = req.params;
      const { sinceDate } = req.body;

      if (!companyId) {
        throw new AppError('Company ID not found', 'UNAUTHORIZED', 401);
      }

      // Validate store access
      const store = await ShopifyStore.findOne({ _id: storeId, companyId });

      if (!store) {
        throw new AppError('Store not found or access denied', 'STORE_NOT_FOUND', 404);
      }

      // Check if sync is paused
      if (store.isPaused) {
        throw new AppError('Order sync is paused for this store', 'SYNC_PAUSED', 400);
      }

      logger.info('Manual order sync initiated', {
        storeId,
        companyId,
        sinceDate,
      });

      // Trigger sync (async process)
      const syncResult = await ShopifyOrderSyncService.syncOrders(
        storeId,
        sinceDate ? new Date(sinceDate) : undefined
      );

      res.json({
        success: true,
        message: 'Order synchronization completed',
        data: {
          itemsProcessed: syncResult.itemsProcessed,
          itemsSynced: syncResult.itemsSynced,
          itemsFailed: syncResult.itemsFailed,
          itemsSkipped: syncResult.itemsSkipped,
          errors: syncResult.syncErrors,
        },
      });
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
      const companyId = req.user?.companyId;
      const { id: storeId } = req.params;

      if (!companyId) {
        throw new AppError('Company ID not found', 'UNAUTHORIZED', 401);
      }

      // Validate store access
      const store = await ShopifyStore.findOne({ _id: storeId, companyId });

      if (!store) {
        throw new AppError('Store not found or access denied', 'STORE_NOT_FOUND', 404);
      }

      logger.info('Pending fulfillments sync initiated', {
        storeId,
        companyId,
      });

      // Sync pending fulfillments
      const fulfillmentCount = await ShopifyFulfillmentService.syncPendingFulfillments(storeId);

      res.json({
        success: true,
        message: 'Fulfillment synchronization completed',
        data: {
          fulfillmentsSynced: fulfillmentCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default ShopifyController;
