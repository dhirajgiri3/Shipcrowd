/**
 * AmazonProductMappingController
 *
 * Handles Amazon product mapping management.
 *
 * Endpoints:
 * - POST /stores/:storeId/mappings/auto-map - Auto-map products by SKU
 * - GET /stores/:storeId/mappings - List mappings with filters
 * - POST /stores/:storeId/mappings - Create manual mapping
 * - DELETE /stores/:storeId/mappings/:id - Delete mapping
 * - POST /stores/:storeId/mappings/import - Import from CSV
 * - GET /stores/:storeId/mappings/export - Export to CSV
 * - GET /stores/:storeId/mappings/stats - Get mapping statistics
 */

import { Request, Response, NextFunction } from 'express';
import AmazonProductMappingService from '../../../../core/application/services/amazon/AmazonProductMappingService';
import AmazonStore from '../../../../infrastructure/database/mongoose/models/AmazonStore';
import { AppError } from '../../../../shared/errors/AppError';
import logger from '../../../../shared/logger/winston.logger';

export class AmazonProductMappingController {
    /**
     * POST /integrations/amazon/stores/:storeId/mappings/auto-map
     *
     * Auto-map products by SKU match
     */
    static async autoMap(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { storeId } = req.params;
            const companyId = req.user?.companyId;

            // Verify ownership
            const store = await AmazonStore.findOne({
                _id: storeId,
                companyId,
            });

            if (!store) {
                throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
            }

            const result = await AmazonProductMappingService.autoMapProducts(storeId);

            res.json({
                success: true,
                message: 'Auto-mapping completed',
                result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /integrations/amazon/stores/:storeId/mappings
     *
     * List mappings with pagination and filters
     */
    static async listMappings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { storeId } = req.params;
            const companyId = req.user?.companyId;
            const {
                page = '1',
                limit = '50',
                isActive,
                syncInventory,
                mappingType,
                fulfillmentType,
                search,
            } = req.query;

            // Verify ownership
            const store = await AmazonStore.findOne({
                _id: storeId,
                companyId,
            });

            if (!store) {
                throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
            }

            const result = await AmazonProductMappingService.getMappings(
                storeId,
                {
                    isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
                    syncInventory: syncInventory === 'true' ? true : syncInventory === 'false' ? false : undefined,
                    mappingType: mappingType as 'AUTO' | 'MANUAL' | 'CSV_IMPORT' | undefined,
                    fulfillmentType: fulfillmentType as 'FBA' | 'MFN' | undefined,
                    search: search as string | undefined,
                },
                parseInt(page as string, 10),
                parseInt(limit as string, 10)
            );

            res.json({
                success: true,
                ...result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /integrations/amazon/stores/:storeId/mappings
     *
     * Create manual mapping
     */
    static async createMapping(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { storeId } = req.params;
            const companyId = req.user?.companyId;
            const userId = req.user?._id;
            const {
                amazonASIN,
                amazonSKU,
                amazonListingId,
                amazonTitle,
                amazonCategory,
                shipcrowdSKU,
                shipcrowdProductName,
                fulfillmentType,
                syncInventory,
                syncPrice,
            } = req.body;

            // Verify ownership
            const store = await AmazonStore.findOne({
                _id: storeId,
                companyId,
            });

            if (!store) {
                throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
            }

            // Validate required fields
            if (!amazonASIN) {
                throw new AppError('Amazon ASIN is required', 'AMAZON_ASIN_REQUIRED', 400);
            }

            if (!amazonSKU) {
                throw new AppError('Amazon SKU is required', 'AMAZON_SKU_REQUIRED', 400);
            }

            if (!shipcrowdSKU) {
                throw new AppError('Shipcrowd SKU is required', 'SHIPCROWD_SKU_REQUIRED', 400);
            }

            const mapping = await AmazonProductMappingService.createManualMapping({
                amazonStoreId: storeId,
                amazonASIN,
                amazonSKU,
                amazonListingId,
                amazonTitle,
                amazonCategory,
                shipcrowdSKU,
                shipcrowdProductName,
                fulfillmentType,
                mappedBy: String(userId),
                syncInventory,
                syncPrice,
            });

            res.status(201).json({
                success: true,
                message: 'Mapping created successfully',
                mapping: {
                    id: mapping._id,
                    amazonASIN: mapping.amazonASIN,
                    amazonSKU: mapping.amazonSKU,
                    shipcrowdSKU: mapping.shipcrowdSKU,
                    fulfillmentType: mapping.fulfillmentType,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /integrations/amazon/stores/:storeId/mappings/:id
     *
     * Delete a mapping
     */
    static async deleteMapping(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { storeId, id } = req.params;
            const companyId = req.user?.companyId;

            // Verify ownership
            const store = await AmazonStore.findOne({
                _id: storeId,
                companyId,
            });

            if (!store) {
                throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
            }

            await AmazonProductMappingService.deleteMapping(id);

            res.json({
                success: true,
                message: 'Mapping deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /integrations/amazon/stores/:storeId/mappings/import
     *
     * Import mappings from CSV
     */
    static async importCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { storeId } = req.params;
            const companyId = req.user?.companyId;
            const { csvData } = req.body;

            // Verify ownership
            const store = await AmazonStore.findOne({
                _id: storeId,
                companyId,
            });

            if (!store) {
                throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
            }

            if (!csvData) {
                throw new AppError('CSV data is required', 'AMAZON_CSV_REQUIRED', 400);
            }

            const result = await AmazonProductMappingService.importMappingsFromCSV(storeId, csvData);

            res.json({
                success: true,
                message: `Imported ${result.imported} mappings, ${result.failed} failed`,
                result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /integrations/amazon/stores/:storeId/mappings/export
     *
     * Export mappings to CSV
     */
    static async exportCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { storeId } = req.params;
            const companyId = req.user?.companyId;

            // Verify ownership
            const store = await AmazonStore.findOne({
                _id: storeId,
                companyId,
            });

            if (!store) {
                throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
            }

            const csv = await AmazonProductMappingService.exportMappingsToCSV(storeId);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="amazon-mappings-${storeId}.csv"`);
            res.send(csv);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /integrations/amazon/stores/:storeId/mappings/stats
     *
     * Get mapping statistics
     */
    static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { storeId } = req.params;
            const companyId = req.user?.companyId;

            // Verify ownership
            const store = await AmazonStore.findOne({
                _id: storeId,
                companyId,
            });

            if (!store) {
                throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
            }

            const stats = await AmazonProductMappingService.getMappingStats(storeId);

            res.json({
                success: true,
                stats,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default AmazonProductMappingController;
