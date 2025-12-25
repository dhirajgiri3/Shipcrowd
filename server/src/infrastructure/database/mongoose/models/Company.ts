import mongoose, { Document, Schema } from 'mongoose';

// Define the interface for Company document
export interface ICompany extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  billingInfo: {
    gstin?: string;
    pan?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
  };
  branding: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    emailTemplate?: string;
  };
  integrations: {
    shopify?: {
      shopDomain?: string;
      accessToken?: string;
      scope?: string;
      lastSyncAt?: Date;
    };
    woocommerce?: {
      siteUrl?: string;
      consumerKey?: string;
      consumerSecret?: string;
      lastSyncAt?: Date;
    };
  };
  settings: {
    defaultWarehouseId?: mongoose.Types.ObjectId;
    defaultRateCardId?: mongoose.Types.ObjectId;
    notificationEmail?: string;
    notificationPhone?: string;
    autoGenerateInvoice?: boolean;
  };

  status: 'pending_verification' | 'kyc_submitted' | 'approved' | 'suspended' | 'rejected';
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Company schema
const CompanySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true, // This creates an index automatically
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
    billingInfo: {
      gstin: String,
      pan: String,
      bankName: String,
      accountNumber: String,
      ifscCode: String,
      upiId: String,
    },
    branding: {
      logo: String,
      primaryColor: String,
      secondaryColor: String,
      emailTemplate: String,
    },
    integrations: {
      shopify: {
        shopDomain: String,
        accessToken: String,
        scope: String,
        lastSyncAt: Date,
      },
      woocommerce: {
        siteUrl: String,
        consumerKey: String,
        consumerSecret: String,
        lastSyncAt: Date,
      },
    },
    settings: {
      defaultWarehouseId: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
      },
      defaultRateCardId: {
        type: Schema.Types.ObjectId,
        ref: 'RateCard',
      },
      notificationEmail: String,
      notificationPhone: String,
      autoGenerateInvoice: {
        type: Boolean,
        default: true,
      },
    },

    status: {
      type: String,
      enum: ['pending_verification', 'kyc_submitted', 'approved', 'suspended', 'rejected'],
      default: 'pending_verification',
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
// Name index is already created by unique: true
CompanySchema.index({ isDeleted: 1 });
CompanySchema.index({ 'address.postalCode': 1 });
CompanySchema.index({ status: 1 }); // Missing index for admin queries filtering by company status

// Create and export the Company model
const Company = mongoose.model<ICompany>('Company', CompanySchema);
export default Company;
