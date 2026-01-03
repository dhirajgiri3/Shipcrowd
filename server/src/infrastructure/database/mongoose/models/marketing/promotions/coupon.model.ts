import mongoose, { Document, Schema } from 'mongoose';
import { arrayLimit } from '../../../../../../shared/utils/arrayValidators';

// Define the interface for Coupon document
export interface ICoupon extends Document {
  code: string;
  companyId: mongoose.Types.ObjectId;
  discount: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  validFrom: Date;
  validUntil: Date;
  restrictions: {
    minOrderValue?: number;
    maxDiscount?: number;
    carriers?: string[];
    serviceTypes?: string[];
    usageLimit?: number;
    usageCount?: number;
    userIds?: mongoose.Types.ObjectId[];
    postalCodes?: string[];
  };
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * CRITICAL RACE CONDITION WARNING:
 * 
 * The usageCount field has a race condition when incremented in controllers.
 * This can cause revenue loss by allowing more redemptions than usageLimit.
 * 
 * Unsafe pattern (DO NOT USE):
 *   const coupon = await Coupon.findOne({ code });
 *   if (coupon.usageCount >= coupon.usageLimit) throw new Error('Fully used');
 *   coupon.usageCount += 1;
 *   await coupon.save();
 * 
 * Safe pattern (USE THIS in controllers):
 *   const result = await Coupon.findOneAndUpdate(
 *     { code, usageCount: { $lt: usageLimit } },  // atomic check
 *     { $inc: { usageCount: 1 } },                // atomic increment
 *     { new: true }
 *   );
 *   if (!result) throw new Error('Coupon fully used or invalid');
 * 
 * Reference: docs/Backend-Fixes-Suggestions.md, Section 4 - Race Conditions
 */

// Create the Coupon schema
const CouponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    discount: {
      type: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true,
      },
      value: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    validFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    restrictions: {
      minOrderValue: {
        type: Number,
        min: 0,
      },
      maxDiscount: {
        type: Number,
        min: 0,
      },
      carriers: [String],
      serviceTypes: [String],
      usageLimit: {
        type: Number,
        min: 0,
      },
      usageCount: {
        type: Number,
        default: 0,
        min: 0,
      },
      userIds: {
        type: [
          {
            type: Schema.Types.ObjectId,
            ref: 'User',
          },
        ],
        validate: [
          arrayLimit(10000),
          'Maximum 10,000 users per coupon (prevents 16MB document limit breach)',
        ],
      },
      postalCodes: {
        type: [String],
        validate: [
          arrayLimit(10000),
          'Maximum 10,000 postal codes per coupon (prevents 16MB document limit breach)',
        ],
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
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
// code index is already created by unique: true
CouponSchema.index({ companyId: 1 });
CouponSchema.index({ validUntil: 1 });
CouponSchema.index({ isActive: 1 });
CouponSchema.index({ isDeleted: 1 });

// Create and export the Coupon model
const Coupon = mongoose.model<ICoupon>('Coupon', CouponSchema);
export default Coupon;
