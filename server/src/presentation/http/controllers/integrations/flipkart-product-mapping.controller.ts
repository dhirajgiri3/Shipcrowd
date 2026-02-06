import { Request, Response, NextFunction } from 'express';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import FlipkartProductMappingService from '../../../../core/application/services/flipkart/flipkart-product-mapping.service';
import FlipkartInventorySyncService from '../../../../core/application/services/flipkart/flipkart-inventory-sync.service';
import { ValidationError, NotFoundError, AuthenticationError, AuthorizationError, AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { sendSuccess, sendCreated } from '../../../../shared/utils/responseHelper';
import logger from '../../../../shared/logger/winston.logger';

/**
 * FlipkartProductMappingController
 *
 * Handles product mapping management between Flipkart and Shipcrowd.
 *
 * Endpoints:
 * - POST /stores/:storeId/mappings/auto - Auto-map products by SKU
 * - GET /stores/:storeId/mappings - List mappings
 * - POST /stores/:storeId/mappings - Create manual mapping
 * - DELETE /mappings/:id - Delete mapping
 * - POST /stores/:storeId/mappings/import - Import from CSV
 * - GET /stores/:storeId/mappings/export - Export to CSV
 * - GET /stores/:storeId/mappings/stats - Get statistics
 * - POST /mappings/:id/toggle - Toggle active status
 * - POST /mappings/:id/sync - Sync single product inventory
 */

export class FlipkartProductMappingController {

  /**
   * POST /integrations/flipkart/stores/:storeId/mappings/auto
   *
   * Auto-map products by exact SKU match
   */
  static async autoMapProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const storeId = req.params.storeId ?? req.params.id;

      // Verify store ownership
      const FlipkartStore = require('../../../../infrastructure/database/mongoose/models/marketplaces/flipkart/flipkart-store.model').default;
      const store = await FlipkartStore.findOne({ _id: storeId, companyId: auth.companyId });

      if (!store) {
        throw new NotFoundError('Flipkart store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      const result = await FlipkartProductMappingService.autoMapProducts(storeId);

      logger.info('Auto-mapping triggered', {
        storeId,
        companyId: auth.companyId,
        userId: auth.userId,
        result,
      });

      sendSuccess(res, {
        ...result,
        message: `Auto-mapped ${result.mapped} products, skipped ${result.skipped}, failed ${result.failed}`,
      }, 'Auto-mapping completed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /integrations/flipkart/stores/:storeId/mappings
   *
   * List product mappings with pagination and filters
   */
  static async listMappings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const storeId = req.params.storeId ?? req.params.id;

      // Verify store ownership
      const FlipkartStore = require('../../../../infrastructure/database/mongoose/models/marketplaces/flipkart/flipkart-store.model').default;
      const store = await FlipkartStore.findOne({ _id: storeId, companyId: auth.companyId });

      if (!store) {
        throw new NotFoundError('Flipkart store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const filters: any = {};
      if (req.query.isActive !== undefined) {
        filters.isActive = req.query.isActive === 'true';
      }
      if (req.query.syncInventory !== undefined) {
        filters.syncInventory = req.query.syncInventory === 'true';
      }
      if (req.query.mappingType) {
        filters.mappingType = req.query.mappingType;
      }
      if (req.query.search) {
        filters.search = req.query.search;
      }

      const result = await FlipkartProductMappingService.getMappings(storeId, filters, page, limit);

      sendSuccess(res, result, 'Mappings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /integrations/flipkart/stores/:storeId/mappings
   *
   * Create manual product mapping
   */
  static async createMapping(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const storeId = req.params.storeId ?? req.params.id;

      // Verify store ownership
      const FlipkartStore = require('../../../../infrastructure/database/mongoose/models/marketplaces/flipkart/flipkart-store.model').default;
      const store = await FlipkartStore.findOne({ _id: storeId, companyId: auth.companyId });

      if (!store) {
        throw new NotFoundError('Flipkart store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      const mapping = await FlipkartProductMappingService.createManualMapping({
        flipkartStoreId: storeId,
        ...req.body,
        mappedBy: auth.userId,
      });

      logger.info('Manual mapping created', {
        mappingId: mapping._id,
        storeId,
        userId: auth.userId,
      });

      sendCreated(res, { mapping }, 'Product mapping created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /integrations/flipkart/mappings/:id
   *
   * Delete product mapping
   */
  static async deleteMapping(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { id: mappingId } = req.params;

      // Verify ownership via FlipkartProductMapping
      const FlipkartProductMapping = require('../../../../infrastructure/database/mongoose/models/marketplaces/flipkart/flipkart-product-mapping.model').default;
      const mapping = await FlipkartProductMapping.findById(mappingId);

      if (!mapping) {
        throw new NotFoundError('Mapping', ErrorCode.RES_NOT_FOUND);
      }

      if (mapping.companyId.toString() !== auth.companyId) {
        throw new AuthorizationError('Unauthorized');
      }

      await FlipkartProductMappingService.deleteMapping(mappingId);

      logger.info('Mapping deleted', {
        mappingId,
        companyId: auth.companyId,
        userId: auth.userId,
      });

      sendSuccess(res, null, 'Product mapping deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /integrations/flipkart/stores/:storeId/mappings/import
   *
   * Import mappings from CSV file
   */
  static async importCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const storeId = req.params.storeId ?? req.params.id;

      // Verify store ownership
      const FlipkartStore = require('../../../../infrastructure/database/mongoose/models/marketplaces/flipkart/flipkart-store.model').default;
      const store = await FlipkartStore.findOne({ _id: storeId, companyId: auth.companyId });

      if (!store) {
        throw new NotFoundError('Flipkart store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      // Get CSV data from request body or file upload
      const csvData = req.body.csvData || req.file?.buffer?.toString('utf-8');

      if (!csvData) {
        throw new ValidationError('CSV data is required');
      }

      const result = await FlipkartProductMappingService.importMappingsFromCSV(storeId, csvData);

      logger.info('CSV import completed', {
        storeId,
        companyId: auth.companyId,
        userId: auth.userId,
        ...result,
      });

      sendSuccess(res, {
        ...result,
        message: `Imported ${result.imported} mappings, failed ${result.failed}`,
      }, 'CSV import completed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /integrations/flipkart/stores/:storeId/mappings/export
   *
   * Export mappings to CSV
   */
  static async exportCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const storeId = req.params.storeId ?? req.params.id;

      // Verify store ownership
      const FlipkartStore = require('../../../../infrastructure/database/mongoose/models/marketplaces/flipkart/flipkart-store.model').default;
      const store = await FlipkartStore.findOne({ _id: storeId, companyId: auth.companyId });

      if (!store) {
        throw new NotFoundError('Flipkart store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      const csv = await FlipkartProductMappingService.exportMappingsToCSV(storeId);

      logger.info('CSV export completed', {
        storeId,
        companyId: auth.companyId,
        userId: auth.userId,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=product-mappings-${storeId}.csv`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /integrations/flipkart/stores/:storeId/mappings/stats
   *
   * Get mapping statistics
   */
  static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const storeId = req.params.storeId ?? req.params.id;

      // Verify store ownership
      const FlipkartStore = require('../../../../infrastructure/database/mongoose/models/marketplaces/flipkart/flipkart-store.model').default;
      const store = await FlipkartStore.findOne({ _id: storeId, companyId: auth.companyId });

      if (!store) {
        throw new NotFoundError('Flipkart store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
      }

      const stats = await FlipkartProductMappingService.getMappingStats(storeId);

      sendSuccess(res, { stats }, 'Mapping stats retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /integrations/flipkart/mappings/:id/toggle
   *
   * Toggle mapping active status
   */
  static async toggleStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { id: mappingId } = req.params;
      const { isActive } = req.body;

      // Verify ownership
      const FlipkartProductMapping = require('../../../../infrastructure/database/mongoose/models/marketplaces/flipkart/flipkart-product-mapping.model').default;
      const mapping = await FlipkartProductMapping.findById(mappingId);

      if (!mapping) {
        throw new NotFoundError('Mapping', ErrorCode.RES_NOT_FOUND);
      }

      if (mapping.companyId.toString() !== auth.companyId) {
        throw new AuthorizationError('Unauthorized');
      }

      await FlipkartProductMappingService.toggleMappingStatus(mappingId, isActive);

      logger.info('Mapping status toggled', {
        mappingId,
        isActive,
        userId: auth.userId,
      });

      sendSuccess(res, null, `Mapping ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /integrations/flipkart/mappings/:id/sync
   *
   * Sync inventory for a single product mapping
   */
  static async syncInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = guardChecks(req);
      requireCompanyContext(auth);
      const { id: mappingId } = req.params;
      const { quantity } = req.body;

      // Verify ownership
      const FlipkartProductMapping = require('../../../../infrastructure/database/mongoose/models/marketplaces/flipkart/flipkart-product-mapping.model').default;
      const mapping = await FlipkartProductMapping.findById(mappingId);

      if (!mapping) {
        throw new NotFoundError('Mapping', ErrorCode.RES_NOT_FOUND);
      }

      if (mapping.companyId.toString() !== auth.companyId) {
        throw new AuthorizationError('Unauthorized');
      }

      if (quantity === undefined || quantity < 0) {
        throw new ValidationError('Valid quantity is required');
      }

      await FlipkartInventorySyncService.syncProductInventory(mappingId, quantity);

      logger.info('Inventory synced for mapping', {
        mappingId,
        quantity,
        userId: auth.userId,
      });

      sendSuccess(res, null, 'Inventory synced successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default FlipkartProductMappingController;
