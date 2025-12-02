import mongoose, { Document, Schema } from 'mongoose';

// Define the interface for Permission document
export interface IPermission extends Document {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  permissions: {
    dashboard: boolean;
    orders: {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
    };
    shipments: {
      view: boolean;
      create: boolean;
      track: boolean;
      cancel: boolean;
    };
    warehouses: {
      view: boolean;
      manage: boolean;
    };
    ndr: {
      view: boolean;
      resolve: boolean;
    };
    reports: {
      view: boolean;
      export: boolean;
    };
    billing: {
      view: boolean;
    };
    settings: {
      view: boolean;
      manage: boolean;
    };
    team: {
      view: boolean;
      manage: boolean;
    };
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Permission schema
const PermissionSchema = new Schema<IPermission>(
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
      dashboard: {
        type: Boolean,
        default: true,
      },
      orders: {
        view: {
          type: Boolean,
          default: true,
        },
        create: {
          type: Boolean,
          default: false,
        },
        edit: {
          type: Boolean,
          default: false,
        },
        delete: {
          type: Boolean,
          default: false,
        },
      },
      shipments: {
        view: {
          type: Boolean,
          default: true,
        },
        create: {
          type: Boolean,
          default: false,
        },
        track: {
          type: Boolean,
          default: true,
        },
        cancel: {
          type: Boolean,
          default: false,
        },
      },
      warehouses: {
        view: {
          type: Boolean,
          default: true,
        },
        manage: {
          type: Boolean,
          default: false,
        },
      },
      ndr: {
        view: {
          type: Boolean,
          default: true,
        },
        resolve: {
          type: Boolean,
          default: false,
        },
      },
      reports: {
        view: {
          type: Boolean,
          default: true,
        },
        export: {
          type: Boolean,
          default: false,
        },
      },
      billing: {
        view: {
          type: Boolean,
          default: false,
        },
      },
      settings: {
        view: {
          type: Boolean,
          default: false,
        },
        manage: {
          type: Boolean,
          default: false,
        },
      },
      team: {
        view: {
          type: Boolean,
          default: false,
        },
        manage: {
          type: Boolean,
          default: false,
        },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
PermissionSchema.index({ userId: 1 }, { unique: true });
PermissionSchema.index({ companyId: 1 });

// Create and export the Permission model
const Permission = mongoose.model<IPermission>('Permission', PermissionSchema);
export default Permission;
