import mongoose, { Document, Schema } from 'mongoose';

export interface IKYCVerificationAttempt extends Document {
  userId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  documentType: 'pan' | 'aadhaar' | 'gstin' | 'bankAccount';
  provider: string;
  status: 'success' | 'soft_failed' | 'hard_failed' | 'error';
  attemptId: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const KYCVerificationAttemptSchema = new Schema<IKYCVerificationAttempt>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    documentType: {
      type: String,
      enum: ['pan', 'aadhaar', 'gstin', 'bankAccount'],
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      default: 'deepvue',
    },
    status: {
      type: String,
      enum: ['success', 'soft_failed', 'hard_failed', 'error'],
      required: true,
      index: true,
    },
    attemptId: {
      type: String,
      required: true,
      index: true,
    },
    errorCode: String,
    errorMessage: String,
    metadata: Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

KYCVerificationAttemptSchema.index({ userId: 1, documentType: 1, createdAt: -1 });
KYCVerificationAttemptSchema.index({ companyId: 1, createdAt: -1 });

const KYCVerificationAttempt = mongoose.model<IKYCVerificationAttempt>(
  'KYCVerificationAttempt',
  KYCVerificationAttemptSchema
);

export default KYCVerificationAttempt;
