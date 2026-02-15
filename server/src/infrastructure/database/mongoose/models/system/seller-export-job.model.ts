import mongoose, { Schema } from 'mongoose';
import type { SellerExportModule } from '../../../../../core/application/services/export/seller-export.service';

export interface ISellerExportJob {
  companyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  module: SellerExportModule;
  filters: Record<string, unknown>;
  canViewPii: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  progress: number;
  estimatedRowCount: number;
  rowCount: number;
  filename?: string;
  filePath?: string;
  fileSize?: number;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SellerExportJobSchema = new Schema<ISellerExportJob>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    module: {
      type: String,
      required: true,
      enum: [
        'orders',
        'shipments',
        'cod_remittance_pending',
        'cod_remittance_history',
        'wallet_transactions',
        'returns',
        'ndr',
        'rto',
        'cod_discrepancies',
        'audit_logs',
        'analytics_dashboard',
        'pincode_checker',
        'bulk_address_validation',
      ],
    },
    filters: { type: Schema.Types.Mixed, default: {} },
    canViewPii: { type: Boolean, required: true, default: false },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'completed', 'failed', 'expired'],
      default: 'pending',
      index: true,
    },
    progress: { type: Number, required: true, default: 0, min: 0, max: 100 },
    estimatedRowCount: { type: Number, required: true, default: 0 },
    rowCount: { type: Number, required: true, default: 0 },
    filename: { type: String },
    filePath: { type: String },
    fileSize: { type: Number },
    errorMessage: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
    expiresAt: { type: Date, index: true },
  },
  {
    timestamps: true,
    collection: 'seller_export_jobs',
  }
);

SellerExportJobSchema.index({ companyId: 1, createdAt: -1 });
SellerExportJobSchema.index({ companyId: 1, status: 1, createdAt: -1 });

export const SellerExportJob = mongoose.model<ISellerExportJob>('SellerExportJob', SellerExportJobSchema);
