import mongoose, { Document, Schema } from 'mongoose';

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
      userIds: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      postalCodes: [String],
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
