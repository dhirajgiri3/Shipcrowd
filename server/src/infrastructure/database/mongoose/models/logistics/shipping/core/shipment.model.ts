import mongoose, { Document, Schema } from 'mongoose';
import { arrayLimit } from '../../../../../../../shared/utils/arrayValidators';

/**
 * CONCURRENCY WARNING:
 * 
 * This model is vulnerable to race conditions during concurrent status updates.
 * Carrier webhooks firing simultaneously can overwrite each other's updates.
 * 
 * Recommended fix (Phase 2 - Controller Refactoring):
 * - Add optimistic locking using version field (__v)
 * - Use findOneAndUpdate with version check instead of save()
 * 
 * Reference: docs/Backend-Fixes-Suggestions.md, Section 4 - Race Conditions
 */

// Define the interface for Shipment document
export interface IShipment extends Document {
  trackingNumber: string;
  orderId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  carrier: string;
  serviceType: string;
  packageDetails: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    packageCount: number;
    packageType: string;
    declaredValue: number;
  };
  pickupDetails?: {
    warehouseId: mongoose.Types.ObjectId;
    pickupDate: Date;
    pickupReference?: string;
    contactPerson: string;
    contactPhone: string;
  };
  deliveryDetails: {
    recipientName: string;
    recipientPhone: string;
    recipientEmail?: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
    instructions?: string;
  };
  paymentDetails: {
    type: 'prepaid' | 'cod';
    codAmount?: number;
    shippingCost: number;
    currency: string;
  };
  statusHistory: Array<{
    status: string;
    timestamp: Date;
    location?: string;
    description?: string;
    updatedBy?: mongoose.Types.ObjectId;
  }>;
  currentStatus: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  documents: Array<{
    type: 'label' | 'invoice' | 'manifest';
    url: string;
    createdAt: Date;
  }>;
  carrierDetails: {
    carrierTrackingNumber?: string;
    carrierServiceType?: string;
    carrierAccount?: string;
    manifestId?: string;
  };
  ndrDetails?: {
    ndrReason?: string;
    ndrDate?: Date;
    ndrStatus?: 'pending' | 'reattempt' | 'return_initiated' | 'returned' | 'resolved';
    ndrAttempts?: number;
    ndrResolutionDate?: Date;
    ndrComments?: string;
  };
  rtoDetails?: {
    rtoInitiatedDate?: Date;
    rtoReason?: string;
    rtoExpectedDate?: Date;
    rtoActualDate?: Date;
    rtoStatus?: 'initiated' | 'in_transit' | 'delivered_to_warehouse' | 'qc_pending' | 'qc_completed' | 'restocked' | 'disposed';
    rtoTrackingNumber?: string;
    rtoShippingCost?: number;
    qcPassed?: boolean;
  };

  // Weight Tracking & Verification (Week 11 Enhancement)
  weights: {
    declared: {
      value: number; // Matches packageDetails.weight
      unit: 'kg' | 'g';
    };
    actual?: {
      value: number; // Updated from carrier webhook
      unit: 'kg' | 'g';
      scannedAt?: Date;
      scannedBy?: string; // 'Bluedart', 'Delhivery', etc.
    };
    verified: boolean; // True when actual weight is recorded
  };

  // Weight Dispute Tracking (Week 11 Enhancement)
  weightDispute?: {
    exists: boolean;
    disputeId?: mongoose.Types.ObjectId;
    status?: 'pending' | 'under_review' | 'resolved';
    detectedAt?: Date;
    financialImpact?: number; // Quick reference to dispute amount
  };

  // COD Remittance Tracking (Week 11 Enhancement)
  remittanceStatus?: {
    eligible: boolean; // True if delivered + hold period elapsed
    eligibleDate?: Date; // When it becomes eligible
    remittanceId?: mongoose.Types.ObjectId; // If included in a remittance batch
    remittedAt?: Date;
    remittedAmount?: number; // Net amount after deductions
  };

  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Shipment schema
const ShipmentSchema = new Schema<IShipment>(
  {
    trackingNumber: {
      type: String,
      required: true,
      unique: true, // This creates an index automatically
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    carrier: {
      type: String,
      required: true,
    },
    serviceType: {
      type: String,
      required: true,
    },
    packageDetails: {
      weight: {
        type: Number,
        required: true,
      },
      dimensions: {
        length: {
          type: Number,
          required: true,
        },
        width: {
          type: Number,
          required: true,
        },
        height: {
          type: Number,
          required: true,
        },
      },
      packageCount: {
        type: Number,
        default: 1,
      },
      packageType: {
        type: String,
        required: true,
      },
      declaredValue: {
        type: Number,
        required: true,
      },
    },
    pickupDetails: {
      warehouseId: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
      },
      pickupDate: Date,
      pickupReference: String,
      contactPerson: String,
      contactPhone: String,
    },
    deliveryDetails: {
      recipientName: {
        type: String,
        required: true,
      },
      recipientPhone: {
        type: String,
        required: true,
      },
      recipientEmail: String,
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
      instructions: String,
    },
    paymentDetails: {
      type: {
        type: String,
        enum: ['prepaid', 'cod'],
        required: true,
      },
      codAmount: Number,
      shippingCost: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        default: 'INR',
      },
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
          location: String,
          description: String,
          updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
          },
        },
      ],
      validate: [
        arrayLimit(100),
        'Maximum 100 status entries (prevents memory exhaustion from webhook storms)',
      ],
    },
    currentStatus: {
      type: String,
      required: true,
      default: 'created',
    },
    estimatedDelivery: Date,
    actualDelivery: Date,
    documents: {
      type: [
        {
          type: {
            type: String,
            enum: ['label', 'invoice', 'manifest'],
            required: true,
          },
          url: {
            type: String,
            required: true,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      validate: [
        arrayLimit(50),
        'Maximum 50 documents per shipment (prevents performance degradation)',
      ],
    },
    carrierDetails: {
      carrierTrackingNumber: String,
      carrierServiceType: String,
      carrierAccount: String,
      manifestId: String,
    },
    ndrDetails: {
      ndrReason: String,
      ndrDate: Date,
      ndrStatus: {
        type: String,
        enum: ['pending', 'reattempt', 'return_initiated', 'returned', 'resolved'],
      },
      ndrAttempts: {
        type: Number,
        default: 0,
      },
      ndrResolutionDate: Date,
      ndrComments: String,
    },
    rtoDetails: {
      rtoInitiatedDate: Date,
      rtoReason: String,
      rtoExpectedDate: Date,
      rtoActualDate: Date,
      rtoStatus: {
        type: String,
        enum: ['initiated', 'in_transit', 'delivered_to_warehouse', 'qc_pending', 'qc_completed', 'restocked', 'disposed'],
      },
      rtoTrackingNumber: String,
      rtoShippingCost: Number,
      qcPassed: Boolean,
    },
    weights: {
      declared: {
        value: {
          type: Number,
          required: true,
        },
        unit: {
          type: String,
          enum: ['kg', 'g'],
          default: 'kg',
        },
      },
      actual: {
        value: Number,
        unit: {
          type: String,
          enum: ['kg', 'g'],
        },
        scannedAt: Date,
        scannedBy: String,
      },
      verified: {
        type: Boolean,
        default: false,
      },
    },
    weightDispute: {
      exists: {
        type: Boolean,
        default: false,
      },
      disputeId: {
        type: Schema.Types.ObjectId,
        ref: 'WeightDispute',
      },
      status: {
        type: String,
        enum: ['pending', 'under_review', 'resolved'],
      },
      detectedAt: Date,
      financialImpact: Number,
    },
    remittanceStatus: {
      eligible: {
        type: Boolean,
        default: false,
      },
      eligibleDate: Date,
      remittanceId: {
        type: Schema.Types.ObjectId,
        ref: 'CODRemittance',
      },
      remittedAt: Date,
      remittedAmount: Number,
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
// trackingNumber index is already created by unique: true
ShipmentSchema.index({ companyId: 1 });
ShipmentSchema.index({ orderId: 1 });
ShipmentSchema.index({ currentStatus: 1 });
ShipmentSchema.index({ 'carrierDetails.carrierTrackingNumber': 1 });
ShipmentSchema.index({ 'deliveryDetails.address.postalCode': 1 });
ShipmentSchema.index({ isDeleted: 1 });
ShipmentSchema.index({ 'ndrDetails.ndrStatus': 1 });

// Compound indexes for common query patterns
ShipmentSchema.index({ companyId: 1, createdAt: -1 }); // Shipments page listing (most recent first)
ShipmentSchema.index({ companyId: 1, currentStatus: 1, createdAt: -1 }); // Status filtering with date sort
ShipmentSchema.index({ companyId: 1, carrier: 1 }); // Carrier filtering
ShipmentSchema.index({ 'ndrDetails.ndrStatus': 1, companyId: 1 }); // NDR management dashboard
ShipmentSchema.index({ companyId: 1, 'paymentDetails.type': 1 }); // COD vs Prepaid filtering

// Analytics indexes (Week 9)
ShipmentSchema.index({ companyId: 1, currentStatus: 1, actualDelivery: -1 }); // Delivery time analytics for completed shipments
ShipmentSchema.index({ companyId: 1, carrier: 1, createdAt: -1 }); // Carrier performance analytics over time

// Week 11: Weight Dispute & Remittance indexes
ShipmentSchema.index({ 'weights.verified': 1, createdAt: -1 }); // Unverified weights scan
ShipmentSchema.index({ 'weightDispute.exists': 1, 'weightDispute.status': 1 }); // Active disputes
ShipmentSchema.index({ 'remittanceStatus.eligible': 1, 'paymentDetails.type': 1 }); // Eligible COD shipments
ShipmentSchema.index({ companyId: 1, 'remittanceStatus.eligible': 1, 'remittanceStatus.remittanceId': 1 }); // Remittance batch creation

// Pre-save hook to ensure the first status is added to history
ShipmentSchema.pre('save', function (next) {
  const shipment = this;

  // If this is a new shipment, add the initial status to the history
  if (shipment.isNew && shipment.statusHistory.length === 0) {
    shipment.statusHistory.push({
      status: shipment.currentStatus,
      timestamp: new Date(),
    });
  }

  // Week 11: Initialize weights.declared from packageDetails.weight (for new shipments)
  if (shipment.isNew && !shipment.weights) {
    shipment.weights = {
      declared: {
        value: shipment.packageDetails.weight,
        unit: 'kg', // Assuming packageDetails.weight is in kg
      },
      verified: false,
    };
  }

  next();
});

// Create and export the Shipment model
const Shipment = mongoose.model<IShipment>('Shipment', ShipmentSchema);
export default Shipment;
