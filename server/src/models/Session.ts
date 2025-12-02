import mongoose, { Document, Schema } from 'mongoose';

// Define the interface for Session document
export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  refreshToken: string;
  userAgent: string;
  ip: string;
  deviceInfo: {
    type?: string;
    browser?: string;
    os?: string;
    deviceName?: string;
  };
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
  lastActive: Date;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Session schema
const SessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    ip: {
      type: String,
      required: true,
    },
    deviceInfo: {
      type: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'other'],
        default: 'other',
      },
      browser: String,
      os: String,
      deviceName: String,
    },
    location: {
      country: String,
      city: String,
      region: String,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient queries
SessionSchema.index({ userId: 1, isRevoked: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup

// Create and export the Session model
const Session = mongoose.model<ISession>('Session', SessionSchema);
export default Session;
