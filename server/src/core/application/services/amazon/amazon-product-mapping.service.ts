/**
 * AmazonProductMappingService
 *
 * Handles product mapping between Amazon listings (ASIN/SKU) and Shipcrowd SKUs.
 *
 * Features:
 * - Auto-mapping by SKU match
 * - Manual mapping creation
 * - CSV import/export
 * - Bulk operations
 * - FBA/MFN fulfillment type tracking
 */

import { AmazonStore } from '../../../../infrastructure/database/mongoose/models';
import { AmazonProductMapping } from '../../../../infrastructure/database/mongoose/models';
import { AmazonClient } from '../../../../infrastructure/external/ecommerce/amazon/amazon.client';
import AmazonOAuthService from './amazon-oauth.service';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import { Parser } from 'json2csv';

interface AmazonListing {
    asin: string;
    sku: string;
    title?: string;
    category?: string;
    fulfillmentChannel?: 'AFN' | 'MFN';
}

interface AutoMapResult {
    mapped: number;
    skipped: number;
    failed: number;
    unmappedASINs: string[];
}

interface CreateMappingData {
    amazonStoreId: string;
    amazonASIN: string;
    amazonSKU: string;
    amazonListingId?: string;
    amazonTitle?: string;
    amazonCategory?: string;
    shipcrowdSKU: string;
    shipcrowdProductName?: string;
    fulfillmentType?: 'FBA' | 'MFN';
    mappedBy?: string;
    syncInventory?: boolean;
    syncPrice?: boolean;
}

export default class AmazonProductMappingService {
    /**
     * Auto-map products by exact SKU match
     */
    static async autoMapProducts(storeId: string): Promise<AutoMapResult> {
        const store = await AmazonStore.findById(storeId).select(
            '+lwaClientId +lwaClientSecret +lwaRefreshToken +awsAccessKeyId +awsSecretAccessKey'
        );

        if (!store) {
            throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
        }

        logger.info('Starting auto-mapping for Amazon store', {
            storeId,
            sellerId: store.sellerId,
        });

        const result: AutoMapResult = {
            mapped: 0,
            skipped: 0,
            failed: 0,
            unmappedASINs: [],
        };

        const client = await AmazonOAuthService.createClientForStore(storeId);

        // Fetch catalog items from Amazon (simplified - in production would use Catalog API)
        // For now, we'll create mappings based on provided data
        // Amazon SP-API requires specific seller permissions for catalog access

        logger.info('Auto-mapping completed (placeholder)', {
            storeId,
            ...result,
        });

        // Update store stats
        store.stats.totalProductsMapped = await AmazonProductMapping.countDocuments({
            amazonStoreId: storeId,
            isActive: true,
        });
        await store.save();

        return result;
    }

    /**
     * Create manual product mapping
     */
    static async createManualMapping(data: CreateMappingData): Promise<any> {
        const store = await AmazonStore.findById(data.amazonStoreId);

        if (!store) {
            throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
        }

        // Check for duplicate
        const existing = await AmazonProductMapping.findOne({
            amazonStoreId: data.amazonStoreId,
            amazonASIN: data.amazonASIN,
        });

        if (existing) {
            throw new AppError('Mapping already exists for this ASIN', 'AMAZON_MAPPING_EXISTS', 409);
        }

        const mapping = await AmazonProductMapping.create({
            companyId: store.companyId,
            amazonStoreId: data.amazonStoreId,
            amazonASIN: data.amazonASIN,
            amazonSKU: data.amazonSKU,
            amazonListingId: data.amazonListingId,
            amazonTitle: data.amazonTitle,
            amazonCategory: data.amazonCategory,
            shipcrowdSKU: data.shipcrowdSKU.toUpperCase(),
            shipcrowdProductName: data.shipcrowdProductName,
            fulfillmentType: data.fulfillmentType || 'MFN',
            mappingType: 'MANUAL',
            mappedBy: data.mappedBy,
            mappedAt: new Date(),
            isActive: true,
            syncInventory: data.syncInventory ?? true,
            syncPrice: data.syncPrice ?? false,
        });

        // Update store stats
        store.stats.totalProductsMapped = await AmazonProductMapping.countDocuments({
            amazonStoreId: data.amazonStoreId,
            isActive: true,
        });
        await store.save();

        logger.info('Created manual Amazon mapping', {
            mappingId: mapping._id,
            asin: data.amazonASIN,
            sku: data.shipcrowdSKU,
        });

        return mapping;
    }

    /**
     * Delete product mapping
     */
    static async deleteMapping(mappingId: string): Promise<void> {
        const mapping = await AmazonProductMapping.findById(mappingId);

        if (!mapping) {
            throw new AppError('Mapping not found', 'AMAZON_MAPPING_NOT_FOUND', 404);
        }

        await mapping.deleteOne();

        logger.info('Deleted Amazon mapping', {
            mappingId,
            asin: mapping.amazonASIN,
            sku: mapping.shipcrowdSKU,
        });
    }

    /**
     * Get mappings with pagination and filters
     */
    static async getMappings(
        storeId: string,
        filters: {
            isActive?: boolean;
            syncInventory?: boolean;
            mappingType?: 'AUTO' | 'MANUAL' | 'CSV_IMPORT';
            fulfillmentType?: 'FBA' | 'MFN';
            search?: string;
        } = {},
        page: number = 1,
        limit: number = 50
    ): Promise<{ mappings: any[]; total: number; page: number; pages: number }> {
        const query: any = { amazonStoreId: storeId };

        if (filters.isActive !== undefined) {
            query.isActive = filters.isActive;
        }

        if (filters.syncInventory !== undefined) {
            query.syncInventory = filters.syncInventory;
        }

        if (filters.mappingType) {
            query.mappingType = filters.mappingType;
        }

        if (filters.fulfillmentType) {
            query.fulfillmentType = filters.fulfillmentType;
        }

        if (filters.search) {
            query.$or = [
                { amazonSKU: { $regex: filters.search, $options: 'i' } },
                { amazonASIN: { $regex: filters.search, $options: 'i' } },
                { shipcrowdSKU: { $regex: filters.search, $options: 'i' } },
                { amazonTitle: { $regex: filters.search, $options: 'i' } },
                { shipcrowdProductName: { $regex: filters.search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;

        const [mappings, total] = await Promise.all([
            AmazonProductMapping.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
            AmazonProductMapping.countDocuments(query),
        ]);

        return {
            mappings,
            total,
            page,
            pages: Math.ceil(total / limit),
        };
    }

    /**
     * Toggle mapping active status
     */
    static async toggleMappingStatus(mappingId: string, isActive: boolean): Promise<void> {
        const mapping = await AmazonProductMapping.findById(mappingId);

        if (!mapping) {
            throw new AppError('Mapping not found', 'AMAZON_MAPPING_NOT_FOUND', 404);
        }

        mapping.isActive = isActive;
        await mapping.save();

        logger.info('Toggled Amazon mapping status', {
            mappingId,
            isActive,
        });
    }

    /**
     * Import mappings from CSV
     *
     * CSV Format: shipcrowdSKU,amazonASIN,amazonSKU,fulfillmentType,syncInventory
     */
    static async importMappingsFromCSV(
        storeId: string,
        csvData: string
    ): Promise<{ imported: number; failed: number; errors: string[] }> {
        const store = await AmazonStore.findById(storeId);

        if (!store) {
            throw new AppError('Amazon store not found', 'AMAZON_STORE_NOT_FOUND', 404);
        }

        const result = {
            imported: 0,
            failed: 0,
            errors: [] as string[],
        };

        // Parse CSV
        const lines = csvData.trim().split('\n');
        const headers = lines[0].split(',').map((h) => h.trim());

        // Validate headers
        const requiredHeaders = ['shipcrowdSKU', 'amazonASIN', 'amazonSKU'];
        const hasAllHeaders = requiredHeaders.every((h) => headers.includes(h));

        if (!hasAllHeaders) {
            throw new AppError(
                'Invalid CSV format. Required columns: ' + requiredHeaders.join(', '),
                'AMAZON_INVALID_CSV',
                400
            );
        }

        // Process rows
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map((v) => v.trim());
            const row: any = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });

            try {
                // Validate required fields
                if (!row.shipcrowdSKU || !row.amazonASIN || !row.amazonSKU) {
                    result.errors.push(`Row ${i + 1}: Missing required fields`);
                    result.failed++;
                    continue;
                }

                // Check if mapping exists
                const existing = await AmazonProductMapping.findOne({
                    amazonStoreId: storeId,
                    amazonASIN: row.amazonASIN,
                });

                if (existing) {
                    result.errors.push(`Row ${i + 1}: Mapping already exists for ASIN ${row.amazonASIN}`);
                    result.failed++;
                    continue;
                }

                // Create mapping
                await AmazonProductMapping.create({
                    companyId: store.companyId,
                    amazonStoreId: storeId,
                    amazonASIN: row.amazonASIN,
                    amazonSKU: row.amazonSKU,
                    amazonListingId: row.amazonListingId || undefined,
                    amazonTitle: row.amazonTitle || 'Imported from CSV',
                    amazonCategory: row.amazonCategory || undefined,
                    shipcrowdSKU: row.shipcrowdSKU.toUpperCase(),
                    shipcrowdProductName: row.shipcrowdProductName || row.amazonTitle || 'Imported',
                    fulfillmentType: row.fulfillmentType === 'FBA' ? 'FBA' : 'MFN',
                    mappingType: 'CSV_IMPORT',
                    mappedAt: new Date(),
                    syncInventory: row.syncInventory === 'true' || row.syncInventory === '1',
                    syncPrice: row.syncPrice === 'true' || row.syncPrice === '1',
                    isActive: true,
                });

                result.imported++;
            } catch (error: any) {
                result.failed++;
                result.errors.push(`Row ${i + 1}: ${error.message}`);
            }
        }

        logger.info('Amazon CSV import completed', {
            storeId,
            imported: result.imported,
            failed: result.failed,
        });

        return result;
    }

    /**
     * Export mappings to CSV
     */
    static async exportMappingsToCSV(storeId: string): Promise<string> {
        const mappings = await AmazonProductMapping.find({ amazonStoreId: storeId });

        const data = mappings.map((m) => ({
            shipcrowdSKU: m.shipcrowdSKU,
            amazonASIN: m.amazonASIN,
            amazonSKU: m.amazonSKU,
            amazonListingId: m.amazonListingId || '',
            amazonTitle: m.amazonTitle || '',
            amazonCategory: m.amazonCategory || '',
            shipcrowdProductName: m.shipcrowdProductName || '',
            fulfillmentType: m.fulfillmentType,
            mappingType: m.mappingType,
            syncInventory: m.syncInventory,
            syncPrice: m.syncPrice,
            isActive: m.isActive,
            lastSyncAt: m.lastSyncAt ? m.lastSyncAt.toISOString() : '',
            lastSyncStatus: m.lastSyncStatus || '',
            createdAt: m.createdAt.toISOString(),
        }));

        const parser = new Parser();
        const csv = parser.parse(data);

        logger.info('Exported Amazon mappings to CSV', {
            storeId,
            count: mappings.length,
        });

        return csv;
    }

    /**
     * Get mapping statistics
     */
    static async getMappingStats(storeId: string): Promise<any> {
        const [total, active, auto, manual, csvImport, syncing, fba, mfn] = await Promise.all([
            AmazonProductMapping.countDocuments({ amazonStoreId: storeId }),
            AmazonProductMapping.countDocuments({ amazonStoreId: storeId, isActive: true }),
            AmazonProductMapping.countDocuments({ amazonStoreId: storeId, mappingType: 'AUTO' }),
            AmazonProductMapping.countDocuments({ amazonStoreId: storeId, mappingType: 'MANUAL' }),
            AmazonProductMapping.countDocuments({ amazonStoreId: storeId, mappingType: 'CSV_IMPORT' }),
            AmazonProductMapping.countDocuments({ amazonStoreId: storeId, syncInventory: true }),
            AmazonProductMapping.countDocuments({ amazonStoreId: storeId, fulfillmentType: 'FBA' }),
            AmazonProductMapping.countDocuments({ amazonStoreId: storeId, fulfillmentType: 'MFN' }),
        ]);

        return {
            total,
            active,
            inactive: total - active,
            auto,
            manual,
            csvImport,
            syncing,
            fulfillment: { fba, mfn },
        };
    }
}
