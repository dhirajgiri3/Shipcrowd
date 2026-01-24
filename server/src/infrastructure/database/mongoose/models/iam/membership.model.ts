import mongoose, { Document, Schema } from 'mongoose';

/**
 * Membership Model - V5 RBAC
 * 
 * Links a User to a Company with specific Roles.
 * This is the "where you belong" layer.
 * 
 * Key Principle: "Users don't do things. Memberships do."
 * 
 * A user can have multiple memberships (multi-company support).
 * Each membership defines what the user can do within that company.
 */

export interface IMembership extends Document {
    userId: mongoose.Types.ObjectId;
    companyId: mongoose.Types.ObjectId;
    roles: mongoose.Types.ObjectId[];
    status: 'active' | 'invited' | 'suspended';
    permissionsVersion: number;
    createdAt: Date;
    updatedAt: Date;
}

const MembershipSchema = new Schema<IMembership>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
        roles: {
            type: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
            required: true,
            validate: {
                validator: function (roles: mongoose.Types.ObjectId[]) {
                    return roles.length > 0;
                },
                message: 'Membership must have at least one role'
            }
        },
        status: {
            type: String,
            enum: ['active', 'invited', 'suspended'],
            default: 'active',
            required: true,
            index: true,
        },
        permissionsVersion: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Compound unique index: One membership per user per company
MembershipSchema.index({ userId: 1, companyId: 1 }, { unique: true });

// Index for querying all memberships of a company
MembershipSchema.index({ companyId: 1, status: 1 });

/**
 * Pre-save hook: Bump permissionsVersion when roles change
 */
MembershipSchema.pre('save', function (next) {
    if (this.isModified('roles')) {
        this.permissionsVersion++;
    }
    next();
});

/**
 * Static method: Get active membership for user in company
 */
MembershipSchema.statics.getActive = async function (
    userId: string | mongoose.Types.ObjectId,
    companyId: string | mongoose.Types.ObjectId
): Promise<IMembership | null> {
    return this.findOne({
        userId,
        companyId,
        status: 'active'
    });
};

/**
 * Static method: Check if user has any active membership
 */
MembershipSchema.statics.hasAnyMembership = async function (
    userId: string | mongoose.Types.ObjectId
): Promise<boolean> {
    const count = await this.countDocuments({
        userId,
        status: 'active'
    });
    return count > 0;
};

// ============================================================================
// CRITICAL V5 RBAC: Ownership Enforcement (pre('save'))
// ============================================================================
// INVARIANT: Every Company must have ≥1 active owner
// Prevent removing last owner via Membership updates
// ============================================================================
MembershipSchema.pre('save', async function (next) {
    try {
        // Check if this is an owner membership being removed/suspended
        if (this.isModified('status') || this.isModified('roles')) {
            const Role = mongoose.model('Role');
            const ownerRole = await Role.findOne({ name: 'owner', scope: 'company' });

            if (!ownerRole) {
                return next(new Error('Owner role not found in system'));
            }

            const wasOwner = this.roles.some(r => r.toString() === ownerRole._id.toString());
            const isOwner = this.roles.some(r => r.toString() === ownerRole._id.toString()) && this.status === 'active';

            // If removing owner status, check for other owners
            if (wasOwner && !isOwner) {
                const otherActiveOwners = await mongoose.model('Membership').countDocuments({
                    companyId: this.companyId,
                    roles: ownerRole._id,
                    status: 'active',
                    _id: { $ne: this._id }
                });

                if (otherActiveOwners === 0) {
                    return next(new Error('Cannot remove last owner. Transfer ownership first.'));
                }
            }
        }

        next();
    } catch (error) {
        next(error as Error);
    }
});

/**
 * CRITICAL V5 SYNC: Reverse Synchronization
 * When Membership changes, update legacy User fields (companyId, teamRole)
 * This ensures legacy APIs continue to work for users managed via V5
 */
MembershipSchema.post('save', async function (doc) {
    try {
        // Only sync if active
        if (doc.status === 'active') {
            const User = mongoose.model('User');
            // Find effective role name from the first role ID
            const role = await mongoose.model('Role').findById(doc.roles[0]);

            if (role) {
                // Map V5 role back to legacy teamRole
                // owner -> owner, manager -> manager, member -> member, viewer -> viewer
                const teamRoleMap: Record<string, string> = {
                    'owner': 'owner',
                    'manager': 'manager',
                    'member': 'member',
                    'viewer': 'viewer'
                };

                const legacyTeamRole = teamRoleMap[role.name] || 'member';

                await User.findByIdAndUpdate(doc.userId, {
                    companyId: doc.companyId,
                    teamRole: legacyTeamRole,
                    teamStatus: 'active'
                });

                // console.log(`[Reverse-Sync] Updated User ${doc.userId} from Membership ${doc._id}`);
            }
        }
    } catch (error) {
        console.error('[Reverse-Sync] Failed to sync Membership to User:', error);
        // Don't fail the transaction, just log
    }
});

/**
 * Prevent deleting last owner via deleteOne/deleteMany (pre('deleteOne'))
 */
MembershipSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    try {
        const Role = mongoose.model('Role');
        const ownerRole = await Role.findOne({ name: 'owner', scope: 'company' });

        if (!ownerRole) return next();

        const isOwner = this.roles.some(r => r.toString() === ownerRole._id.toString()) && this.status === 'active';

        if (isOwner) {
            const otherActiveOwners = await mongoose.model('Membership').countDocuments({
                companyId: this.companyId,
                roles: ownerRole._id,
                status: 'active',
                _id: { $ne: this._id }
            });

            if (otherActiveOwners === 0) {
                return next(new Error('Cannot delete last owner membership'));
            }
        }

        next();
    } catch (error) {
        next(error as Error);
    }
});

const Membership = mongoose.model<IMembership>('Membership', MembershipSchema);

export default Membership;
