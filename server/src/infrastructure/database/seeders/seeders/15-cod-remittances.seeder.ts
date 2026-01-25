/**
 * COD Remittance Seeder
 * 
 * Generates COD remittance batches for eligible shipments.
 * - Creates scheduled and on-demand remittance batches
 * - Calculates deductions (shipping, RTO, weight disputes, platform fees)
 * - Simulates payout processing with Razorpay
 */

import mongoose from 'mongoose';
import CODRemittance from '../../mongoose/models/finance/payouts/cod-remittance.model';
import Shipment from '../../mongoose/models/logistics/shipping/core/shipment.model';
import Company from '../../mongoose/models/organization/core/company.model';
import WeightDispute from '../../mongoose/models/logistics/shipping/exceptions/weight-dispute.model';
import RTOEvent from '../../mongoose/models/logistics/shipping/exceptions/rto-event.model';
import { randomInt, selectRandom, selectWeightedFromObject } from '../utils/random.utils';
import { logger, createTimer } from '../utils/logger.utils';
import { addDays, subDays } from '../utils/date.utils';

// Remittance status distribution
const REMITTANCE_STATUS_DISTRIBUTION = {
    pending_approval: 20,
    approved: 15,
    paid: 60,
    failed: 3,
    cancelled: 2,
};

// Schedule type distribution
const SCHEDULE_TYPE_DISTRIBUTION = {
    scheduled: 70,
    on_demand: 20,
    manual: 10,
};

/**
 * Generate remittance ID
 */
function generateRemittanceId(date: Date): string {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `REM-${dateStr}-${random}`;
}

/**
 * Calculate platform fee (0.5% of COD amount)
 */
function calculatePlatformFee(codAmount: number): number {
    return Math.round(codAmount * 0.005);
}

/**
 * Generate COD remittance batch
 */
async function generateRemittanceBatch(
    company: any,
    eligibleShipments: any[],
    batchNumber: number,
    cutoffDate: Date
): Promise<any> {
    const scheduleType = selectWeightedFromObject(SCHEDULE_TYPE_DISTRIBUTION);
    const status = selectWeightedFromObject(REMITTANCE_STATUS_DISTRIBUTION);
    const createdDate = addDays(cutoffDate, randomInt(1, 3));

    // Get weight disputes for these shipments
    const shipmentIds = eligibleShipments.map(s => s._id);
    const weightDisputes = await WeightDispute.find({
        shipmentId: { $in: shipmentIds },
        'resolution.deductionAmount': { $gt: 0 },
    }).lean();
    const disputeMap = new Map(weightDisputes.map(d => [d.shipmentId.toString(), d]));

    // Get RTO events for these shipments
    const rtoEvents = await RTOEvent.find({
        shipment: { $in: shipmentIds },
        chargesDeducted: true,
    }).lean();
    const rtoMap = new Map(rtoEvents.map(r => [r.shipment.toString(), r]));

    // Process each shipment
    const shipmentsData: any[] = [];
    let totalCODCollected = 0;
    let totalShippingCharges = 0;
    let totalWeightDisputes = 0;
    let totalRTOCharges = 0;
    let totalPlatformFees = 0;
    let successfulDeliveries = 0;
    let rtoCount = 0;

    for (const shipment of eligibleShipments) {
        const codAmount = shipment.paymentDetails.codAmount || 0;
        const shippingCharge = shipment.paymentDetails.shippingCost || 0;
        const platformFee = calculatePlatformFee(codAmount);

        const weightDispute = disputeMap.get(shipment._id.toString());
        const weightDisputeCharge = weightDispute?.resolution?.deductionAmount || 0;

        const rtoEvent = rtoMap.get(shipment._id.toString());
        const rtoCharge = rtoEvent?.rtoCharges || 0;

        const totalDeductions = shippingCharge + weightDisputeCharge + rtoCharge + platformFee;
        const netAmount = codAmount - totalDeductions;

        const shipmentStatus = shipment.currentStatus === 'delivered' ? 'delivered' :
            shipment.currentStatus.includes('rto') ? 'rto' : 'delivered';

        shipmentsData.push({
            shipmentId: shipment._id,
            awb: shipment.trackingNumber,
            codAmount,
            deliveredAt: shipment.actualDelivery,
            status: shipmentStatus,
            deductions: {
                shippingCharge,
                weightDispute: weightDisputeCharge || undefined,
                rtoCharge: rtoCharge || undefined,
                platformFee,
                total: totalDeductions,
            },
            netAmount,
        });

        totalCODCollected += codAmount;
        totalShippingCharges += shippingCharge;
        totalWeightDisputes += weightDisputeCharge;
        totalRTOCharges += rtoCharge;
        totalPlatformFees += platformFee;

        if (shipmentStatus === 'delivered') successfulDeliveries++;
        if (shipmentStatus === 'rto') rtoCount++;
    }

    const grandTotalDeductions = totalShippingCharges + totalWeightDisputes + totalRTOCharges + totalPlatformFees;
    const netPayable = totalCODCollected - grandTotalDeductions;

    // Determine payout status based on remittance status
    let payoutStatus: string;
    let payoutMethod = 'razorpay_payout';
    let initiatedAt: Date | undefined;
    let completedAt: Date | undefined;

    if (status === 'paid') {
        payoutStatus = 'completed';
        initiatedAt = addDays(createdDate, 1);
        completedAt = addDays(initiatedAt, randomInt(0, 2));
    } else if (status === 'approved') {
        payoutStatus = 'processing';
        initiatedAt = addDays(createdDate, 1);
    } else if (status === 'failed') {
        payoutStatus = 'failed';
        initiatedAt = addDays(createdDate, 1);
    } else {
        payoutStatus = 'pending';
    }

    // Generate timeline
    const timeline: any[] = [
        {
            status: 'draft',
            timestamp: createdDate,
            actor: 'system',
            action: `Remittance batch created: ${shipmentsData.length} shipments, ₹${netPayable.toLocaleString()} net payable`,
        },
    ];

    if (status !== 'pending_approval') {
        timeline.push({
            status: 'approved',
            timestamp: addDays(createdDate, randomInt(0, 1)),
            actor: status === 'cancelled' ? 'system' : new mongoose.Types.ObjectId(),
            action: 'Remittance approved for payout',
        });
    }

    if (payoutStatus === 'processing' || payoutStatus === 'completed') {
        timeline.push({
            status: 'processing',
            timestamp: initiatedAt,
            actor: 'system',
            action: 'Payout initiated via Razorpay',
        });
    }

    if (payoutStatus === 'completed') {
        timeline.push({
            status: 'paid',
            timestamp: completedAt,
            actor: 'system',
            action: 'Payout completed successfully',
        });
    }

    if (payoutStatus === 'failed') {
        timeline.push({
            status: 'failed',
            timestamp: initiatedAt,
            actor: 'system',
            action: 'Payout failed',
            notes: selectRandom([
                'Insufficient balance in Razorpay account',
                'Invalid bank account details',
                'Beneficiary account frozen',
            ]),
        });
    }

    if (status === 'cancelled') {
        timeline.push({
            status: 'cancelled',
            timestamp: addDays(createdDate, 1),
            actor: new mongoose.Types.ObjectId(),
            action: 'Remittance cancelled',
            notes: 'Cancelled by admin',
        });
    }

    // Get company bank details
    const bankDetails = company.billingInfo?.accountNumber ? {
        accountNumber: company.billingInfo.accountNumber,
        ifscCode: company.billingInfo.ifscCode || 'HDFC0000001',
        accountHolderName: company.name,
        bankName: company.billingInfo.bankName || 'HDFC Bank',
        upiId: company.billingInfo.upiId,
    } : undefined;

    return {
        remittanceId: generateRemittanceId(createdDate),
        companyId: company._id,
        batch: {
            batchNumber,
            createdDate,
            cutoffDate,
            shippingPeriod: {
                start: subDays(cutoffDate, 7),
                end: cutoffDate,
            },
        },
        schedule: {
            type: scheduleType,
            scheduledDate: scheduleType === 'scheduled' ? createdDate : undefined,
            requestedBy: scheduleType === 'on_demand' ? new mongoose.Types.ObjectId() : undefined,
        },
        shipments: shipmentsData,
        financial: {
            totalCODCollected,
            totalShipments: shipmentsData.length,
            successfulDeliveries,
            rtoCount,
            disputedCount: weightDisputes.length,
            deductionsSummary: {
                totalShippingCharges,
                totalWeightDisputes,
                totalRTOCharges,
                totalInsuranceCharges: 0,
                totalPlatformFees,
                totalOtherFees: 0,
                grandTotal: grandTotalDeductions,
            },
            netPayable,
        },
        payout: {
            status: payoutStatus,
            method: payoutMethod,
            razorpayPayoutId: payoutStatus !== 'pending' ? `payout_${Math.random().toString(36).substring(2, 15)}` : undefined,
            razorpayFundAccountId: bankDetails ? `fa_${Math.random().toString(36).substring(2, 15)}` : undefined,
            razorpayContactId: `contact_${Math.random().toString(36).substring(2, 15)}`,
            accountDetails: bankDetails,
            initiatedAt,
            completedAt,
            failureReason: payoutStatus === 'failed' ? selectRandom([
                'Insufficient balance',
                'Invalid account',
                'Account frozen',
            ]) : undefined,
            retryCount: payoutStatus === 'failed' ? randomInt(1, 3) : 0,
        },
        status,
        approvedBy: ['approved', 'paid'].includes(status) ? new mongoose.Types.ObjectId() : undefined,
        approvedAt: ['approved', 'paid'].includes(status) ? addDays(createdDate, randomInt(0, 1)) : undefined,
        cancelledBy: status === 'cancelled' ? new mongoose.Types.ObjectId() : undefined,
        cancelledAt: status === 'cancelled' ? addDays(createdDate, 1) : undefined,
        cancellationReason: status === 'cancelled' ? 'Cancelled by admin' : undefined,
        reportGenerated: status === 'paid',
        reportUrl: status === 'paid' ? `https://storage.Shipcrowd.com/remittances/${generateRemittanceId(createdDate)}.pdf` : undefined,
        reportGeneratedAt: status === 'paid' ? completedAt : undefined,
        timeline,
        isDeleted: false,
        createdAt: createdDate,
        updatedAt: completedAt || createdDate,
    };
}

/**
 * Main seeder function
 */
export async function seedCODRemittances(): Promise<void> {
    const timer = createTimer();
    logger.step(15, 'Seeding COD Remittances');

    try {
        // Get all companies
        const companies = await Company.find({ status: 'approved', isDeleted: false }).lean();

        if (companies.length === 0) {
            logger.warn('No approved companies found. Skipping COD remittances seeder.');
            return;
        }

        const remittances: any[] = [];
        let totalNetPayable = 0;
        let totalShipments = 0;

        for (let i = 0; i < companies.length; i++) {
            const company = companies[i];

            // Get eligible COD shipments (delivered, hold period elapsed)
            const holdPeriodDays = 3; // Minimum 3 days hold
            const cutoffDate = subDays(new Date(), holdPeriodDays);

            const eligibleShipments = await Shipment.find({
                companyId: company._id,
                'paymentDetails.type': 'cod',
                currentStatus: 'delivered',
                actualDelivery: { $lte: cutoffDate },
                'remittanceStatus.remittanceId': { $exists: false },
                isDeleted: false,
            }).lean();

            if (eligibleShipments.length === 0) continue;

            // Create 2-3 batches per company (simulating weekly/bi-weekly remittances)
            const batchCount = Math.min(randomInt(2, 3), Math.ceil(eligibleShipments.length / 20));
            const shipmentsPerBatch = Math.ceil(eligibleShipments.length / batchCount);

            for (let batchNum = 1; batchNum <= batchCount; batchNum++) {
                const startIdx = (batchNum - 1) * shipmentsPerBatch;
                const endIdx = Math.min(startIdx + shipmentsPerBatch, eligibleShipments.length);
                const batchShipments = eligibleShipments.slice(startIdx, endIdx);

                if (batchShipments.length === 0) continue;

                const batchCutoffDate = subDays(cutoffDate, (batchCount - batchNum) * 7);
                const remittanceData = await generateRemittanceBatch(
                    company,
                    batchShipments,
                    batchNum,
                    batchCutoffDate
                );

                remittances.push(remittanceData);
                totalNetPayable += remittanceData.financial.netPayable;
                totalShipments += remittanceData.shipments.length;
            }

            if ((i + 1) % 10 === 0 || i === companies.length - 1) {
                logger.progress(i + 1, companies.length, 'Companies');
            }
        }

        // Insert remittances
        const insertedRemittances = remittances.length > 0 ? await CODRemittance.insertMany(remittances) : [];

        // Update shipment remittance status
        const updateOps: any[] = [];
        for (const remittance of insertedRemittances) {
            for (const shipment of remittance.shipments) {
                updateOps.push({
                    updateOne: {
                        filter: { _id: shipment.shipmentId },
                        update: {
                            $set: {
                                'remittanceStatus.remittanceId': remittance._id,
                                'remittanceStatus.batch': remittance.remittanceId,
                                'remittanceStatus.status': remittance.status,
                                'remittanceStatus.payoutStatus': remittance.payout.status,
                                'remittanceStatus.updatedAt': remittance.createdAt,
                            },
                        },
                    },
                });
            }
        }

        if (updateOps.length > 0) {
            await Shipment.bulkWrite(updateOps);
        }

        logger.complete('COD remittances', remittances.length, timer.elapsed());
        logger.table({
            'Total Batches': remittances.length,
            'Total Shipments': totalShipments,
            'Total Net Payable': `₹${totalNetPayable.toLocaleString()}`,
            'Avg Batch Size': Math.round(totalShipments / remittances.length),
            'Avg Net Payable': `₹${Math.round(totalNetPayable / remittances.length).toLocaleString()}`,
            'Shipments Updated': updateOps.length,
        });

    } catch (error) {
        logger.error('Failed to seed COD remittances:', error);
        throw error;
    }
}
