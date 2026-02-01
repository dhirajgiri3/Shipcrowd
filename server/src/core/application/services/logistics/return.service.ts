/**
 * Return Service
 * 
 * Handles the complete returns management lifecycle.
 */

import mongoose from 'mongoose';
import ReturnOrder, { IReturnOrder, ReturnReason } from '../../../../infrastructure/database/mongoose/models/logistics/returns/return-order.model';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import WalletService from '../wallet/wallet.service';
import InventoryService from '../warehouse/inventory.service';
import logger from '../../../../shared/logger/winston.logger';
import { AppError, NotFoundError, ValidationError, ConflictError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import NotificationService from '../communication/notification.service';

/**
 * DTOs for type safety
 */
interface ICreateReturnRequestDTO {
    orderId: string;
    shipmentId: string;
    companyId: string;
    customerId?: string;
    returnReason: ReturnReason;
    returnReasonText?: string;
    customerComments?: string;
    items: Array<{
        productId: string;
        productName: string;
        sku?: string;
        quantity: number;
        unitPrice: number;
    }>;
    refundMethod?: 'wallet' | 'original_payment' | 'bank_transfer';
}

interface ISchedulePickupDTO {
    returnId: string;
    scheduledDate: Date;
    courierId: string;
    performedBy: string;
}

interface IRecordQCResultDTO {
    returnId: string;
    result: 'approved' | 'rejected' | 'partial';
    itemsAccepted: number;
    itemsRejected: number;
    rejectionReason?: string;
    photos?: string[];
    notes?: string;
    assignedTo: string;
}

interface IReturnStatistics {
    totalReturns: number;
    returnRate: number;
    topReasons: Array<{ reason: string; count: number; percentage: number }>;
    avgRefundAmount: number;
    qcPassRate: number;
    avgProcessingTime: number;      // In hours
    slaBreachRate: number;
    returnsByStatus: Record<string, number>;
    timeSeriesData?: Array<{
        date: string;
        returns: number;
        refundAmount: number;
    }>;
}

export default class ReturnService {
    // ========================================================================
    // METHOD 1: CREATE RETURN REQUEST
    // ========================================================================
    /**
     * Create a new return request initiated by customer
     * 
     * @param data Return request details
     * @returns Created return order
     * @throws AppError if order not eligible for return
     */
    static async createReturnRequest(data: ICreateReturnRequestDTO): Promise<IReturnOrder> {
        logger.info('Creating return request', {
            orderId: data.orderId,
            shipmentId: data.shipmentId,
            reason: data.returnReason,
        });

        // 1. Validate shipment exists and is delivered
        const shipment = await Shipment.findById(data.shipmentId);
        if (!shipment) {
            throw new NotFoundError('Shipment', ErrorCode.RES_SHIPMENT_NOT_FOUND);
        }

        if (shipment.currentStatus !== 'delivered') {
            throw new ValidationError('Returns can only be initiated for delivered shipments');
        }

        // 2. Check return eligibility window (7 days from delivery)
        const deliveryTimeline = shipment.statusHistory;
        const deliveryDate = deliveryTimeline.find(t => t.status === 'delivered')?.timestamp;
        if (deliveryDate) {
            const daysSinceDelivery = Math.floor(
                (Date.now() - new Date(deliveryDate).getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysSinceDelivery > 7) {
                throw new ValidationError('Return window expired. Returns must be initiated within 7 days of delivery.');
            }
        }

        // 3. Calculate refund amount
        const refundAmount = data.items.reduce(
            (sum, item) => sum + (item.unitPrice * item.quantity),
            0
        );

        // 4. Generate unique return ID
        const returnId = await this.generateReturnId();

        // 5. Set SLA deadlines
        const now = new Date();
        const pickupDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours

        // 6. Create return order
        const returnOrder = await ReturnOrder.create({
            returnId,
            orderId: data.orderId,
            shipmentId: data.shipmentId,
            companyId: data.companyId,
            customerId: data.customerId,
            returnReason: data.returnReason,
            returnReasonText: data.returnReasonText,
            customerComments: data.customerComments,
            items: data.items.map(item => ({
                ...item,
                productId: new mongoose.Types.ObjectId(item.productId),
                totalPrice: item.unitPrice * item.quantity,
            })),
            refundAmount,
            refundMethod: data.refundMethod || 'wallet',
            status: 'requested',
            sla: {
                pickupDeadline,
                isBreached: false,
            },
        });

        logger.info('Return request created successfully', {
            returnId: returnOrder.returnId,
            refundAmount,
            itemCount: data.items.length,
        });

        // Send notification to customer
        try {
            await NotificationService.sendReturnStatusNotification(
                {
                    email: shipment.deliveryDetails.recipientEmail,
                    phone: shipment.deliveryDetails.recipientPhone
                },
                shipment.deliveryDetails.recipientName || 'Customer',
                returnOrder.returnId,
                'requested',
                returnOrder.items.map(i => i.productName)
            );
        } catch (notifError) {
            logger.warn('Failed to send return notification:', notifError);
            // Don't fail the request if notification fails
        }

        return returnOrder;
    }

    // ========================================================================
    // METHOD 2: SCHEDULE PICKUP
    // ========================================================================
    /**
     * Schedule reverse pickup for approved return
     * 
     * @param data Pickup details
     * @returns Updated return order
     */
    static async schedulePickup(data: ISchedulePickupDTO): Promise<IReturnOrder> {
        logger.info('Scheduling return pickup', {
            returnId: data.returnId,
            scheduledDate: data.scheduledDate,
        });

        // 1. Validate return exists
        const returnOrder = await ReturnOrder.findOne({ returnId: data.returnId });
        if (!returnOrder) {
            throw new NotFoundError('Return order', ErrorCode.BIZ_NOT_FOUND);
        }

        // 2. Validate state
        if (returnOrder.status !== 'requested') {
            throw new ValidationError(`Cannot schedule pickup. Current status: ${returnOrder.status}`);
        }

        // 3. Call courier API to create reverse shipment (no mock fallback here)
        const shipment = await Shipment.findById(returnOrder.shipmentId);
        if (!shipment) {
            throw new NotFoundError('Shipment', ErrorCode.RES_SHIPMENT_NOT_FOUND);
        }

        // Only Velocity-backed shipments are supported for automated reverse pickup
        // Get courier provider via Factory
        const courierProvider = (shipment as any).carrier || 'velocity';

        const { CourierFactory } = await import('../../../../infrastructure/external/couriers/courier.factory.js');
        const courierAdapter = await CourierFactory.getProvider(
            returnOrder.companyId.toString(),
            courierProvider
        );

        const pickupAddress = {
            name: (shipment as any).deliveryDetails?.recipientName || 'Customer',
            phone: (shipment as any).deliveryDetails?.recipientPhone || '',
            address: (shipment as any).deliveryDetails?.address?.line1 || '',
            city: (shipment as any).deliveryDetails?.address?.city || '',
            state: (shipment as any).deliveryDetails?.address?.state || '',
            pincode: (shipment as any).deliveryDetails?.address?.postalCode || '',
            country: (shipment as any).deliveryDetails?.address?.country || 'India',
            email: (shipment as any).deliveryDetails?.recipientEmail,
        };

        const packageDetails = {
            weight: (shipment as any).packageDetails?.weight || 0.5,
            length: (shipment as any).packageDetails?.dimensions?.length || 10,
            width: (shipment as any).packageDetails?.dimensions?.width || 10,
            height: (shipment as any).packageDetails?.dimensions?.height || 10,
        };

        const reverseShipmentResponse = await courierAdapter.createReverseShipment({
            originalAwb: (shipment as any).trackingNumber,
            pickupAddress,
            returnWarehouseId: (shipment as any).pickupDetails?.warehouseId?.toString(),
            package: packageDetails,
            orderId: (shipment as any).orderId?.toString() || returnOrder.orderId?.toString() || '',
            reason: 'RETURN - Customer Return Request'
        });

        const realAwb = reverseShipmentResponse.trackingNumber;
        const trackingUrl = reverseShipmentResponse.labelUrl;

        // 4. Update return order
        returnOrder.pickup.status = 'scheduled';
        returnOrder.pickup.scheduledDate = data.scheduledDate;
        returnOrder.pickup.courierId = data.courierId;
        returnOrder.pickup.awb = realAwb;
        returnOrder.pickup.trackingUrl = trackingUrl;
        returnOrder.status = 'pickup_scheduled';

        // 5. Add timeline entry
        returnOrder.addTimelineEntry(
            'pickup_scheduled',
            new mongoose.Types.ObjectId(data.performedBy),
            `Pickup scheduled for ${data.scheduledDate.toLocaleDateString()}`,
            undefined,
            {
                courierId: data.courierId,
                awb: realAwb,
            }
        );

        await returnOrder.save();

        logger.info('Pickup scheduled successfully', {
            returnId: returnOrder.returnId,
            awb: realAwb,
        });

        // Send tracking link to customer
        try {
            // Fetch shipment to get customer details
            const shipment = await Shipment.findById(returnOrder.shipmentId);

            if (shipment) {
                await NotificationService.sendReturnStatusNotification(
                    {
                        email: shipment.deliveryDetails.recipientEmail,
                        phone: shipment.deliveryDetails.recipientPhone
                    },
                    shipment.deliveryDetails.recipientName || 'Customer',
                    returnOrder.returnId,
                    'pickup_scheduled',
                    returnOrder.items.map(i => i.productName),
                    {
                        pickupDate: data.scheduledDate
                    }
                );
            }
        } catch (notifError) {
            logger.warn('Failed to send pickup notification:', notifError);
        }

        return returnOrder;
    }

    // ========================================================================
    // METHOD 3: RECORD QC RESULT
    // ========================================================================
    /**
     * Record quality check results after item received at warehouse
     * 
     * @param data QC result details
     * @returns Updated return order
     */
    static async recordQCResult(data: IRecordQCResultDTO): Promise<IReturnOrder> {
        logger.info('Recording QC result', {
            returnId: data.returnId,
            result: data.result,
            itemsAccepted: data.itemsAccepted,
        });

        // 1. Validate return exists
        const returnOrder = await ReturnOrder.findOne({ returnId: data.returnId });
        if (!returnOrder) {
            throw new NotFoundError('Return order', ErrorCode.BIZ_NOT_FOUND);
        }

        // 2. Validate QC can be performed
        const validStatuses = ['qc_pending', 'qc_in_progress', 'in_transit'];
        if (!validStatuses.includes(returnOrder.status)) {
            throw new ValidationError(`Cannot perform QC. Current status: ${returnOrder.status}`);
        }

        // 3. Update QC details
        returnOrder.qc.status = data.result === 'approved' ? 'passed' : 'failed';
        returnOrder.qc.result = data.result;
        returnOrder.qc.completedAt = new Date();
        returnOrder.qc.assignedTo = new mongoose.Types.ObjectId(data.assignedTo);
        returnOrder.qc.itemsAccepted = data.itemsAccepted;
        returnOrder.qc.itemsRejected = data.itemsRejected;
        returnOrder.qc.rejectionReason = data.rejectionReason;
        returnOrder.qc.photos = data.photos || [];
        returnOrder.qc.notes = data.notes;

        // 4. Update SLA for refund deadline
        if (data.result === 'approved' || data.result === 'partial') {
            const refundDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h for refund
            returnOrder.sla.refundDeadline = refundDeadline;
            returnOrder.status = 'approved';
            returnOrder.refund.status = 'pending';
        } else {
            returnOrder.status = 'rejected';
            returnOrder.refund.status = 'failed';
        }

        // 5. Check SLA compliance
        if (returnOrder.sla.qcDeadline && new Date() > returnOrder.sla.qcDeadline) {
            returnOrder.sla.isBreached = true;
            returnOrder.sla.breachedAt = new Date();
            returnOrder.sla.breachedStage = 'qc';
        }

        // 6. Add timeline entry
        returnOrder.addTimelineEntry(
            returnOrder.status,
            new mongoose.Types.ObjectId(data.assignedTo),
            `QC ${data.result}: ${data.itemsAccepted} accepted, ${data.itemsRejected} rejected`,
            data.rejectionReason,
            {
                qcResult: data.result,
                photosCount: data.photos?.length || 0,
            }
        );

        await returnOrder.save();

        logger.info('QC result recorded successfully', {
            returnId: returnOrder.returnId,
            result: data.result,
            nextStatus: returnOrder.status,
        });

        // 7. Trigger refund if approved
        if (data.result === 'approved' || data.result === 'partial') {
            // Queue refund processing (async)
            this.processRefund(data.returnId).catch(error => {
                logger.error('Auto-refund failed after QC approval', {
                    returnId: data.returnId,
                    error: error.message,
                });
            });
        }

        // Send QC result notification to customer
        try {
            const shipment = await Shipment.findById(returnOrder.shipmentId);
            const status = data.result === 'approved' ? 'qc_approved' : 'qc_rejected';

            if (shipment) {
                await NotificationService.sendReturnStatusNotification(
                    {
                        email: shipment.deliveryDetails.recipientEmail,
                        phone: shipment.deliveryDetails.recipientPhone
                    },
                    shipment.deliveryDetails.recipientName || 'Customer',
                    returnOrder.returnId,
                    status,
                    returnOrder.items.map(i => i.productName),
                    {
                        rejectionReason: data.rejectionReason
                    }
                );
            }
        } catch (notifError) {
            logger.warn('Failed to send QC result notification:', notifError);
        }

        return returnOrder;
    }

    // ========================================================================
    // METHOD 4: PROCESS REFUND
    // ========================================================================
    /**
     * Process refund to customer wallet or original payment method
     * Uses ACID transactions to ensure data consistency
     * 
     * @param returnId Return order ID
     * @returns Updated return order
     */
    static async processRefund(returnId: string): Promise<IReturnOrder> {
        logger.info('Processing refund', { returnId });

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Fetch return order
            const returnOrder = await ReturnOrder.findOne({ returnId }).session(session);
            if (!returnOrder) {
                throw new NotFoundError('Return order', ErrorCode.BIZ_NOT_FOUND);
            }

            // 2. Validate eligibility
            if (!returnOrder.isEligibleForRefund()) {
                throw new ValidationError('Return is not eligible for refund');
            }

            // 3. Calculate actual refund amount based on QC result
            const actualRefundAmount = returnOrder.calculateActualRefund();

            if (actualRefundAmount <= 0) {
                throw new ValidationError('Refund amount must be greater than zero');
            }

            // 4. Process refund based on method
            let transactionId: string;

            if (returnOrder.refundMethod === 'wallet') {
                // Credit to seller wallet
                const walletTransaction = await WalletService.credit(
                    returnOrder.companyId.toString(),
                    actualRefundAmount,
                    'refund',  // Valid TransactionReason
                    `Refund for return ${returnId}`,
                    {
                        type: 'manual',  // Use 'manual' as 'return_order' is not in enum
                        id: returnId,
                    },
                    'system'
                );

                if (!walletTransaction.success || !walletTransaction.transactionId) {
                    throw new AppError(
                        walletTransaction.error || 'Wallet credit failed',
                        'WALLET_CREDIT_FAILED',
                        500
                    );
                }

                transactionId = walletTransaction.transactionId;
            } else {
                // TODO: Integrate with payment gateway for original payment refund
                transactionId = `PG-REFUND-${Date.now()}`;
            }

            // 5. Update refund status
            returnOrder.refund.status = 'completed';
            returnOrder.refund.processedAt = new Date();
            returnOrder.refund.completedAt = new Date();
            returnOrder.refund.transactionId = transactionId;
            returnOrder.status = 'refunding';

            // 6. Add timeline entry
            returnOrder.addTimelineEntry(
                'refunding',
                'system',
                `Refund processed: ₹${actualRefundAmount.toLocaleString()}`,
                undefined,
                {
                    amount: actualRefundAmount,
                    method: returnOrder.refundMethod,
                    transactionId,
                }
            );

            await returnOrder.save({ session });

            // 7. Trigger inventory update (async after refund)
            await session.commitTransaction();

            logger.info('Refund processed successfully', {
                returnId,
                amount: actualRefundAmount,
                transactionId,
            });

            // 8. Update inventory (outside transaction to avoid locks)
            this.updateInventory(returnId).catch(error => {
                logger.error('Inventory update failed after refund', {
                    returnId,
                    error: error.message,
                });
            });

            // Send refund confirmation notification
            try {
                const shipment = await Shipment.findById(returnOrder.shipmentId);

                if (shipment) {
                    await NotificationService.sendReturnStatusNotification(
                        {
                            email: shipment.deliveryDetails.recipientEmail,
                            phone: shipment.deliveryDetails.recipientPhone
                        },
                        shipment.deliveryDetails.recipientName || 'Customer',
                        returnOrder.returnId,
                        'refund_processed',
                        returnOrder.items.map(i => i.productName),
                        {
                            refundAmount: actualRefundAmount,
                            refundTransactionId: transactionId
                        }
                    );
                }
            } catch (notifError) {
                logger.warn('Failed to send refund confirmation:', notifError);
            }

            return returnOrder;
        } catch (error) {
            await session.abortTransaction();
            logger.error('Refund processing failed', {
                returnId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        } finally {
            session.endSession();
        }
    }

    // ========================================================================
    // METHOD 5: UPDATE INVENTORY
    // ========================================================================
    /**
     * Update inventory for returned items accepted by QC
     * 
     * @param returnId Return order ID
     */
    static async updateInventory(returnId: string): Promise<void> {
        logger.info('Updating inventory for return', { returnId });

        // 1. Fetch return order
        const returnOrder = await ReturnOrder.findOne({ returnId });
        if (!returnOrder) {
            throw new NotFoundError('Return order', ErrorCode.BIZ_NOT_FOUND);
        }

        // 2. Validate QC status
        if (returnOrder.qc.status !== 'passed') {
            logger.warn('Skipping inventory update - QC not passed', { returnId });
            return;
        }

        // 3. Get warehouse ID (default to first warehouse if not set)
        // TODO: Determine correct warehouse based on shipment origin
        const warehouseId = returnOrder.inventory.warehouseId?.toString();

        if (!warehouseId) {
            logger.warn('No warehouse specified for inventory update', { returnId });
            returnOrder.inventory.status = 'failed';
            returnOrder.inventory.failureReason = 'No warehouse specified';
            await returnOrder.save();
            return;
        }

        try {
            // 4. Update stock for each accepted item
            const totalItems = returnOrder.items.reduce((sum, item) => sum + item.quantity, 0);
            const acceptedRatio = returnOrder.qc.itemsAccepted / totalItems;

            for (const item of returnOrder.items) {
                const acceptedQuantity = Math.round(item.quantity * acceptedRatio);

                if (acceptedQuantity > 0 && item.sku) {
                    await InventoryService.adjustStock({
                        inventoryId: item.productId.toString(),
                        quantity: acceptedQuantity,
                        reason: `Return received: ${returnId}`,
                        performedBy: 'system',
                    });

                    logger.info('Inventory adjusted for returned item', {
                        returnId,
                        sku: item.sku,
                        quantityAdded: acceptedQuantity,
                    });
                }
            }

            // 5. Update inventory status
            returnOrder.inventory.status = 'updated';
            returnOrder.inventory.updatedAt = new Date();

            // 6. Mark return as completed
            returnOrder.status = 'completed';

            // 7. Add timeline entry
            returnOrder.addTimelineEntry(
                'completed',
                'system',
                `Return completed. ${returnOrder.qc.itemsAccepted} items added back to inventory`,
                undefined,
                {
                    warehouseId,
                    itemsRestocked: returnOrder.qc.itemsAccepted,
                }
            );

            await returnOrder.save();

            logger.info('Inventory updated successfully for return', {
                returnId,
                itemsRestocked: returnOrder.qc.itemsAccepted,
            });
        } catch (error) {
            logger.error('Inventory update failed', {
                returnId,
                error: error instanceof Error ? error.message : String(error),
            });

            returnOrder.inventory.status = 'failed';
            returnOrder.inventory.failureReason = error instanceof Error ? error.message : 'Unknown error';
            await returnOrder.save();

            throw error;
        }
    }

    // ========================================================================
    // METHOD 6: GET RETURN STATISTICS
    // ========================================================================
    /**
     * Get comprehensive return statistics for analytics dashboard
     * 
     * @param companyId Company ID
     * @param dateRange Optional date range filter
     * @returns Return statistics
     */
    static async getReturnStats(
        companyId: string,
        dateRange?: { start: Date; end: Date }
    ): Promise<IReturnStatistics> {
        logger.info('Fetching return statistics', {
            companyId,
            dateRange,
        });

        // Build query filter
        const filter: any = {
            companyId: new mongoose.Types.ObjectId(companyId),
            isDeleted: false,
        };

        if (dateRange) {
            filter.createdAt = {
                $gte: dateRange.start,
                $lte: dateRange.end,
            };
        }

        // Fetch all returns
        const returns = await ReturnOrder.find(filter);

        // Calculate metrics
        const totalReturns = returns.length;

        // Total orders in same period (for return rate)
        // TODO: Fetch actual order count
        const totalOrders = 1000; // Placeholder
        const returnRate = (totalReturns / totalOrders) * 100;

        // Top return reasons
        const reasonCounts = returns.reduce((acc, ret) => {
            acc[ret.returnReason] = (acc[ret.returnReason] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const topReasons = Object.entries(reasonCounts)
            .map(([reason, count]) => ({
                reason,
                count,
                percentage: (count / totalReturns) * 100,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Average refund amount
        const avgRefundAmount = returns.length > 0
            ? returns.reduce((sum, ret) => sum + ret.refundAmount, 0) / returns.length
            : 0;

        // QC pass rate
        const qcCompletedReturns = returns.filter(r => r.qc.status === 'passed' || r.qc.status === 'failed');
        const qcPassRate = qcCompletedReturns.length > 0
            ? (returns.filter(r => r.qc.status === 'passed').length / qcCompletedReturns.length) * 100
            : 0;

        // Average processing time (request to refund)
        const completedReturns = returns.filter(r => r.refund.completedAt);
        const avgProcessingTime = completedReturns.length > 0
            ? completedReturns.reduce((sum, ret) => {
                const hours = (ret.refund.completedAt!.getTime() - ret.createdAt.getTime()) / (1000 * 60 * 60);
                return sum + hours;
            }, 0) / completedReturns.length
            : 0;

        // SLA breach rate
        const slaBreachRate = returns.length > 0
            ? (returns.filter(r => r.sla.isBreached).length / returns.length) * 100
            : 0;

        // Returns by status
        const returnsByStatus = returns.reduce((acc, ret) => {
            acc[ret.status] = (acc[ret.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        logger.info('Return statistics calculated', {
            companyId,
            totalReturns,
            returnRate: `${returnRate.toFixed(2)}%`,
        });

        return {
            totalReturns,
            returnRate,
            topReasons,
            avgRefundAmount,
            qcPassRate,
            avgProcessingTime,
            slaBreachRate,
            returnsByStatus,
        };
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    /**
     * Generate unique return ID
     * Format: RET-YYYYMMDD-XXXXX
     */
    private static async generateReturnId(): Promise<string> {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

        // Get count of returns created today
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        const todayCount = await ReturnOrder.countDocuments({
            createdAt: { $gte: startOfDay, $lte: endOfDay },
        });

        const sequence = (todayCount + 1).toString().padStart(5, '0');
        return `RET-${dateStr}-${sequence}`;
    }

    /**
     * Cancel return request
     */
    static async cancelReturn(
        returnId: string,
        cancelledBy: string,
        reason: string
    ): Promise<IReturnOrder> {
        const returnOrder = await ReturnOrder.findOne({ returnId });
        if (!returnOrder) {
            throw new NotFoundError('Return order', ErrorCode.BIZ_NOT_FOUND);
        }

        // Only allow cancellation if not yet refunded
        if (['refunding', 'completed'].includes(returnOrder.status)) {
            throw new AppError(
                'Cannot cancel return after refund has been processed',
                'CANNOT_CANCEL_REFUNDED',
                400
            );
        }

        returnOrder.status = 'cancelled';
        returnOrder.cancelledBy = new mongoose.Types.ObjectId(cancelledBy);
        returnOrder.cancelledAt = new Date();
        returnOrder.cancellationReason = reason;

        returnOrder.addTimelineEntry(
            'cancelled',
            new mongoose.Types.ObjectId(cancelledBy),
            `Return cancelled: ${reason}`,
            reason
        );

        await returnOrder.save();

        logger.info('Return cancelled', { returnId, cancelledBy, reason });

        // Send cancellation notification to customer
        try {
            const shipment = await Shipment.findById(returnOrder.shipmentId);

            if (shipment) {
                await NotificationService.sendReturnStatusNotification(
                    {
                        email: shipment.deliveryDetails.recipientEmail,
                        phone: shipment.deliveryDetails.recipientPhone
                    },
                    shipment.deliveryDetails.recipientName || 'Customer',
                    returnOrder.returnId,
                    'cancelled',
                    returnOrder.items.map(i => i.productName),
                    {
                        rejectionReason: reason
                    }
                );
            }
        } catch (notifError) {
            logger.warn('Failed to send cancellation notification:', notifError);
        }

        return returnOrder;
    }

    /**
     * Update pickup status from courier webhook
     * Handles status transitions and triggers appropriate workflows
     */
    static async updatePickupStatus(
        awb: string,
        status: string,
        location?: string,
        remarks?: string
    ): Promise<IReturnOrder> {
        logger.info('Updating pickup status from webhook', {
            awb,
            status,
            location,
        });

        // 1. Find return order by AWB
        const returnOrder = await ReturnOrder.findOne({ 'pickup.awb': awb });
        if (!returnOrder) {
            throw new AppError(
                `Return order not found for AWB: ${awb}`,
                'RETURN_NOT_FOUND',
                404
            );
        }

        // 2. Map courier status to internal status
        const statusMap: Record<string, string> = {
            'PICKUP_SCHEDULED': 'pickup_scheduled',
            'PICKED_UP': 'picked_up',
            'IN_TRANSIT': 'in_transit',
            'OUT_FOR_DELIVERY': 'in_transit',
            'DELIVERED_TO_WAREHOUSE': 'received_at_warehouse',
            'RECEIVED': 'received_at_warehouse',
            'FAILED': 'pickup_failed',
            'PICKUP_FAILED': 'pickup_failed',
        };

        const internalStatus = statusMap[status.toUpperCase()] || status.toLowerCase();

        // 3. Validate status transition
        const validTransitions: Record<string, string[]> = {
            'pickup_scheduled': ['picked_up', 'pickup_failed'],
            'picked_up': ['in_transit', 'pickup_failed'],
            'in_transit': ['received_at_warehouse'],
            'pickup_failed': ['pickup_scheduled'], // Allow reschedule
        };

        const currentStatus = returnOrder.status;
        const allowedNextStatuses = validTransitions[currentStatus] || [];

        if (!allowedNextStatuses.includes(internalStatus) && currentStatus !== internalStatus) {
            logger.warn('Invalid status transition attempted', {
                returnId: returnOrder.returnId,
                currentStatus,
                attemptedStatus: internalStatus,
            });
            // Don't throw error, just log and continue (idempotent)
            return returnOrder;
        }

        // 4. Update pickup and return status
        returnOrder.pickup.status = internalStatus as any;
        if (location) returnOrder.pickup.currentLocation = location;
        if (remarks) returnOrder.pickup.remarks = remarks;
        returnOrder.status = internalStatus as any;

        // 5. Handle specific status actions
        if (internalStatus === 'picked_up') {
            returnOrder.pickup.pickedUpAt = new Date();
        } else if (internalStatus === 'received_at_warehouse') {
            returnOrder.pickup.deliveredAt = new Date();
            returnOrder.status = 'qc_pending';
            returnOrder.qc.status = 'pending';

            // Set QC deadline (24 hours)
            returnOrder.sla.qcDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
        } else if (internalStatus === 'pickup_failed') {
            returnOrder.pickup.failureReason = remarks || 'Pickup failed';
        }

        // 6. Add timeline entry
        returnOrder.addTimelineEntry(
            internalStatus as any,
            'system',
            `Courier update: ${status}${location ? ` at ${location}` : ''}`,
            remarks,
            {
                courierStatus: status,
                location,
            }
        );

        await returnOrder.save();

        logger.info('Pickup status updated successfully', {
            returnId: returnOrder.returnId,
            awb,
            newStatus: internalStatus,
        });

        // 7. Send notifications for key status changes
        try {
            const shouldNotify = ['picked_up', 'received_at_warehouse', 'pickup_failed'].includes(internalStatus);

            if (shouldNotify) {
                const shipment = await Shipment.findById(returnOrder.shipmentId);

                if (shipment) {
                    await NotificationService.sendReturnStatusNotification(
                        {
                            email: shipment.deliveryDetails.recipientEmail,
                            phone: shipment.deliveryDetails.recipientPhone
                        },
                        shipment.deliveryDetails.recipientName || 'Customer',
                        returnOrder.returnId,
                        internalStatus,
                        returnOrder.items.map(i => i.productName),
                        {
                            rejectionReason: internalStatus === 'pickup_failed' ? remarks : undefined
                        }
                    );
                }
            }
        } catch (notifError) {
            logger.warn('Failed to send pickup status notification:', notifError);
        }

        return returnOrder;
    }
}
