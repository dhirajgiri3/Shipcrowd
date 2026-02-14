import logger from '../../../../shared/logger/winston.logger';
import type { ISellerBankAccount } from '../../../../infrastructure/database/mongoose/models/finance/payouts/seller-bank-account.model';

export interface BankDetailsForRazorpay {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
}

export interface SyncRazorpayResult {
    success: boolean;
    contactId?: string;
    fundAccountId?: string;
    skipped?: boolean;
    error?: string;
}

const createRazorpayFundAccount = async (params: {
    companyId: string;
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
}) => {
    const { RazorpayPayoutProvider } = await import(
        '../../../../infrastructure/payment/razorpay/razorpay-payout.provider.js'
    );
    const razorpayProvider = new RazorpayPayoutProvider();
    return razorpayProvider.createFundAccount(
        {
            accountNumber: params.accountNumber,
            ifscCode: params.ifscCode,
            accountHolderName: params.accountHolderName,
        },
        params.companyId
    );
};

export async function syncRazorpayFundAccountForSellerBankAccount(
    bankAccount: ISellerBankAccount,
    bankDetails: BankDetailsForRazorpay
): Promise<SyncRazorpayResult> {
    try {
        if (bankAccount.razorpayFundAccountId) {
            return {
                success: true,
                contactId: bankAccount.razorpayContactId,
                fundAccountId: bankAccount.razorpayFundAccountId,
                skipped: true,
            };
        }

        const fundAccount = await createRazorpayFundAccount({
            companyId: bankAccount.companyId.toString(),
            accountNumber: bankDetails.accountNumber,
            ifscCode: bankDetails.ifscCode,
            accountHolderName: bankDetails.accountHolderName,
        });

        bankAccount.razorpayContactId = fundAccount.contact_id;
        bankAccount.razorpayFundAccountId = fundAccount.id;

        return {
            success: true,
            contactId: fundAccount.contact_id,
            fundAccountId: fundAccount.id,
        };
    } catch (error: any) {
        logger.error('RAZORPAY_FUND_ACCOUNT_SYNC_FAILED_FOR_SELLER_ACCOUNT', {
            companyId: bankAccount.companyId,
            bankAccountId: bankAccount._id,
            error: error?.message,
        });
        return {
            success: false,
            error: error?.message ?? 'Unknown error',
        };
    }
}
