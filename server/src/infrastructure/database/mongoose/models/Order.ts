import mongoose, { Document, Schema } from 'mongoose';
import { arrayLimit } from '../../../../shared/utils/arrayValidators';

/**
 * CONCURRENCY WARNING:
 * 
 * This model is vulnerable to race conditions during concurrent status updates.
 * Multiple requests updating currentStatus simultaneously can overwrite each other.
 * 
 * Recommended fix (Phase 2 - Controller Refactoring):
 * - Add optimistic locking using version field (__v)
 * - Use findOneAndUpdate with version check instead of save()
 * 
 * Reference: docs/Backend-Fixes-Suggestions.md, Section 4 - Race Conditions
 */

// Define the interface for Order document
export interface IOrder extends Document {
  orderNumber: string;
  companyId: mongoose.Types.ObjectId;
  customerInfo: {
    name: string;
    email?: string;
    phone: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  };
  products: Array<{
    name: string;
    sku?: string;
    quantity: number;
    price: number;
    weight?: number;
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
    };
  }>;
  shippingDetails: {
    provider?: string;
    method?: string;
    trackingNumber?: string;
    estimatedDelivery?: Date;
    shippingCost: number;
  };
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: 'cod' | 'prepaid';
  source: 'manual' | 'shopify' | 'woocommerce' | 'flipkart' | 'amazon' | 'api';
  sourceId?: string;
  externalOrderNumber?: string; // Display order number from external platform (e.g., WooCommerce order #1234)
  warehouseId?: mongoose.Types.ObjectId;
  // E-commerce platform specific fields
  woocommerceStoreId?: mongoose.Types.ObjectId;
  woocommerceOrderId?: number;
  flipkartStoreId?: mongoose.Types.ObjectId;
  flipkartOrderId?: string;
  amazonStoreId?: mongoose.Types.ObjectId;
  amazonOrderId?: string;
  fulfillmentType?: 'FBA' | 'MFN' | null;
  statusHistory: Array<{
    status: string;
    timestamp: Date;
    comment?: string;
    updatedBy?: mongoose.Types.ObjectId;
  }>;
  currentStatus: string;
  totals: {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
  };
  notes?: string;
  tags?: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Order schema
const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true, // This creates an index automatically
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    customerInfo: {
      name: {
        type: String,
        required: true,
      },
      email: String,
      phone: {
        type: String,
        required: true,
      },
      address: {
        line1: {
          type: String,
          required: true,
        },
        line2: String,
        city: {
          type: String,
          required: true,
        },
        state: {
          type: String,
          required: true,
        },
        country: {
          type: String,
          required: true,
          default: 'India',
        },
        postalCode: {
          type: String,
          required: true,
        },
      },
    },
    products: {
      type: [
        {
          name: {
            type: String,
            required: true,
          },
          sku: String,
          quantity: {
            type: Number,
            required: true,
            min: 1,
          },
          price: {
            type: Number,
            required: true,
            min: 0,
          },
          weight: Number,
          dimensions: {
            length: Number,
            width: Number,
            height: Number,
          },
        },
      ],
      validate: [
        arrayLimit(200),
        'Maximum 200 products per order (prevents query timeout for bulk orders)',
      ],
    },
    shippingDetails: {
      provider: String,
      method: String,
      trackingNumber: String,
      estimatedDelivery: Date,
      shippingCost: {
        type: Number,
        default: 0,
      },
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['cod', 'prepaid'],
    },
    source: {
      type: String,
      enum: ['manual', 'shopify', 'woocommerce', 'flipkart', 'amazon', 'api'],
      default: 'manual',
    },
    sourceId: String,
    externalOrderNumber: String,
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    // E-commerce platform specific fields
    woocommerceStoreId: {
      type: Schema.Types.ObjectId,
      ref: 'WooCommerceStore',
    },
    woocommerceOrderId: Number,
    flipkartStoreId: {
      type: Schema.Types.ObjectId,
      ref: 'FlipkartStore',
    },
    flipkartOrderId: String,
    amazonStoreId: {
      type: Schema.Types.ObjectId,
      ref: 'AmazonStore',
    },
    amazonOrderId: String,
    fulfillmentType: {
      type: String,
      enum: ['FBA', 'MFN', null],
      default: null,
    },
    statusHistory: {
      type: [
        {
          status: {
            type: String,
            required: true,
          },
          timestamp: {
            type: Date,
            default: Date.now,
          },
          comment: String,
          updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
          },
        },
      ],
      validate: [
        arrayLimit(100),
        'Maximum 100 status entries (prevents memory exhaustion from status loops)',
      ],
    },
    currentStatus: {
      type: String,
      required: true,
      default: 'pending',
    },
    totals: {
      subtotal: {
        type: Number,
        required: true,
      },
      tax: {
        type: Number,
        default: 0,
      },
      shipping: {
        type: Number,
        default: 0,
      },
      discount: {
        type: Number,
        default: 0,
      },
      total: {
        type: Number,
        required: true,
      },
    },
    notes: String,
    tags: [String],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
// orderNumber index is already created by unique: true
OrderSchema.index({ companyId: 1 });
OrderSchema.index({ currentStatus: 1 });
OrderSchema.index({ 'customerInfo.phone': 1 });
OrderSchema.index({ 'customerInfo.address.postalCode': 1 });
OrderSchema.index({ isDeleted: 1 });

// Compound indexes for common query patterns
OrderSchema.index({ companyId: 1, createdAt: -1 }); // Orders page listing (most recent first)
OrderSchema.index({ companyId: 1, currentStatus: 1, createdAt: -1 }); // Status filtering with date sort
OrderSchema.index({ companyId: 1, paymentStatus: 1 }); // Payment status filtering
OrderSchema.index({ companyId: 1, paymentMethod: 1 }); // COD vs Prepaid filtering

// E-commerce integration indexes
OrderSchema.index({ source: 1, sourceId: 1, companyId: 1 }, { unique: true, sparse: true }); // Shopify order lookup and duplicate prevention
OrderSchema.index({ companyId: 1, flipkartOrderId: 1 }, { sparse: true, unique: true }); // Flipkart order lookup and duplicate prevention
OrderSchema.index({ flipkartStoreId: 1, currentStatus: 1 }); // Flipkart store filtering with status
OrderSchema.index({ companyId: 1, amazonOrderId: 1 }, { sparse: true, unique: true }); // Amazon order lookup and duplicate prevention
OrderSchema.index({ amazonStoreId: 1, currentStatus: 1 }); // Amazon store filtering with status
OrderSchema.index({ fulfillmentType: 1 }); // For FBA/MFN filtering

// Pre-save hook to ensure the first status is added to history
OrderSchema.pre('save', function (next) {
  const order = this;

  // If this is a new order, add the initial status to the history
  if (order.isNew && order.statusHistory.length === 0) {
    order.statusHistory.push({
      status: order.currentStatus,
      timestamp: new Date(),
    });
  }

  next();
});

// Create and export the Order model
const Order = mongoose.model<IOrder>('Order', OrderSchema);
export default Order;
