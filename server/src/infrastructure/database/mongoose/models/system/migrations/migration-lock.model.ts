import mongoose, { Document, Schema } from 'mongoose';

/**
 * Migration Lock Model
 * 
 * Ensures only one migration worker runs at a time.
 * Prevents race conditions and duplicate migrations.
 */

export interface IMigrationLock extends Document {
    migrationName: string;
    lockedAt: Date;
    lockedBy: string; // hostname or worker ID
    expiresAt: Date;
    status: 'locked' | 'released';
}

const MigrationLockSchema = new Schema<IMigrationLock>({
    migrationName: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    lockedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    lockedBy: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['locked', 'released'],
        default: 'locked',
        required: true
    }
}, {
    timestamps: true,
    collection: 'migration_locks'
});

// TTL index to auto-release stale locks
MigrationLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const MigrationLock = mongoose.model<IMigrationLock>('MigrationLock', MigrationLockSchema);

export default MigrationLock;
