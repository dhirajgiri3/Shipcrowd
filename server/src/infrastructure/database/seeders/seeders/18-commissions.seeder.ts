/**
 * Commissions Seeder
 * 
 * Seeds commission system data:
 * - CommissionRules: 10-20 rules (percentage, flat, tiered, revenue-share)
 * - CommissionTransactions: 500-1000 transactions linked to orders
 * - CommissionAdjustments: 50-100 adjustments (bonuses, penalties)
 */

import mongoose from 'mongoose';
import SalesRepresentative from '../../mongoose/models/crm/sales/sales-representative.model';
import CommissionAdjustment from '../../mongoose/models/finance/commission/commission-adjustment.model';
import CommissionRule from '../../mongoose/models/finance/commission/commission-rule.model';
import CommissionTransaction from '../../mongoose/models/finance/commission/commission-transaction.model';
import User from '../../mongoose/models/iam/users/user.model';
import Order from '../../mongoose/models/orders/core/order.model';
import Company from '../../mongoose/models/organization/core/company.model';
import { addDays, subDays } from '../utils/date.utils';
import { createTimer, logger } from '../utils/logger.utils';
import { randomInt, selectRandom, selectWeightedFromObject } from '../utils/random.utils';

// Rule type distribution
const RULE_TYPE_DISTRIBUTION = {
    percentage: 40,
    flat: 20,
    tiered: 25,
    'revenue-share': 15,
};

// Transaction status distribution
const TRANSACTION_STATUS_DISTRIBUTION = {
    pending: 20,
    approved: 30,
    paid: 45,
    rejected: 3,
    cancelled: 2,
};

// Adjustment type distribution (valid: bonus, penalty, correction, dispute, other)
const ADJUSTMENT_TYPE_DISTRIBUTION = {
    bonus: 40,
    penalty: 20,
    correction: 25,
    dispute: 10,
    other: 5,
};

// Rule names by type
const RULE_NAMES: Record<string, string[]> = {
    percentage: ['Standard Commission', 'Premium Rate', 'Partner Program', 'Enterprise Deal'],
    flat: ['Fixed Per Order', 'Bulk Order Bonus', 'Minimum Guarantee', 'Setup Fee'],
    tiered: ['Volume Based', 'Growth Incentive', 'Quarterly Milestone', 'Annual Target'],
    'revenue-share': ['Profit Sharing', 'Revenue Partnership', 'Margin Based', 'Net Profit Cut'],
};

/**
 * Generate tiers for tiered rules
 */
function generateTiers(): any[] {
    return [
        { minValue: 0, maxValue: 10000, rate: 5 },
        { minValue: 10001, maxValue: 50000, rate: 7 },
        { minValue: 50001, maxValue: 100000, rate: 10 },
        { minValue: 100001, maxValue: 500000, rate: 12 },
        { minValue: 500001, maxValue: 10000000, rate: 15 },
    ];
}

/**
 * Generate a commission rule
 */
function generateRule(
    companyId: mongoose.Types.ObjectId,
    createdBy: mongoose.Types.ObjectId,
    index: number
): any {
    const ruleType = selectWeightedFromObject(RULE_TYPE_DISTRIBUTION);
    const createdAt = subDays(new Date(), randomInt(30, 365));

    const rule: any = {
        name: `${selectRandom(RULE_NAMES[ruleType])} ${index + 1}`,
        company: companyId,
        ruleType,
        isActive: Math.random() > 0.1,
        priority: randomInt(1, 100),
        applicableCategories: Math.random() > 0.5 ? [selectRandom(['fashion', 'electronics', 'home', 'beauty'])] : [],
        effectiveFrom: createdAt,
        effectiveTo: Math.random() > 0.7 ? addDays(createdAt, randomInt(90, 365)) : undefined,
        createdBy,
        createdAt,
        updatedAt: createdAt,
    };

    // Add type-specific fields
    switch (ruleType) {
        case 'percentage':
            rule.percentageRate = randomInt(5, 20);
            break;
        case 'flat':
            rule.flatAmount = randomInt(50, 500);
            break;
        case 'tiered':
            rule.tiers = generateTiers();
            break;
        case 'revenue-share':
            rule.percentageRate = randomInt(10, 30);
            break;
    }

    // Add conditions
    if (Math.random() > 0.5) {
        rule.conditions = {
            minOrderValue: randomInt(500, 2000),
            maxOrderValue: Math.random() > 0.5 ? randomInt(50000, 200000) : undefined,
        };
    }

    return rule;
}

/**
 * Calculate commission based on rule
 */
function calculateCommission(rule: any, orderValue: number): number {
    switch (rule.ruleType) {
        case 'percentage':
            return Math.round(orderValue * (rule.percentageRate / 100));
        case 'flat':
            return rule.flatAmount;
        case 'tiered':
            const tier = rule.tiers.find((t: any) => orderValue >= t.minValue && orderValue <= t.maxValue);
            return tier ? Math.round(orderValue * (tier.rate / 100)) : 0;
        case 'revenue-share':
            const profit = orderValue * 0.3; // Assume 30% margin
            return Math.round(profit * (rule.percentageRate / 100));
        default:
            return 0;
    }
}

/**
 * Generate a commission transaction
 */
function generateTransaction(
    companyId: mongoose.Types.ObjectId,
    salesRepId: mongoose.Types.ObjectId,
    orderId: mongoose.Types.ObjectId,
    ruleId: mongoose.Types.ObjectId,
    rule: any,
    orderValue: number
): any {
    const status = selectWeightedFromObject(TRANSACTION_STATUS_DISTRIBUTION);
    const calculatedAmount = calculateCommission(rule, orderValue);
    const createdAt = subDays(new Date(), randomInt(1, 90));

    const transaction: any = {
        company: companyId,
        salesRepresentative: salesRepId,
        order: orderId,
        commissionRule: ruleId,
        calculatedAmount,
        adjustments: [],
        finalAmount: calculatedAmount,
        status,
        calculatedAt: createdAt,
        version: 0,
        metadata: {
            orderValue,
            ruleType: rule.ruleType,
            eventType: 'order_completed',
        },
        createdAt,
        updatedAt: createdAt,
    };

    // Add status-specific fields
    if (['approved', 'paid'].includes(status)) {
        transaction.approvedAt = addDays(createdAt, randomInt(1, 5));
    }
    if (status === 'paid') {
        transaction.paidAt = addDays(transaction.approvedAt, randomInt(1, 7));
    }
    if (status === 'rejected') {
        transaction.rejectedAt = addDays(createdAt, randomInt(1, 3));
        transaction.rejectionReason = selectRandom([
            'Order cancelled by customer',
            'Fraudulent order detected',
            'Duplicate commission claim',
            'Ineligible order type',
        ]);
    }

    return transaction;
}

/**
 * Generate a commission adjustment
 */
function generateAdjustment(
    companyId: mongoose.Types.ObjectId,
    salesRepId: mongoose.Types.ObjectId,
    transactionId: mongoose.Types.ObjectId,
    createdBy: mongoose.Types.ObjectId
): any {
    const adjustmentType = selectWeightedFromObject(ADJUSTMENT_TYPE_DISTRIBUTION);
    const isPositive = adjustmentType === 'bonus';
    const amount = randomInt(50, 500) * (isPositive ? 1 : -1);
    const createdAt = subDays(new Date(), randomInt(1, 60));

    return {
        company: companyId,
        salesRepresentative: salesRepId,
        commissionTransaction: transactionId,
        adjustmentType,
        amount,
        reason: selectRandom([
            'Performance bonus',
            'Target achievement',
            'Quarterly incentive',
            'Referral bonus',
            'Calculation correction',
            'Late delivery penalty',
        ]),
        status: Math.random() > 0.2 ? 'approved' : 'pending',
        adjustedBy: createdBy,
        createdBy,
        approvedBy: createdBy,
        approvedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
    };
}

/**
 * Main seeder function
 */
export async function seedCommissions(): Promise<void> {
    const timer = createTimer();
    logger.step(18, 'Seeding Commissions (Rules, Transactions, Adjustments)');

    try {
        const companies = await Company.find({ status: 'approved', isDeleted: false }).limit(20).lean();
        const adminUsers = await User.find({ role: 'admin' }).limit(5).lean();
        const salesReps = await SalesRepresentative.find({ status: 'active' }).lean();
        // Query all orders (orders don't have 'delivered' status - that's for shipments)
        const orders = await Order.find({ isDeleted: false }).limit(2000).lean();

        if (companies.length === 0 || adminUsers.length === 0) {
            logger.warn('No companies or admin users found. Skipping commissions seeder.');
            return;
        }

        const rules: any[] = [];
        const transactions: any[] = [];
        const adjustments: any[] = [];

        // Generate commission rules for each company
        for (const company of companies) {
            const companyAny = company as any;
            const admin = selectRandom(adminUsers) as any;
            const ruleCount = randomInt(1, 3);

            for (let i = 0; i < ruleCount; i++) {
                rules.push(generateRule(companyAny._id, admin._id, rules.length));
            }
        }

        // Insert rules first
        const insertedRules = await CommissionRule.insertMany(rules, { ordered: false }).catch((err) => {
            if (err.code !== 11000) throw err;
            logger.warn(`Skipped ${err.writeErrors?.length || 0} duplicate rules`);
            return err.insertedDocs || [];
        });

        const rulesByCompany = new Map<string, any[]>();
        for (const rule of insertedRules) {
            const ruleAny = rule as any;
            const companyId = ruleAny.company.toString();
            if (!rulesByCompany.has(companyId)) {
                rulesByCompany.set(companyId, []);
            }
            rulesByCompany.get(companyId)!.push(ruleAny);
        }

        // Generate transactions for orders with sales reps
        let transactionCount = 0;
        for (const order of orders) {
            const orderAny = order as any;
            const companyRules = rulesByCompany.get(orderAny.companyId.toString());
            if (!companyRules || companyRules.length === 0) continue;
            if (salesReps.length === 0) continue;

            const rule = selectRandom(companyRules);
            const salesRep = selectRandom(salesReps) as any;
            const orderValue = orderAny.totals?.total || randomInt(500, 10000);

            transactions.push(generateTransaction(
                orderAny.companyId,
                salesRep._id,
                orderAny._id,
                rule._id,
                rule,
                orderValue
            ));

            transactionCount++;
            if (transactionCount >= 500) break; // Limit to 500 transactions
        }

        // Insert transactions
        const insertedTransactions = await CommissionTransaction.insertMany(transactions, { ordered: false }).catch((err) => {
            if (err.code !== 11000) throw err;
            logger.warn(`Skipped ${err.writeErrors?.length || 0} duplicate transactions`);
            return err.insertedDocs || [];
        });

        // Generate adjustments for some transactions
        const admin = selectRandom(adminUsers) as any;
        for (const transaction of insertedTransactions.slice(0, 50)) {
            const txnAny = transaction as any;
            if (Math.random() > 0.5) {
                adjustments.push(generateAdjustment(
                    txnAny.company,
                    txnAny.salesRepresentative,
                    txnAny._id,
                    admin._id
                ));
            }
        }

        // Insert adjustments
        if (adjustments.length > 0) {
            await CommissionAdjustment.insertMany(adjustments);
        }

        logger.complete('commissions', rules.length + transactions.length + adjustments.length, timer.elapsed());
        logger.table({
            'Commission Rules': rules.length,
            'Commission Transactions': transactions.length,
            'Commission Adjustments': adjustments.length,
            'Total Records': rules.length + transactions.length + adjustments.length,
        });

    } catch (error) {
        logger.error('Failed to seed commissions:', error);
        throw error;
    }
}
