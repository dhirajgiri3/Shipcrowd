import crypto from 'crypto';
import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * Sales Representative Model
 * 
 * Represents sales team members with:
 * - Hierarchical structure (reportingTo, teamMembers)
 * - Encrypted bank details for payouts
 * - Performance metrics caching
 * - Razorpay fund account integration
 */

// Environment key for encryption
const ENCRYPTION_KEY = process.env.BANK_ENCRYPTION_KEY || 'default-32-byte-encryption-key!!';
const IV_LENGTH = 16; // AES block size

// Roles for sales representatives
export type SalesRepRole = 'rep' | 'team-lead' | 'manager' | 'director';
export type SalesRepStatus = 'active' | 'inactive' | 'suspended';

// KPI targets interface
export interface IKPITargets {
    monthlyRevenue?: number;
    monthlyOrders?: number;
    conversionRate?: number;
}

// Performance metrics (cached)
export interface IPerformanceMetrics {
    totalRevenue: number;
    totalOrders: number;
    totalCommission: number;
    totalPaidCommission: number;
    avgCommissionPerOrder: number;
    lastUpdated: Date;
}

// Bank details (encrypted)
export interface IBankDetails {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
    panNumber?: string;
}

// Sales Representative interface
export interface ISalesRepresentative extends Document {
    user: mongoose.Types.ObjectId;
    company: mongoose.Types.ObjectId;
    employeeId: string;
    role: SalesRepRole;
    territory: string[];
    reportingTo?: mongoose.Types.ObjectId;
    teamMembers?: mongoose.Types.ObjectId[];
    commissionRules: mongoose.Types.ObjectId[];
    status: SalesRepStatus;
    onboardingDate: Date;
    kpiTargets?: IKPITargets;
    performanceMetrics: IPerformanceMetrics;
    bankDetails: IBankDetails;
    razorpayContactId?: string;
    razorpayFundAccountId?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;

    // Instance methods
    encryptBankDetails(): void;
    decryptBankDetails(): IBankDetails;
    updatePerformanceMetrics(): Promise<void>;
}

// Static methods interface
export interface ISalesRepresentativeModel extends Model<ISalesRepresentative> {
    findByTerritory(companyId: string, territory: string): Promise<ISalesRepresentative[]>;
    findTeamMembers(managerId: string): Promise<ISalesRepresentative[]>;
    encryptValue(value: string): string;
    decryptValue(encryptedValue: string): string;
}

// Encryption helpers
function encrypt(text: string): string {
    if (!text) return text;
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
    if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// KPI Targets sub-schema
const KPITargetsSchema = new Schema<IKPITargets>(
    {
        monthlyRevenue: { type: Number, min: 0 },
        monthlyOrders: { type: Number, min: 0 },
        conversionRate: { type: Number, min: 0, max: 100 },
    },
    { _id: false }
);

// Performance Metrics sub-schema
const PerformanceMetricsSchema = new Schema<IPerformanceMetrics>(
    {
        totalRevenue: { type: Number, default: 0, min: 0 },
        totalOrders: { type: Number, default: 0, min: 0 },
        totalCommission: { type: Number, default: 0, min: 0 },
        totalPaidCommission: { type: Number, default: 0, min: 0 },
        avgCommissionPerOrder: { type: Number, default: 0, min: 0 },
        lastUpdated: { type: Date, default: Date.now },
    },
    { _id: false }
);

// Bank Details sub-schema
const BankDetailsSchema = new Schema<IBankDetails>(
    {
        accountNumber: {
            type: String,
            required: [true, 'Account number is required'],
        },
        ifscCode: {
            type: String,
            required: [true, 'IFSC code is required'],
            uppercase: true,
            match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format'],
        },
        accountHolderName: {
            type: String,
            required: [true, 'Account holder name is required'],
            trim: true,
        },
        bankName: {
            type: String,
            required: [true, 'Bank name is required'],
            trim: true,
        },
        panNumber: {
            type: String,
            uppercase: true,
            match: [/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format'],
        },
    },
    { _id: false }
);

// Main SalesRepresentative schema
const SalesRepresentativeSchema = new Schema<ISalesRepresentative, ISalesRepresentativeModel>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User reference is required'],
            index: true,
        },
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: [true, 'Company is required'],
            index: true,
        },
        employeeId: {
            type: String,
            required: [true, 'Employee ID is required'],
            trim: true,
            maxlength: [50, 'Employee ID cannot exceed 50 characters'],
        },
        role: {
            type: String,
            enum: {
                values: ['rep', 'team-lead', 'manager', 'director'],
                message: '{VALUE} is not a valid role',
            },
            default: 'rep',
        },
        territory: {
            type: [String],
            default: [],
            validate: {
                validator: function (v: string[]) {
                    return v.length <= 50;
                },
                message: 'Maximum 50 territories allowed',
            },
        },
        reportingTo: {
            type: Schema.Types.ObjectId,
            ref: 'SalesRepresentative',
        },
        teamMembers: [
            {
                type: Schema.Types.ObjectId,
                ref: 'SalesRepresentative',
            },
        ],
        commissionRules: [
            {
                type: Schema.Types.ObjectId,
                ref: 'CommissionRule',
            },
        ],
        status: {
            type: String,
            enum: {
                values: ['active', 'inactive', 'suspended'],
                message: '{VALUE} is not a valid status',
            },
            default: 'active',
        },
        onboardingDate: {
            type: Date,
            default: Date.now,
        },
        kpiTargets: KPITargetsSchema,
        performanceMetrics: {
            type: PerformanceMetricsSchema,
            default: () => ({
                totalRevenue: 0,
                totalOrders: 0,
                totalCommission: 0,
                totalPaidCommission: 0,
                avgCommissionPerOrder: 0,
                lastUpdated: new Date(),
            }),
        },
        bankDetails: {
            type: BankDetailsSchema,
            required: [true, 'Bank details are required'],
        },
        razorpayContactId: {
            type: String,
            sparse: true,
        },
        razorpayFundAccountId: {
            type: String,
            sparse: true,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ============================================================================
// INDEXES
// ============================================================================

// Main list query
SalesRepresentativeSchema.index({ company: 1, status: 1 });

// One rep per user per company
SalesRepresentativeSchema.index({ user: 1, company: 1 }, { unique: true });

// Employee ID uniqueness per company
SalesRepresentativeSchema.index({ employeeId: 1, company: 1 }, { unique: true });

// Hierarchy queries
SalesRepresentativeSchema.index({ reportingTo: 1 });

// Territory queries
SalesRepresentativeSchema.index({ territory: 1 });

// Performance queries
SalesRepresentativeSchema.index({ company: 1, 'performanceMetrics.totalCommission': -1 });

// ============================================================================
// VIRTUALS
// ============================================================================

SalesRepresentativeSchema.virtual('fullName').get(function () {
    // This would need to be populated to work
    return (this.populated('user') as any)?.name || 'Unknown';
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Encrypt bank account number before saving
 */
SalesRepresentativeSchema.methods.encryptBankDetails = function (): void {
    if (this.bankDetails && this.bankDetails.accountNumber) {
        // Only encrypt if not already encrypted
        if (!this.bankDetails.accountNumber.includes(':')) {
            this.bankDetails.accountNumber = encrypt(this.bankDetails.accountNumber);
        }
    }
};

/**
 * Decrypt bank details for display or payment processing
 */
SalesRepresentativeSchema.methods.decryptBankDetails = function (): IBankDetails {
    if (!this.bankDetails) {
        throw new Error('Bank details not set');
    }

    return {
        accountNumber: decrypt(this.bankDetails.accountNumber),
        ifscCode: this.bankDetails.ifscCode,
        accountHolderName: this.bankDetails.accountHolderName,
        bankName: this.bankDetails.bankName,
        panNumber: this.bankDetails.panNumber,
    };
};

/**
 * Update cached performance metrics from commission transactions
 */
SalesRepresentativeSchema.methods.updatePerformanceMetrics = async function (): Promise<void> {
    const CommissionTransaction = mongoose.model('CommissionTransaction');

    // Aggregate commission transactions
    const [result] = await CommissionTransaction.aggregate([
        {
            $match: {
                salesRepresentative: this._id,
                status: { $in: ['pending', 'approved', 'paid'] },
            },
        },
        {
            $group: {
                _id: null,
                totalCommission: { $sum: '$finalAmount' },
                totalOrders: { $sum: 1 },
                paidCommission: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'paid'] }, '$finalAmount', 0],
                    },
                },
            },
        },
    ]);

    // Get order revenue from metadata
    const [revenueResult] = await CommissionTransaction.aggregate([
        {
            $match: {
                salesRepresentative: this._id,
            },
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$metadata.orderValue' },
            },
        },
    ]);

    this.performanceMetrics = {
        totalRevenue: revenueResult?.totalRevenue || 0,
        totalOrders: result?.totalOrders || 0,
        totalCommission: result?.totalCommission || 0,
        totalPaidCommission: result?.paidCommission || 0,
        avgCommissionPerOrder: result?.totalOrders > 0
            ? Math.round((result.totalCommission / result.totalOrders) * 100) / 100
            : 0,
        lastUpdated: new Date(),
    };

    await this.save();
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find sales reps by territory
 */
SalesRepresentativeSchema.statics.findByTerritory = async function (
    companyId: string,
    territory: string
): Promise<ISalesRepresentative[]> {
    return this.find({
        company: new mongoose.Types.ObjectId(companyId),
        territory: territory,
        status: 'active',
    })
        .populate('user', 'name email phone')
        .lean();
};

/**
 * Find team members for a manager
 */
SalesRepresentativeSchema.statics.findTeamMembers = async function (
    managerId: string
): Promise<ISalesRepresentative[]> {
    return this.find({
        reportingTo: new mongoose.Types.ObjectId(managerId),
        status: 'active',
    })
        .populate('user', 'name email phone')
        .lean();
};

/**
 * Static encryption helper
 */
SalesRepresentativeSchema.statics.encryptValue = function (value: string): string {
    return encrypt(value);
};

/**
 * Static decryption helper
 */
SalesRepresentativeSchema.statics.decryptValue = function (encryptedValue: string): string {
    return decrypt(encryptedValue);
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Pre-save hook to encrypt bank details
 */
SalesRepresentativeSchema.pre('save', function (next) {
    // Encrypt bank details before saving
    if (this.isModified('bankDetails.accountNumber')) {
        this.encryptBankDetails();
    }

    // Validate hierarchy (prevent self-reference)
    if (this.reportingTo && this.reportingTo.toString() === String(this._id)) {
        return next(new Error('Sales representative cannot report to themselves'));
    }

    next();
});

/**
 * Pre-update hook for findOneAndUpdate
 */
SalesRepresentativeSchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate() as any;

    // Encrypt bank details if being updated
    if (update?.$set?.['bankDetails.accountNumber'] || update?.bankDetails?.accountNumber) {
        const accountNumber = update.$set?.['bankDetails.accountNumber'] || update.bankDetails?.accountNumber;
        if (accountNumber && !accountNumber.includes(':')) {
            if (update.$set) {
                update.$set['bankDetails.accountNumber'] = encrypt(accountNumber);
            } else if (update.bankDetails) {
                update.bankDetails.accountNumber = encrypt(accountNumber);
            }
        }
    }

    next();
});

// Create and export the model
const SalesRepresentative = mongoose.model<ISalesRepresentative, ISalesRepresentativeModel>(
    'SalesRepresentative',
    SalesRepresentativeSchema
);

export default SalesRepresentative;
