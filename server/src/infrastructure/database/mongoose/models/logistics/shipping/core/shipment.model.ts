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

    // ✅ NEW: COD Remittance Fields
    codCharges?: number;
    totalCollection?: number;
    collectionStatus?: 'pending' | 'collected' | 'reconciled' | 'remitted' | 'disputed' | 'lost';
    actualCollection?: number;
    collectedAt?: Date;
    collectedBy?: string;
    collectionMethod?: 'cash' | 'card' | 'upi' | 'wallet';

    pod?: {
      photo?: string;
      signature?: string;
      customerName?: string;
      timestamp?: Date;
      gpsLocation?: {
        latitude: number;
        longitude: number;
      };
    };

    fraud?: {
      riskScore?: number;
      riskLevel?: 'low' | 'medium' | 'high' | 'critical';
      flags?: string[];
      verificationMethod?: string;
      verifiedAt?: Date;
      blacklisted?: boolean;
    };

    reconciled?: boolean;
    reconciledAt?: Date;
    reconciledBy?: string;
    variance?: number;
    varianceReason?: string;
    discrepancyId?: mongoose.Types.ObjectId;

    timeline?: Array<{
      status: string;
      timestamp: Date;
      source: string;
      notes: string;
      updatedBy?: string;
    }>;

    remittance?: {
      included: boolean;
      remittanceId?: string; // string mainly, or ObjectId ref if we change
      status?: string;
      remittedAt?: Date;
      remittedAmount?: number;
    };
  };
  pricingDetails?: {
    selectedQuote?: {
      quoteSessionId?: mongoose.Types.ObjectId;
      optionId?: string;
      provider?: string;
      serviceId?: mongoose.Types.ObjectId;
      serviceName?: string;
      quotedSellAmount?: number;
      expectedCostAmount?: number;
      expectedMarginAmount?: number;
      expectedMarginPercent?: number;
      chargeableWeight?: number;
      zone?: string;
      pricingSource?: 'live' | 'table' | 'hybrid';
      confidence?: 'high' | 'medium' | 'low';
      calculatedAt?: Date;
      sellBreakdown?: {
        baseCharge?: number;
        weightCharge?: number;
        zoneCharge?: number;
        codCharge?: number;
        fuelSurcharge?: number;
        discount?: number;
        subtotal?: number;
        gst?: number;
        total?: number;
      };
      costBreakdown?: {
        baseCharge?: number;
        weightCharge?: number;
        zoneCharge?: number;
        codCharge?: number;
        fuelSurcharge?: number;
        rtoCharge?: number;
        subtotal?: number;
        gst?: number;
        total?: number;
      };
    };
    rateCardId: mongoose.Types.ObjectId;
    rateCardName: string;
    baseRate: number;
    weightCharge: number;
    zoneCharge: number;
    zone: string;
    customerDiscount: number;
    subtotal: number;
    codCharge: number;
    gstAmount: number;
    totalPrice: number;
    calculatedAt: Date;
    calculationMethod: 'ratecard' | 'fallback' | 'override';
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
    type: 'label' | 'invoice' | 'manifest' | 'pod';
    url: string;
    createdAt: Date;
  }>;
  carrierDetails: {
    carrierTrackingNumber?: string;
    carrierServiceType?: string;
    carrierAccount?: string;
    manifestId?: string;
    providerShipmentId?: string;
    retryCount?: number; // Tracks carrier sync retry attempts
    lastRetryAttempt?: Date; // Timestamp of last retry attempt
    // Velocity-specific fields
    velocityOrderId?: string;
    velocityShipmentId?: string;
    zone?: string;
    routingCode?: string;
    rtoRoutingCode?: string;
    pickupTokenNumber?: string;
    appliedWeight?: number;
    deadWeightBilling?: boolean;
    manifestUrl?: string;
    // Charges breakdown from Velocity
    charges?: {
      forwardShippingCharges?: number;
      forwardCodCharges?: number;
      rtoCharges?: number;
      reverseCharges?: number;
      qcCharges?: number;
      platformFee?: number;
    };
    courierAssignedAt?: Date;
    pickupScheduledDate?: Date;
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
      source?: 'manual' | 'sku_master' | 'api' | 'packing_station'; // ✅ NEW: Track weight source
    };
    actual?: {
      value: number; // Updated from carrier webhook
      unit: 'kg' | 'g';
      scannedAt?: Date;
      scannedBy?: string; // 'Bluedart', 'Delhivery', etc.
      scannedLocation?: string; // ✅ NEW: Hub location where weight was scanned
      dimensions?: { // ✅ NEW: Actual dimensions from carrier DWS scan
        length: number;
        width: number;
        height: number;
      };
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

  // Packing Station Evidence (Week 2 Feature)
  packingEvidence?: {
    photos: string[]; // S3/local URLs of weight scale photos
    weightKg: number; // Weight captured at packing station
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    capturedAt: Date;
    capturedBy: string; // User ID or station ID
    location?: string; // Warehouse/station identifier
    notes?: string;
  };

  // COD Remittance Tracking
  remittance?: {
    included: boolean; // True if included in a remittance batch
    remittanceId?: string; // Remittance batch ID
    remittedAt?: Date;
    remittedAmount?: number; // Net amount after deductions
    platformFee?: number; // Fee deducted by platform
  };

  // Wallet Transaction Reference
  walletTransactionId?: mongoose.Types.ObjectId;

  isDeleted: boolean;
  isDemoData?: boolean;
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

      // ✅ ENHANCED: Week 12 - Advanced COD Tracking (Phase 1)
      codCharges: Number, // Courier COD handling fee
      totalCollection: Number, // codAmount + codCharges

      collectionStatus: {
        type: String,
        enum: ['pending', 'collected', 'reconciled', 'remitted', 'disputed', 'lost'],
        default: 'pending',
      },

      actualCollection: Number, // What courier actually collected
      collectedAt: Date,
      collectedBy: String, // Courier agent ID
      collectionMethod: {
        type: String,
        enum: ['cash', 'card', 'upi', 'wallet'],
        default: 'cash',
      },

      // ✅ NEW: POD data
      pod: {
        photo: String, // S3 URL
        signature: String,
        customerName: String,
        timestamp: Date,
        gpsLocation: {
          latitude: Number,
          longitude: Number,
        },
      },

      // ✅ NEW: Fraud & Risk Assessment (Persisted from FraudDetectionService)
      fraud: {
        riskScore: Number, // 0-100
        riskLevel: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
        },
        flags: [String],
        verificationMethod: String, // 'otp', 'call', etc.
        verifiedAt: Date,
        blacklisted: Boolean,
      },

      // ✅ NEW: Reconciliation tracking
      reconciled: {
        type: Boolean,
        default: false,
      },
      reconciledAt: Date,
      reconciledBy: String,
      variance: Number, // actualCollection - totalCollection
      varianceReason: String,
      discrepancyId: {
        type: Schema.Types.ObjectId,
        ref: 'CODDiscrepancy',
      },

      // ✅ NEW: Timeline for payment lifecycle
      timeline: [
        {
          status: String,
          timestamp: Date,
          source: String, // 'webhook', 'api', 'mis', 'manual'
          notes: String,
          updatedBy: String,
        },
      ],
    },
    pricingDetails: {
      selectedQuote: {
        quoteSessionId: {
          type: Schema.Types.ObjectId,
          ref: 'QuoteSession',
        },
        optionId: String,
        provider: String,
        serviceId: {
          type: Schema.Types.ObjectId,
          ref: 'CourierService',
        },
        serviceName: String,
        quotedSellAmount: Number,
        expectedCostAmount: Number,
        expectedMarginAmount: Number,
        expectedMarginPercent: Number,
        chargeableWeight: Number,
        zone: String,
        pricingSource: {
          type: String,
          enum: ['live', 'table', 'hybrid'],
        },
        confidence: {
          type: String,
          enum: ['high', 'medium', 'low'],
        },
        calculatedAt: Date,
        sellBreakdown: {
          baseCharge: Number,
          weightCharge: Number,
          zoneCharge: Number,
          codCharge: Number,
          fuelSurcharge: Number,
          discount: Number,
          subtotal: Number,
          gst: Number,
          total: Number,
        },
        costBreakdown: {
          baseCharge: Number,
          weightCharge: Number,
          zoneCharge: Number,
          codCharge: Number,
          fuelSurcharge: Number,
          rtoCharge: Number,
          subtotal: Number,
          gst: Number,
          total: Number,
        },
      },
      rateCardId: {
        type: Schema.Types.ObjectId,
        ref: 'RateCard',
      },
      rateCardName: String,
      baseRate: Number,
      weightCharge: Number,
      zoneCharge: Number,
      zone: String,
      customerDiscount: Number,
      subtotal: Number,
      codCharge: Number,
      gstAmount: Number,
      totalPrice: Number,
      calculatedAt: Date,
      calculationMethod: {
        type: String,
        enum: ['ratecard', 'fallback', 'override'],
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
            enum: ['label', 'invoice', 'manifest', 'pod'],
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
      providerShipmentId: String,
      retryCount: {
        type: Number,
        default: 0,
      },
      lastRetryAttempt: Date,
      // Velocity-specific fields
      velocityOrderId: String,
      velocityShipmentId: String,
      zone: String,
      routingCode: String,
      rtoRoutingCode: String,
      pickupTokenNumber: String,
      appliedWeight: Number,
      deadWeightBilling: Boolean,
      manifestUrl: String,
      // Charges breakdown from Velocity
      charges: {
        forwardShippingCharges: Number,
        forwardCodCharges: Number,
        rtoCharges: Number,
        reverseCharges: Number,
        qcCharges: Number,
        platformFee: Number,
      },
      courierAssignedAt: Date,
      pickupScheduledDate: Date,
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
        source: { // ✅ NEW FIELD 1
          type: String,
          enum: ['manual', 'sku_master', 'api', 'packing_station'],
          default: 'manual',
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
        scannedLocation: String, // ✅ NEW FIELD 2
        dimensions: { // ✅ NEW FIELD 3
          length: Number,
          width: Number,
          height: Number,
        },
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

    // Packing Station Evidence (Week 2 Feature)
    packingEvidence: {
      photos: [{ type: String }],
      weightKg: Number,
      dimensions: {
        length: Number,
        width: Number,
        height: Number,
      },
      capturedAt: Date,
      capturedBy: String,
      location: String,
      notes: String,
    },
    remittance: {
      included: {
        type: Boolean,
        default: false,
      },
      remittanceId: String,
      remittedAt: Date,
      remittedAmount: Number,
      platformFee: Number, // Added missing field
    },
    walletTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'WalletTransaction',
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isDemoData: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true, // Auto-increment version key (__v) on updates to prevent race conditions
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
ShipmentSchema.index({ 'remittance.included': 1, 'paymentDetails.type': 1, currentStatus: 1 }); // Eligible COD shipments for remittance
ShipmentSchema.index({ companyId: 1, 'remittance.included': 1, 'remittance.remittanceId': 1 }); // Remittance batch tracking
ShipmentSchema.index({ 'pricingDetails.selectedQuote.quoteSessionId': 1 }); // Quote-session traceability

// Week 12: Advanced COD Indexes (Phase 1)
ShipmentSchema.index({ 'paymentDetails.collectionStatus': 1, companyId: 1 }); // Track pending collections
ShipmentSchema.index({ 'paymentDetails.reconciled': 1, 'paymentDetails.type': 1 }); // Unreconciled COD shipments
ShipmentSchema.index({ 'paymentDetails.fraud.riskLevel': 1, createdAt: -1 }); // High risk shipment monitoring


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
