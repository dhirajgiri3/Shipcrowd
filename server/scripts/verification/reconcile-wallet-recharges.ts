import 'dotenv/config';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import WalletService from '../../src/core/application/services/wallet/wallet.service';
import WalletTransaction from '../../src/infrastructure/database/mongoose/models/finance/wallets/wallet-transaction.model';

type CliOptions = {
    days: number;
    dryRun: boolean;
    limit: number;
};

type RechargePayment = {
    id: string;
    order_id?: string;
    amount: number;
    currency: string;
    status: string;
    notes?: Record<string, string>;
    created_at: number;
};

const parseArgs = (): CliOptions => {
    const args = process.argv.slice(2);
    const options: CliOptions = {
        days: 7,
        dryRun: true,
        limit: 100,
    };

    for (const arg of args) {
        if (arg.startsWith('--days=')) {
            options.days = Math.max(1, Number(arg.split('=')[1]) || options.days);
        } else if (arg === '--apply') {
            options.dryRun = false;
        } else if (arg.startsWith('--limit=')) {
            options.limit = Math.min(100, Math.max(10, Number(arg.split('=')[1]) || options.limit));
        } else if (arg === '--dry-run') {
            options.dryRun = true;
        }
    }

    return options;
};

const getRazorpayClient = (): Razorpay => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new Error('Missing Razorpay credentials: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
    }

    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });
};

const fetchCapturedWalletRecharges = async (
    razorpay: Razorpay,
    fromUnix: number,
    toUnix: number,
    limit: number
): Promise<RechargePayment[]> => {
    const payments: RechargePayment[] = [];
    let skip = 0;

    while (true) {
        const response = await razorpay.payments.all({
            from: fromUnix,
            to: toUnix,
            count: limit,
            skip,
        }) as unknown as { items?: RechargePayment[] };

        const items = response.items || [];
        if (items.length === 0) break;

        const filtered = items.filter((payment) => {
            const notes = payment.notes || {};
            const purpose = notes.purpose || notes.type;
            return payment.status === 'captured' && purpose === 'wallet_recharge';
        });
        payments.push(...filtered);

        if (items.length < limit) break;
        skip += limit;
    }

    return payments;
};

const hasWalletCredit = async (companyId: string, paymentId: string): Promise<boolean> => {
    const existing = await WalletTransaction.findOne({
        company: companyId,
        reason: 'recharge',
        type: 'credit',
        $or: [
            { 'reference.externalId': paymentId },
            { 'metadata.idempotencyKey': `wallet-recharge:${paymentId}` },
        ],
    }).select('_id').lean();

    return Boolean(existing);
};

async function main() {
    const options = parseArgs();
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('Missing MONGODB_URI');
    }

    const nowUnix = Math.floor(Date.now() / 1000);
    const fromUnix = nowUnix - options.days * 24 * 60 * 60;

    await mongoose.connect(mongoUri);
    const razorpay = getRazorpayClient();

    console.log('Wallet recharge reconciliation started');
    console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'APPLY'}`);
    console.log(`Window: last ${options.days} day(s)`);

    const payments = await fetchCapturedWalletRecharges(razorpay, fromUnix, nowUnix, options.limit);

    let missing = 0;
    let fixed = 0;
    let failed = 0;
    let skipped = 0;

    for (const payment of payments) {
        const notes = payment.notes || {};
        const companyId = notes.companyId;

        if (!companyId) {
            skipped++;
            console.log(`[SKIP] ${payment.id} missing companyId in notes`);
            continue;
        }

        const exists = await hasWalletCredit(companyId, payment.id);
        if (exists) {
            continue;
        }

        missing++;
        if (options.dryRun) {
            console.log(`[MISSING] payment=${payment.id} company=${companyId} amount=${payment.amount / 100}`);
            continue;
        }

        const result = await WalletService.processCapturedRechargeWebhook(payment.id);
        if (result.success) {
            fixed++;
            console.log(`[FIXED] payment=${payment.id} tx=${result.transactionId}`);
        } else {
            failed++;
            console.log(`[FAILED] payment=${payment.id} error=${result.error}`);
        }
    }

    console.log('\nReconciliation summary');
    console.log(`Captured wallet recharge payments scanned: ${payments.length}`);
    console.log(`Missing wallet credits detected: ${missing}`);
    console.log(`Skipped (missing companyId): ${skipped}`);
    if (!options.dryRun) {
        console.log(`Fixed: ${fixed}`);
        console.log(`Failed: ${failed}`);
    }
}

main()
    .catch((error) => {
        console.error('Reconciliation failed:', error.message || error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
