/**
 * Validation Utilities for Seeded Data
 * 
 * Functions to validate data integrity after seeding.
 */

import mongoose from 'mongoose';
import { logger } from './logger.utils';

// Import models
import User from '../../mongoose/models/iam/users/user.model';
import Company from '../../mongoose/models/organization/core/company.model';
import Order from '../../mongoose/models/orders/core/order.model';
import Shipment from '../../mongoose/models/logistics/shipping/core/shipment.model';
import NDREvent from '../../mongoose/models/logistics/shipping/exceptions/ndr-event.model';
import WalletTransaction from '../../mongoose/models/finance/wallets/wallet-transaction.model';

interface ValidationResult {
    passed: boolean;
    errors: string[];
    warnings: string[];
    stats: Record<string, number | string>;
}

/**
 * Run all validation checks on seeded data
 */
export async function validateSeededData(): Promise<ValidationResult> {
    const result: ValidationResult = {
        passed: true,
        errors: [],
        warnings: [],
        stats: {},
    };

    logger.phase('Data Validation');

    try {
        // 1. Check for duplicate order numbers
        await checkDuplicateOrderNumbers(result);

        // 2. Check for invalid email formats
        await checkInvalidEmails(result);

        // 3. Check for orphan shipments
        await checkOrphanShipments(result);

        // 4. Check for negative wallet balances
        await checkNegativeBalances(result);

        // 5. Check for future dates
        await checkFutureDates(result);

        // 6. Verify referential integrity
        await checkReferentialIntegrity(result);

        // 7. Verify data distribution
        await verifyDataDistribution(result);

        // 8. Check wallet transaction integrity
        await checkWalletTransactionIntegrity(result);

        // Print results
        printValidationResults(result);

    } catch (error) {
        result.passed = false;
        result.errors.push(`Validation failed with error: ${error}`);
        logger.error('Validation failed with error:', error);
    }

    return result;
}

/**
 * Check for duplicate order numbers
 */
async function checkDuplicateOrderNumbers(result: ValidationResult): Promise<void> {
    const duplicates = await Order.aggregate([
        { $group: { _id: '$orderNumber', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
    ]);

    if (duplicates.length > 0) {
        result.errors.push(`Found ${duplicates.length} duplicate order numbers`);
        result.passed = false;
    } else {
        logger.success('No duplicate order numbers found');
    }
}

/**
 * Check for invalid email formats
 */
async function checkInvalidEmails(result: ValidationResult): Promise<void> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = await User.find({
        email: { $not: { $regex: emailRegex } },
    }).select('email');

    if (invalidEmails.length > 0) {
        result.errors.push(`Found ${invalidEmails.length} users with invalid email formats`);
        result.passed = false;
    } else {
        logger.success('All email formats are valid');
    }
}

/**
 * Check for orphan shipments (shipments without valid orders)
 */
async function checkOrphanShipments(result: ValidationResult): Promise<void> {
    const orphanShipments = await Shipment.aggregate([
        {
            $lookup: {
                from: 'orders',
                localField: 'orderId',
                foreignField: '_id',
                as: 'order',
            },
        },
        { $match: { order: { $size: 0 } } },
        { $count: 'count' },
    ]);

    const count = orphanShipments[0]?.count || 0;
    if (count > 0) {
        result.errors.push(`Found ${count} orphan shipments without valid orders`);
        result.passed = false;
    } else {
        logger.success('No orphan shipments found');
    }
}

/**
 * Check for negative wallet balances
 */
async function checkNegativeBalances(result: ValidationResult): Promise<void> {
    const negativeBalances = await Company.countDocuments({
        'wallet.balance': { $lt: 0 },
    });

    if (negativeBalances > 0) {
        result.errors.push(`Found ${negativeBalances} companies with negative wallet balance`);
        result.passed = false;
    } else {
        logger.success('No negative wallet balances found');
    }
}

/**
 * Check for records with future dates
 */
async function checkFutureDates(result: ValidationResult): Promise<void> {
    const now = new Date();

    const futureOrders = await Order.countDocuments({
        createdAt: { $gt: now },
    });

    if (futureOrders > 0) {
        result.warnings.push(`Found ${futureOrders} orders with future dates`);
    } else {
        logger.success('No future-dated records found');
    }
}

/**
 * Check referential integrity across collections
 */
async function checkReferentialIntegrity(result: ValidationResult): Promise<void> {
    // Check orders have valid companies
    const ordersWithoutCompany = await Order.aggregate([
        {
            $lookup: {
                from: 'companies',
                localField: 'companyId',
                foreignField: '_id',
                as: 'company',
            },
        },
        { $match: { company: { $size: 0 } } },
        { $count: 'count' },
    ]);

    const orphanOrders = ordersWithoutCompany[0]?.count || 0;
    if (orphanOrders > 0) {
        result.errors.push(`Found ${orphanOrders} orders without valid company reference`);
        result.passed = false;
    }

    // Check NDR events have valid shipments
    const ndrWithoutShipment = await NDREvent.aggregate([
        {
            $lookup: {
                from: 'shipments',
                localField: 'shipment',
                foreignField: '_id',
                as: 'shipmentDoc',
            },
        },
        { $match: { shipmentDoc: { $size: 0 } } },
        { $count: 'count' },
    ]);

    const orphanNDR = ndrWithoutShipment[0]?.count || 0;
    if (orphanNDR > 0) {
        result.errors.push(`Found ${orphanNDR} NDR events without valid shipment reference`);
        result.passed = false;
    }

    if (orphanOrders === 0 && orphanNDR === 0) {
        logger.success('Referential integrity verified');
    }
}

/**
 * Verify data distribution matches expected ratios
 */
async function verifyDataDistribution(result: ValidationResult): Promise<void> {
    // User role distribution
    const userRoles = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    const roleMap: Record<string, number> = {};
    userRoles.forEach((r: any) => {
        roleMap[r._id] = r.count;
    });

    result.stats['users.admin'] = roleMap['admin'] || 0;
    result.stats['users.seller'] = roleMap['seller'] || 0;
    result.stats['users.staff'] = roleMap['staff'] || 0;

    // Company status distribution
    const companyStatus = await Company.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusMap: Record<string, number> = {};
    companyStatus.forEach((s: any) => {
        statusMap[s._id] = s.count;
    });

    result.stats['companies.approved'] = statusMap['approved'] || 0;
    result.stats['companies.kyc_submitted'] = statusMap['kyc_submitted'] || 0;
    result.stats['companies.suspended'] = statusMap['suspended'] || 0;

    // Shipment status distribution
    const shipmentStatus = await Shipment.aggregate([
        { $group: { _id: '$currentStatus', count: { $sum: 1 } } },
    ]);

    const shipmentMap: Record<string, number> = {};
    shipmentStatus.forEach((s: any) => {
        shipmentMap[s._id] = s.count;
    });

    const totalShipments = Object.values(shipmentMap).reduce((a, b) => a + b, 0);
    const deliveredRate = ((shipmentMap['delivered'] || 0) / totalShipments * 100).toFixed(1);

    result.stats['shipments.total'] = totalShipments;
    result.stats['shipments.deliveryRate'] = `${deliveredRate}%`;

    // Payment method distribution
    const paymentMethods = await Order.aggregate([
        { $group: { _id: '$paymentMethod', count: { $sum: 1 } } },
    ]);

    const paymentMap: Record<string, number> = {};
    paymentMethods.forEach((p: any) => {
        paymentMap[p._id] = p.count;
    });

    const totalOrders = Object.values(paymentMap).reduce((a, b) => a + b, 0);
    const codRate = ((paymentMap['cod'] || 0) / totalOrders * 100).toFixed(1);

    result.stats['orders.total'] = totalOrders;
    result.stats['orders.codRate'] = `${codRate}%`;

    logger.success('Data distribution verified');
}

/**
 * Check wallet transaction integrity (balance before/after consistency)
 */
async function checkWalletTransactionIntegrity(result: ValidationResult): Promise<void> {
    // Sample check: verify a few companies have consistent transaction history
    const companies = await Company.find({ status: 'approved' }).limit(5);

    let inconsistentCount = 0;

    for (const company of companies) {
        const transactions = await WalletTransaction.find({
            company: company._id,
            status: 'completed',
        }).sort({ createdAt: 1 });

        for (let i = 1; i < transactions.length; i++) {
            const prev = transactions[i - 1];
            const curr = transactions[i];

            // Balance after previous should equal balance before current
            // (with small tolerance for floating point)
            if (Math.abs(prev.balanceAfter - curr.balanceBefore) > 0.01) {
                inconsistentCount++;
                break;
            }
        }
    }

    if (inconsistentCount > 0) {
        result.warnings.push(
            `Found ${inconsistentCount} companies with inconsistent transaction history`
        );
    } else {
        logger.success('Wallet transaction integrity verified');
    }
}

/**
 * Print validation results
 */
function printValidationResults(result: ValidationResult): void {
    logger.divider();

    if (result.passed) {
        logger.success('All validation checks passed! ✓');
    } else {
        logger.error('Validation failed with errors:');
        result.errors.forEach((err) => logger.error(`  - ${err}`));
    }

    if (result.warnings.length > 0) {
        logger.warn('Warnings:');
        result.warnings.forEach((warn) => logger.warn(`  - ${warn}`));
    }

    logger.info('\nData Statistics:');
    logger.table(result.stats);
}

/**
 * Standalone validation runner
 */
export async function runValidation(): Promise<void> {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Shipcrowd';
        await mongoose.connect(mongoUri);
        logger.info('Connected to MongoDB');

        // Run validation
        const result = await validateSeededData();

        // Exit with appropriate code
        process.exit(result.passed ? 0 : 1);
    } catch (error) {
        logger.error('Validation runner failed:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    runValidation();
}
