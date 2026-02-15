import { NextFunction, Request, Response } from 'express';
import FlipkartOAuthService from '../../../../core/application/services/flipkart/flipkart-oauth.service';
import { applyDefaultsToSettings, applyDefaultsToSyncConfig, toEcommerceStoreDTO } from '../../../../core/mappers/store.mapper';
import { FlipkartStore, FlipkartSyncLog, Order } from '../../../../infrastructure/database/mongoose/models';
import FlipkartOrderSyncJob from '../../../../infrastructure/jobs/marketplaces/flipkart/flipkart-order-sync.job';
import { NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess } from '../../../../shared/utils/responseHelper';

/**
 * FlipkartController
 *
 * Handles Flipkart OAuth installation, store management, and connection testing.
 *
 * Endpoints:
 * - POST /connect - Connect Flipkart seller account
 * - GET /stores - List connected stores
 * - GET /stores/:id - Get store details
 * - DELETE /stores/:id - Disconnect store
 * - POST /stores/:id/test - Test connection
 * - POST /stores/:id/pause - Pause sync
 * - POST /stores/:id/resume - Resume sync
 */

export class FlipkartController {

  /**
   * POST /integrations/flipkart/connect
   *
   * Connect Flipkart seller account
   *
   * Body params:
   * - sellerEmail: Flipkart seller email
   * - apiKey: Flipkart API key
   * - apiSecret: Flipkart API secret
   */
  static async connect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const credentials = req.body.credentials || req.body;
      const sellerId = credentials.sellerId || credentials.accessToken;
      const sellerName = credentials.sellerName || req.body.storeName;
      const sellerEmail = credentials.sellerEmail;
      const apiKey = credentials.apiKey || credentials.appId;
      const apiSecret = credentials.apiSecret || credentials.appSecret;

      if (!sellerId || typeof sellerId !== 'string') {
        throw new ValidationError('Seller ID is required');
      }

      if (!apiKey || typeof apiKey !== 'string') {
        throw new ValidationError('API key is required');
      }

      if (!apiSecret || typeof apiSecret !== 'string') {
        throw new ValidationError('API secret is required');
      }

      // Connect Flipkart seller account
      const store = await FlipkartOAuthService.connectStore({
        sellerId,
        sellerName,
        sellerEmail,
        apiKey,
        apiSecret,
        companyId: String(auth.companyId),
        createdBy: String(auth.userId),
      });

      logger.info('Flipkart seller connected', {
        storeId: store._id,
        sellerId: store.sellerId,
        companyId: store.companyId,
        userId: auth.userId,
      });

      sendSuccess(res, {
        store: {
          id: store._id,
          sellerId: store.sellerId,
          sellerName: store.sellerName,
          isActive: store.isActive,
        },
      }, 'Flipkart seller account connected successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /integrations/flipkart/stores
   *
   * List all connected Flipkart stores for the company
   */
  static async listStores(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);

      const stores = await FlipkartOAuthService.getActiveStores(auth.companyId);

      sendSuccess(res, {
        count: stores.length,
        stores: stores.map((store) => ({
          ...toEcommerceStoreDTO(store, 'flipkart'),
          id: store._id,
          sellerEmail: store.sellerEmail,
          sellerName: store.sellerName,
          isActive: store.isActive,
          isPaused: store.isPaused,
          connectedAt: store.connectedAt,
          syncConfig: store.syncConfig,
          settings: applyDefaultsToSettings(store.settings),
          stats: store.stats,
          activeWebhooksCount: store.webhooks.filter((w: any) => w.isActive).length,
        })),
      }, 'Flipkart stores retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /integrations/flipkart/stores/:id
   *
   * Get details of a specific store
   */
  static async getStore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { id } = req.params;

      const store = await FlipkartStore.findOne({
        _id: id,
        companyId: auth.companyId,
      });

      if (!store) {
        throw new NotFoundError('Flipkart store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      const totalOrdersSynced = await Order.countDocuments({
        source: 'flipkart',
        flipkartStoreId: id,
        companyId: auth.companyId,
      });

      const stats = { ...(store.stats || {}), totalOrdersSynced };

      sendSuccess(res, {
        store: {
          ...toEcommerceStoreDTO(store, 'flipkart'),
          id: store._id,
          sellerEmail: store.sellerEmail,
          sellerName: store.sellerName,
          isActive: store.isActive,
          isPaused: store.isPaused,
          connectedAt: store.connectedAt,
          syncConfig: store.syncConfig,
          settings: applyDefaultsToSettings(store.settings),
          webhooks: store.webhooks,
          stats,
        },
      }, 'Flipkart store details retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /integrations/flipkart/stores/:id
   *
   * Disconnect Flipkart store and unregister webhooks
   */
  static async disconnectStore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { id } = req.params;

      // Verify ownership
      const store = await FlipkartStore.findOne({
        _id: id,
        companyId: auth.companyId,
      });

      if (!store) {
        throw new NotFoundError('Flipkart store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      // Disconnect store
      await FlipkartOAuthService.disconnectStore(id);

      logger.info('Store disconnected', {
        storeId: id,
        sellerEmail: store.sellerEmail,
        companyId: auth.companyId,
        userId: auth.userId,
      });

      sendSuccess(res, null, 'Store disconnected successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /integrations/flipkart/stores/:id/test
   *
   * Test connection to Flipkart store
   */
  static async testConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { id } = req.params;

      // Verify ownership
      const store = await FlipkartStore.findById(id).select('+apiKey +apiSecret');

      if (!store || String(store.companyId) !== String(auth.companyId)) {
        throw new NotFoundError('Flipkart store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      // Test connection using credentials
      const isValid = await FlipkartOAuthService.testConnection(
        store.decryptApiKey(),
        store.decryptApiSecret(),
        store.sellerId
      );

      sendSuccess(res, {
        connected: isValid,
      }, isValid ? 'Connection is valid' : 'Connection failed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Pre-connect credential test
   * POST /integrations/flipkart/test
   */
  static async testConnectionCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = req.body.sellerId || req.body.accessToken;
      const apiKey = req.body.apiKey || req.body.appId;
      const apiSecret = req.body.apiSecret || req.body.appSecret;

      if (!sellerId || !apiKey || !apiSecret) {
        throw new ValidationError('Seller ID, API key, and API secret are required');
      }

      const connected = await FlipkartOAuthService.testConnection(apiKey, apiSecret, sellerId);

      sendSuccess(res, {
        connected,
        storeName: sellerId ? `Flipkart Store - ${sellerId}` : undefined,
        details: {
          sellerId,
        },
      }, connected ? 'Connection is valid' : 'Connection failed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update store settings
   * PATCH /integrations/flipkart/stores/:id/settings
   */
  static async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { id } = req.params;
      const { settings, syncConfig } = req.body;

      const store = await FlipkartStore.findOne({
        _id: id,
        companyId: auth.companyId,
      });

      if (!store) {
        throw new NotFoundError('Flipkart store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
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
          ...toEcommerceStoreDTO(store, 'flipkart'),
          sellerEmail: store.sellerEmail,
          sellerName: store.sellerName,
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
   * POST /integrations/flipkart/stores/:id/pause
   *
   * Pause sync for a store
   */
  static async pauseSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { id } = req.params;

      // Verify ownership
      const store = await FlipkartStore.findOne({
        _id: id,
        companyId: auth.companyId,
      });

      if (!store) {
        throw new NotFoundError('Flipkart store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      await FlipkartOAuthService.togglePauseSync(id, true);

      logger.info('Store sync paused', {
        storeId: id,
        sellerEmail: store.sellerEmail,
        companyId: auth.companyId,
        userId: auth.userId,
      });

      sendSuccess(res, null, 'Sync paused successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /integrations/flipkart/stores/:id/resume
   *
   * Resume sync for a store
   */
  static async resumeSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { id } = req.params;

      // Verify ownership
      const store = await FlipkartStore.findOne({
        _id: id,
        companyId: auth.companyId,
      });

      if (!store) {
        throw new NotFoundError('Flipkart store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      await FlipkartOAuthService.togglePauseSync(id, false);

      logger.info('Store sync resumed', {
        storeId: id,
        sellerEmail: store.sellerEmail,
        companyId: auth.companyId,
        userId: auth.userId,
      });

      sendSuccess(res, null, 'Sync resumed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /integrations/flipkart/stores/:id/sync/orders
   *
   * Trigger manual order sync for a store
   */
  static async syncOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { id } = req.params;
      const { hoursBack } = req.body;

      const store = await FlipkartStore.findOne({
        _id: id,
        companyId: auth.companyId,
      });

      if (!store) {
        throw new NotFoundError('Flipkart store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      const jobId = await FlipkartOrderSyncJob.triggerManualSync(id, hoursBack);

      logger.info('Flipkart manual order sync triggered via API', {
        storeId: id,
        companyId: auth.companyId,
        userId: auth.userId,
        jobId,
        hoursBack,
      });

      sendSuccess(res, { jobId }, 'Order sync queued successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /integrations/flipkart/stores/:id/sync/logs
   *
   * Get recent sync logs for a store
   */
  static async getSyncLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { id } = req.params;
      const limit = Number(req.query.limit) || 50;

      const store = await FlipkartStore.findOne({
        _id: id,
        companyId: auth.companyId,
      }).select('_id');

      if (!store) {
        throw new NotFoundError('Flipkart store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      const logs = await (FlipkartSyncLog as any).getRecentLogs(id, undefined, limit);

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
        'Flipkart sync logs retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}

export default FlipkartController;
