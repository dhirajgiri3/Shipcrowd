import mongoose, { Document, Schema } from 'mongoose';

// Define the interface for TeamInvitation document
export interface ITeamInvitation extends Document {
  email: string;
  companyId: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;
  teamRole: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
  invitationMessage?: string;
  token: string;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: Date;
  updatedAt: Date;
}

// Create the TeamInvitation schema
const TeamInvitationSchema = new Schema<ITeamInvitation>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    teamRole: {
      type: String,
      enum: ['owner', 'admin', 'manager', 'member', 'viewer'],
      default: 'member',
    },
    invitationMessage: {
      type: String,
      trim: true,
    },
    token: {
      type: String,
      required: true,
      // ⚠️ NO DEFAULT - Tokens MUST be generated explicitly in controllers with hashing
      // See AuthTokenService.generateSecureToken() for proper token generation
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
TeamInvitationSchema.index({ email: 1, companyId: 1 }, { unique: true });
TeamInvitationSchema.index({ token: 1 }, { unique: true });
TeamInvitationSchema.index({ expiresAt: 1 });
TeamInvitationSchema.index({ status: 1 });

// Create and export the TeamInvitation model
const TeamInvitation = mongoose.model<ITeamInvitation>('TeamInvitation', TeamInvitationSchema);
export default TeamInvitation;
