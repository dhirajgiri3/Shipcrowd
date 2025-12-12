import mongoose, { Document, Schema } from 'mongoose';

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
    statusHistory: [
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
    currentStatus: {
      type: String,
      required: true,
      default: 'created',
    },
    estimatedDelivery: Date,
    actualDelivery: Date,
    documents: [
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

  next();
});

// Create and export the Shipment model
const Shipment = mongoose.model<IShipment>('Shipment', ShipmentSchema);
export default Shipment;
