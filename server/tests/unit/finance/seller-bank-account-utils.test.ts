import mongoose from 'mongoose';
import {
computeFingerprint,
maskAccount,
normalizeAccount,
normalizeIfsc,
} from '../../../src/infrastructure/database/mongoose/models/finance/payouts/seller-bank-account.model';

describe('SellerBankAccount utilities', () => {
  it('normalizes account and IFSC values consistently', () => {
    expect(normalizeAccount(' 1234 5678 90 ')).toBe('1234567890');
    expect(normalizeIfsc(' hdfc0001234 ')).toBe('HDFC0001234');
  });

  it('masks account numbers to last 4 digits only', () => {
    expect(maskAccount('123456789012')).toBe('****9012');
  });

  it('computes stable HMAC fingerprint and varies by company', () => {
    const companyA = new mongoose.Types.ObjectId();
    const companyB = new mongoose.Types.ObjectId();

    const one = computeFingerprint({
      companyId: companyA,
      accountNumber: '123456789012',
      ifscCode: 'hdfc0001234',
    });

    const two = computeFingerprint({
      companyId: companyA,
      accountNumber: '123456789012',
      ifscCode: 'HDFC0001234',
    });

    const three = computeFingerprint({
      companyId: companyB,
      accountNumber: '123456789012',
      ifscCode: 'HDFC0001234',
    });

    expect(one).toHaveLength(64);
    expect(one).toBe(two);
    expect(one).not.toBe(three);
  });
});

