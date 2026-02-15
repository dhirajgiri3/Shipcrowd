import mongoose from 'mongoose';
import { Company, KYC, SellerBankAccount } from '../../mongoose/models';
import {
computeFingerprint,
normalizeAccount,
normalizeIfsc,
} from '../../mongoose/models/finance/payouts/seller-bank-account.model';
import { BaseMigration } from '../base-migration';

export class SellerBankAccountCutoverMigration extends BaseMigration {
  constructor(dryRun = false) {
    super({
      migrationName: 'seller-bank-account-cutover',
      phase: 'bank-accounts',
      batchSize: 200,
      dryRun,
    });
  }

  async execute(): Promise<void> {
    const upsertSellerBankAccount = async (params: {
      companyId: mongoose.Types.ObjectId;
      bankName?: string;
      accountHolderName?: string;
      accountNumber: string;
      ifscCode: string;
      verifiedAt?: Date;
      razorpayContactId?: string;
      razorpayFundAccountId?: string;
    }): Promise<void> => {
      const normalizedAccount = normalizeAccount(params.accountNumber);
      const normalizedIfsc = normalizeIfsc(params.ifscCode);
      if (!normalizedAccount || !normalizedIfsc) return;

      const fingerprint = computeFingerprint({
        companyId: params.companyId,
        accountNumber: normalizedAccount,
        ifscCode: normalizedIfsc,
      });

      const existing = await SellerBankAccount.find({ companyId: params.companyId })
        .select('_id accountFingerprint ifscCode isDefault verificationStatus verifiedAt razorpayContactId razorpayFundAccountId')
        .lean();

      const matching = existing.find(
        (acc: any) => acc.accountFingerprint === fingerprint && acc.ifscCode === normalizedIfsc
      ) as any;

      const incomingStatus = params.verifiedAt ? 'verified' : 'pending';
      const hasVerifiedDefault = existing.some(
        (a: any) => a.isDefault === true && a.verificationStatus === 'verified'
      );
      const shouldDefault = incomingStatus === 'verified' && !hasVerifiedDefault;

      if (!this.dryRun) {
        if (matching?._id) {
          const mergedStatus =
            matching.verificationStatus === 'verified' || incomingStatus === 'verified'
              ? 'verified'
              : 'pending';

          await SellerBankAccount.updateOne(
            { _id: matching._id },
            {
              $set: {
                bankName: params.bankName || 'Unknown Bank',
                accountHolderName: params.accountHolderName || 'Company Account',
                accountNumberEncrypted: normalizedAccount,
                accountLast4: normalizedAccount.slice(-4),
                verificationStatus: mergedStatus,
                verifiedAt: matching.verifiedAt || params.verifiedAt,
                isDefault: matching.isDefault || shouldDefault,
                razorpayContactId:
                  matching.razorpayContactId || params.razorpayContactId || undefined,
                razorpayFundAccountId:
                  matching.razorpayFundAccountId || params.razorpayFundAccountId || undefined,
              },
            }
          );
        } else {
          await SellerBankAccount.create({
            companyId: params.companyId,
            bankName: params.bankName || 'Unknown Bank',
            accountHolderName: params.accountHolderName || 'Company Account',
            accountNumberEncrypted: normalizedAccount,
            accountLast4: normalizedAccount.slice(-4),
            accountFingerprint: fingerprint,
            ifscCode: normalizedIfsc,
            verificationStatus: incomingStatus,
            verifiedAt: params.verifiedAt,
            isDefault: shouldDefault,
            razorpayContactId: params.razorpayContactId || undefined,
            razorpayFundAccountId: params.razorpayFundAccountId || undefined,
          });
        }
      }
    };

    const companies = await Company.find({
      $or: [
        { 'billingInfo.accountNumber': { $exists: true, $ne: null } },
        { 'billingInfo.ifscCode': { $exists: true, $ne: null } },
      ],
    })
      .select('_id billingInfo financial')
      .lean();

    this.log(`Found ${companies.length} companies eligible for seller bank account cutover`);

    for (const company of companies) {
      await upsertSellerBankAccount({
        companyId: (company as any)._id,
        bankName: (company as any).billingInfo?.bankName,
        accountHolderName: (company as any).billingInfo?.accountHolderName,
        accountNumber: String((company as any).billingInfo?.accountNumber || ''),
        ifscCode: String((company as any).billingInfo?.ifscCode || ''),
        verifiedAt: (company as any).billingInfo?.bankVerifiedAt,
        razorpayContactId: (company as any).financial?.razorpayContactId,
        razorpayFundAccountId: (company as any).financial?.razorpayFundAccountId,
      });

      if (!this.dryRun) {
        await Company.updateOne(
          { _id: (company as any)._id },
          {
            $unset: {
              'billingInfo.bankName': 1,
              'billingInfo.accountNumber': 1,
              'billingInfo.ifscCode': 1,
              'billingInfo.accountHolderName': 1,
              'billingInfo.bankVerifiedAt': 1,
              'financial.razorpayContactId': 1,
              'financial.razorpayFundAccountId': 1,
              'financial.bankDetailsHash': 1,
            },
          }
        );
      }
    }

    const kycWithBank = await KYC.find({
      'documents.bankAccount.accountNumber': { $exists: true, $ne: null },
      'documents.bankAccount.ifscCode': { $exists: true, $ne: null },
      companyId: { $exists: true, $ne: null },
    })
      .select('companyId documents.bankAccount')
      .lean();

    this.log(`Found ${kycWithBank.length} KYC documents with bank account for backfill`);

    for (const kyc of kycWithBank) {
      const bank = (kyc as any).documents?.bankAccount;
      await upsertSellerBankAccount({
        companyId: (kyc as any).companyId,
        bankName: bank?.bankName,
        accountHolderName: bank?.accountHolderName,
        accountNumber: String(bank?.accountNumber || ''),
        ifscCode: String(bank?.ifscCode || ''),
        verifiedAt: bank?.verifiedAt || (bank?.verified ? new Date() : undefined),
      });
    }

    this.log('Seller bank account cutover migration executed successfully');
  }

  async rollback(): Promise<void> {
    this.log('Rollback is intentionally unsupported for seller-bank-account-cutover migration');
  }
}
