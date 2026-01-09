import { Request, Response, NextFunction } from 'express';
import FlipkartProductMappingService from '../../../../core/application/services/flipkart/flipkart-product-mapping.service';
import FlipkartInventorySyncService from '../../../../core/application/services/flipkart/flipkart-inventory-sync.service';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * FlipkartProductMappingController
 *
 * Handles product mapping management between Flipkart and Shipcrowd.
 *
 * Endpoints:
 * - POST /stores/:id/mappings/auto - Auto-map products by SKU
 * - GET /stores/:id/mappings - List mappings
 * - POST /stores/:id/mappings - Create manual mapping
 * - DELETE /mappings/:id - Delete mapping
 * - POST /stores/:id/mappings/import - Import from CSV
 * - GET /stores/:id/mappings/export - Export to CSV
 * - GET /stores/:id/mappings/stats - Get statistics
 * - POST /mappings/:id/toggle - Toggle active status
 * - POST /mappings/:id/sync - Sync single product inventory
 */

export class FlipkartProductMappingController {

  /**
   * POST /integrations/flipkart/stores/:id/mappings/auto
   *
   * Auto-map products by exact SKU match
   */
  static async autoMapProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: storeId } = req.params;
      const companyId = req.user?.companyId;

      // Verify store ownership
      const FlipkartStore = require('../../../../infrastructure/database/mongoose/models/flipkart-store.model').default;
      const store = await FlipkartStore.findOne({ _id: storeId, companyId });

      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      const result = await FlipkartProductMappingService.autoMapProducts(storeId);

      logger.info('Auto-mapping triggered', {
        storeId,
        companyId,
        userId: req.user?._id,
        result,
      });

      res.json({
        success: true,
        ...result,
        message: `Auto-mapped ${result.mapped} products, skipped ${result.skipped}, failed ${result.failed}`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /integrations/flipkart/stores/:id/mappings
   *
   * List product mappings with pagination and filters
   */
  static async listMappings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: storeId } = req.params;
      const companyId = req.user?.companyId;

      // Verify store ownership
      const FlipkartStore = require('../../../../infrastructure/database/mongoose/models/flipkart-store.model').default;
      const store = await FlipkartStore.findOne({ _id: storeId, companyId });

      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
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

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /integrations/flipkart/stores/:id/mappings
   *
   * Create manual product mapping
   */
  static async createMapping(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: storeId } = req.params;
      const companyId = req.user?.companyId;

      // Verify store ownership
      const FlipkartStore = require('../../../../infrastructure/database/mongoose/models/flipkart-store.model').default;
      const store = await FlipkartStore.findOne({ _id: storeId, companyId });

      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      const mapping = await FlipkartProductMappingService.createManualMapping({
        flipkartStoreId: storeId,
        ...req.body,
        mappedBy: req.user?._id,
      });

      logger.info('Manual mapping created', {
        mappingId: mapping._id,
        storeId,
        userId: req.user?._id,
      });

      res.status(201).json({
        success: true,
        mapping,
        message: 'Product mapping created successfully',
      });
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
      const { id: mappingId } = req.params;
      const companyId = req.user?.companyId;

      // Verify ownership via FlipkartProductMapping
      const FlipkartProductMapping = require('../../../../infrastructure/database/mongoose/models/flipkart-product-mapping.model').default;
      const mapping = await FlipkartProductMapping.findById(mappingId);

      if (!mapping) {
        throw new AppError('Mapping not found', 'MAPPING_NOT_FOUND', 404);
      }

      if (mapping.companyId.toString() !== companyId) {
        throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
      }

      await FlipkartProductMappingService.deleteMapping(mappingId);

      logger.info('Mapping deleted', {
        mappingId,
        companyId,
        userId: req.user?._id,
      });

      res.json({
        success: true,
        message: 'Product mapping deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /integrations/flipkart/stores/:id/mappings/import
   *
   * Import mappings from CSV file
   */
  static async importCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: storeId } = req.params;
      const companyId = req.user?.companyId;

      // Verify store ownership
      const FlipkartStore = require('../../../../infrastructure/database/mongoose/models/flipkart-store.model').default;
      const store = await FlipkartStore.findOne({ _id: storeId, companyId });

      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      // Get CSV data from request body or file upload
      const csvData = req.body.csvData || req.file?.buffer?.toString('utf-8');

      if (!csvData) {
        throw new AppError('CSV data is required', 'CSV_DATA_REQUIRED', 400);
      }

      const result = await FlipkartProductMappingService.importMappingsFromCSV(storeId, csvData);

      logger.info('CSV import completed', {
        storeId,
        companyId,
        userId: req.user?._id,
        ...result,
      });

      res.json({
        success: true,
        ...result,
        message: `Imported ${result.imported} mappings, failed ${result.failed}`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /integrations/flipkart/stores/:id/mappings/export
   *
   * Export mappings to CSV
   */
  static async exportCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: storeId } = req.params;
      const companyId = req.user?.companyId;

      // Verify store ownership
      const FlipkartStore = require('../../../../infrastructure/database/mongoose/models/flipkart-store.model').default;
      const store = await FlipkartStore.findOne({ _id: storeId, companyId });

      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      const csv = await FlipkartProductMappingService.exportMappingsToCSV(storeId);

      logger.info('CSV export completed', {
        storeId,
        companyId,
        userId: req.user?._id,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=product-mappings-${storeId}.csv`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /integrations/flipkart/stores/:id/mappings/stats
   *
   * Get mapping statistics
   */
  static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: storeId } = req.params;
      const companyId = req.user?.companyId;

      // Verify store ownership
      const FlipkartStore = require('../../../../infrastructure/database/mongoose/models/flipkart-store.model').default;
      const store = await FlipkartStore.findOne({ _id: storeId, companyId });

      if (!store) {
        throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
      }

      const stats = await FlipkartProductMappingService.getMappingStats(storeId);

      res.json({
        success: true,
        stats,
      });
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
      const { id: mappingId } = req.params;
      const { isActive } = req.body;
      const companyId = req.user?.companyId;

      // Verify ownership
      const FlipkartProductMapping = require('../../../../infrastructure/database/mongoose/models/flipkart-product-mapping.model').default;
      const mapping = await FlipkartProductMapping.findById(mappingId);

      if (!mapping) {
        throw new AppError('Mapping not found', 'MAPPING_NOT_FOUND', 404);
      }

      if (mapping.companyId.toString() !== companyId) {
        throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
      }

      await FlipkartProductMappingService.toggleMappingStatus(mappingId, isActive);

      logger.info('Mapping status toggled', {
        mappingId,
        isActive,
        userId: req.user?._id,
      });

      res.json({
        success: true,
        message: `Mapping ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
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
      const { id: mappingId } = req.params;
      const { quantity } = req.body;
      const companyId = req.user?.companyId;

      // Verify ownership
      const FlipkartProductMapping = require('../../../../infrastructure/database/mongoose/models/flipkart-product-mapping.model').default;
      const mapping = await FlipkartProductMapping.findById(mappingId);

      if (!mapping) {
        throw new AppError('Mapping not found', 'MAPPING_NOT_FOUND', 404);
      }

      if (mapping.companyId.toString() !== companyId) {
        throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
      }

      if (quantity === undefined || quantity < 0) {
        throw new AppError('Valid quantity is required', 'INVALID_QUANTITY', 400);
      }

      await FlipkartInventorySyncService.syncProductInventory(mappingId, quantity);

      logger.info('Inventory synced for mapping', {
        mappingId,
        quantity,
        userId: req.user?._id,
      });

      res.json({
        success: true,
        message: 'Inventory synced successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default FlipkartProductMappingController;
