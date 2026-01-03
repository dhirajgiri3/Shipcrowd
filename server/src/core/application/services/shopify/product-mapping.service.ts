import ShopifyStore from '../../../../infrastructure/database/mongoose/models/shopify-store.model';
import ProductMapping from '../../../../infrastructure/database/mongoose/models/product-mapping.model';
import ShopifyClient from '../../../../infrastructure/external/ecommerce/shopify/shopify.client';
import { AppError } from '../../../../shared/errors/app.error';
import winston from 'winston';
import { Parser } from 'json2csv';

/**
 * ProductMappingService
 *
 * Handles product mapping between Shopify variants and Shipcrowd SKUs.
 *
 * Features:
 * - Auto-mapping by SKU match
 * - Manual mapping creation
 * - CSV import/export
 * - Bulk operations
 * - Mapping validation
 */

interface ShopifyProduct {
  id: number;
  title: string;
  variants: Array<{
    id: number;
    title: string;
    sku: string;
    barcode: string;
    inventory_item_id: number;
    price: string;
  }>;
}

interface AutoMapResult {
  mapped: number;
  skipped: number;
  failed: number;
  unmappedSKUs: string[];
}

interface CreateMappingData {
  shopifyStoreId: string;
  shopifyProductId: string;
  shopifyVariantId: string;
  shopifySKU: string;
  shopifyTitle: string;
  shopifyBarcode?: string;
  shopifyInventoryItemId?: string;
  shipcrowdSKU: string;
  shipcrowdProductName: string;
  mappedBy?: string;
  syncInventory?: boolean;
  syncPrice?: boolean;
  syncOnFulfillment?: boolean;
}

export class ProductMappingService {
  private static logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
  });

  /**
   * Auto-map products by exact SKU match
   *
   * @param storeId - ShopifyStore ID
   * @returns Auto-mapping result statistics
   */
  static async autoMapProducts(storeId: string): Promise<AutoMapResult> {
    const store = await ShopifyStore.findById(storeId).select('+accessToken');
    if (!store) {
      throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
    }

    this.logger.info('Starting auto-mapping for store', {
      storeId,
      shop: store.shopDomain,
    });

    const client = new ShopifyClient({
      shopDomain: store.shopDomain,
      accessToken: store.decryptAccessToken(),
    });

    const result: AutoMapResult = {
      mapped: 0,
      skipped: 0,
      failed: 0,
      unmappedSKUs: [],
    };

    // Fetch all products from Shopify
    const products = await this.fetchAllProducts(client);

    this.logger.info('Fetched products from Shopify', {
      productsCount: products.length,
    });

    // Process each variant
    for (const product of products) {
      for (const variant of product.variants) {
        if (!variant.sku || variant.sku.trim() === '') {
          result.skipped++;
          continue;
        }

        try {
          // Check if mapping already exists
          const existingMapping = await ProductMapping.findOne({
            shopifyStoreId: storeId,
            shopifyVariantId: variant.id.toString(),
          });

          if (existingMapping) {
            result.skipped++;
            continue;
          }

          // TODO: Check if SKU exists in Shipcrowd inventory
          // For now, we'll create the mapping and mark it as AUTO type
          // In production, you'd integrate with InventoryService to verify SKU

          // Create auto mapping
          await ProductMapping.create({
            companyId: store.companyId,
            shopifyStoreId: storeId,
            shopifyProductId: product.id.toString(),
            shopifyVariantId: variant.id.toString(),
            shopifySKU: variant.sku,
            shopifyTitle: `${product.title} - ${variant.title}`,
            shopifyBarcode: variant.barcode || undefined,
            shopifyInventoryItemId: variant.inventory_item_id?.toString(),
            shipcrowdSKU: variant.sku.toUpperCase(),
            shipcrowdProductName: product.title,
            mappingType: 'AUTO',
            mappedAt: new Date(),
            syncInventory: true,
            syncPrice: false,
            syncOnFulfillment: true,
            isActive: true,
          });

          result.mapped++;

          this.logger.debug('Auto-mapped variant', {
            variantId: variant.id,
            sku: variant.sku,
          });
        } catch (error: any) {
          result.failed++;
          result.unmappedSKUs.push(variant.sku);

          this.logger.error('Failed to auto-map variant', {
            variantId: variant.id,
            sku: variant.sku,
            error: error.message,
          });
        }
      }
    }

    // Update store stats
    store.stats.totalProductsMapped = await ProductMapping.countDocuments({
      shopifyStoreId: storeId,
      isActive: true,
    });
    await store.save();

    this.logger.info('Auto-mapping completed', {
      storeId,
      ...result,
    });

    return result;
  }

  /**
   * Fetch all products from Shopify with pagination
   */
  private static async fetchAllProducts(client: ShopifyClient): Promise<ShopifyProduct[]> {
    const products: ShopifyProduct[] = [];
    const limit = 250;
    let hasMore = true;
    let pageInfo: string | null = null;

    while (hasMore) {
      const params: any = {
        limit,
        fields: 'id,title,variants',
        ...(pageInfo ? { page_info: pageInfo } : {}),
      };

      const response = await client.get<{ products: ShopifyProduct[] }>(
        '/products.json',
        params
      );

      const batch = response.products || [];
      products.push(...batch);

      // Check for more pages
      hasMore = batch.length === limit;
      pageInfo = null; // Would extract from Link header in production
      hasMore = false; // Single batch for now
    }

    return products;
  }

  /**
   * Create manual product mapping
   *
   * @param data - Mapping data
   * @returns Created ProductMapping
   */
  static async createManualMapping(data: CreateMappingData): Promise<any> {
    const store = await ShopifyStore.findById(data.shopifyStoreId);
    if (!store) {
      throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
    }

    // Check for duplicate
    const existing = await ProductMapping.findOne({
      shopifyStoreId: data.shopifyStoreId,
      shopifyVariantId: data.shopifyVariantId,
    });

    if (existing) {
      throw new AppError('Mapping already exists for this variant', 'MAPPING_EXISTS', 409);
    }

    // TODO: Verify Shipcrowd SKU exists
    // In production, integrate with InventoryService

    const mapping = await ProductMapping.create({
      companyId: store.companyId,
      ...data,
      mappingType: 'MANUAL',
      mappedAt: new Date(),
      isActive: true,
    });

    this.logger.info('Created manual mapping', {
      mappingId: mapping._id,
      variantId: data.shopifyVariantId,
      sku: data.shipcrowdSKU,
    });

    return mapping;
  }

  /**
   * Delete product mapping
   *
   * @param mappingId - ProductMapping ID
   */
  static async deleteMapping(mappingId: string): Promise<void> {
    const mapping = await ProductMapping.findById(mappingId);
    if (!mapping) {
      throw new AppError('Mapping not found', 'MAPPING_NOT_FOUND', 404);
    }

    await mapping.deleteOne();

    this.logger.info('Deleted mapping', {
      mappingId,
      variantId: mapping.shopifyVariantId,
      sku: mapping.shipcrowdSKU,
    });
  }

  /**
   * Get mappings with pagination and filters
   *
   * @param storeId - ShopifyStore ID
   * @param filters - Query filters
   * @param page - Page number
   * @param limit - Items per page
   */
  static async getMappings(
    storeId: string,
    filters: {
      isActive?: boolean;
      syncInventory?: boolean;
      mappingType?: 'AUTO' | 'MANUAL';
      search?: string;
    } = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{ mappings: any[]; total: number; page: number; pages: number }> {
    const query: any = { shopifyStoreId: storeId };

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
        { shopifySKU: { $regex: filters.search, $options: 'i' } },
        { shipcrowdSKU: { $regex: filters.search, $options: 'i' } },
        { shopifyTitle: { $regex: filters.search, $options: 'i' } },
        { shipcrowdProductName: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [mappings, total] = await Promise.all([
      ProductMapping.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ProductMapping.countDocuments(query),
    ]);

    return {
      mappings,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Import mappings from CSV
   *
   * CSV Format: shopifyProductId,shopifyVariantId,shopifySKU,shipcrowdSKU,syncInventory
   *
   * @param storeId - ShopifyStore ID
   * @param csvData - CSV file content
   * @returns Import result
   */
  static async importMappingsFromCSV(
    storeId: string,
    csvData: string
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    const store = await ShopifyStore.findById(storeId);
    if (!store) {
      throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
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
    const requiredHeaders = ['shopifyProductId', 'shopifyVariantId', 'shopifySKU', 'shipcrowdSKU'];
    const hasAllHeaders = requiredHeaders.every((h) => headers.includes(h));

    if (!hasAllHeaders) {
      throw new AppError('Invalid CSV format. Required columns: ' + requiredHeaders.join(', '), 'INVALID_CSV', 400);
    }

    // Process rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      try {
        // Check if mapping exists
        const existing = await ProductMapping.findOne({
          shopifyStoreId: storeId,
          shopifyVariantId: row.shopifyVariantId,
        });

        if (existing) {
          result.errors.push(`Row ${i + 1}: Mapping already exists for variant ${row.shopifyVariantId}`);
          result.failed++;
          continue;
        }

        // Create mapping
        await ProductMapping.create({
          companyId: store.companyId,
          shopifyStoreId: storeId,
          shopifyProductId: row.shopifyProductId,
          shopifyVariantId: row.shopifyVariantId,
          shopifySKU: row.shopifySKU,
          shopifyTitle: row.shopifyTitle || 'Imported from CSV',
          shipcrowdSKU: row.shipcrowdSKU.toUpperCase(),
          shipcrowdProductName: row.shipcrowdProductName || row.shopifyTitle || 'Imported',
          mappingType: 'MANUAL',
          mappedAt: new Date(),
          syncInventory: row.syncInventory === 'true' || row.syncInventory === '1',
          isActive: true,
        });

        result.imported++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    this.logger.info('CSV import completed', {
      storeId,
      imported: result.imported,
      failed: result.failed,
    });

    return result;
  }

  /**
   * Export mappings to CSV
   *
   * @param storeId - ShopifyStore ID
   * @returns CSV string
   */
  static async exportMappingsToCSV(storeId: string): Promise<string> {
    const mappings = await ProductMapping.find({ shopifyStoreId: storeId });

    const data = mappings.map((m) => ({
      shopifyProductId: m.shopifyProductId,
      shopifyVariantId: m.shopifyVariantId,
      shopifySKU: m.shopifySKU,
      shopifyTitle: m.shopifyTitle,
      shopifyBarcode: m.shopifyBarcode || '',
      shipcrowdSKU: m.shipcrowdSKU,
      shipcrowdProductName: m.shipcrowdProductName,
      mappingType: m.mappingType,
      syncInventory: m.syncInventory,
      syncPrice: m.syncPrice,
      syncOnFulfillment: m.syncOnFulfillment,
      isActive: m.isActive,
      createdAt: m.createdAt.toISOString(),
    }));

    const parser = new Parser();
    const csv = parser.parse(data);

    this.logger.info('Exported mappings to CSV', {
      storeId,
      count: mappings.length,
    });

    return csv;
  }

  /**
   * Get mapping statistics
   *
   * @param storeId - ShopifyStore ID
   */
  static async getMappingStats(storeId: string): Promise<any> {
    return ProductMapping.getMappingStats(storeId);
  }

  /**
   * Toggle mapping active status
   *
   * @param mappingId - ProductMapping ID
   * @param isActive - Active status
   */
  static async toggleMappingStatus(mappingId: string, isActive: boolean): Promise<void> {
    const mapping = await ProductMapping.findById(mappingId);
    if (!mapping) {
      throw new AppError('Mapping not found', 'MAPPING_NOT_FOUND', 404);
    }

    mapping.isActive = isActive;
    await mapping.save();

    this.logger.info('Toggled mapping status', {
      mappingId,
      isActive,
    });
  }
}

export default ProductMappingService;
