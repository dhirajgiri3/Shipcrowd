import mongoose, { Document, Schema } from 'mongoose';

// Define the interface for KYC document
export interface IKYC extends Document {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  status: 'pending' | 'verified' | 'rejected';
  documents: {
    pan?: {
      number: string;
      image: string;
      verified: boolean;
      verifiedAt?: Date;
      verificationData?: any; // Store API response
      name?: string; // Name as per PAN
    };
    aadhaar?: {
      number: string;
      frontImage: string;
      backImage: string;
      verified: boolean;
      verifiedAt?: Date;
      verificationData?: any; // Store API response
    };
    gstin?: {
      number: string;
      verified: boolean;
      verifiedAt?: Date;
      verificationData?: any; // Store API response
      businessName?: string; // Business name as per GSTIN
      legalName?: string; // Legal name of the business
      status?: string; // Active, Inactive, etc.
      registrationType?: string; // Regular, Composition, etc.
      businessType?: string[]; // Array of business types
      addresses?: {
        type: string; // Principal, Additional, etc.
        address: string; // Formatted address
        businessNature?: string; // Nature of business at this address
      }[];
      registrationDate?: string; // Date of GST registration
      lastUpdated?: string; // Last updated date in GST records
    };
    bankAccount?: {
      accountNumber: string;
      ifscCode: string;
      accountHolderName: string;
      bankName: string;
      verified: boolean;
      verifiedAt?: Date;
      proofImage?: string;
      verificationData?: any; // Store API response
    };
  };
  completionStatus: {
    personalKycComplete: boolean;
    companyInfoComplete: boolean;
    bankDetailsComplete: boolean;
    agreementComplete: boolean;
  };
  verificationNotes?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create the KYC schema
const KYCSchema = new Schema<IKYC>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    documents: {
      pan: {
        number: String,
        image: String,
        verified: {
          type: Boolean,
          default: false,
        },
        verifiedAt: Date,
        verificationData: mongoose.Schema.Types.Mixed,
        name: String,
      },
      aadhaar: {
        number: String,
        frontImage: String,
        backImage: String,
        verified: {
          type: Boolean,
          default: false,
        },
        verifiedAt: Date,
        verificationData: mongoose.Schema.Types.Mixed,
      },
      gstin: {
        number: String,
        verified: {
          type: Boolean,
          default: false,
        },
        verifiedAt: Date,
        verificationData: mongoose.Schema.Types.Mixed,
        businessName: String,
        legalName: String,
        status: String,
        registrationType: String,
        businessType: [String],
        addresses: [{
          type: {
            type: String
          },
          address: {
            type: String
          },
          businessNature: {
            type: String
          }
        }],
        registrationDate: String,
        lastUpdated: String,
      },
      bankAccount: {
        accountNumber: String,
        ifscCode: String,
        accountHolderName: String,
        bankName: String,
        verified: {
          type: Boolean,
          default: false,
        },
        verifiedAt: Date,
        proofImage: String,
        verificationData: mongoose.Schema.Types.Mixed,
      },
    },
    completionStatus: {
      personalKycComplete: {
        type: Boolean,
        default: false,
      },
      companyInfoComplete: {
        type: Boolean,
        default: false,
      },
      bankDetailsComplete: {
        type: Boolean,
        default: false,
      },
      agreementComplete: {
        type: Boolean,
        default: false,
      },
    },
    verificationNotes: String,
    rejectionReason: String,
  },
  {
    timestamps: true,
  }
);

// Create indexes
KYCSchema.index({ userId: 1 }, { unique: true }); // One KYC per user
KYCSchema.index({ companyId: 1 });
KYCSchema.index({ status: 1 });
KYCSchema.index({ 'documents.pan.number': 1 });
KYCSchema.index({ 'documents.aadhaar.number': 1 });
KYCSchema.index({ 'documents.gstin.number': 1 });

// Compound indexes for common query patterns
KYCSchema.index({ companyId: 1, status: 1 }); // Admin KYC filtering

// Create and export the KYC model
const KYC = mongoose.model<IKYC>('KYC', KYCSchema);
export default KYC;
