import mongoose, { Document, Schema } from 'mongoose';

/**
 * Notification Template Model (Phase 6)
 *
 * Stores templates for multi-channel notifications:
 * - Email: HTML templates for customer updates
 * - WhatsApp: Plain text messages for sales reps
 * - SMS: Short messages for callbacks and reminders
 *
 * Supports variable substitution: {{ticketId}}, {{repName}}, {{status}}, etc.
 */

export type NotificationChannel = 'email' | 'whatsapp' | 'sms';
export type NotificationTrigger =
  | 'ticket_created'
  | 'ticket_assigned'
  | 'ticket_status_changed'
  | 'ticket_escalated'
  | 'dispute_created'
  | 'dispute_resolved'
  | 'callback_pending'
  | 'sla_breached'
  | 'manual';

export interface INotificationTemplate extends Document {
  // Identification
  name: string;
  description?: string;

  // Trigger & Channel
  channel: NotificationChannel;
  trigger: NotificationTrigger;

  // Content
  subject?: string; // For email
  body: string; // Main message content
  footer?: string; // Optional footer

  // Variables / Placeholders
  variables: {
    name: string;
    description?: string;
    example?: string;
  }[];

  // Status & Metadata
  isActive: boolean;
  company?: mongoose.Types.ObjectId; // If company-specific; null for system templates

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const NotificationTemplateSchema = new Schema<INotificationTemplate>(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
      index: true,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    channel: {
      type: String,
      enum: {
        values: ['email', 'whatsapp', 'sms'],
        message: '{VALUE} is not a valid notification channel',
      },
      required: [true, 'Channel is required'],
      index: true,
    },
    trigger: {
      type: String,
      enum: {
        values: [
          'ticket_created',
          'ticket_assigned',
          'ticket_status_changed',
          'ticket_escalated',
          'dispute_created',
          'dispute_resolved',
          'callback_pending',
          'sla_breached',
          'manual',
        ],
        message: '{VALUE} is not a valid trigger event',
      },
      required: [true, 'Trigger event is required'],
      index: true,
    },
    subject: {
      type: String,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    body: {
      type: String,
      required: [true, 'Body content is required'],
      maxlength: [5000, 'Body cannot exceed 5000 characters'],
    },
    footer: {
      type: String,
      maxlength: [500, 'Footer cannot exceed 500 characters'],
    },
    variables: [
      {
        name: {
          type: String,
          required: true,
        },
        description: String,
        example: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
      // null means it's a system-wide template
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================================
// INDEXES
// ============================================================================

// Composite index for finding active templates by channel and trigger
NotificationTemplateSchema.index({ channel: 1, trigger: 1, isActive: 1 });

// Company-specific templates
NotificationTemplateSchema.index({ company: 1, isActive: 1 });

// Search by name
NotificationTemplateSchema.index({ name: 'text' });

// Create and export the model
const NotificationTemplate = mongoose.model<INotificationTemplate>(
  'NotificationTemplate',
  NotificationTemplateSchema
);

export default NotificationTemplate;
