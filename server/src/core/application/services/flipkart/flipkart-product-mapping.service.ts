/**
 * Flipkart Product Mapping
 * 
 * Purpose: FlipkartProductMappingService
 * 
 * DEPENDENCIES:
 * - Database Models, Error Handling
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import { FlipkartStore } from '../../../../infrastructure/database/mongoose/models';
import { FlipkartProductMapping } from '../../../../infrastructure/database/mongoose/models';
import FlipkartClient from '../../../../infrastructure/external/ecommerce/flipkart/flipkart.client';
import { AppError } from '../../../../shared/errors/app.error';
import winston from 'winston';
import { Parser } from 'json2csv';

/**
 * FlipkartProductMappingService
 *
 * Handles product mapping between Flipkart listings and Shipcrowd SKUs.
 *
 * Features:
 * - Auto-mapping by SKU match
 * - Manual mapping creation
 * - CSV import/export
 * - Bulk operations
 * - Mapping validation
 */

interface FlipkartListing {
  fsn: string;
  sku: string;
  listingId: string;
  title: string;
  category?: string;
  mrp?: number;
  sellingPrice?: number;
  inventory?: number;
}

interface FlipkartListingsResponse {
  listings: FlipkartListing[];
  nextPageToken?: string;
}

interface AutoMapResult {
  mapped: number;
  skipped: number;
  failed: number;
  unmappedSKUs: string[];
}

interface CreateMappingData {
  flipkartStoreId: string;
  flipkartFSN: string;
  flipkartSKU: string;
  flipkartListingId?: string;
  flipkartTitle: string;
  flipkartCategory?: string;
  shipcrowdSKU: string;
  shipcrowdProductName: string;
  mappedBy?: string;
  syncInventory?: boolean;
  syncPrice?: boolean;
}

export class FlipkartProductMappingService {
  private static logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
  });

  /**
   * Auto-map products by exact SKU match
   *
   * @param storeId - FlipkartStore ID
   * @returns Auto-mapping result statistics
   */
  static async autoMapProducts(storeId: string): Promise<AutoMapResult> {
    const store = await FlipkartStore.findById(storeId).select('+apiKey +apiSecret');
    if (!store) {
      throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
    }

    this.logger.info('Starting auto-mapping for store', {
      storeId,
      sellerId: store.sellerId,
    });

    const client = new FlipkartClient({
      apiKey: store.decryptApiKey(),
      apiSecret: store.decryptApiSecret(),
      sellerId: store.sellerId,
    });

    const result: AutoMapResult = {
      mapped: 0,
      skipped: 0,
      failed: 0,
      unmappedSKUs: [],
    };

    // Fetch all listings from Flipkart
    const listings = await this.fetchAllListings(client);

    this.logger.info('Fetched listings from Flipkart', {
      listingsCount: listings.length,
    });

    // Process each listing
    for (const listing of listings) {
      if (!listing.sku || listing.sku.trim() === '') {
        result.skipped++;
        continue;
      }

      try {
        // Check if mapping already exists
        const existingMapping = await FlipkartProductMapping.findOne({
          flipkartStoreId: storeId,
          flipkartFSN: listing.fsn,
        });

        if (existingMapping) {
          result.skipped++;
          continue;
        }

        // TODO: Check if SKU exists in Shipcrowd inventory
        // For now, we'll create the mapping and mark it as AUTO type
        // In production, you'd integrate with InventoryService to verify SKU

        // Create auto mapping - match Flipkart SKU to Shipcrowd SKU (case-insensitive)
        await FlipkartProductMapping.create({
          companyId: store.companyId,
          flipkartStoreId: storeId,
          flipkartFSN: listing.fsn,
          flipkartSKU: listing.sku,
          flipkartListingId: listing.listingId,
          flipkartTitle: listing.title,
          flipkartCategory: listing.category,
          shipcrowdSKU: listing.sku.toUpperCase(),
          shipcrowdProductName: listing.title,
          mappingType: 'AUTO',
          mappedAt: new Date(),
          syncInventory: true,
          syncPrice: false,
          isActive: true,
        });

        result.mapped++;

        this.logger.debug('Auto-mapped listing', {
          fsn: listing.fsn,
          sku: listing.sku,
        });
      } catch (error: any) {
        result.failed++;
        result.unmappedSKUs.push(listing.sku);

        this.logger.error('Failed to auto-map listing', {
          fsn: listing.fsn,
          sku: listing.sku,
          error: error.message,
        });
      }
    }

    // Update store stats
    store.stats.totalProductsMapped = await FlipkartProductMapping.countDocuments({
      flipkartStoreId: storeId,
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
   * Fetch all listings from Flipkart with pagination
   */
  private static async fetchAllListings(client: FlipkartClient): Promise<FlipkartListing[]> {
    const listings: FlipkartListing[] = [];
    let nextPageToken: string | undefined = undefined;
    const maxPages = 100; // Safety limit
    let pageCount = 0;

    do {
      try {
        const params: any = {
          limit: 100, // Max listings per page
        };

        if (nextPageToken) {
          params.pageToken = nextPageToken;
        }

        const response = await client.get<FlipkartListingsResponse>(
          '/listings/v3/search',
          params
        );

        const batch = response.listings || [];
        listings.push(...batch);

        nextPageToken = response.nextPageToken;
        pageCount++;

        this.logger.debug('Fetched listings page', {
          page: pageCount,
          count: batch.length,
          hasMore: !!nextPageToken,
        });

        // Rate limiting
        if (nextPageToken) {
          await this.sleep(100);
        }
      } catch (error: any) {
        this.logger.error('Failed to fetch listings page', {
          page: pageCount,
          error: error.message,
        });
        break;
      }
    } while (nextPageToken && pageCount < maxPages);

    return listings;
  }

  /**
   * Create manual product mapping
   *
   * @param data - Mapping data
   * @returns Created FlipkartProductMapping
   */
  static async createManualMapping(data: CreateMappingData): Promise<any> {
    const store = await FlipkartStore.findById(data.flipkartStoreId);
    if (!store) {
      throw new AppError('Store not found', 'STORE_NOT_FOUND', 404);
    }

    // Check for duplicate
    const existing = await FlipkartProductMapping.findOne({
      flipkartStoreId: data.flipkartStoreId,
      flipkartFSN: data.flipkartFSN,
    });

    if (existing) {
      throw new AppError('Mapping already exists for this FSN', 'MAPPING_EXISTS', 409);
    }

    // TODO: Verify Shipcrowd SKU exists
    // In production, integrate with InventoryService

    const mapping = await FlipkartProductMapping.create({
      companyId: store.companyId,
      ...data,
      mappingType: 'MANUAL',
      mappedAt: new Date(),
      isActive: true,
    });

    this.logger.info('Created manual mapping', {
      mappingId: mapping._id,
      fsn: data.flipkartFSN,
      sku: data.shipcrowdSKU,
    });

    return mapping;
  }

  /**
   * Delete product mapping
   *
   * @param mappingId - FlipkartProductMapping ID
   */
  static async deleteMapping(mappingId: string): Promise<void> {
    const mapping = await FlipkartProductMapping.findById(mappingId);
    if (!mapping) {
      throw new AppError('Mapping not found', 'MAPPING_NOT_FOUND', 404);
    }

    await mapping.deleteOne();

    this.logger.info('Deleted mapping', {
      mappingId,
      fsn: mapping.flipkartFSN,
      sku: mapping.shipcrowdSKU,
    });
  }

  /**
   * Get mappings with pagination and filters
   *
   * @param storeId - FlipkartStore ID
   * @param filters - Query filters
   * @param page - Page number
   * @param limit - Items per page
   */
  static async getMappings(
    storeId: string,
    filters: {
      isActive?: boolean;
      syncInventory?: boolean;
      mappingType?: 'AUTO' | 'MANUAL' | 'CSV_IMPORT';
      search?: string;
    } = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{ mappings: any[]; total: number; page: number; pages: number }> {
    const query: any = { flipkartStoreId: storeId };

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
        { flipkartSKU: { $regex: filters.search, $options: 'i' } },
        { flipkartFSN: { $regex: filters.search, $options: 'i' } },
        { shipcrowdSKU: { $regex: filters.search, $options: 'i' } },
        { flipkartTitle: { $regex: filters.search, $options: 'i' } },
        { shipcrowdProductName: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [mappings, total] = await Promise.all([
      FlipkartProductMapping.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      FlipkartProductMapping.countDocuments(query),
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
   *
   * @param mappingId - FlipkartProductMapping ID
   * @param isActive - Active status
   */
  static async toggleMappingStatus(mappingId: string, isActive: boolean): Promise<void> {
    const mapping = await FlipkartProductMapping.findById(mappingId);
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

  /**
   * Import mappings from CSV
   *
   * CSV Format: shipcrowdSKU,flipkartFSN,flipkartSKU,syncInventory
   *
   * @param storeId - FlipkartStore ID
   * @param csvData - CSV file content
   * @returns Import result
   */
  static async importMappingsFromCSV(
    storeId: string,
    csvData: string
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    const store = await FlipkartStore.findById(storeId);
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
    const requiredHeaders = ['shipcrowdSKU', 'flipkartFSN', 'flipkartSKU'];
    const hasAllHeaders = requiredHeaders.every((h) => headers.includes(h));

    if (!hasAllHeaders) {
      throw new AppError(
        'Invalid CSV format. Required columns: ' + requiredHeaders.join(', '),
        'INVALID_CSV',
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
        if (!row.shipcrowdSKU || !row.flipkartFSN || !row.flipkartSKU) {
          result.errors.push(`Row ${i + 1}: Missing required fields`);
          result.failed++;
          continue;
        }

        // Check if mapping exists
        const existing = await FlipkartProductMapping.findOne({
          flipkartStoreId: storeId,
          flipkartFSN: row.flipkartFSN,
        });

        if (existing) {
          result.errors.push(`Row ${i + 1}: Mapping already exists for FSN ${row.flipkartFSN}`);
          result.failed++;
          continue;
        }

        // Create mapping
        await FlipkartProductMapping.create({
          companyId: store.companyId,
          flipkartStoreId: storeId,
          flipkartFSN: row.flipkartFSN,
          flipkartSKU: row.flipkartSKU,
          flipkartListingId: row.flipkartListingId || undefined,
          flipkartTitle: row.flipkartTitle || 'Imported from CSV',
          flipkartCategory: row.flipkartCategory || undefined,
          shipcrowdSKU: row.shipcrowdSKU.toUpperCase(),
          shipcrowdProductName: row.shipcrowdProductName || row.flipkartTitle || 'Imported',
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
   * @param storeId - FlipkartStore ID
   * @returns CSV string
   */
  static async exportMappingsToCSV(storeId: string): Promise<string> {
    const mappings = await FlipkartProductMapping.find({ flipkartStoreId: storeId });

    const data = mappings.map((m) => ({
      shipcrowdSKU: m.shipcrowdSKU,
      flipkartFSN: m.flipkartFSN,
      flipkartSKU: m.flipkartSKU,
      flipkartListingId: m.flipkartListingId || '',
      flipkartTitle: m.flipkartTitle,
      flipkartCategory: m.flipkartCategory || '',
      shipcrowdProductName: m.shipcrowdProductName,
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

    this.logger.info('Exported mappings to CSV', {
      storeId,
      count: mappings.length,
    });

    return csv;
  }

  /**
   * Get mapping statistics
   *
   * @param storeId - FlipkartStore ID
   */
  static async getMappingStats(storeId: string): Promise<any> {
    const [total, active, auto, manual, csvImport, syncing] = await Promise.all([
      FlipkartProductMapping.countDocuments({ flipkartStoreId: storeId }),
      FlipkartProductMapping.countDocuments({ flipkartStoreId: storeId, isActive: true }),
      FlipkartProductMapping.countDocuments({ flipkartStoreId: storeId, mappingType: 'AUTO' }),
      FlipkartProductMapping.countDocuments({ flipkartStoreId: storeId, mappingType: 'MANUAL' }),
      FlipkartProductMapping.countDocuments({ flipkartStoreId: storeId, mappingType: 'CSV_IMPORT' }),
      FlipkartProductMapping.countDocuments({ flipkartStoreId: storeId, syncInventory: true }),
    ]);
    return { total, active, inactive: total - active, auto, manual, csvImport, syncing };
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default FlipkartProductMappingService;
