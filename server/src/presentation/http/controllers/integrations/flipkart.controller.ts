import { Request, Response, NextFunction } from 'express';
import FlipkartOAuthService from '../../../../core/application/services/flipkart/FlipkartOAuthService';
import { AppError } from '../../../../shared/errors/AppError';
import winston from 'winston';

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
  private static logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
  });

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
      const { sellerId, sellerName, sellerEmail, apiKey, apiSecret } = req.body;
      const companyId = req.user?.companyId;
      const userId = req.user?._id;

      if (!sellerId || typeof sellerId !== 'string') {
        throw new AppError('Seller ID is required', 'FLIPKART_SELLER_ID_REQUIRED', 400);
      }

      if (!apiKey || typeof apiKey !== 'string') {
        throw new AppError('API key is required', 'FLIPKART_API_KEY_REQUIRED', 400);
      }

      if (!apiSecret || typeof apiSecret !== 'string') {
        throw new AppError('API secret is required', 'FLIPKART_API_SECRET_REQUIRED', 400);
      }

      if (!companyId) {
        throw new AppError('Company ID not found in request', 'AUTH_COMPANY_REQUIRED', 401);
      }

      // Connect Flipkart seller account
      const store = await FlipkartOAuthService.connectStore({
        sellerId,
        sellerName,
        sellerEmail,
        apiKey,
        apiSecret,
        companyId: String(companyId),
        createdBy: String(userId),
      });

      this.logger.info('Flipkart seller connected', {
        storeId: store._id,
        sellerId: store.sellerId,
        companyId: store.companyId,
        userId: req.user?._id,
      });

      res.json({
        success: true,
        store: {
          id: store._id,
          sellerId: store.sellerId,
          sellerName: store.sellerName,
          isActive: store.isActive,
        },
        message: 'Flipkart seller account connected successfully',
      });
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
      const companyId = req.user?.companyId;

      if (!companyId) {
        throw new AppError('Company ID not found in request', 'ERROR_CODE', 401);
      }

      const stores = await FlipkartOAuthService.getActiveStores(companyId);

      res.json({
        success: true,
        count: stores.length,
        stores: stores.map((store) => ({
          id: store._id,
          sellerEmail: store.sellerEmail,
          sellerName: store.sellerName,
          sellerCountry: store.sellerCountry,
          isActive: store.isActive,
          isPaused: store.isPaused,
          connectedAt: store.connectedAt,
          syncConfig: store.syncConfig,
          stats: store.stats,
          activeWebhooksCount: store.webhooks.filter((w: any) => w.isActive).length,
        })),
      });
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
      const { id } = req.params;
      const companyId = req.user?.companyId;

      const FlipkartStore = require('../../../../infrastructure/database/mongoose/models/FlipkartStore').default;
      const store = await FlipkartStore.findOne({
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
          sellerEmail: store.sellerEmail,
          sellerName: store.sellerName,
          sellerCountry: store.sellerCountry,
          isActive: store.isActive,
          isPaused: store.isPaused,
          connectedAt: store.connectedAt,
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
   * DELETE /integrations/flipkart/stores/:id
   *
   * Disconnect Flipkart store and unregister webhooks
   */
  static async disconnectStore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      // Verify ownership
      const FlipkartStore = require('../../../../infrastructure/database/mongoose/models/FlipkartStore').default;
      const store = await FlipkartStore.findOne({
        _id: id,
        companyId,
      });

      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      // Disconnect store
      await FlipkartOAuthService.disconnectStore(id);

      this.logger.info('Store disconnected', {
        storeId: id,
        sellerEmail: store.sellerEmail,
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
   * POST /integrations/flipkart/stores/:id/test
   *
   * Test connection to Flipkart store
   */
  static async testConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      // Verify ownership
      const FlipkartStore = require('../../../../infrastructure/database/mongoose/models/FlipkartStore').default;
      const store = await FlipkartStore.findById(id).select('+apiKey +apiSecret');

      if (!store || String(store.companyId) !== String(companyId)) {
        throw new AppError('Store not found', 'FLIPKART_STORE_NOT_FOUND', 404);
      }

      // Test connection using credentials
      const isValid = await FlipkartOAuthService.testConnection(
        store.decryptApiKey(),
        store.decryptApiSecret(),
        store.sellerId
      );

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
   * POST /integrations/flipkart/stores/:id/pause
   *
   * Pause sync for a store
   */
  static async pauseSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      // Verify ownership
      const FlipkartStore = require('../../../../infrastructure/database/mongoose/models/FlipkartStore').default;
      const store = await FlipkartStore.findOne({
        _id: id,
        companyId,
      });

      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      await FlipkartOAuthService.togglePauseSync(id, true);

      this.logger.info('Store sync paused', {
        storeId: id,
        sellerEmail: store.sellerEmail,
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
   * POST /integrations/flipkart/stores/:id/resume
   *
   * Resume sync for a store
   */
  static async resumeSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      // Verify ownership
      const FlipkartStore = require('../../../../infrastructure/database/mongoose/models/FlipkartStore').default;
      const store = await FlipkartStore.findOne({
        _id: id,
        companyId,
      });

      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      await FlipkartOAuthService.togglePauseSync(id, false);

      this.logger.info('Store sync resumed', {
        storeId: id,
        sellerEmail: store.sellerEmail,
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
}

export default FlipkartController;
