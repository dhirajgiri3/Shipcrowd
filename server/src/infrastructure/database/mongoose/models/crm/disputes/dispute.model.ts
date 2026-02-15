import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * Dispute Model (Phase 5)
 *
 * Handles serious issues (damaged, lost, delayed).
 * Auto-created when support tickets can't resolve issues.
 * Tracks escalation workflow: investigation → decision → resolution.
 */

export type DisputeType = 'damaged-goods' | 'lost-shipment' | 'delayed-delivery' | 'quality-issue';
export type DisputeStatus = 'open' | 'investigation' | 'decision' | 'resolved' | 'closed';
export type DisputeResolution = 'refund' | 'replacement' | 'partial-refund' | 'no-action' | 'pending';

export interface IDispute extends Document {
  // Core Info
  company: mongoose.Types.ObjectId;
  type: DisputeType;
  status: DisputeStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';

  // Related Records
  relatedOrderId?: string;
  relatedSupportTicketId?: mongoose.Types.ObjectId;
  relatedShipmentId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;

  // Description & Evidence
  description: string;
  evidence: {
    type: string; // 'photo', 'video', 'document', etc.
    url: string;
    uploadedAt: Date;
  }[];

  // Investigation
  assignedTo?: mongoose.Types.ObjectId; // User or SalesRep
  investigationNotes?: string;
  investigationStartedAt?: Date;
  investigationCompletedAt?: Date;

  // Decision
  resolution?: DisputeResolution;
  refundAmount?: number;
  resolutionNotes?: string;
  decidedAt?: Date;
  decidedBy?: mongoose.Types.ObjectId;

  // Timeline
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;

  // History/Audit
  timeline: Array<{
    event: string;
    actor?: mongoose.Types.ObjectId;
    details?: string;
    timestamp: Date;
  }>;

  // SLA Tracking
  slaBreached: boolean;
  slaDeadline?: Date;
}

export interface IDisputeModel extends Model<IDispute> {
  getMetricsByType(companyId: string): Promise<any>;
  getOpenDisputes(companyId: string): Promise<IDispute[]>;
  getStalledDisputes(companyId: string, hoursOld?: number): Promise<IDispute[]>;
}

const DisputeSchema = new Schema<IDispute, IDisputeModel>(
  {
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ['damaged-goods', 'lost-shipment', 'delayed-delivery', 'quality-issue'],
        message: '{VALUE} is not a valid dispute type',
      },
      required: [true, 'Dispute type is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['open', 'investigation', 'decision', 'resolved', 'closed'],
        message: '{VALUE} is not a valid status',
      },
      default: 'open',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    relatedOrderId: {
      type: String,
    },
    relatedSupportTicketId: {
      type: Schema.Types.ObjectId,
      ref: 'SupportTicket',
    },
    relatedShipmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Shipment',
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    evidence: [
      {
        type: {
          type: String,
          enum: ['photo', 'video', 'document', 'audio', 'other'],
        },
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    investigationNotes: {
      type: String,
      maxlength: [3000, 'Investigation notes cannot exceed 3000 characters'],
    },
    investigationStartedAt: {
      type: Date,
    },
    investigationCompletedAt: {
      type: Date,
    },
    resolution: {
      type: String,
      enum: {
        values: ['refund', 'replacement', 'partial-refund', 'no-action', 'pending'],
        message: '{VALUE} is not a valid resolution',
      },
      default: 'pending',
    },
    refundAmount: {
      type: Number,
      min: 0,
    },
    resolutionNotes: {
      type: String,
      maxlength: [2000, 'Resolution notes cannot exceed 2000 characters'],
    },
    decidedAt: {
      type: Date,
    },
    decidedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
    timeline: [
      {
        event: {
          type: String,
          required: true,
        },
        actor: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        details: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    slaBreached: {
      type: Boolean,
      default: false,
    },
    slaDeadline: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================================
// INDEXES
// ============================================================================

// Company + status filtering
DisputeSchema.index({ company: 1, status: 1 });

// Type-based queries
DisputeSchema.index({ company: 1, type: 1 });

// Date-based queries
DisputeSchema.index({ createdAt: -1 });

// Assigned to lookup
DisputeSchema.index({ assignedTo: 1, status: 1 });

// SLA tracking
DisputeSchema.index({ slaDeadline: 1, slaBreached: 1 });

// Related records lookup
DisputeSchema.index({ relatedOrderId: 1 });
DisputeSchema.index({ relatedSupportTicketId: 1 });
DisputeSchema.index({ relatedShipmentId: 1 });

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Get metrics (count) by dispute type
 */
DisputeSchema.statics.getMetricsByType = async function (
  companyId: string
): Promise<any> {
  return this.aggregate([
    {
      $match: {
        company: new mongoose.Types.ObjectId(companyId),
      },
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        openCount: {
          $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] },
        },
        resolvedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
        },
        avgRefundAmount: {
          $avg: '$refundAmount',
        },
        totalRefunded: {
          $sum: {
            $cond: [{ $eq: ['$resolution', 'refund'] }, '$refundAmount', 0],
          },
        },
      },
    },
  ]);
};

/**
 * Get all open disputes for a company
 */
DisputeSchema.statics.getOpenDisputes = async function (
  companyId: string
): Promise<IDispute[]> {
  return this.find({
    company: new mongoose.Types.ObjectId(companyId),
    status: { $in: ['open', 'investigation', 'decision'] },
  })
    .sort({ priority: -1, createdAt: -1 })
    .lean();
};

/**
 * Get disputes that are stalled (open for X hours without progress)
 */
DisputeSchema.statics.getStalledDisputes = async function (
  companyId: string,
  hoursOld: number = 24
): Promise<IDispute[]> {
  const stallThreshold = new Date(Date.now() - hoursOld * 60 * 60 * 1000);

  return this.find({
    company: new mongoose.Types.ObjectId(companyId),
    status: { $in: ['open', 'investigation'] },
    createdAt: { $lte: stallThreshold },
  })
    .sort({ createdAt: 1 })
    .lean();
};

// Create and export the model
const Dispute = (mongoose.models.CRMDispute as IDisputeModel) || mongoose.model<IDispute, IDisputeModel>('CRMDispute', DisputeSchema);

export default Dispute;
