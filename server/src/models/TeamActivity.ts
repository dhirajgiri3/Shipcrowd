import mongoose, { Document, Schema } from 'mongoose';

// Define the interface for TeamActivity document
export interface ITeamActivity extends Document {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  action: string;
  module: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Create the TeamActivity schema
const TeamActivitySchema = new Schema<ITeamActivity>(
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
    action: {
      type: String,
      required: true,
      enum: ['login', 'logout', 'view', 'create', 'update', 'delete', 'export', 'import', 'other'],
    },
    module: {
      type: String,
      required: true,
      enum: ['orders', 'products', 'warehouses', 'customers', 'team', 'reports', 'settings', 'system'],
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// Create indexes
TeamActivitySchema.index({ userId: 1 });
TeamActivitySchema.index({ companyId: 1 });
TeamActivitySchema.index({ createdAt: 1 });
TeamActivitySchema.index({ action: 1 });
TeamActivitySchema.index({ module: 1 });

// Create and export the TeamActivity model
const TeamActivity = mongoose.model<ITeamActivity>('TeamActivity', TeamActivitySchema);
export default TeamActivity;
