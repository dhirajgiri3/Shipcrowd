import mongoose, { Schema, Document } from 'mongoose';

/**
 * AmazonProductMapping Model
 *
 * Maps Helix products (SKU) to Amazon listings (ASIN/SKU).
 * Enables bi-directional inventory synchronization.
 *
 * Features:
 * - Auto-mapping by SKU match
 * - Manual mapping support
 * - CSV import/export
 * - Sync control per mapping
 * - FBA vs MFN fulfillment tracking
 */

export interface IAmazonProductMapping extends Document {
  amazonStoreId: Schema.Types.ObjectId;
  companyId: Schema.Types.ObjectId;

  // Helix product
  HelixSKU: string;
  HelixProductId?: Schema.Types.ObjectId;
  HelixProductName?: string;

  // Amazon listing
  amazonASIN: string; // Amazon Standard Identification Number
  amazonSKU: string; // Seller SKU
  amazonListingId?: string;
  amazonTitle?: string;
  amazonCategory?: string;
  fulfillmentType: 'FBA' | 'MFN'; // Fulfilled by Amazon or Merchant Fulfilled Network

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
  lastAmazonQuantity?: number;
  lastInventorySyncAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const AmazonProductMappingSchema = new Schema<IAmazonProductMapping>(
  {
    amazonStoreId: {
      type: Schema.Types.ObjectId,
      ref: 'AmazonStore',
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

    // Amazon listing
    amazonASIN: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    amazonSKU: {
      type: String,
      required: true,
      trim: true,
    },
    amazonListingId: {
      type: String,
    },
    amazonTitle: {
      type: String,
    },
    amazonCategory: {
      type: String,
    },
    fulfillmentType: {
      type: String,
      enum: ['FBA', 'MFN'],
      required: true,
      default: 'MFN',
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
    lastAmazonQuantity: {
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
AmazonProductMappingSchema.index({ amazonStoreId: 1, HelixSKU: 1 }, { unique: true });
AmazonProductMappingSchema.index({ amazonStoreId: 1, amazonASIN: 1 });
AmazonProductMappingSchema.index({ amazonStoreId: 1, amazonSKU: 1 });
AmazonProductMappingSchema.index({ companyId: 1, HelixSKU: 1 });
AmazonProductMappingSchema.index({ isActive: 1, syncInventory: 1 });
AmazonProductMappingSchema.index({ fulfillmentType: 1, isActive: 1 });

export default mongoose.model<IAmazonProductMapping>(
  'AmazonProductMapping',
  AmazonProductMappingSchema
);
