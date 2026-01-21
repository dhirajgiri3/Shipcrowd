import mongoose, { Schema, Document } from 'mongoose';

/**
 * FlipkartProductMapping Model
 *
 * Maps Helix products (SKU) to Flipkart listings (FSN/SKU).
 * Enables bi-directional inventory synchronization.
 *
 * Features:
 * - Auto-mapping by SKU match
 * - Manual mapping support
 * - CSV import/export
 * - Sync control per mapping
 */

export interface IFlipkartProductMapping extends Document {
  flipkartStoreId: Schema.Types.ObjectId;
  companyId: Schema.Types.ObjectId;

  // Helix product
  HelixSKU: string;
  HelixProductId?: Schema.Types.ObjectId;
  HelixProductName?: string;

  // Flipkart listing
  flipkartFSN: string; // Flipkart Serial Number (unique product identifier)
  flipkartSKU: string; // Seller SKU
  flipkartListingId?: string;
  flipkartTitle?: string;
  flipkartCategory?: string;

  // Mapping metadata
  mappingType: 'AUTO' | 'MANUAL' | 'CSV_IMPORT';
  mappedBy?: Schema.Types.ObjectId; // User who created mapping
  mappedAt: Date;
  isActive: boolean;

  // Sync configuration
  syncInventory: boolean;
  syncPrice: boolean;
  lastSyncAt?: Date;
  lastSyncStatus?: 'SUCCESS' | 'FAILED';
  lastSyncError?: string;

  // Inventory tracking
  lastHelixQuantity?: number;
  lastFlipkartQuantity?: number;
  lastInventorySyncAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Methods
  recordSyncSuccess(): Promise<void>;
  recordSyncError(error: string): Promise<void>;
}

const FlipkartProductMappingSchema = new Schema<IFlipkartProductMapping>(
  {
    flipkartStoreId: {
      type: Schema.Types.ObjectId,
      ref: 'FlipkartStore',
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    // Helix product
    HelixSKU: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    HelixProductId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
    },
    HelixProductName: {
      type: String,
    },

    // Flipkart listing
    flipkartFSN: {
      type: String,
      required: true,
      trim: true,
    },
    flipkartSKU: {
      type: String,
      required: true,
      trim: true,
    },
    flipkartListingId: {
      type: String,
    },
    flipkartTitle: {
      type: String,
    },
    flipkartCategory: {
      type: String,
    },

    // Mapping metadata
    mappingType: {
      type: String,
      enum: ['AUTO', 'MANUAL', 'CSV_IMPORT'],
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
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Sync configuration
    syncInventory: {
      type: Boolean,
      default: true,
    },
    syncPrice: {
      type: Boolean,
      default: false,
    },
    lastSyncAt: {
      type: Date,
    },
    lastSyncStatus: {
      type: String,
      enum: ['SUCCESS', 'FAILED'],
    },
    lastSyncError: {
      type: String,
    },

    // Inventory tracking
    lastHelixQuantity: {
      type: Number,
    },
    lastFlipkartQuantity: {
      type: Number,
    },
    lastInventorySyncAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
FlipkartProductMappingSchema.index({ flipkartStoreId: 1, HelixSKU: 1 }, { unique: true });
FlipkartProductMappingSchema.index({ flipkartStoreId: 1, flipkartFSN: 1 });
FlipkartProductMappingSchema.index({ companyId: 1, HelixSKU: 1 });
FlipkartProductMappingSchema.index({ isActive: 1, syncInventory: 1 });

// Instance Methods

// Instance method: Record sync success
FlipkartProductMappingSchema.methods.recordSyncSuccess = async function (): Promise<void> {
  this.lastSyncAt = new Date();
  this.lastSyncStatus = 'SUCCESS';
  this.lastSyncError = undefined;
  this.lastInventorySyncAt = new Date();
  await this.save();
};

// Instance method: Record sync error
FlipkartProductMappingSchema.methods.recordSyncError = async function (error: string): Promise<void> {
  this.lastSyncAt = new Date();
  this.lastSyncStatus = 'FAILED';
  this.lastSyncError = error;
  await this.save();
};

// Static Methods

// Static method: Get mapping statistics
FlipkartProductMappingSchema.statics.getMappingStats = async function (storeId: string) {
  const [total, active, auto, manual, csvImport, syncing] = await Promise.all([
    this.countDocuments({ flipkartStoreId: storeId }),
    this.countDocuments({ flipkartStoreId: storeId, isActive: true }),
    this.countDocuments({ flipkartStoreId: storeId, mappingType: 'AUTO' }),
    this.countDocuments({ flipkartStoreId: storeId, mappingType: 'MANUAL' }),
    this.countDocuments({ flipkartStoreId: storeId, mappingType: 'CSV_IMPORT' }),
    this.countDocuments({ flipkartStoreId: storeId, syncInventory: true }),
  ]);

  return {
    total,
    active,
    inactive: total - active,
    auto,
    manual,
    csvImport,
    syncing,
  };
};

export default mongoose.model<IFlipkartProductMapping>(
  'FlipkartProductMapping',
  FlipkartProductMappingSchema
);
