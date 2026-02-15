import mongoose from 'mongoose';
import CODRemittance, { ICODRemittance } from '../../../../infrastructure/database/mongoose/models/finance/payouts/cod-remittance.model';
import { SellerBankAccount, Shipment } from '../../../../infrastructure/database/mongoose/models';
import QueueManager from '../../../../infrastructure/utilities/queue-manager';
import { AppError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';
import { EarlyCODService } from './early-cod.service';

/**
 * COD Remittance Service
 * Handles batch creation, Razorpay payout integration, and remittance lifecycle
 */
export class CODRemittanceService {
    private static readonly PAYOUT_AMOUNT_EPSILON = 0.01;

    private static calculateNextPayoutDate(
        frequency: 'weekly' | 'bi-weekly' | 'monthly',
        dayOfWeek?: number,
        dayOfMonth?: number
    ): Date {
        const now = new Date();
        const next = new Date(now);

        if (frequency === 'monthly') {
            const targetDay = typeof dayOfMonth === 'number' ? dayOfMonth : 1;
            next.setMonth(now.getMonth() + 1);
            next.setDate(targetDay);
            next.setHours(0, 0, 0, 0);
            return next;
        }

        const targetDay = typeof dayOfWeek === 'number' ? dayOfWeek : 1;
        const daysUntil = (targetDay - now.getDay() + 7) % 7 || 7;
        next.setDate(now.getDate() + daysUntil + (frequency === 'bi-weekly' ? 7 : 0));
        next.setHours(0, 0, 0, 0);
        return next;
    }

    /**
     * Create Early COD Remittance Batch
     * Triggered manually or via cron for enrolled companies
     */
    static async createEarlyRemittanceBatch(companyId: string): Promise<any> {
        const enrollment = await EarlyCODService.getActiveEnrollment(companyId);
        if (!enrollment) {
            throw new AppError('Company is not enrolled in Early COD', ErrorCode.BIZ_RULE_VIOLATION, 400);
        }

        // Determine cutoff date based on tier
        // T+1: Delivered <= Yesterday
        // T+2: Delivered <= 2 days ago
        const cutoffDate = new Date();
        const daysToSubtract = parseInt(enrollment.tier.replace('T+', ''), 10);
        cutoffDate.setDate(cutoffDate.getDate() - daysToSubtract);
        cutoffDate.setHours(23, 59, 59, 999);

        // Find eligible shipments
        // Status = delivered, Type = COD, Remittance = Not Included, DeliveredAt <= Cutoff
        const eligibleShipments = await Shipment.find({
            companyId,
            'paymentDetails.type': 'cod',
            currentStatus: 'delivered',
            'paymentDetails.collectionStatus': 'reconciled',
            'remittance.included': false,
            'paymentDetails.collectedAt': { $lte: cutoffDate } // Assuming collectedAt matches delivery for now
        });

        if (eligibleShipments.length === 0) {
            return { message: 'No eligible shipments for early remittance', count: 0 };
        }

        logger.info(`Found ${eligibleShipments.length} eligible shipments for Early COD ${enrollment.tier}`, { companyId });

        // Calculate totals and map shipments
        let totalCodAmount = 0;
        let totalPlatformFees = 0;
        let totalEarlyFees = 0; // Will be mapped to otherFees or similar
        const remittanceShipments = [];

        for (const shipment of eligibleShipments) {
            const codAmount = shipment.paymentDetails.actualCollection || shipment.paymentDetails.totalCollection || shipment.paymentDetails.codAmount || 0;
            totalCodAmount += codAmount;

            // Calculate fees per shipment (pro-rated or simple calculation)
            // For simplicity in Early COD, we might apply a flat % to the total, but schema requires per-shipment deductions
            // Let's calculate per shipment
            const shipmentEarlyFee = EarlyCODService.calculateFee(codAmount, enrollment.fee);
            totalEarlyFees += shipmentEarlyFee;

            const deductions = {
                shippingCharge: 0, // Assuming deductions handled elsewhere or 0 for now
                weightDispute: 0,
                rtoCharge: 0,
                insuranceCharge: 0,
                platformFee: 0,
                otherFees: shipmentEarlyFee, // Capture early fee here
                total: shipmentEarlyFee
            };

            const netAmount = codAmount - deductions.total;

            remittanceShipments.push({
                shipmentId: shipment._id,
                awb: shipment.trackingNumber,
                codAmount: codAmount,
                deliveredAt: shipment.actualDelivery || shipment.paymentDetails.collectedAt || new Date(),
                status: 'delivered',
                deductions: deductions,
                netAmount: netAmount,
                reconciliation: {
                    status: 'pending',
                    courierAmount: 0,
                    diffAmount: 0,
                    remarks: 'Early COD Auto-generated'
                }
            });
        }

        const payoutAmount = totalCodAmount - totalEarlyFees; // Net payable

        // Get next batch number
        const lastBatch = await CODRemittance.findOne({ companyId }).sort({ 'batch.batchNumber': -1 });
        const batchNumber = (lastBatch?.batch?.batchNumber || 0) + 1;

        // Generate Remittance ID
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const remittanceId = `REM-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

        // Create Batch
        const batch = await CODRemittance.create({
            remittanceId,
            companyId,
            status: 'pending_approval', // Valid enum value
            scheduleId: undefined, // Optional
            batch: {
                batchNumber,
                createdDate: new Date(),
                cutoffDate: cutoffDate,
                shippingPeriod: {
                    start: new Date(0), // All historic
                    end: cutoffDate
                }
            },
            schedule: {
                type: 'on_demand', // Early COD is effectively on-demand
                scheduledDate: new Date(),
                requestedBy: undefined // System triggered
            },
            shipments: remittanceShipments,
            financial: {
                totalCODCollected: totalCodAmount,
                totalShipments: eligibleShipments.length,
                successfulDeliveries: eligibleShipments.length,
                rtoCount: 0,
                disputedCount: 0,
                deductionsSummary: {
                    totalShippingCharges: 0,
                    totalWeightDisputes: 0,
                    totalRTOCharges: 0,
                    totalInsuranceCharges: 0,
                    totalPlatformFees: 0,
                    totalOtherFees: totalEarlyFees,
                    grandTotal: totalEarlyFees
                },
                netPayable: payoutAmount
            },
            payout: {
                status: 'pending',
                method: 'razorpay_payout',
                accountDetails: enrollment.bankDetails ? {
                    accountNumber: enrollment.bankDetails.accountNumber,
                    ifscCode: enrollment.bankDetails.ifsc,
                    accountHolderName: enrollment.bankDetails.beneficiaryName,
                    bankName: '', // Optional
                    upiId: '' // Optional
                } : undefined,
                requiresManualIntervention: false
            },
            // Metadata for tracking which isn't in schema but good to know context? 
            // Schema doesn't have 'type' or 'tier' at root, usually handled via schedule or separate logic.
            // We'll rely on the nature of the batch creation.
        });

        // Update Shipments
        const shipmentIds = eligibleShipments.map(s => s._id);
        await Shipment.updateMany(
            { _id: { $in: shipmentIds } },
            {
                $set: {
                    'paymentDetails.collectionStatus': 'remitted',
                    'remittance': {
                        included: true,
                        remittanceId: (batch as any)._id.toString(), // Store ObjectId as string ref
                        status: 'processed', // Shipment level status
                        remittedAmount: 0, // Individual breakdown could be updated later if needed
                        remittedAt: new Date(),
                        platformFee: 0 // If we want to track it
                    }
                }
            },
            { runValidators: false }
        );
        enrollment.usage.totalBatches += 1;
        enrollment.usage.totalAmountRemitted += payoutAmount;
        enrollment.usage.totalFeesPaid += totalEarlyFees;
        enrollment.usage.lastBatchAt = new Date();
        await enrollment.save();

        return batch;
    }

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
            'paymentDetails.type': 'cod',
            currentStatus: 'delivered',
            actualDelivery: { $lte: cutoffDate },
            'remittance.included': { $ne: true },
            isDeleted: false,
        })
            .select('trackingNumber paymentDetails.codAmount paymentDetails.shippingCost actualDelivery')
            .lean();

        if (!eligibleShipments || eligibleShipments.length === 0) {
            throw new AppError(
                'No eligible shipments found for remittance',
                ErrorCode.RES_REMITTANCE_NOT_FOUND,
                404
            );
        }

        let totalCOD = 0;
        let totalDeductions = 0;

        const formattedShipments = eligibleShipments.map((shipment: any) => {
            const codAmount = shipment.paymentDetails?.codAmount || 0;
            const shippingCharge = shipment.paymentDetails?.shippingCost || 0;
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
     * 
     * IDEMPOTENCY: Prevents duplicate batches for same company + cutoffDate
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
        // IDEMPOTENCY CHECK: Check if batch already exists for this company + cutoffDate
        const cutoffDateOnly = new Date(cutoffDate);
        cutoffDateOnly.setHours(0, 0, 0, 0);

        const existingBatch = await CODRemittance.findOne({
            companyId: new mongoose.Types.ObjectId(companyId),
            'batch.cutoffDate': {
                $gte: cutoffDateOnly,
                $lt: new Date(cutoffDateOnly.getTime() + 24 * 60 * 60 * 1000)
            },
            status: { $in: ['pending_approval', 'approved', 'paid'] }
        });

        if (existingBatch) {
            logger.info('Returning existing remittance batch (idempotency)', {
                remittanceId: existingBatch.remittanceId,
                companyId,
                cutoffDate: cutoffDateOnly
            });

            return {
                remittanceId: existingBatch.remittanceId,
                financial: {
                    totalCODCollected: existingBatch.financial.totalCODCollected,
                    netPayable: existingBatch.financial.netPayable,
                    deductionsSummary: existingBatch.financial.deductionsSummary,
                },
                shipmentCount: existingBatch.shipments.length,
            };
        }

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
     * 
     * DISTRIBUTED LOCK: Prevents concurrent payout initiation
     */
    static async initiatePayout(remittanceId: string): Promise<{
        success: boolean;
        razorpayPayoutId?: string;
        status: 'processing' | 'failed';
        failureReason?: string;
    }> {
        // DISTRIBUTED LOCK: Use Redis-based lock to prevent concurrent initiation
        const lockKey = `payout:lock:${remittanceId}`;
        const lockTTL = 30; // 30 seconds

        const { getRateLimiter } = await import('../../../../infrastructure/utilities/rate-limiter');
        const rateLimiter = getRateLimiter();

        // Try to acquire lock
        const lockAcquired = await rateLimiter.acquireLock(lockKey, lockTTL);

        if (!lockAcquired) {
            logger.warn('Payout initiation already in progress', { remittanceId });
            throw new ValidationError(
                'Payout initiation already in progress. Please wait.',
                ErrorCode.BIZ_INVALID_STATE
            );
        }

        try {
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

            // Check if payout already processing
            if (remittance.payout.status === 'processing' || remittance.payout.status === 'completed') {
                logger.warn('Payout already initiated', {
                    remittanceId,
                    payoutStatus: remittance.payout.status
                });
                return {
                    success: true,
                    status: 'processing',
                    razorpayPayoutId: remittance.payout.razorpayPayoutId
                };
            }

            const company: any = remittance.companyId;

            // Resolve payout account from verified default bank account.
            const defaultVerifiedBankAccount = await SellerBankAccount.findOne({
                companyId: company._id,
                isDefault: true,
                verificationStatus: 'verified',
                razorpayFundAccountId: { $exists: true, $ne: '' },
            }).select('razorpayFundAccountId');

            const razorpayFundAccountId = defaultVerifiedBankAccount?.razorpayFundAccountId;

            if (!razorpayFundAccountId) {
                throw new AppError(
                    'No verified default bank account. Please add and verify a bank account.',
                    ErrorCode.BIZ_SETUP_FAILED,
                    400
                );
            }

            // Saga Pattern: Enqueue Payout Job
            // We do NOT call Razorpay directly here. We let the worker handle it.

            // 1. Update status to 'processing' (Locking)
            remittance.payout.status = 'processing';
            remittance.payout.initiatedAt = new Date();
            await remittance.save();

            // 2. Enqueue Job
            await QueueManager.addJob('payout-queue', 'process-payout', {
                remittanceId: remittance.remittanceId,
                companyId: company._id.toString(),
                amount: Math.round(remittance.financial.netPayable * 100),
                fundAccountId: razorpayFundAccountId,
                batchNumber: remittance.batch.batchNumber
            });

            logger.info(`Payout job enqueued for ${remittanceId}`);

            return {
                success: true,
                status: 'processing',
            };
        } catch (error: any) {
            logger.error(`Failed to enqueue payout for ${remittanceId}:`, error);

            // Revert status if we failed to enqueue
            const remittanceToRevert = await CODRemittance.findOne({ remittanceId });
            if (remittanceToRevert) {
                remittanceToRevert.payout.status = 'failed';
                remittanceToRevert.payout.failureReason = 'Failed to enqueue payout job: ' + error.message;
                remittanceToRevert.payout.lastError = error.message;
                remittanceToRevert.status = 'failed';
                await remittanceToRevert.save();
            }

            return {
                success: false,
                status: 'failed',
                failureReason: error.message,
            };
        } finally {
            // Release lock
            await rateLimiter.releaseLock(lockKey);
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
            search?: string;
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
        const { status, search, startDate, endDate, page, limit } = options;

        const filter: Record<string, any> = {
            companyId: new mongoose.Types.ObjectId(companyId),
            isDeleted: false,
        };

        if (status) {
            filter.status = status;
        }

        if (search) {
            const safeSearch = search.trim();
            if (safeSearch.length > 0) {
                filter.$or = [
                    { remittanceId: { $regex: safeSearch, $options: 'i' } },
                    { 'settlementDetails.utrNumber': { $regex: safeSearch, $options: 'i' } },
                    { 'payout.razorpayPayoutId': { $regex: safeSearch, $options: 'i' } },
                ];
            }
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
    static async getDashboardStats(
        companyId: string,
        dateRange?: { startDate?: Date; endDate?: Date }
    ): Promise<any> {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const createdAtFilter = dateRange?.startDate || dateRange?.endDate
                ? {
                    ...(dateRange.startDate ? { $gte: dateRange.startDate } : {}),
                    ...(dateRange.endDate ? { $lte: dateRange.endDate } : {}),
                }
                : undefined;
            const effectiveCutoffDate = dateRange?.endDate || now;

            // 1. Pending Collection (Delivered but not remitted)
            let eligible;
            try {
                eligible = await this.getEligibleShipments(companyId, effectiveCutoffDate);
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
                        isDeleted: false,
                        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
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
                        isDeleted: false,
                        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
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
                        createdAt: createdAtFilter || { $gte: startOfMonth },
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
     * Reconciles settlement data with internal COD remittance batches
     */
    static async handleSettlementWebhook(payload: {
        settlement_id: string;
        settlement_date: string;
        total_amount: number;
        currency?: string;
        utr_number?: string;
        bank_details?: {
            account_number?: string;
            ifsc?: string;
            bank_name?: string;
        };
        shipments: Array<{
            awb: string;
            cod_amount: number;
            shipping_deduction: number;
            cod_charge: number;
            rto_charge?: number;
            net_amount: number;
        }>;
    }): Promise<{
        success: boolean;
        reconciledBatches: number;
        discrepancies: Array<{ awb: string; reason: string }>;
        message: string;
    }> {
        try {
            logger.info('Processing settlement webhook', {
                settlementId: payload.settlement_id,
                totalAmount: payload.total_amount,
                shipmentCount: payload.shipments.length
            });

            const discrepancies: Array<{ awb: string; reason: string }> = [];
            const reconciledShipments = new Set<string>();
            const reconciledShipmentIds = new Set<string>();

            const awbs = payload.shipments.map((shipment) => shipment.awb).filter(Boolean);
            const shipments = awbs.length > 0
                ? await Shipment.find({
                    trackingNumber: { $in: awbs },
                    'paymentDetails.type': 'cod',
                    isDeleted: false,
                })
                : [];
            const shipmentByAwb = new Map(shipments.map(shipment => [shipment.trackingNumber, shipment]));

            // Step 1: Match each shipment in settlement with internal records
            for (const settlementShipment of payload.shipments) {
                try {
                    // Find shipment by AWB
                    const shipment = shipmentByAwb.get(settlementShipment.awb);

                    if (!shipment) {
                        discrepancies.push({
                            awb: settlementShipment.awb,
                            reason: 'Shipment not found in system'
                        });
                        continue;
                    }

                    // Check if already reconciled
                    if (shipment.remittance?.included) {
                        // Verify amount matches
                        const expectedNet = settlementShipment.net_amount;
                        const recordedAmount = shipment.remittance.remittedAmount || 0;

                        if (Math.abs(expectedNet - recordedAmount) > 0.01) {
                            discrepancies.push({
                                awb: settlementShipment.awb,
                                reason: `Amount mismatch: expected ${expectedNet}, recorded ${recordedAmount}`
                            });
                        } else {
                            // Update settlement details
                            shipment.remittance.remittedAt = new Date(payload.settlement_date);
                            shipment.remittance.remittedAmount = settlementShipment.net_amount;
                            await shipment.save();
                            reconciledShipments.add(settlementShipment.awb);
                            reconciledShipmentIds.add(String(shipment._id));
                        }
                    } else {
                        // Mark as remitted
                        shipment.remittance = {
                            included: true,
                            remittanceId: payload.settlement_id,
                            remittedAt: new Date(payload.settlement_date),
                            remittedAmount: settlementShipment.net_amount,
                            platformFee: settlementShipment.shipping_deduction + settlementShipment.cod_charge + (settlementShipment.rto_charge || 0)
                        };
                        await shipment.save();
                        reconciledShipments.add(settlementShipment.awb);
                        reconciledShipmentIds.add(String(shipment._id));
                    }
                } catch (error) {
                    logger.error('Error reconciling shipment', {
                        awb: settlementShipment.awb,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                    discrepancies.push({
                        awb: settlementShipment.awb,
                        reason: error instanceof Error ? error.message : 'Processing error'
                    });
                }
            }

            // Step 2: Find and update related COD remittance batches
            const companyIds = new Set<string>();
            for (const shipment of shipments) {
                if (reconciledShipments.has(shipment.trackingNumber)) {
                    companyIds.add(shipment.companyId.toString());
                }
            }

            let reconciledBatches = 0;
            const companyIdList = Array.from(companyIds).map(id => new mongoose.Types.ObjectId(id));
            if (companyIdList.length > 0) {
                // Find batches that might contain these shipments
                const batches = await CODRemittance.find({
                    companyId: { $in: companyIdList },
                    status: { $in: ['approved', 'processing'] },
                    isDeleted: false
                });

                for (const batch of batches) {
                    // Check if batch shipments are in the settlement
                    const batchShipments = batch.shipments || [];
                    const hasReconciledShipment = batchShipments.some((shipment: any) => {
                        if (shipment?.awb && reconciledShipments.has(shipment.awb)) {
                            return true;
                        }
                        if (shipment?.shipmentId && reconciledShipmentIds.has(String(shipment.shipmentId))) {
                            return true;
                        }
                        return false;
                    });

                    if (hasReconciledShipment) {
                        // Update batch status
                        (batch as any).status = 'settled';
                        (batch as any).settlementDetails = {
                            settlementId: payload.settlement_id,
                            settledAt: new Date(payload.settlement_date),
                            utrNumber: payload.utr_number,
                            settledAmount: payload.total_amount,
                            bankDetails: payload.bank_details
                        };
                        await batch.save();
                        reconciledBatches++;

                        logger.info('Batch reconciled with settlement', {
                            batchId: batch._id,
                            settlementId: payload.settlement_id
                        });
                    }
                }
            }

            // Step 3: Send alert if discrepancies found
            if (discrepancies.length > 0) {
                logger.warn('Settlement reconciliation completed with discrepancies', {
                    settlementId: payload.settlement_id,
                    totalShipments: payload.shipments.length,
                    reconciled: reconciledShipments.size,
                    discrepancies: discrepancies.length
                });

                // Send email alert to finance team
                const EmailService = (await import('../communication/email.service')).default;
                if ((EmailService as any).sendOperationalAlert) {
                    await (EmailService as any).sendOperationalAlert({
                        to: process.env.FINANCE_ALERT_EMAIL || 'finance@shipcrowd.com',
                        subject: `Settlement Reconciliation Alert - ${discrepancies.length} Discrepancies`,
                        body: `Settlement ID: ${payload.settlement_id}\n\n` +
                            `Total Amount: ${payload.total_amount} ${payload.currency || 'INR'}\n` +
                            `Reconciled: ${reconciledShipments.size}/${payload.shipments.length}\n\n` +
                            `Discrepancies:\n${discrepancies.map(d => `- ${d.awb}: ${d.reason}`).join('\n')}`
                    });
                } else {
                    logger.warn('EmailService.sendOperationalAlert not found, skipping alert email');
                }
            }

            return {
                success: true,
                reconciledBatches,
                discrepancies,
                message: discrepancies.length > 0
                    ? `Reconciled with ${discrepancies.length} discrepancies`
                    : 'Successfully reconciled all shipments'
            };

        } catch (error) {
            logger.error('Error handling settlement webhook', {
                error: error instanceof Error ? error.message : 'Unknown error',
                settlementId: payload.settlement_id
            });
            throw error;
        }
    }

    /**
     * Request on-demand payout
     */
    static async requestPayout(
        companyId: string,
        amount: number,
        userId: string
    ): Promise<{
        remittanceId: string;
        financial: {
            totalCODCollected: number;
            netPayable: number;
            deductionsSummary: Record<string, number>;
        };
        shipmentCount: number;
        requestedAmount: number;
        availableAmount: number;
        processedAmount: number;
        isPartialRequest: boolean;
    }> {
        if (!amount || amount <= 0) {
            throw new ValidationError('Payout amount must be greater than zero', ErrorCode.BIZ_RULE_VIOLATION);
        }

        const eligible = await this.getEligibleShipments(companyId, new Date());
        const availableAmount = eligible.summary.netPayable;

        if (availableAmount <= 0) {
            throw new ValidationError('No COD amount available for payout', ErrorCode.BIZ_INVALID_STATE);
        }

        if (amount - availableAmount > this.PAYOUT_AMOUNT_EPSILON) {
            throw new ValidationError(
                `Requested amount exceeds available payout balance (${availableAmount.toFixed(2)})`,
                ErrorCode.BIZ_RULE_VIOLATION
            );
        }

        const remittance = await this.createRemittanceBatch(companyId, 'on_demand', new Date(), userId);
        return {
            ...remittance,
            requestedAmount: amount,
            availableAmount,
            processedAmount: remittance.financial.netPayable,
            isPartialRequest: Math.abs(amount - availableAmount) > this.PAYOUT_AMOUNT_EPSILON,
        };
    }

    /**
     * Get COD settlement timeline (4-stage pipeline)
     * Powers the CODSettlementTimeline dashboard component
     * Stages: Collected → In Process → Scheduled → Settled
     */
    static async getTimeline(companyId: string): Promise<{
        stages: Array<{
            stage: 'collected' | 'in_process' | 'scheduled' | 'settled';
            amount: number;
            count: number;
            date: string | null;
        }>;
        lastSettlementAmount: number;
        nextSettlementIn: string;
        totalPending: number;
    }> {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Stage 1: Collected (Delivered COD not yet in a batch)
        let collected = { amount: 0, count: 0 };
        try {
            const eligibleData = await this.getEligibleShipments(companyId, now);
            collected = {
                amount: eligibleData.summary.totalCOD,
                count: eligibleData.summary.totalShipments
            };
        } catch (error) {
            // No eligible shipments is fine
            collected = { amount: 0, count: 0 };
        }

        // Stage 2: In Process (Batches pending approval)
        const inProcessResult = await CODRemittance.aggregate([
            {
                $match: {
                    companyId: new mongoose.Types.ObjectId(companyId),
                    status: 'pending_approval',
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
        const inProcess = {
            amount: inProcessResult[0]?.amount || 0,
            count: inProcessResult[0]?.count || 0
        };

        // Stage 3: Scheduled (Approved, ready for payout)
        const scheduledResult = await CODRemittance.aggregate([
            {
                $match: {
                    companyId: new mongoose.Types.ObjectId(companyId),
                    status: 'approved',
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
        const scheduled = {
            amount: scheduledResult[0]?.amount || 0,
            count: scheduledResult[0]?.count || 0
        };

        // Get next scheduled payout date from actual approved batch schedule when available
        const nextScheduledPayout = await CODRemittance.findOne({
            companyId: new mongoose.Types.ObjectId(companyId),
            status: 'approved',
            'schedule.scheduledDate': { $exists: true, $ne: null },
            isDeleted: false,
        })
            .sort({ 'schedule.scheduledDate': 1 })
            .select('schedule.scheduledDate')
            .lean();

        const nextPayoutDate = scheduled.amount > 0
            ? (nextScheduledPayout?.schedule?.scheduledDate
                ? new Date(nextScheduledPayout.schedule.scheduledDate).toISOString().split('T')[0]
                : new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            : null;

        // Stage 4: Settled (Paid in last 30 days)
        const settledResult = await CODRemittance.aggregate([
            {
                $match: {
                    companyId: new mongoose.Types.ObjectId(companyId),
                    status: 'paid',
                    'payout.completedAt': { $gte: thirtyDaysAgo },
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

        // Get last settlement date
        const lastSettlement = await CODRemittance.findOne({
            companyId: new mongoose.Types.ObjectId(companyId),
            status: 'paid',
            isDeleted: false
        })
            .sort({ 'payout.completedAt': -1 })
            .select('payout.completedAt financial.netPayable')
            .lean();

        const settled = {
            amount: settledResult[0]?.amount || 0,
            count: settledResult[0]?.count || 0,
            date: lastSettlement?.payout?.completedAt
                ? new Date(lastSettlement.payout.completedAt).toISOString().split('T')[0]
                : null
        };

        // Calculate next settlement estimate
        let nextSettlementIn = 'No pending settlements';
        if (scheduled.amount > 0) {
            nextSettlementIn = '1 day';
        } else if (inProcess.amount > 0) {
            nextSettlementIn = '2-3 days';
        } else if (collected.amount > 0) {
            nextSettlementIn = '3-5 days';
        }

        return {
            stages: [
                { stage: 'collected', amount: collected.amount, count: collected.count, date: null },
                { stage: 'in_process', amount: inProcess.amount, count: inProcess.count, date: null },
                { stage: 'scheduled', amount: scheduled.amount, count: scheduled.count, date: nextPayoutDate },
                { stage: 'settled', amount: settled.amount, count: settled.count, date: settled.date }
            ],
            lastSettlementAmount: lastSettlement?.financial?.netPayable || 0,
            nextSettlementIn,
            totalPending: collected.amount + inProcess.amount + scheduled.amount
        };
    }

    /**
     * Schedule payout preference
     */
    static async schedulePayout(
        companyId: string,
        schedule: {
            frequency?: 'weekly' | 'bi-weekly' | 'monthly';
            dayOfWeek?: number;
            dayOfMonth?: number;
        }
    ): Promise<{
        scheduleId: string;
        frequency: 'weekly' | 'bi-weekly' | 'monthly';
        dayOfWeek?: number;
        dayOfMonth?: number;
        nextPayoutDate: Date;
    }> {
        const frequency = schedule.frequency;
        if (!frequency || !['weekly', 'bi-weekly', 'monthly'].includes(frequency)) {
            throw new ValidationError('Invalid payout frequency', ErrorCode.BIZ_RULE_VIOLATION);
        }

        if (frequency === 'monthly') {
            if (typeof schedule.dayOfMonth !== 'number' || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31) {
                throw new ValidationError('dayOfMonth must be between 1 and 31 for monthly frequency', ErrorCode.BIZ_RULE_VIOLATION);
            }
        } else if (typeof schedule.dayOfWeek !== 'number' || schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6) {
            throw new ValidationError('dayOfWeek must be between 0 and 6 for weekly frequencies', ErrorCode.BIZ_RULE_VIOLATION);
        }

        const normalized = {
            frequency,
            dayOfWeek: frequency === 'monthly' ? undefined : schedule.dayOfWeek,
            dayOfMonth: frequency === 'monthly' ? schedule.dayOfMonth : undefined,
        };

        const nextPayoutDate = this.calculateNextPayoutDate(normalized.frequency, normalized.dayOfWeek, normalized.dayOfMonth);

        logger.info('Updated payout schedule', { companyId, schedule });
        return {
            scheduleId: 'SCH-' + Date.now(),
            ...normalized,
            nextPayoutDate,
        };
    }

    /**
     * Get total scheduled COD settlements for next N days
     * Used by Available Balance calculation to show incoming cash flow
     * 
     * @param companyId - Company ID
     * @param days - Number of days to look ahead (default: 7)
     * @returns Total amount scheduled to arrive in seller's wallet
     */
    static async getScheduledSettlements(
        companyId: string,
        days: number = 7
    ): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() + days);

            // Find all approved batches scheduled for payout within N days
            const scheduled = await CODRemittance.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(companyId),
                        status: 'approved', // Ready for payout
                        'schedule.scheduledDate': { $lte: cutoffDate },
                        isDeleted: false,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: '$financial.netPayable' },
                    },
                },
            ]);

            const total = scheduled[0]?.totalAmount || 0;

            logger.info('Calculated scheduled COD settlements', {
                companyId,
                days,
                total,
                cutoffDate: cutoffDate.toISOString(),
            });

            return total;
        } catch (error) {
            logger.error('Error calculating scheduled COD settlements', {
                companyId,
                days,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            // Return 0 instead of throwing - don't block Available Balance calculation
            return 0;
        }
    }
}

export default CODRemittanceService;
