import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * ProductMapping Model
 *
 * Maps Shopify product variants to Shipcrowd SKUs for inventory synchronization.
 * Supports both automatic (by SKU matching) and manual mapping creation.
 */

// Static methods interface
interface IProductMappingModel extends Model<IProductMapping> {
  findByShipcrowdSKU(storeId: string, sku: string): Promise<IProductMapping | null>;
  findByShopifyVariant(storeId: string, variantId: string): Promise<IProductMapping | null>;
  getUnmappedVariants(storeId: string, shopifyVariantIds: string[]): Promise<string[]>;
  getMappingStats(storeId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    auto: number;
    manual: number;
    syncing: number;
    errors: number;
  }>;
}

export interface IProductMapping extends Document {
  companyId: Schema.Types.ObjectId;
  shopifyStoreId: Schema.Types.ObjectId;

  // Shopify product details
  shopifyProductId: string;
  shopifyVariantId: string;
  shopifySKU: string;
  shopifyTitle: string;
  shopifyBarcode?: string;
  shopifyInventoryItemId?: string; // For inventory API

  // Shipcrowd product details
  ShipcrowdSKU: string;
  ShipcrowdProductName: string;

  // Mapping metadata
  mappingType: 'AUTO' | 'MANUAL';
  mappedBy?: Schema.Types.ObjectId; // User who created manual mapping
  mappedAt: Date;
  lastVerifiedAt?: Date;

  // Sync settings
  syncInventory: boolean;
  syncPrice: boolean;
  syncOnFulfillment: boolean; // Auto-sync when order fulfilled

  // Status
  isActive: boolean;
  syncErrors: number;
  lastSyncError?: string;
  lastSyncAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Methods
  recordSyncSuccess(): Promise<void>;
  recordSyncError(error: string): Promise<void>;
}


const ProductMappingSchema = new Schema<IProductMapping>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    shopifyStoreId: {
      type: Schema.Types.ObjectId,
      ref: 'ShopifyStore',
      required: true,
      index: true,
    },

    // Shopify product details
    shopifyProductId: {
      type: String,
      required: true,
    },
    shopifyVariantId: {
      type: String,
      required: true,
    },
    shopifySKU: {
      type: String,
      required: true,
      trim: true,
    },
    shopifyTitle: {
      type: String,
      required: true,
      trim: true,
    },
    shopifyBarcode: {
      type: String,
      trim: true,
    },
    shopifyInventoryItemId: {
      type: String,
      trim: true,
    },

    // Shipcrowd product details
    ShipcrowdSKU: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    ShipcrowdProductName: {
      type: String,
      required: true,
      trim: true,
    },

    // Mapping metadata
    mappingType: {
      type: String,
      enum: ['AUTO', 'MANUAL'],
      required: true,
      default: 'MANUAL',
    },
    mappedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    mappedAt: {
      type: Date,
      default: Date.now,
    },
    lastVerifiedAt: {
      type: Date,
    },

    // Sync settings
    syncInventory: {
      type: Boolean,
      default: true,
    },
    syncPrice: {
      type: Boolean,
      default: false, // Price sync optional
    },
    syncOnFulfillment: {
      type: Boolean,
      default: true,
    },

    // Status
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
  }
);

// Indexes
ProductMappingSchema.index(
  { companyId: 1, shopifyStoreId: 1, shopifyVariantId: 1 },
  { unique: true }
);
ProductMappingSchema.index({ companyId: 1, ShipcrowdSKU: 1 });
ProductMappingSchema.index({ shopifyStoreId: 1, shopifySKU: 1 });
ProductMappingSchema.index({ companyId: 1, isActive: 1, syncInventory: 1 });

// Virtual: Sync health indicator
ProductMappingSchema.virtual('syncHealth').get(function () {
  if (this.syncErrors === 0) return 'HEALTHY';
  if (this.syncErrors < 3) return 'WARNING';
  return 'ERROR';
});

// Virtual: Days since last sync
ProductMappingSchema.virtual('daysSinceSync').get(function () {
  if (!this.lastSyncAt) return null;
  const diff = Date.now() - this.lastSyncAt.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Static method: Find mapping by Shipcrowd SKU
ProductMappingSchema.statics.findByShipcrowdSKU = function (
  storeId: string,
  sku: string
) {
  return this.findOne({
    shopifyStoreId: storeId,
    ShipcrowdSKU: sku.toUpperCase(),
    isActive: true,
  });
};

// Static method: Find mapping by Shopify variant ID
ProductMappingSchema.statics.findByShopifyVariant = function (
  storeId: string,
  variantId: string
) {
  return this.findOne({
    shopifyStoreId: storeId,
    shopifyVariantId: variantId,
    isActive: true,
  });
};

// Static method: Get unmapped Shopify variants
ProductMappingSchema.statics.getUnmappedVariants = async function (
  storeId: string,
  shopifyVariantIds: string[]
) {
  const mapped = await this.find({
    shopifyStoreId: storeId,
    shopifyVariantId: { $in: shopifyVariantIds },
    isActive: true,
  }).select('shopifyVariantId');

  const mappedIds = mapped.map((m: any) => m.shopifyVariantId);
  return shopifyVariantIds.filter((id) => !mappedIds.includes(id));
};

// Static method: Get mapping statistics
ProductMappingSchema.statics.getMappingStats = async function (storeId: string) {
  const [total, active, auto, manual, syncing, errors] = await Promise.all([
    this.countDocuments({ shopifyStoreId: storeId }),
    this.countDocuments({ shopifyStoreId: storeId, isActive: true }),
    this.countDocuments({ shopifyStoreId: storeId, mappingType: 'AUTO' }),
    this.countDocuments({ shopifyStoreId: storeId, mappingType: 'MANUAL' }),
    this.countDocuments({ shopifyStoreId: storeId, syncInventory: true }),
    this.countDocuments({ shopifyStoreId: storeId, syncErrors: { $gt: 0 } }),
  ]);

  return {
    total,
    active,
    inactive: total - active,
    auto,
    manual,
    syncing,
    errors,
  };
};

// Instance method: Record sync success
ProductMappingSchema.methods.recordSyncSuccess = async function () {
  this.syncErrors = 0;
  this.lastSyncError = undefined;
  this.lastSyncAt = new Date();
  await this.save();
};

// Instance method: Record sync error
ProductMappingSchema.methods.recordSyncError = async function (error: string) {
  this.syncErrors += 1;
  this.lastSyncError = error;
  this.lastSyncAt = new Date();

  // Auto-disable if too many errors
  if (this.syncErrors >= 10) {
    this.isActive = false;
  }

  await this.save();
};

export default mongoose.model<IProductMapping, IProductMappingModel>('ProductMapping', ProductMappingSchema);
