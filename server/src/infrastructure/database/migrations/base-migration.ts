import mongoose from 'mongoose';
import MigrationLock from '../mongoose/models/system/migrations/migration-lock.model';
import MigrationProgress from '../mongoose/models/system/migrations/migration-progress.model';
import os from 'os';

/**
 * Base Migration Runner
 * 
 * Provides infrastructure for safe, resumable, idempotent migrations.
 * All migration scripts should extend this class.
 */

export interface MigrationOptions {
    migrationName: string;
    phase: string;
    batchSize?: number;
    dryRun?: boolean;
    lockTimeout?: number; // milliseconds
}

export abstract class BaseMigration {
    protected migrationName: string;
    protected phase: string;
    protected batchSize: number;
    protected dryRun: boolean;
    protected lockTimeout: number;
    protected workerId: string;

    constructor(options: MigrationOptions) {
        this.migrationName = options.migrationName;
        this.phase = options.phase;
        this.batchSize = options.batchSize || 500;
        this.dryRun = options.dryRun || false;
        this.lockTimeout = options.lockTimeout || 30 * 60 * 1000; // 30 minutes
        this.workerId = `${os.hostname()}-${process.pid}`;
    }

    /**
     * Acquire migration lock
     */
    protected async acquireLock(): Promise<boolean> {
        try {
            const expiresAt = new Date(Date.now() + this.lockTimeout);

            await MigrationLock.create({
                migrationName: this.migrationName,
                lockedBy: this.workerId,
                expiresAt,
                status: 'locked'
            });

            console.log(`✅ Lock acquired for ${this.migrationName}`);
            return true;
        } catch (error: any) {
            if (error.code === 11000) {
                // Duplicate key - lock already exists
                const existingLock = await MigrationLock.findOne({ migrationName: this.migrationName });

                if (existingLock && existingLock.expiresAt < new Date()) {
                    // Lock expired, release and retry
                    await this.releaseLock();
                    return this.acquireLock();
                }

                console.error(`❌ Migration ${this.migrationName} is already running (locked by ${existingLock?.lockedBy})`);
                return false;
            }
            throw error;
        }
    }

    /**
     * Release migration lock
     */
    protected async releaseLock(): Promise<void> {
        await MigrationLock.updateOne(
            { migrationName: this.migrationName },
            { status: 'released' }
        );
        console.log(`🔓 Lock released for ${this.migrationName}`);
    }

    /**
     * Initialize or resume migration progress
     */
    protected async initializeProgress(): Promise<void> {
        const existing = await MigrationProgress.findOne({ migrationName: this.migrationName });

        if (!existing) {
            await MigrationProgress.create({
                migrationName: this.migrationName,
                phase: this.phase,
                status: 'running',
                startedAt: new Date(),
                batchSize: this.batchSize,
                dryRun: this.dryRun,
                totalDocuments: 0,
                processedDocuments: 0,
                failedDocuments: 0,
                skippedDocuments: 0
            });
        } else if (existing.status === 'failed' || existing.status === 'pending') {
            // Resume from last checkpoint
            existing.status = 'running';
            existing.startedAt = new Date();
            await existing.save();
            console.log(`🔄 Resuming migration from document ID: ${existing.lastProcessedId}`);
        }
    }

    /**
     * Update migration progress
     */
    protected async updateProgress(update: Partial<{
        lastProcessedId: mongoose.Types.ObjectId;
        processedDocuments: number;
        failedDocuments: number;
        skippedDocuments: number;
        totalDocuments: number;
    }>): Promise<void> {
        await MigrationProgress.updateOne(
            { migrationName: this.migrationName },
            { $set: update }
        );
    }

    /**
     * Mark migration as completed
     */
    protected async markCompleted(): Promise<void> {
        await MigrationProgress.updateOne(
            { migrationName: this.migrationName },
            {
                status: 'completed',
                completedAt: new Date()
            }
        );
        console.log(`✅ Migration ${this.migrationName} completed successfully`);
    }

    /**
     * Mark migration as failed
     */
    protected async markFailed(error: string): Promise<void> {
        await MigrationProgress.updateOne(
            { migrationName: this.migrationName },
            {
                status: 'failed',
                error
            }
        );
        console.error(`❌ Migration ${this.migrationName} failed: ${error}`);
    }

    /**
     * Get current progress
     */
    /**
     * Log message with timestamp
     */
    protected log(message: string): void {
        console.log(`[${new Date().toISOString()}] ${message}`);
    }

    /**
     * Process documents in batches
     */
    protected async processInBatches(
        model: mongoose.Model<any>,
        query: any,
        processor: (batch: any[]) => Promise<void>
    ): Promise<void> {
        const total = await model.countDocuments(query);
        let processed = 0;
        let skip = 0;

        while (processed < total) {
            const batch = await model.find(query)
                .skip(skip)
                .limit(this.batchSize)
                .lean(); // Use lean for performance unless save() is needed

            if (batch.length === 0) break;

            if (this.dryRun) {
                this.log(`[DRY RUN] Would process batch of ${batch.length} documents (Skip: ${skip})`);
            } else {
                await processor(batch);

                // Update progress
                await this.updateProgress({
                    processedDocuments: processed + batch.length
                });
            }

            processed += batch.length;
            skip += this.batchSize;

            // Log progress
            const percent = Math.round((processed / total) * 100);
            this.log(`Progress: ${percent}% (${processed}/${total})`);
        }
    }

    /**
     * Abstract method: Execute migration logic
     * Must be implemented by subclasses
     */
    abstract execute(): Promise<void>;

    /**
     * Abstract method: Rollback migration logic
     * Must be implemented by subclasses
     */
    abstract rollback(): Promise<void>;

    /**
     * Run migration with safety checks
     */
    async run(): Promise<void> {
        console.log(`\n🚀 Starting migration: ${this.migrationName}`);
        console.log(`   Phase: ${this.phase}`);
        console.log(`   Dry Run: ${this.dryRun ? 'YES' : 'NO'}`);
        console.log(`   Batch Size: ${this.batchSize}`);

        try {
            // Acquire lock
            const lockAcquired = await this.acquireLock();
            if (!lockAcquired) {
                throw new Error('Failed to acquire migration lock');
            }

            // Initialize progress tracking
            await this.initializeProgress();

            // Execute migration
            await this.execute();

            // Mark as completed
            await this.markCompleted();

        } catch (error: any) {
            await this.markFailed(error.message);
            throw error;
        } finally {
            // Always release lock
            await this.releaseLock();
        }
    }
}
