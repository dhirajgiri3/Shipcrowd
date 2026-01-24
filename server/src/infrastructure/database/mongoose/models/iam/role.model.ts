import mongoose, { Document, Schema } from 'mongoose';

/**
 * Role Model - V5 RBAC
 * 
 * Represents a set of permissions that can be assigned to users.
 * Roles are scoped to either 'global' (platform-level) or 'company' (tenant-level).
 * 
 * Key Features:
 * - effectivePermissions: Precomputed transitive permissions (includes inherited)
 * - Governance: isDeprecated, replacedBy for role lifecycle management
 * - permissionsVersion: Cache invalidation key
 */

export interface IRole extends Document {
    name: string;
    scope: 'global' | 'company';
    permissions: string[];
    effectivePermissions: string[];
    inherits: mongoose.Types.ObjectId[];
    isSystem: boolean;
    isDeprecated: boolean;
    deprecatedAt?: Date;
    deprecationReason?: string;
    replacedBy?: mongoose.Types.ObjectId;
    permissionsVersion: number;
    createdAt: Date;
    updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        scope: {
            type: String,
            enum: ['global', 'company'],
            required: true,
            index: true,
        },
        permissions: {
            type: [String],
            default: [],
            validate: {
                validator: function (perms: string[]) {
                    // Prevent wildcard '*' except for system roles during seeding
                    const hasWildcard = perms.includes('*');
                    if (hasWildcard && !this.isSystem) {
                        return false;
                    }
                    return true;
                },
                message: 'Wildcard permissions only allowed for system roles'
            }
        },
        effectivePermissions: {
            type: [String],
            default: [],
        },
        inherits: {
            type: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
            default: [],
            validate: {
                validator: async function (roleIds: mongoose.Types.ObjectId[]) {
                    // Prevent inheriting from different scope
                    if (roleIds.length === 0) return true;

                    const roles = await mongoose.model('Role').find({ _id: { $in: roleIds } });
                    const allSameScope = roles.every(r => r.scope === this.scope);
                    return allSameScope;
                },
                message: 'Cannot inherit from roles with different scope'
            }
        },
        isSystem: {
            type: Boolean,
            default: false,
            index: true,
        },
        isDeprecated: {
            type: Boolean,
            default: false,
            index: true,
        },
        deprecatedAt: {
            type: Date,
        },
        deprecationReason: {
            type: String,
        },
        replacedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Role',
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

// Compound unique index
RoleSchema.index({ name: 1, scope: 1 }, { unique: true });

// ============================================================================
// CRITICAL V5 RBAC: Cycle Detection in Role Inheritance
// ============================================================================
// Detect and prevent circular role inheritance (A → B → C → A)
// Uses DFS with recursion stack to detect back-edges
// ============================================================================

/**
 * Helper: Detect cycles in role inheritance graph
 * Uses DFS with visited set + recursion stack
 */
async function detectCycle(
    startRoleId: mongoose.Types.ObjectId,
    inherits: mongoose.Types.ObjectId[]
): Promise<boolean> {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    async function dfs(roleId: mongoose.Types.ObjectId): Promise<boolean> {
        const id = roleId.toString();

        if (recursionStack.has(id)) return true; // Back-edge detected = cycle!
        if (visited.has(id)) return false; // Already processed, no cycle

        visited.add(id);
        recursionStack.add(id);

        const role = await mongoose.model('Role').findById(roleId).select('inherits').lean() as any;
        if (role?.inherits && Array.isArray(role.inherits)) {
            for (const inheritedRoleId of role.inherits) {
                if (await dfs(inheritedRoleId)) {
                    return true; // Cycle found in subtree
                }
            }
        }

        recursionStack.delete(id);
        return false;
    }

    // Check if any of the new inherits creates a cycle back to startRoleId
    for (const inheritId of inherits) {
        if (await dfs(inheritId)) {
            return true;
        }
    }

    return false;
}

/**
 * Pre-save hook: Prevent cycle creation (RUNS BEFORE effectivePermissions)
 */
RoleSchema.pre('save', async function(next) {
    if (!this.isModified('inherits')) return next();

    try {
        const hasCycle = await detectCycle(
            this._id as mongoose.Types.ObjectId,
            this.inherits
        );
        if (hasCycle) {
            return next(new Error('Circular role inheritance detected. Cannot save.'));
        }
        next();
    } catch (error) {
        next(error as Error);
    }
});

/**
 * Pre-save hook: Precompute effectivePermissions
 * This eliminates runtime graph traversal during permission checks
 */
RoleSchema.pre('save', async function (next) {
    // Only recompute if permissions or inherits changed
    if (!this.isModified('permissions') && !this.isModified('inherits')) {
        return next();
    }

    try {
        const effectivePerms = new Set<string>(this.permissions);
        const visited = new Set<string>();

        // Recursive function to resolve inherited permissions
        const resolveInherits = async (roleIds: mongoose.Types.ObjectId[]) => {
            for (const roleId of roleIds) {
                const id = roleId.toString();
                if (visited.has(id)) continue; // Prevent cycles
                visited.add(id);

                const role = await mongoose.model<IRole>('Role').findById(roleId).lean();
                if (role) {
                    role.permissions.forEach(p => effectivePerms.add(p));
                    if (role.inherits?.length) {
                        await resolveInherits(role.inherits);
                    }
                }
            }
        };

        if (this.inherits?.length) {
            await resolveInherits(this.inherits);
        }

        this.effectivePermissions = Array.from(effectivePerms);
        this.permissionsVersion++;

        next();
    } catch (error) {
        next(error as Error);
    }
});

/**
 * Prevent modification of system roles via API
 */
RoleSchema.pre('save', function (next) {
    if (this.isSystem && !this.isNew) {
        const error = new Error('System roles cannot be modified. Use database migration instead.');
        return next(error);
    }
    next();
});

// ============================================================================
// CRITICAL V5 RBAC: Complete System Role Protection
// ============================================================================
// Prevent deletion and modification of system roles through any method
// ============================================================================

/**
 * Prevent deleting system roles (pre('deleteOne'))
 */
RoleSchema.pre('deleteOne', { document: true, query: false }, function(next) {
    if (this.isSystem) {
        return next(new Error('Cannot delete system role. Use deprecation instead.'));
    }
    next();
});

/**
 * Prevent bulk updates on system roles via updateOne/updateMany
 */
RoleSchema.pre('updateOne', async function(next) {
    try {
        const update = this.getUpdate() as any;
        const role = await mongoose.model('Role').findOne(this.getQuery()).lean() as any;

        if (role?.isSystem) {
            // Allow only deprecation-related fields
            const allowedUpdates = ['isDeprecated', 'deprecatedAt', 'deprecationReason', 'replacedBy'];
            const updateKeys = Object.keys(update.$set || update).filter(k => !k.startsWith('$'));
            const hasDisallowedUpdate = updateKeys.some(k => !allowedUpdates.includes(k));

            if (hasDisallowedUpdate) {
                return next(new Error('Cannot modify system role permissions. Use database migration.'));
            }
        }
        next();
    } catch (error) {
        next(error as Error);
    }
});

/**
 * Prevent updates on system roles via findOneAndUpdate
 */
RoleSchema.pre('findOneAndUpdate', async function(next) {
    try {
        const update = this.getUpdate() as any;
        const role = await mongoose.model('Role').findOne(this.getQuery()).lean() as any;

        if (role?.isSystem) {
            // Allow only deprecation-related fields
            const allowedUpdates = ['isDeprecated', 'deprecatedAt', 'deprecationReason', 'replacedBy'];
            const updateKeys = Object.keys(update.$set || update).filter(k => !k.startsWith('$'));
            const hasDisallowedUpdate = updateKeys.some(k => !allowedUpdates.includes(k));

            if (hasDisallowedUpdate) {
                return next(new Error('Cannot modify system role. Use database migration.'));
            }
        }
        next();
    } catch (error) {
        next(error as Error);
    }
});

/**
 * Instance method to check if role has a specific permission
 */
RoleSchema.methods.hasPermission = function (permission: string): boolean {
    return this.effectivePermissions.includes(permission);
};

const Role = mongoose.model<IRole>('Role', RoleSchema);

export default Role;
