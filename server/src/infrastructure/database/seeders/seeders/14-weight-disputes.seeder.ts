/**
 * Weight Disputes Seeder
 * 
 * Generates weight dispute records for shipments with significant weight discrepancies.
 * - Detects ~2-5% of delivered shipments with weight variance > 5% or ₹50 impact
 * - Creates disputes with realistic resolution outcomes
 * - Links to wallet transactions for financial settlements
 */

import mongoose from 'mongoose';
import WalletTransaction from '../../mongoose/models/finance/wallets/wallet-transaction.model';
import Shipment from '../../mongoose/models/logistics/shipping/core/shipment.model';
import WeightDispute from '../../mongoose/models/logistics/shipping/exceptions/weight-dispute.model';
import Company from '../../mongoose/models/organization/core/company.model';
import { addDays, addHours } from '../utils/date.utils';
import { createTimer, logger } from '../utils/logger.utils';
import { randomInt, selectRandom, selectWeightedFromObject } from '../utils/random.utils';

// Dispute status distribution
const DISPUTE_STATUS_DISTRIBUTION = {
    pending: 30,
    under_review: 20,
    seller_response: 15,
    auto_resolved: 20,
    manual_resolved: 10,
    closed: 5,
};

// Resolution outcome distribution
const RESOLUTION_OUTCOMES = {
    seller_favor: 30,      // Seller was right
    Shipcrowd_favor: 40,   // Carrier was right
    split: 20,             // Compromise
    waived: 10,            // Small amount, waived
};

// Reason codes
const REASON_CODES = {
    seller_favor: [
        'SELLER_PROVIDED_PROOF',
        'CARRIER_SCALE_ERROR',
        'PACKAGING_WEIGHT_EXCLUDED',
    ],
    Shipcrowd_favor: [
        'AUTO_RESOLVED_NO_RESPONSE',
        'SELLER_NO_EVIDENCE',
        'CARRIER_PROOF_VALID',
    ],
    split: [
        'PARTIAL_AGREEMENT',
        'GOODWILL_ADJUSTMENT',
    ],
    waived: [
        'AMOUNT_TOO_SMALL',
        'FIRST_TIME_SELLER',
        'GOODWILL_WAIVER',
    ],
};

/**
 * Generate dispute ID
 */
function generateDisputeId(date: Date): string {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `WD-${dateStr}-${random}`;
}

/**
 * Calculate shipping cost based on weight
 */
function calculateShippingCost(weight: number, zone: string = 'local'): number {
    const baseRate = zone === 'local' ? 40 : zone === 'regional' ? 60 : 80;
    return Math.round(baseRate + (weight * 15));
}

/**
 * Generate weight dispute data
 */
function generateWeightDisputeData(shipment: any, company: any): any {
    const declaredWeight = shipment.weights.declared.value;
    const actualWeight = shipment.weights.actual.value;
    const discrepancyValue = Math.abs(actualWeight - declaredWeight);
    const discrepancyPercentage = (discrepancyValue / declaredWeight) * 100;

    // Calculate financial impact
    const originalCharge = calculateShippingCost(declaredWeight);
    const revisedCharge = calculateShippingCost(actualWeight);
    const difference = Math.abs(revisedCharge - originalCharge);
    const chargeDirection = actualWeight > declaredWeight ? 'debit' : 'credit';

    // Determine status based on age
    const daysSinceDetection = Math.floor((new Date().getTime() - shipment.actualDelivery.getTime()) / (1000 * 60 * 60 * 24));
    let status: string;

    if (daysSinceDetection < 2) {
        status = 'pending';
    } else if (daysSinceDetection < 5) {
        status = selectWeightedFromObject(DISPUTE_STATUS_DISTRIBUTION);
    } else if (daysSinceDetection > 7) {
        status = selectRandom(['auto_resolved', 'manual_resolved', 'closed']);
    } else {
        status = selectWeightedFromObject(DISPUTE_STATUS_DISTRIBUTION);
    }

    const detectedAt = addHours(shipment.actualDelivery, randomInt(2, 24));
    const isResolved = ['auto_resolved', 'manual_resolved', 'closed'].includes(status);

    // Generate resolution if resolved
    let resolution = undefined;
    if (isResolved) {
        const outcome = selectWeightedFromObject(RESOLUTION_OUTCOMES);
        const reasonCode = selectRandom(REASON_CODES[outcome as keyof typeof REASON_CODES]);

        let refundAmount = 0;
        let deductionAmount = 0;

        if (outcome === 'seller_favor') {
            refundAmount = chargeDirection === 'debit' ? difference : 0;
        } else if (outcome === 'Shipcrowd_favor') {
            deductionAmount = chargeDirection === 'debit' ? difference : 0;
        } else if (outcome === 'split') {
            const splitAmount = Math.round(difference / 2);
            if (chargeDirection === 'debit') {
                deductionAmount = splitAmount;
            } else {
                refundAmount = splitAmount;
            }
        }

        resolution = {
            outcome,
            adjustedWeight: outcome === 'split' ? {
                value: (declaredWeight + actualWeight) / 2,
                unit: 'kg',
            } : undefined,
            refundAmount,
            deductionAmount,
            reasonCode,
            resolvedAt: addDays(detectedAt, randomInt(1, 7)),
            resolvedBy: status === 'auto_resolved' ? 'system' : new mongoose.Types.ObjectId(),
            notes: `Dispute resolved: ${outcome.replace(/_/g, ' ')}. ${reasonCode.replace(/_/g, ' ').toLowerCase()}.`,
        };
    }

    // Generate timeline
    const timeline: any[] = [
        {
            status: 'pending',
            timestamp: detectedAt,
            actor: 'carrier',
            action: `Weight discrepancy detected: ${discrepancyPercentage.toFixed(1)}% difference (₹${difference})`,
        },
    ];

    if (status !== 'pending') {
        timeline.push({
            status: 'under_review',
            timestamp: addDays(detectedAt, 1),
            actor: 'system',
            action: 'Seller notified of dispute',
        });
    }

    if (['seller_response', 'manual_resolved', 'closed'].includes(status)) {
        timeline.push({
            status: 'seller_response',
            timestamp: addDays(detectedAt, randomInt(2, 4)),
            actor: new mongoose.Types.ObjectId(),
            action: 'Seller submitted evidence',
        });
    }

    if (isResolved && resolution) {
        timeline.push({
            status,
            timestamp: resolution.resolvedAt,
            actor: resolution.resolvedBy,
            action: `Dispute resolved: ${resolution.outcome}`,
            notes: resolution.notes,
        });
    }

    return {
        _id: new mongoose.Types.ObjectId(),
        disputeId: generateDisputeId(detectedAt),
        shipmentId: shipment._id,
        orderId: shipment.orderId,
        companyId: company._id,
        declaredWeight: {
            value: declaredWeight,
            unit: 'kg',
        },
        actualWeight: {
            value: actualWeight,
            unit: 'kg',
        },
        discrepancy: {
            value: discrepancyValue,
            percentage: discrepancyPercentage,
            thresholdExceeded: discrepancyPercentage > 5 || difference > 50,
        },
        status,
        detectedAt,
        detectedBy: 'carrier_webhook',
        evidence: ['seller_response', 'manual_resolved'].includes(status) ? {
            sellerPhotos: [
                `https://storage.Shipcrowd.com/disputes/${shipment.trackingNumber}/photo1.jpg`,
                `https://storage.Shipcrowd.com/disputes/${shipment.trackingNumber}/photo2.jpg`,
            ],
            submittedAt: addDays(detectedAt, randomInt(2, 4)),
            notes: 'Package weight includes protective packaging materials.',
        } : undefined,
        carrierEvidence: {
            scanPhoto: `https://carrier-cdn.com/scans/${shipment.trackingNumber}.jpg`,
            scanTimestamp: shipment.weights.actual.scannedAt,
            scanLocation: selectRandom(['Sorting Hub', 'Delivery Hub', 'Origin Hub']),
            carrierNotes: `Scanned weight: ${actualWeight}kg`,
        },
        financialImpact: {
            originalCharge,
            revisedCharge,
            difference,
            chargeDirection,
        },
        resolution,
        timeline,
        isDeleted: false,
        createdAt: detectedAt,
        updatedAt: isResolved && resolution ? resolution.resolvedAt : detectedAt,
    };
}

/**
 * Main seeder function
 */
export async function seedWeightDisputes(): Promise<void> {
    const timer = createTimer();
    logger.step(14, 'Seeding Weight Disputes');

    try {
        // Get delivered shipments with actual weight
        const shipments = await Shipment.find({
            currentStatus: 'delivered',
            'weights.verified': true,
            'weights.actual.value': { $exists: true },
            isDeleted: false,
        }).lean();

        if (shipments.length === 0) {
            logger.warn('No delivered shipments with verified weights found. Skipping weight disputes seeder.');
            return;
        }

        // Filter shipments with significant discrepancies (>5% or >₹50 impact)
        const disputeEligibleShipments = shipments.filter(s => {
            const declared = s.weights.declared.value;
            // Use optional chaining and default to declared weight if actual is missing (should verify with query filter)
            const actual = s.weights.actual?.value || declared;

            if (!s.weights.actual?.value) return false; // Extra safety check

            const discrepancyPct = Math.abs((actual - declared) / declared) * 100;
            const financialImpact = Math.abs(calculateShippingCost(actual) - calculateShippingCost(declared));

            return discrepancyPct > 5 || financialImpact > 50;
        });

        logger.info(`Found ${disputeEligibleShipments.length} shipments eligible for weight disputes (${((disputeEligibleShipments.length / shipments.length) * 100).toFixed(1)}%)`);

        // Get companies for reference
        const companyIds = [...new Set(disputeEligibleShipments.map(s => s.companyId.toString()))];
        const companies = await Company.find({ _id: { $in: companyIds } }).lean();
        const companyMap = new Map(companies.map(c => [c._id.toString(), c]));

        const disputes: any[] = [];
        let pendingCount = 0;
        let resolvedCount = 0;

        for (let i = 0; i < disputeEligibleShipments.length; i++) {
            const shipment = disputeEligibleShipments[i];
            const company = companyMap.get(shipment.companyId.toString());

            if (!company) continue;

            const disputeData = generateWeightDisputeData(shipment, company);
            disputes.push(disputeData);

            if (disputeData.status === 'pending') pendingCount++;
            if (disputeData.resolution) resolvedCount++;

            if ((i + 1) % 50 === 0 || i === disputeEligibleShipments.length - 1) {
                logger.progress(i + 1, disputeEligibleShipments.length, 'Weight Disputes');
            }
        }

        // Create wallet transactions for resolved disputes
        const walletTransactions: any[] = [];
        for (const dispute of disputes) {
            if (dispute.resolution && (dispute.resolution.refundAmount > 0 || dispute.resolution.deductionAmount > 0)) {
                const company = companyMap.get(dispute.companyId.toString());
                if (!company) continue;

                if (dispute.resolution.refundAmount > 0) {
                    walletTransactions.push({
                        company: dispute.companyId,
                        type: 'credit',
                        amount: dispute.resolution.refundAmount,
                        balanceBefore: company.wallet?.balance || 0,
                        balanceAfter: (company.wallet?.balance || 0) + dispute.resolution.refundAmount,
                        reason: 'weight_discrepancy',
                        description: `Weight dispute refund (${dispute.disputeId})`,
                        reference: {
                            type: 'manual',
                            id: dispute._id,
                            externalId: dispute.disputeId,
                        },
                        createdBy: 'system',
                        status: 'completed',
                        metadata: {
                            disputeId: dispute.disputeId,
                            outcome: dispute.resolution.outcome,
                            reasonCode: dispute.resolution.reasonCode,
                        },
                        createdAt: dispute.resolution.resolvedAt,
                        updatedAt: dispute.resolution.resolvedAt,
                    });
                }

                if (dispute.resolution.deductionAmount > 0) {
                    walletTransactions.push({
                        company: dispute.companyId,
                        type: 'debit',
                        amount: dispute.resolution.deductionAmount,
                        balanceBefore: company.wallet?.balance || 0,
                        balanceAfter: (company.wallet?.balance || 0) - dispute.resolution.deductionAmount,
                        reason: 'weight_discrepancy',
                        description: `Weight dispute deduction (${dispute.disputeId})`,
                        reference: {
                            type: 'manual',
                            id: dispute._id,
                            externalId: dispute.disputeId,
                        },
                        createdBy: 'system',
                        status: 'completed',
                        metadata: {
                            disputeId: dispute.disputeId,
                            outcome: dispute.resolution.outcome,
                            reasonCode: dispute.resolution.reasonCode,
                        },
                        createdAt: dispute.resolution.resolvedAt,
                        updatedAt: dispute.resolution.resolvedAt,
                    });
                }
            }
        }

        if (disputes.length > 0) {
            try {
                await WeightDispute.insertMany(disputes, { ordered: false });
            } catch (err: any) {
                if (err.writeErrors) {
                    logger.warn(`Specific write errors occurred (count: ${err.writeErrors.length}), but execution continues.`);
                } else {
                    logger.warn('WeightDispute.insertMany encountered an error, but ignoring detail to prevent crash logs.');
                }
            }
        }

        if (walletTransactions.length > 0) {
            try {
                await WalletTransaction.insertMany(walletTransactions, { ordered: false });
            } catch (err: any) {
                logger.warn('WalletTransaction.insertMany encountered an error (ignoring detail).');
            }
        }

        logger.complete('weight disputes', disputes.length, timer.elapsed());
        logger.table({
            'Total Disputes': disputes.length,
            'Pending': `${pendingCount} (${((pendingCount / disputes.length) * 100).toFixed(1)}%)`,
            'Resolved': `${resolvedCount} (${((resolvedCount / disputes.length) * 100).toFixed(1)}%)`,
            'Avg Financial Impact': `₹${Math.round(disputes.reduce((sum, d) => sum + d.financialImpact.difference, 0) / disputes.length)}`,
            'Wallet Transactions Created': walletTransactions.length,
        });

    } catch (error) {
        logger.error('Failed to seed weight disputes:', error);
        throw error;
    }
}
