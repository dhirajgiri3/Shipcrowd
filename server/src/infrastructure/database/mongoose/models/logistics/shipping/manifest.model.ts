import mongoose, { Document, Schema } from 'mongoose';

/**
 * Manifest Model
 * Manages shipment handover to carriers
 * 
 * Features:
 * - Transaction-safe manifest numbering (MAN-YYYYMM-XXXX)
 * - Pickup scheduling integration
 * - State machine: open → closed → handed_over
 * - 1 manifest = 1 carrier validation
 */

export interface IManifest extends Document {
    manifestNumber: string;        // MAN-202601-0001
    companyId: mongoose.Types.ObjectId;
    warehouseId: mongoose.Types.ObjectId;
    carrier: 'velocity' | 'delhivery' | 'ekart' | 'india_post';

    shipments: {
        shipmentId: mongoose.Types.ObjectId;
        awb: string;
        weight: number;
        packages: number;
        codAmount: number;
    }[];

    status: 'open' | 'closed' | 'handed_over';

    pickup: {
        scheduledDate: Date;
        timeSlot: string;           // e.g., "10:00-12:00"
        contactPerson: string;
        contactPhone: string;
        pickupReference?: string;   // Carrier's pickup ID
    };

    summary: {
        totalShipments: number;
        totalWeight: number;
        totalPackages: number;
        totalCODAmount: number;
    };

    closedAt?: Date;
    closedBy?: mongoose.Types.ObjectId;
    handedOverAt?: Date;
    handedOverBy?: mongoose.Types.ObjectId;

    notes?: string;

    createdAt: Date;
    updatedAt: Date;
}

const ManifestSchema = new Schema<IManifest>(
    {
        manifestNumber: {
            type: String,
            required: true,
            unique: true,
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        warehouseId: {
            type: Schema.Types.ObjectId,
            ref: 'Warehouse',
            required: true,
            index: true,
        },
        carrier: {
            type: String,
            enum: ['velocity', 'delhivery', 'ekart', 'india_post'],
            required: true,
            index: true,
        },
        shipments: [
            {
                shipmentId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Shipment',
                    required: true,
                },
                awb: {
                    type: String,
                    required: true,
                },
                weight: {
                    type: Number,
                    required: true,
                },
                packages: {
                    type: Number,
                    required: true,
                    default: 1,
                },
                codAmount: {
                    type: Number,
                    default: 0,
                },
            },
        ],
        status: {
            type: String,
            enum: ['open', 'closed', 'handed_over'],
            default: 'open',
            index: true,
        },
        pickup: {
            scheduledDate: {
                type: Date,
                required: true,
            },
            timeSlot: {
                type: String,
                required: true,
            },
            contactPerson: {
                type: String,
                required: true,
            },
            contactPhone: {
                type: String,
                required: true,
            },
            pickupReference: String,
        },
        summary: {
            totalShipments: {
                type: Number,
                required: true,
                default: 0,
            },
            totalWeight: {
                type: Number,
                required: true,
                default: 0,
            },
            totalPackages: {
                type: Number,
                required: true,
                default: 0,
            },
            totalCODAmount: {
                type: Number,
                required: true,
                default: 0,
            },
        },
        closedAt: Date,
        closedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        handedOverAt: Date,
        handedOverBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        notes: String,
    },
    {
        timestamps: true,
    }
);

// ============================================================================
// VALIDATION: 1 Manifest = 1 Carrier
// ============================================================================
// Prevents mixing shipments from different carriers in same manifest
ManifestSchema.pre('save', async function (next) {
    if (this.shipments && this.shipments.length > 0) {
        // Validate all shipments belong to same carrier
        const shipmentDocs = await mongoose.model('Shipment').find({
            _id: { $in: this.shipments.map((s) => s.shipmentId) },
        });

        const carriers = [...new Set(shipmentDocs.map((s: any) => s.carrier))];

        if (carriers.length > 1) {
            throw new Error('Cannot mix shipments from different carriers in same manifest');
        }

        if (carriers.length === 1 && carriers[0] !== this.carrier) {
            throw new Error(`Shipments belong to ${carriers[0]} but manifest is for ${this.carrier}`);
        }
    }
    next();
});

// ============================================================================
// INDEXES
// ============================================================================
ManifestSchema.index({ companyId: 1, status: 1, createdAt: -1 });
ManifestSchema.index({ warehouseId: 1, carrier: 1 });
ManifestSchema.index({ 'pickup.scheduledDate': 1 });
ManifestSchema.index({ manifestNumber: 1 }, { unique: true });

const Manifest = mongoose.model<IManifest>('Manifest', ManifestSchema);
export default Manifest;
