import mongoose, { Document, Schema } from 'mongoose';

/**
 * In-App Notification Model
 * 
 * Stores user notifications for the NotificationCenter UI.
 * Supports read/unread tracking and action links.
 */

export type NotificationType = 'order' | 'shipment' | 'payment' | 'system' | 'alert';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface INotification extends Document {
    // Recipient
    recipientId: mongoose.Types.ObjectId;

    // Content
    type: NotificationType;
    title: string;
    message: string;
    priority: NotificationPriority;

    // Status
    read: boolean;

    // Optional action
    actionUrl?: string;
    actionLabel?: string;

    // Additional data
    metadata?: Record<string, any>;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
    {
        recipientId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Recipient is required'],
            index: true,
        },
        type: {
            type: String,
            enum: {
                values: ['order', 'shipment', 'payment', 'system', 'alert'],
                message: '{VALUE} is not a valid notification type',
            },
            required: [true, 'Type is required'],
            index: true,
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        message: {
            type: String,
            required: [true, 'Message is required'],
            maxlength: [1000, 'Message cannot exceed 1000 characters'],
        },
        priority: {
            type: String,
            enum: {
                values: ['low', 'medium', 'high', 'urgent'],
                message: '{VALUE} is not a valid priority',
            },
            default: 'medium',
            index: true,
        },
        read: {
            type: Boolean,
            default: false,
            index: true,
        },
        actionUrl: {
            type: String,
            maxlength: [500, 'Action URL cannot exceed 500 characters'],
        },
        actionLabel: {
            type: String,
            maxlength: [100, 'Action label cannot exceed 100 characters'],
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

// ============================================================================
// INDEXES
// ============================================================================

// Composite index for efficient queries: get unread notifications for a user
NotificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });

// Index for filtering by type
NotificationSchema.index({ recipientId: 1, type: 1, createdAt: -1 });

// Index for counting unread
NotificationSchema.index({ recipientId: 1, read: 1 });

// ============================================================================
// METHODS
// ============================================================================

// Mark notification as read
NotificationSchema.methods.markAsRead = async function (): Promise<void> {
    this.read = true;
    await this.save();
};

// Create and export the model (prevent overwrite in dev mode)
const Notification = mongoose.models.Notification ||
    mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
