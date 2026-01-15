/**
 * Migration: Invalidate existing recovery tokens
 * 
 * Reason: Tokens are now hashed with SHA-256. Existing plain-text tokens
 * are invalid and should be deleted. Users will need to request new reset links.
 * 
 * Impact: Low - tokens expire in 4h anyway
 * 
 * Date: 2026-01-16
 */

import mongoose from 'mongoose';
import RecoveryToken from '../mongoose/models/auth/recovery-token.model';
import logger from '../../../shared/logger/winston.logger';

export async function up(): Promise<void> {
    logger.info('Migration: Deleting all existing recovery tokens');

    const result = await RecoveryToken.deleteMany({});

    logger.info(`Migration complete: Deleted ${result.deletedCount} recovery tokens`);
    logger.info('Users will need to request new password reset links');
}

export async function down(): Promise<void> {
    // Cannot reverse - tokens are already deleted and expired anyway
    logger.info('Migration rollback: No action needed (tokens already expired)');
}
