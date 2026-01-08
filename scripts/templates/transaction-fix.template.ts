/**
 * TEMPLATE: Transaction Fix Pattern
 * 
 * Use this template when adding transaction support to services with multiple
 * database operations that must be atomic (all succeed or all fail).
 * 
 * WHEN TO USE:
 * - Service has 2+ await Model.update/create operations
 * - Operations modify related models (Order + Shipment, Commission + Wallet)
 * - Data consistency is critical (financial, inventory, status updates)
 * 
 * PATTERN:
 * 1. Start session
 * 2. Start transaction
 * 3. Pass { session } to all DB operations
 * 4. Commit on success
 * 5. Abort on error
 * 6. Always end session in finally
 */

import mongoose from 'mongoose';
import { logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/errors/AppError';

export class ServiceName {
    /**
     * Method description
     * 
     * @transaction This method uses transactions to ensure atomicity
     */
    async methodName(id: string, data: DataType): Promise<ReturnType> {
        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            // ============================================
            // TODO: Replace with your actual logic
            // ============================================

            // Example: Update primary model
            const result = await PrimaryModel.updateOne(
                { _id: id },
                { $set: data },
                { session } // ← CRITICAL: Pass session
            );

            if (!result.modifiedCount) {
                throw new AppError('Record not found', 'NOT_FOUND', 404);
            }

            // Example: Update related model
            await RelatedModel.updateOne(
                { primaryId: id },
                { $set: { status: 'updated' } },
                { session } // ← CRITICAL: Pass session
            );

            // Example: Create audit log
            await AuditLog.create([{
                action: 'update',
                resourceId: id,
                timestamp: new Date(),
            }], { session }); // ← CRITICAL: Use array with session

            // ============================================
            // Commit transaction
            // ============================================
            await session.commitTransaction();

            logger.info('Operation completed successfully', { id });

            return result;

        } catch (error) {
            // ============================================
            // Rollback on error
            // ============================================
            await session.abortTransaction();

            logger.error('Operation failed, transaction rolled back', {
                id,
                error: error.message,
            });

            // Re-throw or wrap in AppError
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError(
                'Operation failed',
                'OPERATION_FAILED',
                500,
                error
            );

        } finally {
            // ============================================
            // CRITICAL: Always end session
            // ============================================
            session.endSession();
        }
    }
}

/**
 * CHECKLIST AFTER APPLYING:
 * 
 * [ ] All DB operations have { session } option
 * [ ] Model.create uses array syntax: create([data], { session })
 * [ ] Transaction commits on success
 * [ ] Transaction aborts on error
 * [ ] Session ends in finally block
 * [ ] Logged success/failure
 * [ ] Error handling preserves original error info
 * [ ] Added unit test for rollback behavior
 */
