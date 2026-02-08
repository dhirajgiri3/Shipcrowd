import { Job } from 'bullmq';
import mongoose from 'mongoose';
import { Company, WalletTransaction } from '../../database/mongoose/models';
import logger from '../../../shared/logger/winston.logger';

/**
 * Wallet Reconciliation Job
 * 
 * Purpose:
 * Runs periodically (e.g., nightly) to assert that:
 * Company.wallet.balance == Sum(Credit Tx) - Sum(Debit Tx)
 * 
 * Logic:
 * 1. Iterates through all active companies.
 * 2. Aggregates all 'completed' wallet transactions.
 * 3. Compares calculated balance with stored balance.
 * 4. Logs/Alerts on mismatches.
 */
export const walletReconciliationProcessor = async (job: Job) => {
    logger.info('Starting Wallet Reconciliation Job...');
    const session = await mongoose.startSession();

    try {
        const companies = await Company.find({ isDeleted: false }).select('_id wallet.balance name');
        const companyIds = companies.map((company) => company._id);
        const aggregationResults = companyIds.length > 0
            ? await WalletTransaction.aggregate([
                {
                    $match: {
                        company: { $in: companyIds },
                        status: 'completed',
                        isDeleted: false
                    }
                },
                {
                    $group: {
                        _id: '$company',
                        totalCredits: {
                            $sum: {
                                $cond: [{ $in: ['$type', ['credit', 'refund']] }, '$amount', 0]
                            }
                        },
                        totalDebits: {
                            $sum: {
                                $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0]
                            }
                        }
                    }
                }
            ])
            : [];
        const summaryByCompany = new Map(
            aggregationResults.map((result) => [result._id.toString(), result])
        );
        let checkedCount = 0;
        let mismatchCount = 0;

        for (const company of companies) {
            checkedCount++;
            const companyId = company._id;
            const storedBalance = company.wallet?.balance || 0;

            const result = summaryByCompany.get(companyId.toString()) || { totalCredits: 0, totalDebits: 0 };
            const calculatedBalance = Math.round((result.totalCredits - result.totalDebits) * 100) / 100;

            // Compare with tolerance (floating point safety)
            const diff = Math.abs(storedBalance - calculatedBalance);

            if (diff > 0.01) {
                mismatchCount++;
                logger.error('CRITICAL: Wallet Balance Mismatch Detected', {
                    companyId,
                    companyName: company.name,
                    storedBalance,
                    calculatedBalance,
                    diff,
                    ledgerSummary: result
                });

                // TODO: Trigger Email Alert to Finance Ops
            }
        }

        logger.info('Wallet Reconciliation Job Completed', {
            checkedCount,
            mismatchCount,
            status: mismatchCount > 0 ? 'Passed with Warnings' : 'Passed Successfully'
        });

        return { checkedCount, mismatchCount };

    } catch (error) {
        logger.error('Wallet Reconciliation Job Failed', error);
        throw error;
    } finally {
        await session.endSession();
    }
};
