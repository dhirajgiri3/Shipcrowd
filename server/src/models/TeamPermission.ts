import mongoose, { Document, Schema } from 'mongoose';

// Define the interface for TeamPermission document
export interface ITeamPermission extends Document {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  permissions: {
    orders: {
      view: boolean;
      create: boolean;
      update: boolean;
      delete: boolean;
    };
    products: {
      view: boolean;
      create: boolean;
      update: boolean;
      delete: boolean;
    };
    warehouses: {
      view: boolean;
      create: boolean;
      update: boolean;
      delete: boolean;
    };
    customers: {
      view: boolean;
      create: boolean;
      update: boolean;
      delete: boolean;
    };
    team: {
      view: boolean;
      invite: boolean;
      update: boolean;
      remove: boolean;
      manage_roles: boolean;
      manage_permissions: boolean;
    };
    reports: {
      view: boolean;
      export: boolean;
    };
    settings: {
      view: boolean;
      update: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// Create the TeamPermission schema
const TeamPermissionSchema = new Schema<ITeamPermission>(
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
    permissions: {
      orders: {
        view: { type: Boolean, default: true },
        create: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },
      products: {
        view: { type: Boolean, default: true },
        create: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },
      warehouses: {
        view: { type: Boolean, default: true },
        create: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },
      customers: {
        view: { type: Boolean, default: true },
        create: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },
      team: {
        view: { type: Boolean, default: false },
        invite: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        remove: { type: Boolean, default: false },
        manage_roles: { type: Boolean, default: false },
        manage_permissions: { type: Boolean, default: false },
      },
      reports: {
        view: { type: Boolean, default: true },
        export: { type: Boolean, default: false },
      },
      settings: {
        view: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
TeamPermissionSchema.index({ userId: 1 }, { unique: true });
TeamPermissionSchema.index({ companyId: 1 });

// Create and export the TeamPermission model
const TeamPermission = mongoose.model<ITeamPermission>('TeamPermission', TeamPermissionSchema);
export default TeamPermission;
