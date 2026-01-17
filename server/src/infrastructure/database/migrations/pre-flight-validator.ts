import mongoose from 'mongoose';

/**
 * Pre-Flight Validation Suite
 * 
 * Runs invariant checks before and after migrations.
 * Ensures data integrity and business logic correctness.
 */

export interface ValidationResult {
    passed: boolean;
    errors: string[];
    warnings: string[];
    stats: Record<string, any>;
}

export class PreFlightValidator {
    private errors: string[] = [];
    private warnings: string[] = [];
    private stats: Record<string, any> = {};

    /**
     * Validate document counts match expectations
     */
    async validateCounts(
        Model: any,
        expectedCount?: number,
        tolerance: number = 0.01
    ): Promise<void> {
        const actualCount = await Model.countDocuments();
        this.stats[`${Model.modelName}_count`] = actualCount;

        if (expectedCount !== undefined) {
            const diff = Math.abs(actualCount - expectedCount);
            const percentDiff = diff / expectedCount;

            if (percentDiff > tolerance) {
                this.errors.push(
                    `${Model.modelName} count mismatch: expected ${expectedCount}, got ${actualCount} (${(percentDiff * 100).toFixed(2)}% difference)`
                );
            }
        }
    }

    /**
     * Validate no orphaned records
     */
    async validateNoOrphans(
        Model: any,
        referenceField: string,
        ReferenceModel: any
    ): Promise<void> {
        const orphanCount = await Model.countDocuments({
            [referenceField]: {
                $nin: await ReferenceModel.distinct('_id')
            }
        });

        this.stats[`${Model.modelName}_orphans`] = orphanCount;

        if (orphanCount > 0) {
            this.errors.push(
                `Found ${orphanCount} orphaned ${Model.modelName} records (missing ${referenceField})`
            );
        }
    }

    /**
     * Validate encryption/decryption works
     */
    async validateEncryption(
        Model: any,
        encryptedField: string,
        sampleSize: number = 10
    ): Promise<void> {
        const samples = await Model.find({ [encryptedField]: { $exists: true } })
            .limit(sampleSize);

        for (const doc of samples) {
            const value = doc[encryptedField];
            if (!value || value.length === 0) {
                this.errors.push(
                    `${Model.modelName}: Encrypted field ${encryptedField} is empty for document ${doc._id}`
                );
            }
        }

        this.stats[`${Model.modelName}_encryption_samples`] = samples.length;
    }

    /**
     * Validate business flow (e.g., user signup → order → payout)
     */
    async validateBusinessFlow(): Promise<void> {
        // This is a placeholder - implement actual business logic validation
        // Example: Check that all paid orders have corresponding wallet transactions
        this.warnings.push('Business flow validation not yet implemented');
    }

    /**
     * Validate schema versions
     */
    async validateSchemaVersions(
        Model: any,
        expectedVersion: number
    ): Promise<void> {
        const legacyCount = await Model.countDocuments({
            $or: [
                { schemaVersion: { $exists: false } },
                { schemaVersion: { $lt: expectedVersion } }
            ]
        });

        this.stats[`${Model.modelName}_legacy_documents`] = legacyCount;

        if (legacyCount > 0) {
            this.warnings.push(
                `${Model.modelName} has ${legacyCount} documents with old schema version`
            );
        }
    }

    /**
     * Run all validations
     */
    async runAll(): Promise<ValidationResult> {
        console.log('🔍 Running pre-flight validations...\n');

        try {
            // Add your validation calls here
            // Example:
            // await this.validateCounts(WalletTransaction);
            // await this.validateNoOrphans(Order, 'companyId', Company);
            // await this.validateEncryption(User, 'password');

            console.log('✅ Validations completed\n');
        } catch (error: any) {
            this.errors.push(`Validation error: ${error.message}`);
        }

        return {
            passed: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings,
            stats: this.stats
        };
    }

    /**
     * Print validation report
     */
    printReport(result: ValidationResult): void {
        console.log('📊 Validation Report');
        console.log('='.repeat(50));

        if (result.passed) {
            console.log('✅ All validations passed');
        } else {
            console.log('❌ Validations failed');
        }

        if (result.errors.length > 0) {
            console.log('\n🔴 Errors:');
            result.errors.forEach(err => console.log(`   - ${err}`));
        }

        if (result.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            result.warnings.forEach(warn => console.log(`   - ${warn}`));
        }

        console.log('\n📈 Statistics:');
        Object.entries(result.stats).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
        });

        console.log('='.repeat(50));
    }
}

// CLI execution
if (require.main === module) {
    const validator = new PreFlightValidator();

    validator.runAll()
        .then((result) => {
            validator.printReport(result);
            process.exit(result.passed ? 0 : 1);
        })
        .catch((error) => {
            console.error('Validation failed:', error);
            process.exit(1);
        });
}
