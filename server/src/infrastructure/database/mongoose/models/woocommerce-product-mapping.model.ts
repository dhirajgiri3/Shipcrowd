/**
 * WooCommerceProductMapping Model
 *
 * Maps WooCommerce products/variations to Shipcrowd SKUs for inventory synchronization.
 * Similar to ShopifyProductMapping but for WooCommerce stores.
 *
 * Features:
 * - Auto-mapping by exact SKU match
 * - Manual mapping creation
 * - Sync configuration per mapping
 * - Error tracking and auto-disable after 10 errors
 * - Support for both simple products and variations
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// Static methods interface
interface IWooCommerceProductMappingModel extends Model<IWooCommerceProductMapping> {
  findByShipcrowdSKU(storeId: string, sku: string): Promise<IWooCommerceProductMapping | null>;
  findByWooCommerceId(storeId: string, productId: number, variationId?: number): Promise<IWooCommerceProductMapping | null>;
  getMappingStats(storeId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    auto: number;
    manual: number;
    syncing: number;
    errors: number;
  }>;
  getMappingsWithErrors(storeId: string): Promise<IWooCommerceProductMapping[]>;
  bulkCreateMappings(mappings: any[]): Promise<{ created: number; failed: number; errors: string[] }>;
}

export interface IWooCommerceProductMapping extends Document {
  companyId: mongoose.Types.ObjectId;
  woocommerceStoreId: mongoose.Types.ObjectId;
  woocommerceProductId: number;
  woocommerceVariationId?: number; // Null for simple products
  woocommerceSKU: string;
  woocommerceTitle: string;
  shipcrowdSKU: string;
  shipcrowdProductName?: string;
  mappingType: 'AUTO' | 'MANUAL';
  syncInventory: boolean;
  syncPrice: boolean;
  syncOnFulfillment: boolean;
  isActive: boolean;
  syncErrors: number;
  lastSyncError?: string;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  recordSyncSuccess(): Promise<void>;
  recordSyncError(error: string): Promise<void>;
}

const WooCommerceProductMappingSchema = new Schema<IWooCommerceProductMapping>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    woocommerceStoreId: {
      type: Schema.Types.ObjectId,
      ref: 'WooCommerceStore',
      required: true,
      index: true,
    },
    woocommerceProductId: {
      type: Number,
      required: true,
    },
    woocommerceVariationId: {
      type: Number, // Null for simple products
    },
    woocommerceSKU: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    woocommerceTitle: {
      type: String,
      required: true,
    },
    shipcrowdSKU: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    shipcrowdProductName: {
      type: String,
    },
    mappingType: {
      type: String,
      enum: ['AUTO', 'MANUAL'],
      required: true,
      default: 'MANUAL',
    },
    syncInventory: {
      type: Boolean,
      default: true,
    },
    syncPrice: {
      type: Boolean,
      default: false,
    },
    syncOnFulfillment: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    syncErrors: {
      type: Number,
      default: 0,
    },
    lastSyncError: {
      type: String,
    },
    lastSyncAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'woocommerce_product_mappings',
  }
);

/**
 * Indexes
 */

// Unique mapping per variation (or product if simple)
WooCommerceProductMappingSchema.index(
  {
    companyId: 1,
    woocommerceStoreId: 1,
    woocommerceProductId: 1,
    woocommerceVariationId: 1,
  },
  { unique: true }
);

// Lookup by Shipcrowd SKU
WooCommerceProductMappingSchema.index({
  companyId: 1,
  woocommerceStoreId: 1,
  shipcrowdSKU: 1,
});

// Query active mappings
WooCommerceProductMappingSchema.index({
  woocommerceStoreId: 1,
  isActive: 1,
  syncInventory: 1,
});

/**
 * Instance Methods
 */

/**
 * Record successful sync
 * Resets error count and updates last sync time
 */
WooCommerceProductMappingSchema.methods.recordSyncSuccess = async function (): Promise<void> {
  this.syncErrors = 0;
  this.lastSyncError = undefined;
  this.lastSyncAt = new Date();
  await this.save();
};

/**
 * Record sync error
 * Increments error count and auto-disables after 10 errors
 */
WooCommerceProductMappingSchema.methods.recordSyncError = async function (
  error: string
): Promise<void> {
  this.syncErrors += 1;
  this.lastSyncError = error;

  // Auto-disable after 10 consecutive errors
  if (this.syncErrors >= 10) {
    this.isActive = false;
  }

  await this.save();
};

/**
 * Static Methods
 */

/**
 * Find mapping by Shipcrowd SKU
 */
WooCommerceProductMappingSchema.statics.findByShipcrowdSKU = function (
  storeId: string,
  sku: string
) {
  return this.findOne({
    woocommerceStoreId: storeId,
    shipcrowdSKU: sku.toUpperCase(),
    isActive: true,
  });
};

/**
 * Find mapping by WooCommerce product/variation ID
 */
WooCommerceProductMappingSchema.statics.findByWooCommerceId = function (
  storeId: string,
  productId: number,
  variationId?: number
) {
  const query: any = {
    woocommerceStoreId: storeId,
    woocommerceProductId: productId,
    isActive: true,
  };

  if (variationId) {
    query.woocommerceVariationId = variationId;
  } else {
    query.woocommerceVariationId = { $exists: false };
  }

  return this.findOne(query);
};

/**
 * Get mapping statistics for a store
 */
WooCommerceProductMappingSchema.statics.getMappingStats = async function (storeId: string) {
  const stats = await this.aggregate([
    {
      $match: {
        woocommerceStoreId: new mongoose.Types.ObjectId(storeId),
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: {
          $sum: { $cond: ['$isActive', 1, 0] },
        },
        inactive: {
          $sum: { $cond: ['$isActive', 0, 1] },
        },
        auto: {
          $sum: { $cond: [{ $eq: ['$mappingType', 'AUTO'] }, 1, 0] },
        },
        manual: {
          $sum: { $cond: [{ $eq: ['$mappingType', 'MANUAL'] }, 1, 0] },
        },
        syncing: {
          $sum: { $cond: ['$syncInventory', 1, 0] },
        },
        errors: {
          $sum: { $cond: [{ $gt: ['$syncErrors', 0] }, 1, 0] },
        },
      },
    },
  ]);

  if (stats.length === 0) {
    return {
      total: 0,
      active: 0,
      inactive: 0,
      auto: 0,
      manual: 0,
      syncing: 0,
      errors: 0,
    };
  }

  return stats[0];
};

/**
 * Get mappings with errors
 */
WooCommerceProductMappingSchema.statics.getMappingsWithErrors = function (storeId: string) {
  return this.find({
    woocommerceStoreId: storeId,
    syncErrors: { $gt: 0 },
  })
    .sort({ syncErrors: -1 })
    .limit(50);
};

/**
 * Bulk create mappings
 * Used for auto-mapping and CSV import
 */
WooCommerceProductMappingSchema.statics.bulkCreateMappings = async function (
  mappings: any[]
): Promise<{ created: number; failed: number; errors: string[] }> {
  const result = {
    created: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const mapping of mappings) {
    try {
      await this.create(mapping);
      result.created++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(
        `Failed to create mapping for ${mapping.woocommerceSKU}: ${error.message}`
      );
    }
  }

  return result;
};

const WooCommerceProductMapping = mongoose.model<IWooCommerceProductMapping, IWooCommerceProductMappingModel>(
  'WooCommerceProductMapping',
  WooCommerceProductMappingSchema
);

export default WooCommerceProductMapping;
