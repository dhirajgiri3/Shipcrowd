import mongoose, { ClientSession } from 'mongoose';

/**
 * Transaction Helper Utility
 * 
 * WHY: Prevent data inconsistency from partial multi-document updates
 * 
 * Issue: Operations that update multiple documents (e.g., KYC verification + user update,
 * shipment creation + order update) can leave data in inconsistent state if one operation
 * fails after another succeeds.
 * 
 * Reference: docs/Backend-Fixes-Suggestions.md, Section 4 - Critical: Missing Transactions
 * 
 * Example incident scenario:
 * - KYC marked as verified (operation 1 succeeds)
 * - User status update fails due to network error (operation 2 fails)
 * - Result: KYC verified but user.kycStatus.isComplete = false (inconsistent state)
 * 
 * ---
 * 
 * NOTE: This utility is created in Phase 1 but INTENTIONALLY NOT USED yet.
 * It will be integrated into controllers during Phase 2 (Controller Refactoring).
 * 
 * Why not use it now?
 * - Session A scope is limited to models only
 * - Transaction logic needs to be added in service/controller layer (Phase 2)
 * - Adding it now would require modifying controllers (out of scope)
 * 
 * ---
 */

/**
 * Executes a function within a MongoDB transaction
 * Automatically handles session lifecycle (start, commit, abort, end)
 * 
 * @param fn - Function to execute within transaction context
 * @returns Promise resolving to the function's return value
 * 
 * @example
 * // Phase 2 usage (in service layer):
 * await withTransaction(async (session) => {
 *   kyc.status = 'verified';
 *   await kyc.save({ session });
 * 
 *   await User.findByIdAndUpdate(
 *     userId,
 *     { 'kycStatus.isComplete': true },
 *     { session }
 *   );
 * });
 */
export async function withTransaction<T>(
    fn: (session: ClientSession) => Promise<T>
): Promise<T> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const result = await fn(session);
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}
