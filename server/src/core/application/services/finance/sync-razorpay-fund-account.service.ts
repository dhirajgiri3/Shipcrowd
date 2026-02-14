/**
 * Sync Razorpay Fund Account Service
 *
 * Shared helper to create/update Razorpay fund account for company payouts.
 * Used by both addBankAccount and KYC verify-bank-account flows.
 * Non-blocking: logs errors but does not throw.
 */

import logger from '../../../../shared/logger/winston.logger';
import type { ICompany } from '../../../../infrastructure/database/mongoose/models/organization/core/company.model';

export interface BankDetailsForRazorpay {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
}

export interface SyncRazorpayResult {
    success: boolean;
    fundAccountId?: string;
    error?: string;
}

/**
 * Sync Razorpay fund account for a company.
 * Creates contact + fund account if not already present.
 * Does NOT save the company - caller must save.
 *
 * @param company Company document (will be mutated with financial.razorpay*)
 * @param bankDetails Bank account details for Razorpay
 * @returns { success, fundAccountId } or { success: false, error }
 */
export async function syncRazorpayFundAccount(
    company: ICompany,
    bankDetails: BankDetailsForRazorpay
): Promise<SyncRazorpayResult> {
    if (company.financial?.razorpayFundAccountId) {
        logger.debug('Razorpay fund account already exists, skipping creation', {
            companyId: company._id,
            fundAccountId: company.financial.razorpayFundAccountId,
        });
        return {
            success: true,
            fundAccountId: company.financial.razorpayFundAccountId,
        };
    }

    try {
        const { RazorpayPayoutProvider } = await import(
            '../../../../infrastructure/payment/razorpay/razorpay-payout.provider.js'
        );
        const razorpayProvider = new RazorpayPayoutProvider();

        const fundAccount = await razorpayProvider.createFundAccount(
            {
                accountNumber: bankDetails.accountNumber,
                ifscCode: bankDetails.ifscCode,
                accountHolderName: bankDetails.accountHolderName || (company.name ?? 'Company'),
            },
            company._id.toString()
        );

        company.financial = {
            razorpayContactId: fundAccount.contact_id,
            razorpayFundAccountId: fundAccount.id,
            lastPayoutAt: company.financial?.lastPayoutAt,
            totalPayoutsReceived: company.financial?.totalPayoutsReceived ?? 0,
        };

        logger.info('Razorpay fund account created and synced', {
            companyId: company._id,
            fundAccountId: fundAccount.id,
        });

        return { success: true, fundAccountId: fundAccount.id };
    } catch (error: any) {
        logger.error('RAZORPAY_FUND_ACCOUNT_SYNC_FAILED', {
            companyId: company._id,
            error: error?.message,
            stack: error?.stack,
        });
        return {
            success: false,
            error: error?.message ?? 'Unknown error',
        };
    }
}
