/**
 * Woocommerce Product Mapping
 * 
 * Purpose: WooCommerceProductMappingService
 * 
 * DEPENDENCIES:
 * - Database Models, Error Handling, Logger
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import { WooCommerceStore } from '../../../../infrastructure/database/mongoose/models';
import { WooCommerceProductMapping } from '../../../../infrastructure/database/mongoose/models';
import WooCommerceClient from '../../../../infrastructure/external/ecommerce/woocommerce/woocommerce.client';
import {
  WooCommerceProduct,
  WooCommerceProductVariation,
} from '../../../../infrastructure/external/ecommerce/woocommerce/woocommerce.types';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import { Parser } from 'json2csv';

interface AutoMapResult {
  mapped: number;
  skipped: number;
  failed: number;
  unmappedSKUs: string[];
}

interface CreateMappingData {
  woocommerceProductId: number;
  woocommerceVariationId?: number;
  woocommerceSKU: string;
  woocommerceTitle: string;
  HelixSKU: string;
  HelixProductName?: string;
  syncInventory?: boolean;
  syncPrice?: boolean;
  syncOnFulfillment?: boolean;
}

export default class WooCommerceProductMappingService {
  /**
   * Auto-map products by exact SKU match
   * Fetches all WooCommerce products and matches by SKU
   */
  static async autoMapProducts(storeId: string): Promise<AutoMapResult> {
    const result: AutoMapResult = {
      mapped: 0,
      skipped: 0,
      failed: 0,
      unmappedSKUs: [],
    };

    try {
      // 1. Get store
      const store = await WooCommerceStore.findById(storeId).select(
        '+consumerKey +consumerSecret'
      );

      if (!store) {
        throw new AppError('WooCommerce store not found', 'WOOCOMMERCE_STORE_NOT_FOUND', 404);
      }

      // 2. Create client
      const client = new WooCommerceClient({
        storeUrl: store.storeUrl,
        consumerKey: store.decryptConsumerKey(),
        consumerSecret: store.decryptConsumerSecret(),
      });

      logger.info('Starting WooCommerce auto-mapping', { storeId });

      // 3. Fetch all products with pagination
      const allProducts: WooCommerceProduct[] = [];
      for await (const batch of client.paginate<WooCommerceProduct>('/products', {}, 100)) {
        allProducts.push(...batch);
      }

      logger.info('Fetched WooCommerce products for mapping', {
        storeId,
        count: allProducts.length,
      });

      // 4. Process each product
      for (const product of allProducts) {
        // Handle variable products (with variations)
        if (product.type === 'variable' && product.variations.length > 0) {
          // Fetch variations
          for (const variationId of product.variations) {
            try {
              const variation = await client.get<WooCommerceProductVariation>(
                `/products/${product.id}/variations/${variationId}`
              );

              if (variation.sku) {
                await this.attemptMapping(
                  store,
                  product.id,
                  variationId,
                  variation.sku,
                  `${product.name} - ${variation.attributes.map((a) => a.option).join(', ')}`,
                  result
                );
              } else {
                result.skipped++;
              }
            } catch (error: any) {
              logger.error('Failed to fetch variation', {
                productId: product.id,
                variationId,
                error: error.message,
              });
              result.failed++;
            }
          }
        } else {
          // Handle simple products
          if (product.sku) {
            await this.attemptMapping(
              store,
              product.id,
              undefined,
              product.sku,
              product.name,
              result
            );
          } else {
            result.skipped++;
          }
        }
      }

      logger.info('WooCommerce auto-mapping completed', {
        storeId,
        ...result,
      });

      return result;
    } catch (error: any) {
      logger.error('WooCommerce auto-mapping failed', {
        storeId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Attempt to create a mapping for a product/variation
   */
  private static async attemptMapping(
    store: any,
    productId: number,
    variationId: number | undefined,
    wooSKU: string,
    title: string,
    result: AutoMapResult
  ): Promise<void> {
    try {
      // Check if mapping already exists
      const existing = await WooCommerceProductMapping.findByWooCommerceId(
        store._id.toString(),
        productId,
        variationId
      );

      if (existing) {
        result.skipped++;
        return;
      }

      // TODO: Check if SKU exists in Helix inventory
      // For now, assuming exact SKU match
      const HelixSKU = wooSKU;

      // Create mapping
      await WooCommerceProductMapping.create({
        companyId: store.companyId,
        woocommerceStoreId: store._id,
        woocommerceProductId: productId,
        woocommerceVariationId: variationId,
        woocommerceSKU: wooSKU,
        woocommerceTitle: title,
        HelixSKU: HelixSKU,
        HelixProductName: title,
        mappingType: 'AUTO',
        syncInventory: true,
        syncPrice: false,
        syncOnFulfillment: true,
        isActive: true,
      });

      result.mapped++;
    } catch (error: any) {
      result.failed++;
      result.unmappedSKUs.push(wooSKU);
      logger.error('Failed to create mapping', {
        wooSKU,
        error: error.message,
      });
    }
  }

  /**
   * Create manual product mapping
   */
  static async createManualMapping(
    storeId: string,
    companyId: string,
    data: CreateMappingData
  ): Promise<any> {
    try {
      // Verify store exists and belongs to company
      const store = await WooCommerceStore.findOne({
        _id: storeId,
        companyId,
      });

      if (!store) {
        throw new AppError('WooCommerce store not found', 'WOOCOMMERCE_STORE_NOT_FOUND', 404);
      }

      // Check if mapping already exists
      const existing = await WooCommerceProductMapping.findByWooCommerceId(
        storeId,
        data.woocommerceProductId,
        data.woocommerceVariationId
      );

      if (existing) {
        throw new AppError(
          'Mapping already exists for this product/variation',
          'MAPPING_ALREADY_EXISTS',
          400
        );
      }

      // Create mapping
      const mapping = await WooCommerceProductMapping.create({
        companyId,
        woocommerceStoreId: storeId,
        woocommerceProductId: data.woocommerceProductId,
        woocommerceVariationId: data.woocommerceVariationId,
        woocommerceSKU: data.woocommerceSKU,
        woocommerceTitle: data.woocommerceTitle,
        HelixSKU: data.HelixSKU,
        HelixProductName: data.HelixProductName,
        mappingType: 'MANUAL',
        syncInventory: data.syncInventory !== false,
        syncPrice: data.syncPrice || false,
        syncOnFulfillment: data.syncOnFulfillment !== false,
        isActive: true,
      });

      logger.info('WooCommerce manual mapping created', {
        mappingId: mapping._id,
        storeId,
        wooSKU: data.woocommerceSKU,
        HelixSKU: data.HelixSKU,
      });

      return mapping;
    } catch (error: any) {
      logger.error('Failed to create manual mapping', {
        storeId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Delete mapping
   */
  static async deleteMapping(mappingId: string, companyId: string): Promise<void> {
    try {
      const mapping = await WooCommerceProductMapping.findOne({
        _id: mappingId,
        companyId,
      });

      if (!mapping) {
        throw new AppError('Mapping not found', 'MAPPING_NOT_FOUND', 404);
      }

      await mapping.deleteOne();

      logger.info('WooCommerce mapping deleted', {
        mappingId,
        companyId,
      });
    } catch (error: any) {
      logger.error('Failed to delete mapping', {
        mappingId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Toggle mapping active status
   */
  static async toggleMappingStatus(
    mappingId: string,
    companyId: string,
    isActive: boolean
  ): Promise<void> {
    try {
      const mapping = await WooCommerceProductMapping.findOne({
        _id: mappingId,
        companyId,
      });

      if (!mapping) {
        throw new AppError('Mapping not found', 'MAPPING_NOT_FOUND', 404);
      }

      mapping.isActive = isActive;
      await mapping.save();

      logger.info('WooCommerce mapping status toggled', {
        mappingId,
        isActive,
      });
    } catch (error: any) {
      logger.error('Failed to toggle mapping status', {
        mappingId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Get mappings with pagination
   */
  static async getMappings(
    storeId: string,
    companyId: string,
    filters: {
      isActive?: boolean;
      syncInventory?: boolean;
      mappingType?: 'AUTO' | 'MANUAL';
      search?: string;
    },
    page: number = 1,
    limit: number = 50
  ): Promise<{ mappings: any[]; total: number; page: number; pages: number }> {
    try {
      const query: any = {
        woocommerceStoreId: storeId,
        companyId,
      };

      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      if (filters.syncInventory !== undefined) {
        query.syncInventory = filters.syncInventory;
      }

      if (filters.mappingType) {
        query.mappingType = filters.mappingType;
      }

      if (filters.search) {
        query.$or = [
          { woocommerceSKU: { $regex: filters.search, $options: 'i' } },
          { HelixSKU: { $regex: filters.search, $options: 'i' } },
          { woocommerceTitle: { $regex: filters.search, $options: 'i' } },
        ];
      }

      const skip = (page - 1) * limit;

      const [mappings, total] = await Promise.all([
        WooCommerceProductMapping.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        WooCommerceProductMapping.countDocuments(query),
      ]);

      return {
        mappings,
        total,
        page,
        pages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      logger.error('Failed to get mappings', {
        storeId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Import mappings from CSV
   */
  static async importMappingsFromCSV(
    storeId: string,
    companyId: string,
    csvData: string
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    const result = {
      imported: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      // Parse CSV
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map((h) => h.trim());

      // Validate headers
      const requiredHeaders = [
        'woocommerceProductId',
        'woocommerceSKU',
        'HelixSKU',
      ];
      for (const header of requiredHeaders) {
        if (!headers.includes(header)) {
          throw new AppError(
            `Missing required header: ${header}`,
            'INVALID_CSV_FORMAT',
            400
          );
        }
      }

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim());
        const row: any = {};

        headers.forEach((header, index) => {
          row[header] = values[index];
        });

        try {
          await this.createManualMapping(storeId, companyId, {
            woocommerceProductId: parseInt(row.woocommerceProductId),
            woocommerceVariationId: row.woocommerceVariationId
              ? parseInt(row.woocommerceVariationId)
              : undefined,
            woocommerceSKU: row.woocommerceSKU,
            woocommerceTitle: row.woocommerceTitle || row.woocommerceSKU,
            HelixSKU: row.HelixSKU,
            HelixProductName: row.HelixProductName,
            syncInventory: row.syncInventory !== 'false',
          });

          result.imported++;
        } catch (error: any) {
          result.failed++;
          result.errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }

      logger.info('WooCommerce CSV import completed', {
        storeId,
        ...result,
      });

      return result;
    } catch (error: any) {
      logger.error('WooCommerce CSV import failed', {
        storeId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Export mappings to CSV
   */
  static async exportMappingsToCSV(storeId: string, companyId: string): Promise<string> {
    try {
      const mappings = await WooCommerceProductMapping.find({
        woocommerceStoreId: storeId,
        companyId,
      }).lean();

      const fields = [
        'woocommerceProductId',
        'woocommerceVariationId',
        'woocommerceSKU',
        'woocommerceTitle',
        'HelixSKU',
        'HelixProductName',
        'mappingType',
        'syncInventory',
        'syncPrice',
        'isActive',
        'syncErrors',
        'lastSyncAt',
      ];

      const parser = new Parser({ fields });
      const csv = parser.parse(mappings);

      logger.info('WooCommerce mappings exported to CSV', {
        storeId,
        count: mappings.length,
      });

      return csv;
    } catch (error: any) {
      logger.error('Failed to export mappings to CSV', {
        storeId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Get mapping statistics
   */
  static async getMappingStats(storeId: string): Promise<any> {
    try {
      const stats = await WooCommerceProductMapping.getMappingStats(storeId);
      return stats;
    } catch (error: any) {
      logger.error('Failed to get mapping stats', {
        storeId,
        error: error.message,
      });

      throw error;
    }
  }
}
