/**
 * Wallet Transactions Seeder
 * 
 * Generates wallet transactions (8,000-15,000) including recharges, shipping debits, RTO charges, and COD remittances.
 */

import mongoose from 'mongoose';
import WalletTransaction from '../../mongoose/models/finance/wallets/wallet-transaction.model';
import Company from '../../mongoose/models/organization/core/company.model';
import Shipment from '../../mongoose/models/logistics/shipping/core/shipment.model';
import RTOEvent from '../../mongoose/models/logistics/shipping/exceptions/rto-event.model';
import { SEED_CONFIG } from '../config';
import { randomInt, randomFloat, selectRandom } from '../utils/random.utils';
import { logger, createTimer } from '../utils/logger.utils';
import { addDays, addHours, subDays, randomDateBetween } from '../utils/date.utils';

interface CompanyBalance {
    companyId: mongoose.Types.ObjectId;
    balance: number;
}

/**
 * Generate initial recharge transaction
 */
function generateRechargeTransaction(
    company: any,
    amount: number,
    balanceBefore: number,
    transactionDate: Date
): any {
    return {
        company: company._id,
        type: 'credit',
        amount,
        balanceBefore,
        balanceAfter: balanceBefore + amount,
        reason: 'recharge',
        description: `Wallet recharge via ${selectRandom(['Razorpay', 'PayU', 'Bank Transfer', 'UPI'])}`,
        reference: {
            type: 'payment',
            externalId: `PAY${randomInt(100000, 999999)}`,
        },
        createdBy: 'system',
        status: 'completed',
        createdAt: transactionDate,
        updatedAt: transactionDate,
    };
}

/**
 * Generate shipping cost debit transaction
 */
function generateShippingDebitTransaction(
    shipment: any,
    balanceBefore: number
): any {
    const shippingCost = shipment.paymentDetails?.shippingCost || 100;

    return {
        company: shipment.companyId,
        type: 'debit',
        amount: shippingCost,
        balanceBefore,
        balanceAfter: balanceBefore - shippingCost,
        reason: 'shipping_cost',
        description: `Shipping charge for AWB: ${shipment.trackingNumber}`,
        reference: {
            type: 'shipment',
            id: shipment._id,
            externalId: shipment.trackingNumber,
        },
        createdBy: 'system',
        status: 'completed',
        createdAt: addHours(shipment.createdAt, randomInt(1, 4)),
        updatedAt: addHours(shipment.createdAt, randomInt(1, 4)),
    };
}

/**
 * Generate RTO charge debit transaction
 */
function generateRTOChargeTransaction(
    rtoEvent: any,
    balanceBefore: number
): any {
    const rtoCharges = rtoEvent.rtoCharges || 150;

    return {
        company: rtoEvent.company,
        type: 'debit',
        amount: rtoCharges,
        balanceBefore,
        balanceAfter: balanceBefore - rtoCharges,
        reason: 'rto_charge',
        description: `RTO charges for AWB: ${rtoEvent.reverseAwb}`,
        reference: {
            type: 'rto_event',
            id: rtoEvent._id,
            externalId: rtoEvent.reverseAwb,
        },
        createdBy: 'system',
        status: 'completed',
        createdAt: rtoEvent.chargesDeductedAt || addDays(rtoEvent.triggeredAt, 3),
        updatedAt: rtoEvent.chargesDeductedAt || addDays(rtoEvent.triggeredAt, 3),
    };
}

/**
 * Generate COD remittance credit transaction
 */
function generateCODRemittanceTransaction(
    shipment: any,
    balanceBefore: number
): any {
    const codAmount = shipment.paymentDetails?.codAmount || 1000;
    const remittanceDate = addDays(
        shipment.actualDelivery || addDays(shipment.createdAt, 5),
        randomInt(SEED_CONFIG.codRemittanceDays.min, SEED_CONFIG.codRemittanceDays.max)
    );

    return {
        company: shipment.companyId,
        type: 'credit',
        amount: codAmount,
        balanceBefore,
        balanceAfter: balanceBefore + codAmount,
        reason: 'cod_remittance',
        description: `COD remittance for order ${shipment.orderId}`,
        reference: {
            type: 'shipment',
            id: shipment._id,
            externalId: shipment.trackingNumber,
        },
        createdBy: 'system',
        status: 'completed',
        createdAt: remittanceDate,
        updatedAt: remittanceDate,
    };
}

/**
 * Check if balance is low and generate auto-recharge
 */
function checkAndGenerateAutoRecharge(
    company: any,
    balance: number,
    transactionDate: Date
): any | null {
    if (balance < SEED_CONFIG.wallet.lowBalanceThreshold) {
        const rechargeAmount = randomInt(
            SEED_CONFIG.wallet.rechargeAmount.min,
            SEED_CONFIG.wallet.rechargeAmount.max
        );

        return generateRechargeTransaction(company, rechargeAmount, balance, transactionDate);
    }
    return null;
}

/**
 * Main seeder function
 */
export async function seedWalletTransactions(): Promise<void> {
    const timer = createTimer();
    logger.step(11, 'Seeding Wallet Transactions');

    try {
        // Get all approved companies
        const companies = await Company.find({ status: 'approved' }).lean();

        // Get all shipments for debits
        const shipments = await Shipment.find({ isDeleted: false }).lean();

        // Get all RTO events for RTO charges
        const rtoEvents = await RTOEvent.find({ chargesDeducted: true }).lean();

        if (companies.length === 0) {
            logger.warn('No companies found. Skipping wallet transactions seeder.');
            return;
        }

        const transactions: any[] = [];
        const companyBalances = new Map<string, number>();

        // Initialize company balances with their current wallet balance
        for (const company of companies) {
            companyBalances.set(company._id.toString(), company.wallet?.balance || SEED_CONFIG.wallet.initialBalance.min);
        }

        // Group shipments and RTO events by company
        const shipmentsByCompany = new Map<string, any[]>();
        const rtoEventsByCompany = new Map<string, any[]>();

        for (const shipment of shipments) {
            const key = shipment.companyId.toString();
            if (!shipmentsByCompany.has(key)) shipmentsByCompany.set(key, []);
            shipmentsByCompany.get(key)!.push(shipment);
        }

        for (const rtoEvent of rtoEvents) {
            const key = rtoEvent.company.toString();
            if (!rtoEventsByCompany.has(key)) rtoEventsByCompany.set(key, []);
            rtoEventsByCompany.get(key)!.push(rtoEvent);
        }

        let processedCompanies = 0;

        for (const company of companies) {
            const companyId = company._id.toString();
            const companyShipments = shipmentsByCompany.get(companyId) || [];
            const companyRTOs = rtoEventsByCompany.get(companyId) || [];

            // Sort by date for proper balance tracking
            const allEvents: { type: string; date: Date; data: any }[] = [];

            // Add initial recharge (business start)
            const startDate = subDays(new Date(), 365);
            allEvents.push({
                type: 'recharge',
                date: startDate,
                data: { company, amount: randomInt(SEED_CONFIG.wallet.initialBalance.min, SEED_CONFIG.wallet.initialBalance.max) },
            });

            // Add shipping debits
            for (const shipment of companyShipments) {
                allEvents.push({
                    type: 'shipping',
                    date: shipment.createdAt,
                    data: shipment,
                });

                // Add COD remittance for COD shipments that were delivered
                if (shipment.paymentDetails?.type === 'cod' && shipment.currentStatus === 'delivered') {
                    allEvents.push({
                        type: 'cod_remittance',
                        date: addDays(shipment.actualDelivery || shipment.createdAt, randomInt(3, 7)),
                        data: shipment,
                    });
                }
            }

            // Add RTO charges
            for (const rtoEvent of companyRTOs) {
                allEvents.push({
                    type: 'rto_charge',
                    date: rtoEvent.chargesDeductedAt || addDays(rtoEvent.triggeredAt, 3),
                    data: rtoEvent,
                });
            }

            // Sort events by date
            allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Process events and maintain balance
            let currentBalance = 0;

            for (const event of allEvents) {
                let transaction: any;

                switch (event.type) {
                    case 'recharge':
                        transaction = generateRechargeTransaction(
                            event.data.company,
                            event.data.amount,
                            currentBalance,
                            event.date
                        );
                        currentBalance = transaction.balanceAfter;
                        transactions.push(transaction);
                        break;

                    case 'shipping':
                        // Check if we need auto-recharge first
                        const shippingCost = event.data.paymentDetails?.shippingCost || 100;
                        if (currentBalance < shippingCost + SEED_CONFIG.wallet.lowBalanceThreshold) {
                            const recharge = checkAndGenerateAutoRecharge(
                                company,
                                currentBalance,
                                addHours(event.date, -1)
                            );
                            if (recharge) {
                                currentBalance = recharge.balanceAfter;
                                transactions.push(recharge);
                            }
                        }

                        transaction = generateShippingDebitTransaction(event.data, currentBalance);
                        currentBalance = transaction.balanceAfter;
                        transactions.push(transaction);
                        break;

                    case 'cod_remittance':
                        transaction = generateCODRemittanceTransaction(event.data, currentBalance);
                        currentBalance = transaction.balanceAfter;
                        transactions.push(transaction);
                        break;

                    case 'rto_charge':
                        // Check if we need auto-recharge first
                        const rtoCharge = event.data.rtoCharges || 150;
                        if (currentBalance < rtoCharge + SEED_CONFIG.wallet.lowBalanceThreshold) {
                            const recharge = checkAndGenerateAutoRecharge(
                                company,
                                currentBalance,
                                addHours(event.date, -1)
                            );
                            if (recharge) {
                                currentBalance = recharge.balanceAfter;
                                transactions.push(recharge);
                            }
                        }

                        transaction = generateRTOChargeTransaction(event.data, currentBalance);
                        currentBalance = transaction.balanceAfter;
                        transactions.push(transaction);
                        break;
                }
            }

            // Update final balance
            companyBalances.set(companyId, currentBalance);

            processedCompanies++;
            if (processedCompanies % 20 === 0 || processedCompanies === companies.length) {
                logger.progress(processedCompanies, companies.length, 'Companies');
            }
        }

        // Insert in batches
        const batchSize = 2000;
        for (let i = 0; i < transactions.length; i += batchSize) {
            const batch = transactions.slice(i, i + batchSize);
            await WalletTransaction.insertMany(batch);
            logger.progress(Math.min(i + batchSize, transactions.length), transactions.length, 'Transactions inserted');
        }

        // Update company balances
        const updateOps = Array.from(companyBalances.entries()).map(([id, balance]) => ({
            updateOne: {
                filter: { _id: new mongoose.Types.ObjectId(id) },
                update: { 'wallet.balance': Math.max(0, balance), 'wallet.lastUpdated': new Date() },
            },
        }));
        await Company.bulkWrite(updateOps);

        // Calculate statistics
        const credits = transactions.filter(t => t.type === 'credit');
        const debits = transactions.filter(t => t.type === 'debit');
        const totalCredits = credits.reduce((sum, t) => sum + t.amount, 0);
        const totalDebits = debits.reduce((sum, t) => sum + t.amount, 0);

        logger.complete('wallet transactions', transactions.length, timer.elapsed());
        logger.table({
            'Total Transactions': transactions.length,
            'Credit Transactions': credits.length,
            'Debit Transactions': debits.length,
            'Total Credits': `₹${(totalCredits / 100000).toFixed(2)} Lac`,
            'Total Debits': `₹${(totalDebits / 100000).toFixed(2)} Lac`,
            'Net Flow': `₹${((totalCredits - totalDebits) / 100000).toFixed(2)} Lac`,
        });

    } catch (error) {
        logger.error('Failed to seed wallet transactions:', error);
        throw error;
    }
}
