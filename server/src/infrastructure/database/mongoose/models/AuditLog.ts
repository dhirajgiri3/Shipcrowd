import mongoose, { Document, Schema } from 'mongoose';

// Define the interface for AuditLog document
export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  action: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'verify' | 'generate' | 'other' | 'security' | 'password_change' | 'email_change' | 'account_lock' | 'account_unlock' | 'session_revoke' | 'profile_update';
  resource: string;
  resourceId?: mongoose.Types.ObjectId | string;
  details: {
    document?: any;
    before?: any;
    after?: any;
    changes?: any;
    message?: string;
    [key: string]: any;
  };
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  isDeleted: boolean;
}

// Create the AuditLog schema
const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
    },
    action: {
      type: String,
      enum: [
        'create', 'read', 'update', 'delete',
        'login', 'logout', 'verify', 'generate', 'other',
        'security', 'password_change', 'email_change',
        'account_lock', 'account_unlock', 'session_revoke', 'profile_update'
      ],
      required: true,
    },
    resource: {
      type: String,
      required: true,
    },
    resourceId: {
      type: Schema.Types.Mixed,
    },
    details: {
      document: Schema.Types.Mixed,
      before: Schema.Types.Mixed,
      after: Schema.Types.Mixed,
      changes: Schema.Types.Mixed,
      message: String,
    },
    ipAddress: String,
    userAgent: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: false, // We'll use the timestamp field instead
  }
);

// Create indexes
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ companyId: 1 });
AuditLogSchema.index({ resource: 1 });
AuditLogSchema.index({ resourceId: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ isDeleted: 1 });

// Create TTL index to automatically delete logs after 90 days
// This also serves as a regular index on timestamp
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Create and export the AuditLog model
const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLog;
