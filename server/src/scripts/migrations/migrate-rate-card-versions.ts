import mongoose from 'mongoose';
import RateCard from '../../infrastructure/database/mongoose/models/logistics/shipping/configuration/rate-card.model';
import logger from '../../shared/logger/winston.logger';

/**
 * Migration Script: Add Sequential Versioning to Existing Rate Cards
 * 
 * This migrates existing rate cards to the new versioning system by:
 * 1. Adding versionNumber field (starting at 1)
 * 2. Setting initial approval metadata
 * 3. Preserving existing version string for backward compatibility
 */

export async function migrateRateCardVersions(): Promise<void> {
    try {
        logger.info('[RateCardMigration] Starting rate card versioning migration...');

        // Find all rate cards without versionNumber
        const cardsToMigrate = await RateCard.find({
            $or: [
                { versionNumber: { $exists: false } },
                { versionNumber: null }
            ]
        });

        logger.info(`[RateCardMigration] Found ${cardsToMigrate.length} rate cards to migrate`);

        let migratedCount = 0;
        let errorCount = 0;

        for (const card of cardsToMigrate) {
            try {
                // Set initial versioning fields
                card.versionNumber = 1;
                card.approvedBy = undefined; // System migration - no specific user
                card.approvedAt = card.createdAt; // Use creation date as initial approval
                card.changeReason = 'Migrated from legacy version string system';
                card.deprecatedAt = undefined;

                // Preserve existing version string for backward compatibility
                if (!card.version) {
                    card.version = 'v1';
                }

                await card.save();
                migratedCount++;

                if (migratedCount % 100 === 0) {
                    logger.info(`[RateCardMigration] Progress: ${migratedCount}/${cardsToMigrate.length}`);
                }
            } catch (error) {
                errorCount++;
                logger.error(`[RateCardMigration] Error migrating card ${card._id}:`, error);
            }
        }

        logger.info(`[RateCardMigration] Migration complete!`, {
            total: cardsToMigrate.length,
            migrated: migratedCount,
            errors: errorCount
        });

        if (errorCount > 0) {
            throw new Error(`Migration completed with ${errorCount} errors`);
        }
    } catch (error) {
        logger.error('[RateCardMigration] Migration failed:', error);
        throw error;
    }
}

// Execute if run directly
if (require.main === module) {
    const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd';

    mongoose
        .connect(DB_URI)
        .then(async () => {
            logger.info('[RateCardMigration] Connected to database');
            await migrateRateCardVersions();
            await mongoose.disconnect();
            logger.info('[RateCardMigration] Disconnected from database');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('[RateCardMigration] Database connection failed:', error);
            process.exit(1);
        });
}
