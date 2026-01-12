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
import AmazonProductMappingService from '../../../../core/application/services/amazon/amazon-product-mapping.service';
import { AmazonStore } from '../../../../infrastructure/database/mongoose/models';
import { ValidationError, NotFoundError, AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { sendSuccess, sendCreated } from '../../../../shared/utils/responseHelper';
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
                throw new NotFoundError('Amazon store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
            }

            const result = await AmazonProductMappingService.autoMapProducts(storeId);

            sendSuccess(res, {
                result,
            }, 'Auto-mapping completed');
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
                throw new NotFoundError('Amazon store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
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

            sendSuccess(res, result, 'Mappings retrieved successfully');
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
                throw new NotFoundError('Amazon store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
            }

            // Validate required fields
            if (!amazonASIN) {
                throw new ValidationError('Amazon ASIN is required');
            }

            if (!amazonSKU) {
                throw new ValidationError('Amazon SKU is required');
            }

            if (!shipcrowdSKU) {
                throw new ValidationError('Shipcrowd SKU is required');
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

            sendCreated(res, {
                mapping: {
                    id: mapping._id,
                    amazonASIN: mapping.amazonASIN,
                    amazonSKU: mapping.amazonSKU,
                    shipcrowdSKU: mapping.shipcrowdSKU,
                    fulfillmentType: mapping.fulfillmentType,
                },
            }, 'Mapping created successfully');
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
                throw new NotFoundError('Amazon store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
            }

            await AmazonProductMappingService.deleteMapping(id);

            sendSuccess(res, null, 'Mapping deleted successfully');
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
                throw new NotFoundError('Amazon store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
            }

            if (!csvData) {
                throw new ValidationError('CSV data is required');
            }

            const result = await AmazonProductMappingService.importMappingsFromCSV(storeId, csvData);

            sendSuccess(res, {
                result,
            }, `Imported ${result.imported} mappings, ${result.failed} failed`);
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
                throw new NotFoundError('Amazon store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
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
                throw new NotFoundError('Amazon store', ErrorCode.RES_INTEGRATION_NOT_FOUND);
            }

            const stats = await AmazonProductMappingService.getMappingStats(storeId);

            sendSuccess(res, { stats }, 'Mapping stats retrieved');
        } catch (error) {
            next(error);
        }
    }
}

export default AmazonProductMappingController;
