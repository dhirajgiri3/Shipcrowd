import mongoose from 'mongoose';
import CODRemittance, { ICODRemittance } from '../../../../infrastructure/database/mongoose/models/finance/payouts/cod-remittance.model';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import { AppError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';
import Razorpay from 'razorpay';

/**
 * COD Remittance Service
 * Handles batch creation, Razorpay payout integration, and remittance lifecycle
 */
export default class CODRemittanceService {
    private static razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    /**
     * Get eligible shipments for COD remittance
     * Only includes delivered COD shipments not already in a batch
     */
    static async getEligibleShipments(
        companyId: string,
        cutoffDate: Date
    ): Promise<{
        shipments: Array<{
            shipmentId: string;
            awb: string;
            codAmount: number;
            deliveredAt: Date;
            deductions: Record<string, number>;
            netAmount: number;
        }>;
        summary: {
            totalShipments: number;
            totalCOD: number;
            totalDeductions: number;
            netPayable: number;
        };
    }> {
        // Find all delivered COD shipments not yet remitted
        const eligibleShipments = await Shipment.find({
            companyId: new mongoose.Types.ObjectId(companyId),
            paymentMode: 'COD',
            currentStatus: 'delivered',
            actualDelivery: { $lte: cutoffDate },
            'remittance.included': { $ne: true },
            isDeleted: false,
        })
            .select('trackingNumber billing.codAmount billing.totalAmount actualDelivery')
            .lean();

        if (!eligibleShipments || eligibleShipments.length === 0) {
            throw new ValidationError(
                'No eligible shipments found for remittance',
                ErrorCode.RES_REMITTANCE_NOT_FOUND
            );
        }

        let totalCOD = 0;
        let totalDeductions = 0;

        const formattedShipments = eligibleShipments.map((shipment: any) => {
            const codAmount = shipment.billing?.codAmount || 0;
            const shippingCharge = shipment.billing?.totalAmount || 0;
            const platformFee = codAmount * 0.005; // 0.5% platform fee

            const deductionsTotal = shippingCharge + platformFee;
            const netAmount = codAmount - deductionsTotal;

            totalCOD += codAmount;
            totalDeductions += deductionsTotal;

            return {
                shipmentId: shipment._id.toString(),
                awb: shipment.trackingNumber,
                codAmount,
                deliveredAt: shipment.actualDelivery,
                deductions: {
                    shippingCharge,
                    platformFee,
                    total: deductionsTotal,
                },
                netAmount,
            };
        });

        return {
            shipments: formattedShipments,
            summary: {
                totalShipments: eligibleShipments.length,
                totalCOD,
                totalDeductions,
                netPayable: totalCOD - totalDeductions,
            },
        };
    }

    /**
     * Create new COD remittance batch
     * Aggregates eligible shipments and calculates deductions
     */
    static async createRemittanceBatch(
        companyId: string,
        scheduleType: 'scheduled' | 'on_demand' | 'manual',
        cutoffDate: Date,
        requestedBy?: string
    ): Promise<{
        remittanceId: string;
        financial: {
            totalCODCollected: number;
            netPayable: number;
            deductionsSummary: Record<string, number>;
        };
        shipmentCount: number;
    }> {
        // Get eligible shipments
        const eligibleData = await this.getEligibleShipments(companyId, cutoffDate);

        // Get latest batch number for company
        const lastBatch = await CODRemittance.findOne({
            companyId: new mongoose.Types.ObjectId(companyId),
        })
            .sort({ 'batch.batchNumber': -1 })
            .select('batch.batchNumber')
            .lean();

        const batchNumber = (lastBatch?.batch.batchNumber || 0) + 1;

        // Generate remittance ID
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 7).toUpperCase();
        const remittanceId = `REM-${timestamp}-${random}`;

        // Calculate financial summary
        let totalShippingCharges = 0;
        let totalPlatformFees = 0;

        const shipmentsData = eligibleData.shipments.map((ship) => {
            totalShippingCharges += ship.deductions.shippingCharge || 0;
            totalPlatformFees += ship.deductions.platformFee || 0;

            return {
                shipmentId: new mongoose.Types.ObjectId(ship.shipmentId),
                awb: ship.awb,
                codAmount: ship.codAmount,
                deliveredAt: ship.deliveredAt,
                status: 'delivered' as const,
                deductions: {
                    shippingCharge: ship.deductions.shippingCharge || 0,
                    platformFee: ship.deductions.platformFee || 0,
                    total: ship.deductions.total,
                },
                netAmount: ship.netAmount,
            };
        });

        const deductionsGrandTotal = totalShippingCharges + totalPlatformFees;

        // Create remittance batch
        const remittance = await CODRemittance.create({
            remittanceId,
            companyId: new mongoose.Types.ObjectId(companyId),
            batch: {
                batchNumber,
                createdDate: new Date(),
                cutoffDate,
                shippingPeriod: {
                    start: eligibleData.shipments[eligibleData.shipments.length - 1].deliveredAt,
                    end: eligibleData.shipments[0].deliveredAt,
                },
            },
            schedule: {
                type: scheduleType,
                requestedBy: requestedBy ? new mongoose.Types.ObjectId(requestedBy) : undefined,
            },
            shipments: shipmentsData,
            financial: {
                totalCODCollected: eligibleData.summary.totalCOD,
                totalShipments: eligibleData.summary.totalShipments,
                successfulDeliveries: eligibleData.summary.totalShipments,
                rtoCount: 0,
                disputedCount: 0,
                deductionsSummary: {
                    totalShippingCharges,
                    totalWeightDisputes: 0,
                    totalRTOCharges: 0,
                    totalInsuranceCharges: 0,
                    totalPlatformFees,
                    totalOtherFees: 0,
                    grandTotal: deductionsGrandTotal,
                },
                netPayable: eligibleData.summary.netPayable,
            },
            status: 'pending_approval',
            payout: {
                status: 'pending',
                method: 'razorpay_payout',
            },
        });

        // Mark shipments as included in remittance
        await Shipment.updateMany(
            {
                _id: { $in: shipmentsData.map((s) => s.shipmentId) },
            },
            {
                $set: {
                    'remittance.included': true,
                    'remittance.remittanceId': remittanceId,
                    'remittance.remittedAt': new Date(),
                },
            }
        );

        const shipmentCount = remittance.shipments.length;

        logger.info(`COD Remittance batch created: ${remittanceId} with ${shipmentCount} shipments`);

        return {
            remittanceId: remittance.remittanceId,
            financial: {
                totalCODCollected: remittance.financial.totalCODCollected,
                netPayable: remittance.financial.netPayable,
                deductionsSummary: remittance.financial.deductionsSummary,
            },
            shipmentCount: remittance.shipments.length,
        };
    }

    /**
     * Approve remittance batch (admin action)
     */
    static async approveRemittance(
        remittanceId: string,
        approvedBy: string,
        approvalNotes?: string
    ): Promise<{
        success: boolean;
        remittanceId: string;
        status: 'approved';
    }> {
        const remittance = await CODRemittance.findOne({ remittanceId });

        if (!remittance) {
            throw new ValidationError('Remittance not found', ErrorCode.RES_REMITTANCE_NOT_FOUND);
        }

        if (remittance.status !== 'pending_approval') {
            throw new ValidationError(
                `Cannot approve remittance in ${remittance.status} status`,
                ErrorCode.BIZ_INVALID_STATE
            );
        }

        remittance.status = 'approved';
        remittance.approvedBy = new mongoose.Types.ObjectId(approvedBy);
        remittance.approvedAt = new Date();
        remittance.approvalNotes = approvalNotes;

        remittance.timeline.push({
            status: 'approved',
            timestamp: new Date(),
            actor: new mongoose.Types.ObjectId(approvedBy),
            action: 'Remittance batch approved',
            notes: approvalNotes,
        });

        await remittance.save();

        logger.info(`Remittance ${remittanceId} approved by ${approvedBy}`);

        return {
            success: true,
            remittanceId: remittance.remittanceId,
            status: 'approved',
        };
    }

    /**
     * Initiate payout via Razorpay
     */
    static async initiatePayout(remittanceId: string): Promise<{
        success: boolean;
        razorpayPayoutId?: string;
        status: 'processing' | 'failed';
        failureReason?: string;
    }> {
        const remittance = await CODRemittance.findOne({ remittanceId }).populate('companyId');

        if (!remittance) {
            throw new ValidationError('Remittance not found', ErrorCode.RES_REMITTANCE_NOT_FOUND);
        }

        if (remittance.status !== 'approved') {
            throw new ValidationError(
                `Cannot initiate payout for remittance in ${remittance.status} status`,
                ErrorCode.BIZ_INVALID_STATE
            );
        }

        const company: any = remittance.companyId;

        // Check Razorpay configuration
        const razorpayFundAccountId = company.financial?.razorpayFundAccountId;
        if (!razorpayFundAccountId) {
            throw new AppError(
                'Razorpay fund account not configured. Please add bank details.',
                ErrorCode.BIZ_SETUP_FAILED,
                400
            );
        }

        try {
            // Create Razorpay payout
            // Note: Using 'as any' for Razorpay types - SDK types may be incomplete
            const razorpayInstance = this.razorpay as any;
            const payout: any = await razorpayInstance.payouts.create({
                account_number: process.env.RAZORPAY_ACCOUNT_NUMBER!,
                fund_account_id: razorpayFundAccountId,
                amount: Math.round(remittance.financial.netPayable * 100), // Convert to paise
                currency: 'INR',
                mode: 'IMPS',
                purpose: 'payout',
                queue_if_low_balance: false,
                reference_id: remittanceId,
                narration: `COD Remittance #${remittance.batch.batchNumber}`,
            });

            // Update remittance with payout details
            remittance.payout.status = 'processing';
            remittance.payout.razorpayPayoutId = payout.id;
            remittance.payout.initiatedAt = new Date();
            remittance.status = 'paid';

            remittance.timeline.push({
                status: 'processing',
                timestamp: new Date(),
                actor: 'system',
                action: `Razorpay payout initiated: ${payout.id}`,
            });

            await remittance.save();

            logger.info(`Payout initiated for ${remittanceId}: ${payout.id}`);

            return {
                success: true,
                razorpayPayoutId: payout.id,
                status: 'processing',
            };
        } catch (error: any) {
            // Handle Razorpay errors
            remittance.payout.status = 'failed';
            remittance.payout.failureReason = error.message || 'Unknown Razorpay error';
            remittance.status = 'failed';

            remittance.timeline.push({
                status: 'failed',
                timestamp: new Date(),
                actor: 'system',
                action: 'Razorpay payout failed',
                notes: error.message,
            });

            await remittance.save();

            logger.error(`Payout failed for ${remittanceId}:`, error);

            return {
                success: false,
                status: 'failed',
                failureReason: error.message,
            };
        }
    }

    /**
     * Handle Razorpay payout webhook
     * Updates remittance status when payout completes/fails
     */
    static async handlePayoutWebhook(
        razorpayPayoutId: string,
        status: 'completed' | 'failed' | 'reversed',
        failureReason?: string
    ): Promise<void> {
        const remittance = await CODRemittance.findOne({
            'payout.razorpayPayoutId': razorpayPayoutId,
        });

        if (!remittance) {
            logger.warn(`Webhook received for unknown payout: ${razorpayPayoutId}`);
            return;
        }

        if (status === 'completed') {
            remittance.payout.status = 'completed';
            remittance.payout.completedAt = new Date();
            remittance.status = 'paid';

            remittance.timeline.push({
                status: 'completed',
                timestamp: new Date(),
                actor: 'system',
                action: 'Payout completed successfully',
            });

            logger.info(`Payout completed for ${remittance.remittanceId}`);
        } else if (status === 'failed' || status === 'reversed') {
            remittance.payout.status = 'failed';
            remittance.payout.failureReason = failureReason || 'Payout failed';
            remittance.status = 'failed';

            remittance.timeline.push({
                status: 'failed',
                timestamp: new Date(),
                actor: 'system',
                action: `Payout ${status}`,
                notes: failureReason,
            });

            logger.error(`Payout ${status} for ${remittance.remittanceId}: ${failureReason}`);
        }

        await remittance.save();
    }

    /**
     * Get remittance details by ID
     */
    static async getRemittanceDetails(remittanceId: string, companyId: string): Promise<any> {
        const remittance = await CODRemittance.findOne({
            _id: remittanceId,
            companyId,
            isDeleted: false,
        })
            .populate({
                path: 'shipments.shipmentId',
                select: 'awb orderId deliveredAt status courierPartner weight packageDetails',
                populate: {
                    path: 'orderId',
                    select: 'orderNumber productDetails customerDetails',
                },
            })
            .lean();

        if (!remittance) {
            throw new AppError('Remittance not found', ErrorCode.RES_RESOURCE_NOT_FOUND, 404);
        }

        return remittance;
    }

    /**
     * List remittances for a company (paginated)
     */
    static async listRemittances(
        companyId: string,
        options: {
            status?: string;
            startDate?: Date;
            endDate?: Date;
            page: number;
            limit: number;
        }
    ): Promise<{
        remittances: ICODRemittance[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }> {
        const { status, startDate, endDate, page, limit } = options;

        const filter: Record<string, any> = {
            companyId: new mongoose.Types.ObjectId(companyId),
            isDeleted: false,
        };

        if (status) {
            filter.status = status;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = startDate;
            if (endDate) filter.createdAt.$lte = endDate;
        }

        const skip = (page - 1) * limit;

        const [remittances, total] = await Promise.all([
            CODRemittance.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            CODRemittance.countDocuments(filter),
        ]);

        return {
            remittances: remittances as ICODRemittance[],
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Cancel remittance batch (before payout)
     */
    static async cancelRemittance(
        remittanceId: string,
        cancelledBy: string,
        reason: string
    ): Promise<void> {
        const remittance = await CODRemittance.findOne({ remittanceId });

        if (!remittance) {
            throw new ValidationError('Remittance not found', ErrorCode.RES_REMITTANCE_NOT_FOUND);
        }

        if (!['pending_approval', 'approved'].includes(remittance.status)) {
            throw new ValidationError(
                `Cannot cancel remittance in ${remittance.status} status`,
                ErrorCode.BIZ_INVALID_STATE
            );
        }

        remittance.status = 'cancelled';
        remittance.cancelledBy = new mongoose.Types.ObjectId(cancelledBy);
        remittance.cancelledAt = new Date();
        remittance.cancellationReason = reason;

        remittance.timeline.push({
            status: 'cancelled',
            timestamp: new Date(),
            actor: new mongoose.Types.ObjectId(cancelledBy),
            action: 'Remittance batch cancelled',
            notes: reason,
        });

        await remittance.save();

        // Unmark shipments
        await Shipment.updateMany(
            {
                _id: { $in: remittance.shipments.map((s) => s.shipmentId) },
            },
            {
                $set: {
                    'remittance.included': false,
                    'remittance.remittanceId': null,
                },
            }
        );

        logger.info(`Remittance ${remittanceId} cancelled by ${cancelledBy}: ${reason}`);
    }
    /**
     * Get COD remittance dashboard stats
     */
    static async getDashboardStats(companyId: string): Promise<any> {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            // 1. Pending Collection (Delivered but not remitted)
            let eligible;
            try {
                eligible = await this.getEligibleShipments(companyId, now);
            } catch (error) {
                // If no eligible shipments, return zeros instead of throwing error
                eligible = {
                    shipments: [],
                    summary: {
                        totalShipments: 0,
                        totalCOD: 0,
                        totalDeductions: 0,
                        netPayable: 0
                    }
                };
            }

            // 2. In Settlement (Batches created but not paid)
            const inSettlement = await CODRemittance.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(companyId),
                        status: { $in: ['pending_approval', 'approved'] },
                        isDeleted: false
                    }
                },
                {
                    $group: {
                        _id: null,
                        amount: { $sum: '$financial.netPayable' },
                        count: { $sum: '$financial.totalShipments' }
                    }
                }
            ]);

            // 3. Available (Approved pending payout) - strictly speaking overlap with "In Settlement" 
            // but let's define Available as 'approved' specifically if we want distinct buckets.
            // For simplicity, let's stick to the plan's buckets.
            const available = await CODRemittance.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(companyId),
                        status: 'approved',
                        'payout.status': 'pending',
                        isDeleted: false
                    }
                },
                {
                    $group: {
                        _id: null,
                        amount: { $sum: '$financial.netPayable' }
                    }
                }
            ]);

            // 4. This Month Stats
            const thisMonth = await CODRemittance.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(companyId),
                        status: 'paid',
                        createdAt: { $gte: startOfMonth },
                        isDeleted: false
                    }
                },
                {
                    $group: {
                        _id: null,
                        collected: { $sum: '$financial.totalCODCollected' },
                        deducted: { $sum: '$financial.deductionsSummary.grandTotal' },
                        received: { $sum: '$financial.netPayable' }
                    }
                }
            ]);

            return {
                pendingCollection: {
                    amount: eligible.summary.totalCOD,
                    orders: eligible.summary.totalShipments,
                    estimatedDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) // +2 days
                },
                inSettlement: {
                    amount: (inSettlement[0]?.amount || 0) - (available[0]?.amount || 0), // Subtract available to avoid double count if overlapping
                    orders: inSettlement[0]?.count || 0,
                    estimatedDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000) // +1 day
                },
                available: {
                    amount: available[0]?.amount || 0,
                    estimatedPayoutDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000) // Next day
                },
                thisMonth: {
                    collected: thisMonth[0]?.collected || 0,
                    deducted: thisMonth[0]?.deducted || 0,
                    received: thisMonth[0]?.received || 0
                }
            };
        } catch (error) {
            logger.error('Error getting dashboard stats', error);
            throw error;
        }
    }

    /**
     * Handle Velocity settlement webhook
     */
    static async handleSettlementWebhook(payload: any): Promise<void> {
        logger.info('Received settlement webhook', { payload });
        // Logic to reconcile settlements would go here
        // For now, we mock success
    }

    /**
     * Request on-demand payout
     */
    static async requestPayout(
        companyId: string,
        amount: number,
        userId: string
    ): Promise<any> {
        // Create a special batch
        return this.createRemittanceBatch(companyId, 'on_demand', new Date(), userId);
    }

    /**
     * Schedule payout preference
     */
    static async schedulePayout(
        companyId: string,
        schedule: any
    ): Promise<any> {
        // Mock implementation - in prod, save to Company model
        logger.info('Updated payout schedule', { companyId, schedule });
        return {
            scheduleId: 'SCH-' + Date.now(),
            ...schedule,
            nextPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        };
    }
}
