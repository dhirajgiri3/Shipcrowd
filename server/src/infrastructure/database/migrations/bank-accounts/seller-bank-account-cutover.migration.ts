import mongoose from 'mongoose';
import { BaseMigration } from '../base-migration';
import { Company, SellerBankAccount } from '../../mongoose/models';
import {
  computeFingerprint,
  normalizeAccount,
  normalizeIfsc,
} from '../../mongoose/models/finance/payouts/seller-bank-account.model';

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
      const legacyAccountNumber = normalizeAccount(String((company as any).billingInfo?.accountNumber || ''));
      const legacyIfsc = normalizeIfsc(String((company as any).billingInfo?.ifscCode || ''));
      if (!legacyAccountNumber || !legacyIfsc) {
        continue;
      }

      const fingerprint = computeFingerprint({
        companyId: (company as any)._id,
        accountNumber: legacyAccountNumber,
        ifscCode: legacyIfsc,
      });

      const existing = await SellerBankAccount.find({ companyId: (company as any)._id })
        .select('_id accountFingerprint ifscCode isDefault verificationStatus')
        .lean();

      const matching = existing.find(
        (acc: any) => acc.accountFingerprint === fingerprint && acc.ifscCode === legacyIfsc
      );

      const status = (company as any).billingInfo?.bankVerifiedAt ? 'verified' : 'pending';
      const shouldDefault = status === 'verified' && !existing.some((a: any) => a.isDefault === true);

      if (!this.dryRun) {
        if (matching?._id) {
          await SellerBankAccount.updateOne(
            { _id: matching._id },
            {
              $set: {
                bankName: (company as any).billingInfo?.bankName || 'Unknown Bank',
                accountHolderName: (company as any).billingInfo?.accountHolderName || 'Company Account',
                accountNumberEncrypted: legacyAccountNumber,
                accountLast4: legacyAccountNumber.slice(-4),
                verificationStatus: status,
                verifiedAt: (company as any).billingInfo?.bankVerifiedAt,
                isDefault: shouldDefault ? true : matching.isDefault,
                razorpayContactId:
                  (company as any).financial?.razorpayContactId || undefined,
                razorpayFundAccountId:
                  (company as any).financial?.razorpayFundAccountId || undefined,
              },
            }
          );
        } else {
          await SellerBankAccount.create({
            companyId: (company as any)._id,
            bankName: (company as any).billingInfo?.bankName || 'Unknown Bank',
            accountHolderName: (company as any).billingInfo?.accountHolderName || 'Company Account',
            accountNumberEncrypted: legacyAccountNumber,
            accountLast4: legacyAccountNumber.slice(-4),
            accountFingerprint: fingerprint,
            ifscCode: legacyIfsc,
            verificationStatus: status,
            verifiedAt: (company as any).billingInfo?.bankVerifiedAt,
            isDefault: shouldDefault,
            razorpayContactId: (company as any).financial?.razorpayContactId || undefined,
            razorpayFundAccountId: (company as any).financial?.razorpayFundAccountId || undefined,
          });
        }

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

    this.log('Seller bank account cutover migration executed successfully');
  }

  async rollback(): Promise<void> {
    this.log('Rollback is intentionally unsupported for seller-bank-account-cutover migration');
  }
}
