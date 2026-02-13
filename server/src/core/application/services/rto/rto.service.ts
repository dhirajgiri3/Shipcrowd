/**
 * Rto
 * 
 * Purpose: Check rate limit for RTO triggers
 * 
 * DEPENDENCIES:
 * - Database Models, Error Handling, Event Bus, Logger
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import mongoose from 'mongoose';
import { RTOEvent, IRTOEvent } from '../../../../infrastructure/database/mongoose/models';
import { NDREvent } from '../../../../infrastructure/database/mongoose/models';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import { Order } from '../../../../infrastructure/database/mongoose/models';
import WhatsAppService from '../../../../infrastructure/external/communication/whatsapp/whatsapp.service';
import WarehouseNotificationService from '../warehouse/warehouse-notification.service';
import WalletService from '../wallet/wallet.service';
import { RTONotificationService } from './rto-notification.service';
import ServiceRatePricingService from './rate-card.service';
import InventoryService from '../warehouse/inventory.service';
import RTOAnalyticsService from './rto-analytics.service';
import logger from '../../../../shared/logger/winston.logger';
import { AppError } from '../../../../shared/errors/app.error';
import { createAuditLog } from '../../../../presentation/http/middleware/system/audit-log.middleware';
import { getRateLimiter } from '../../../../infrastructure/utilities/rate-limiter';
import eventBus from '../../../../shared/events/eventBus';

interface RTOResult {
    success: boolean;
    rtoEventId?: string;
    reverseAwb?: string;
    error?: string;
}

interface ShipmentInfo {
    _id: string;
    awb: string;
    orderId: string;
    companyId: string;
    warehouseId: string;
    status: string;
    customer?: {
        name: string;
        phone: string;
    };
}

interface AnalyticsDateRange {
    start: Date;
    end: Date;
}

export default class RTOService {
    private static whatsapp = new WhatsAppService();

    // Issue #A (Audit Fix): Redis-based distributed rate limiting
    private static rateLimiter = getRateLimiter();
    private static readonly RTO_RATE_LIMIT = 10; // Max RTOs per minute per company
    private static readonly RTO_RATE_WINDOW_SECONDS = 60; // 1 minute

    private static readonly DEFAULT_RTO_CHARGE = 50; // Fallback flat rate if calculation fails

    /**
     * Check rate limit for RTO triggers
     * Issue #A: Uses Redis for distributed rate limiting with in-memory fallback
     */
    private static async checkRateLimit(companyId: string): Promise<{ allowed: boolean; retryAfter?: number }> {
        try {
            const result = await this.rateLimiter.checkLimit(
                `rto:${companyId}`,
                this.RTO_RATE_LIMIT,
                this.RTO_RATE_WINDOW_SECONDS
            );

            if (!result.allowed) {
                logger.warn('RTO rate limit exceeded', {
                    companyId,
                    limit: this.RTO_RATE_LIMIT,
                    retryAfter: result.retryAfter,
                });
            }

            return {
                allowed: result.allowed,
                retryAfter: result.retryAfter,
            };
        } catch (error: any) {
            logger.error('Rate limit check failed, allowing request', {
                companyId,
                error: error.message,
            });
            // On error, allow the request (fail-open for availability)
            return { allowed: true };
        }
    }

    /**
     * Trigger RTO for a shipment
     */
    static async triggerRTO(
        shipmentId: string,
        reason: 'ndr_unresolved' | 'customer_cancellation' | 'qc_failure' | 'refused' | 'damaged_in_transit' | 'incorrect_product' | 'other',
        ndrEventId?: string,
        triggeredBy: 'auto' | 'manual' = 'manual',
        triggeredByUser?: string
    ): Promise<RTOResult> {
        const session = await mongoose.startSession();

        try {
            // Start transaction for atomic RTO creation (Issue #9)
            session.startTransaction();

            // Get shipment details
            const shipment = await this.getShipmentInfo(shipmentId);

            if (!shipment) {
                await session.abortTransaction();
                return { success: false, error: 'Shipment not found' };
            }

            // Validate shipment can be RTO'd (FIRST - fast check)
            const validation = this.validateRTOEligibility(shipment);
            if (!validation.eligible) {
                await session.abortTransaction();
                return { success: false, error: validation.reason };
            }

            // Calculate RTO charges
            const rtoCharges = await this.calculateRTOCharges(shipment);

            // CRITICAL FIX (Issue #2): Check wallet balance BEFORE creating RTO
            // This prevents "zombie RTOs" - RTOs created without payment
            const hasBalance = await WalletService.hasMinimumBalance(shipment.companyId, rtoCharges);

            if (!hasBalance) {
                await session.abortTransaction();
                const { balance } = await WalletService.getBalance(shipment.companyId);
                logger.warn('Insufficient wallet balance for RTO', {
                    shipmentId,
                    companyId: shipment.companyId,
                    requiredAmount: rtoCharges,
                    currentBalance: balance,
                });
                return {
                    success: false,
                    error: `Insufficient wallet balance. Required: ₹${rtoCharges}, Current: ₹${balance}`,
                };
            }

            // Issue #A (Audit Fix #5): Check rate limit AFTER validation
            // Only count valid, payable requests against rate limit quota
            const rateLimitCheck = await this.checkRateLimit(shipment.companyId);
            if (!rateLimitCheck.allowed) {
                await session.abortTransaction();
                return {
                    success: false,
                    error: `Rate limit exceeded. Max ${this.RTO_RATE_LIMIT} RTOs per minute. Retry after ${rateLimitCheck.retryAfter} seconds.`,
                };
            }


            // IDEMPOTENCY CHECK (Issue #5): Prevent duplicate RTO triggers from same NDR
            let idempotencyKey: string | undefined;
            if (ndrEventId) {
                idempotencyKey = `ndr-${ndrEventId}-rto`;

                // Check if this idempotency key was already used
                const existingNDR = await NDREvent.findOne({ idempotencyKey }).session(session);
                if (existingNDR && existingNDR.status === 'rto_triggered') {
                    await session.abortTransaction();
                    logger.warn('Duplicate RTO trigger attempt from NDR event', {
                        ndrEventId,
                        idempotencyKey,
                        existingNDR: existingNDR._id,
                    });
                    return {
                        success: false,
                        error: 'RTO already triggered for this NDR event',
                    };
                }

                // Mark NDR with idempotency key to prevent future duplicates
                await NDREvent.findByIdAndUpdate(
                    ndrEventId,
                    { idempotencyKey },
                    { session }
                );
            }

            // Create reverse shipment via courier API
            const reverseAwb = await this.createReverseShipment(shipment);

            // Create RTO event (Issue #4: unique index will prevent duplicates)
            let rtoEvent;
            try {
                rtoEvent = await RTOEvent.create(
                    [
                        {
                            shipment: shipmentId,
                            order: shipment.orderId,
                            reverseAwb,
                            rtoReason: reason,
                            ndrEvent: ndrEventId,
                            triggeredBy,
                            triggeredByUser,
                            rtoCharges,
                            warehouse: shipment.warehouseId,
                            expectedReturnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                            company: shipment.companyId,
                            returnStatus: 'initiated',
                            chargesDeducted: false, // Will be set to true after successful wallet deduction
                        },
                    ],
                    { session }
                );
            } catch (error: any) {
                await session.abortTransaction();
                // Handle duplicate key error from unique index (Issue #4)
                if (error.code === 11000) {
                    logger.warn('Duplicate RTO attempt detected', { shipmentId });
                    return {
                        success: false,
                        error: 'RTO already triggered for this shipment',
                    };
                }
                throw error;
            }

            // Deduct RTO charges from wallet (ATOMIC within SAME transaction)
            // FIX #3: Pass session for true ACID compliance - wallet deduction is now
            // part of the same transaction as RTO creation
            const walletResult = await WalletService.handleRTOCharge(
                shipment.companyId,
                String(rtoEvent[0]._id),
                rtoCharges,
                shipment.awb,
                session // Pass session for transaction isolation
            );

            if (!walletResult.success) {
                // If wallet deduction fails, ABORT entire transaction (no zombie RTO)
                await session.abortTransaction();
                logger.error('Failed to deduct RTO charges, aborting RTO creation', {
                    shipmentId,
                    companyId: shipment.companyId,
                    rtoCharges,
                    error: walletResult.error,
                });
                return {
                    success: false,
                    error: `Failed to deduct RTO charges: ${walletResult.error}`,
                };
            }

            // Mark charges as deducted
            rtoEvent[0].chargesDeducted = true;
            rtoEvent[0].chargesDeductedAt = new Date();
            await rtoEvent[0].save({ session });

            // Update shipment status within transaction
            await Shipment.findByIdAndUpdate(
                shipmentId,
                {
                    currentStatus: 'rto_initiated',
                    'rtoDetails.rtoInitiatedDate': new Date(),
                    'rtoDetails.rtoReason': reason,
                },
                { session }
            );

            // Update NDR event if applicable
            if (ndrEventId) {
                await NDREvent.findByIdAndUpdate(
                    ndrEventId,
                    {
                        status: 'rto_triggered',
                        autoRtoTriggered: triggeredBy === 'auto',
                    },
                    { session }
                );
            }

            // Commit transaction - ALL operations succeeded
            await session.commitTransaction();

            // Emit rto.completed event for commission system
            eventBus.emitEvent('rto.completed', {
                rtoId: String(rtoEvent[0]._id),
                orderId: shipment.orderId,
                companyId: shipment.companyId,
            });

            // Update order status (outside transaction - not critical)
            await this.updateOrderStatus(shipment.orderId, 'RTO_INITIATED');

            // Audit log (outside transaction)
            await createAuditLog(
                triggeredByUser || 'system',
                String(shipment.companyId),
                'create',
                'rto_event',
                String(rtoEvent[0]._id),
                {
                    action: 'trigger_rto',
                    shipmentId,
                    reason,
                    triggeredBy,
                    rtoCharges: rtoEvent[0].rtoCharges,
                    walletDeducted: true,
                }
            );

            // Notify warehouse (async, outside transaction)
            try {
                await this.notifyWarehouse(shipment.warehouseId, rtoEvent[0]);
                await RTOEvent.findByIdAndUpdate(rtoEvent[0]._id, {
                    warehouseNotified: true,
                });
            } catch (notifyError: any) {
                logger.error('Failed to notify warehouse', {
                    rtoEventId: rtoEvent[0]._id,
                    error: notifyError.message,
                });
                // Don't fail the RTO for notification failures
            }

            // Notify customer (RTO initiated) - fire-and-forget
            RTONotificationService.notifyRTOInitiated(String(rtoEvent[0]._id), {
                awb: shipment.awb,
                reverseAwb: rtoEvent[0].reverseAwb,
            }).catch((err) => logger.warn('RTO customer notification failed', { rtoEventId: rtoEvent[0]._id, error: err?.message }));

            // Notify customer (async, outside transaction)
            if (shipment.customer?.phone) {
                try {
                    await this.notifyCustomer(shipment.customer, shipment.orderId, reason, reverseAwb);
                    await RTOEvent.findByIdAndUpdate(rtoEvent[0]._id, {
                        customerNotified: true,
                    });
                } catch (notifyError: any) {
                    logger.error('Failed to notify customer', {
                        rtoEventId: rtoEvent[0]._id,
                        error: notifyError.message,
                    });
                    // Don't fail the RTO for notification failures
                }
            }

            logger.info('RTO triggered successfully', {
                rtoEventId: rtoEvent[0]._id,
                shipmentId,
                reason,
                triggeredBy,
                reverseAwb,
                chargesDeducted: rtoCharges,
                newWalletBalance: walletResult.newBalance,
            });

            return {
                success: true,
                rtoEventId: String(rtoEvent[0]._id),
                reverseAwb,
            };
        } catch (error: any) {
            await session.abortTransaction();
            logger.error('Failed to trigger RTO', {
                shipmentId,
                error: error.message,
                stack: error.stack,
            });

            return {
                success: false,
                error: error.message,
            };
        } finally {
            session.endSession();
        }
    }

    /**
     * Validate shipment is eligible for RTO
     */
    private static validateRTOEligibility(shipment: ShipmentInfo): {
        eligible: boolean;
        reason?: string;
    } {
        // Can't RTO delivered shipments
        if (shipment.status === 'delivered') {
            return { eligible: false, reason: 'Cannot RTO delivered shipment' };
        }

        // Can't RTO if already in RTO
        if (shipment.status === 'rto_initiated' || shipment.status === 'rto_in_transit') {
            return { eligible: false, reason: 'Shipment already in RTO process' };
        }

        return { eligible: true };
    }

    /**
     * Create reverse shipment via courier API
     *
     * Phase 5 Implementation: Integrates with Velocity courier adapter for RTO/reverse pickup.
     * Includes mock fallback for when real API is unavailable.
     */
    private static async createReverseShipment(shipment: ShipmentInfo): Promise<string> {
        try {
            // Get full shipment details for package information
            const fullShipment = await Shipment.findById(shipment._id)
                .populate('consignee')
                .populate('warehouseId');

            if (!fullShipment) {
                throw new Error('Shipment not found for reverse shipment creation');
            }

            // Check if shipment uses Velocity courier
            // Get courier provider via Factory
            // This decouples the service from specific implementations (Velocity, etc.)
            const courierProvider = fullShipment.carrier || 'velocity-shipfast'; // Default fallback

            const { CourierFactory } = await import('../courier/courier.factory.js');
            const courierAdapter = await CourierFactory.getProvider(
                courierProvider,
                new mongoose.Types.ObjectId(shipment.companyId)
            );

            // Prepare pickup address (customer location)
            const pickupAddress = {
                name: fullShipment.deliveryDetails?.recipientName || 'Customer',
                phone: fullShipment.deliveryDetails?.recipientPhone || '',
                address: fullShipment.deliveryDetails?.address?.line1 || '',
                city: fullShipment.deliveryDetails?.address?.city || '',
                state: fullShipment.deliveryDetails?.address?.state || '',
                pincode: fullShipment.deliveryDetails?.address?.postalCode || '',
                country: fullShipment.deliveryDetails?.address?.country || 'India',
                email: fullShipment.deliveryDetails?.recipientEmail
            };

            // Prepare package details
            const packageDetails = {
                weight: fullShipment.packageDetails?.weight || 0.5, // Default 0.5kg if not specified
                length: fullShipment.packageDetails?.dimensions?.length || 10,
                width: fullShipment.packageDetails?.dimensions?.width || 10,
                height: fullShipment.packageDetails?.dimensions?.height || 10
            };

            // Call courier API to create reverse shipment
            logger.info('Creating reverse shipment', {
                courier: courierProvider,
                originalAwb: fullShipment.trackingNumber,
                orderId: fullShipment.orderId,
                warehouseId: fullShipment.pickupDetails?.warehouseId
            });

            // Use correct schema paths
            const reverseShipmentResponse = await courierAdapter.createReverseShipment({
                originalAwb: fullShipment.trackingNumber,
                pickupAddress,
                returnWarehouseId: String(fullShipment.pickupDetails?.warehouseId || ''),
                package: packageDetails,
                orderId: fullShipment.orderId.toString(),
                reason: 'RTO - Return to Origin'
            });

            logger.info('Velocity reverse shipment created successfully', {
                originalAwb: fullShipment.trackingNumber,
                reverseAwb: reverseShipmentResponse.trackingNumber,
                labelUrl: reverseShipmentResponse.labelUrl,
                isFallback: reverseShipmentResponse.courierName?.includes('Mock')
            });

            return reverseShipmentResponse.trackingNumber;

        } catch (error) {
            // NO FALLBACK - Fail properly to surface configuration or integration issues
            logger.error('Failed to create reverse shipment with courier', {
                originalAwb: shipment.awb,
                companyId: shipment.companyId,
                warehouseId: shipment.warehouseId,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });

            throw new AppError(
                'Failed to create reverse shipment. Please verify courier configuration and Velocity API credentials.',
                'RTO_REVERSE_SHIPMENT_FAILED',
                500,
                true,
                {
                    originalAwb: shipment.awb,
                    companyId: shipment.companyId,
                    warehouseId: shipment.warehouseId
                }
            );
        }
    }

    /**
     * Calculate RTO charges
     *
     * Phase 5 Implementation: Dynamic calculation based on service-level pricing configuration.
     * Falls back to flat rate if no rate card configured.
     */
    private static async calculateRTOCharges(shipment: ShipmentInfo): Promise<number> {
        try {
            // Get full shipment for package and carrier details
            const fullShipment = await Shipment.findById(shipment._id);

            if (!fullShipment) {
                logger.warn('Shipment not found for charge calculation, using flat rate', {
                    shipmentId: shipment._id
                });
                return Number(process.env.RTO_FLAT_CHARGE) || this.DEFAULT_RTO_CHARGE;
            }

            // Prepare input for rate calculation
            const rateInput = {
                companyId: shipment.companyId,
                carrier: fullShipment.carrier || 'velocity',
                serviceType: fullShipment.serviceType || 'express',
                weight: fullShipment.packageDetails?.weight || 0.5,
                // RTO reverses origin/dest: pickup from delivery address, deliver to warehouse
                originPincode: fullShipment.deliveryDetails.address.postalCode,
                destinationPincode: fullShipment.pickupDetails?.warehouseId?.toString() // Will need warehouse lookup for actual pincode
            };

            // Calculate charges using service-level pricing helper
            const calculation = await ServiceRatePricingService.calculateRTOCharges(rateInput);

            logger.info('RTO charges calculated', {
                shipmentId: shipment._id,
                finalPrice: calculation.finalPrice,
                rateCardUsed: calculation.rateCardUsed || 'flat_rate',
                breakdown: calculation.breakdown
            });

            return calculation.finalPrice;

        } catch (error) {
            logger.error('Error calculating RTO charges, using flat rate fallback', {
                shipmentId: shipment._id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            // Fallback to flat rate
            return Number(process.env.RTO_FLAT_CHARGE) || this.DEFAULT_RTO_CHARGE;
        }
    }

    /**
     * Update order status when RTO is triggered
     * 
     * CRITICAL: This must be called OUTSIDE the main transaction to avoid
     * blocking RTO creation on order update failures. Order status is
     * important but not critical - RTO can proceed even if this fails.
     */
    private static async updateOrderStatus(orderId: string, status: string): Promise<void> {
        try {
            const result = await Order.findByIdAndUpdate(
                orderId,
                {
                    $set: { currentStatus: status.toLowerCase() },
                    $push: {
                        statusHistory: {
                            status: status.toLowerCase(),
                            timestamp: new Date(),
                            comment: 'RTO initiated - shipment being returned to warehouse',
                            updatedBy: 'system',
                        },
                    },
                },
                { new: true }
            );

            if (!result) {
                logger.warn('Order not found for status update', { orderId, status });
            } else {
                logger.info('Order status updated successfully', {
                    orderId,
                    previousStatus: result.currentStatus,
                    newStatus: status
                });
            }
        } catch (error: any) {
            // Log error but don't throw - order update failure shouldn't block RTO
            logger.error('Failed to update order status (non-critical)', {
                orderId,
                status,
                error: error.message,
            });
        }
    }

    /**
     * Deduct RTO charges from company wallet
     */
    private static async deductRTOCharges(
        companyId: string,
        rtoEventId: string,
        amount: number,
        shipmentAwb?: string
    ): Promise<{ success: boolean; newBalance?: number; error?: string }> {
        try {
            const result = await WalletService.handleRTOCharge(
                companyId,
                rtoEventId,
                amount,
                shipmentAwb
            );

            return result;
        } catch (error: any) {
            logger.error('Error deducting RTO charges', {
                companyId,
                rtoEventId,
                amount,
                error: error.message,
            });

            return {
                success: false,
                error: error.message,
            };
        }
    }

    private static async notifyWarehouse(
        warehouseId: string,
        rtoEvent: IRTOEvent
    ): Promise<void> {
        // Fetch shipment to get actual AWB
        const shipmentInfo = await this.getShipmentInfo(String(rtoEvent.shipment));
        const awb = shipmentInfo?.awb || String(rtoEvent.shipment);

        await WarehouseNotificationService.notifyRTOIncoming(
            String(rtoEvent._id),
            warehouseId,
            {
                awb,
                reverseAwb: rtoEvent.reverseAwb,
                expectedReturnDate: rtoEvent.expectedReturnDate || new Date(), // Fallback to current date
                rtoReason: rtoEvent.rtoReason,
                requiresQC: true, // Always require QC for RTO
            }
        );
    }

    /**
     * Notify customer about RTO
     */
    private static async notifyCustomer(
        customer: { name: string; phone: string },
        orderId: string,
        reason: string,
        reverseAwb?: string
    ): Promise<void> {
        const reasonText = this.getRTOReasonText(reason);

        await this.whatsapp.sendRTONotification(
            customer.phone,
            customer.name,
            orderId,
            reasonText,
            reverseAwb
        );
    }

    /**
     * Get human-readable RTO reason
     */
    private static getRTOReasonText(reason: string): string {
        const reasonMap: Record<string, string> = {
            ndr_unresolved: 'Delivery attempts exhausted',
            customer_cancellation: 'Order cancelled by customer',
            qc_failure: 'Quality check failed',
            refused: 'Delivery refused by customer',
            other: 'Unable to complete delivery',
        };

        return reasonMap[reason] || 'Unable to complete delivery';
    }

    /**
     * Get shipment info (mock for now)
     */
    private static async getShipmentInfo(shipmentId: string): Promise<ShipmentInfo | null> {
        // Direct DB access for performance and simplicity
        try {
            const shipment = await Shipment.findById(shipmentId) as any;

            if (!shipment) return null;

            return {
                _id: String(shipment._id),
                awb: shipment.awb,
                orderId: shipment.orderId?.toString() || '',
                companyId: shipment.companyId?.toString() || '',
                warehouseId: shipment.warehouseId?.toString() || '',
                status: shipment.status || shipment.currentStatus,
                customer: {
                    name: shipment.recipientName || shipment.consignee?.name || 'Customer',
                    phone: shipment.recipientPhone || shipment.consignee?.phone || '',
                },
            };
        } catch (error) {
            logger.error('Error fetching shipment', { shipmentId, error });
            return null;
        }
    }

    /**
     * Track reverse shipment by reverse AWB
     *
     * Phase 5: Provides real-time tracking for RTO shipments
     */
    static async trackReverseShipment(reverseAwb: string): Promise<any> {
        try {
            logger.info('Tracking reverse shipment', { reverseAwb });

            // Find RTO event by reverse AWB
            const rtoEvent = await RTOEvent.findOne({ reverseAwb }).populate('shipment');

            if (!rtoEvent) {
                throw new AppError('RTO event not found', 'RTO_NOT_FOUND', 404);
            }

            // Get shipment details
            const shipment = await Shipment.findById(rtoEvent.shipment);
            if (!shipment) {
                throw new AppError('Associated shipment not found', 'SHIPMENT_NOT_FOUND', 404);
            }

            const { CourierFactory } = await import('../courier/courier.factory.js');
            const courierProvider = shipment.carrier || 'velocity-shipfast';
            const courierAdapter = await CourierFactory.getProvider(
                courierProvider,
                new mongoose.Types.ObjectId(shipment.companyId)
            );

            const tracking = await courierAdapter.trackShipment(reverseAwb);

            logger.info('Reverse shipment tracked successfully', {
                reverseAwb,
                status: tracking.status,
                currentLocation: tracking.currentLocation
            });

            return {
                reverseAwb,
                originalAwb: shipment.trackingNumber,
                status: tracking.status,
                currentLocation: tracking.currentLocation,
                trackingHistory: tracking.timeline,
                estimatedDelivery: tracking.estimatedDelivery
            };

        } catch (error) {
            logger.error('Error tracking reverse shipment', {
                reverseAwb,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Schedule pickup for reverse shipment
     *
     * Phase 5: Schedules courier pickup at customer location for RTO
     */
    static async scheduleReversePickup(
        rtoEventId: string,
        pickupDate: Date,
        timeSlot: 'morning' | 'afternoon' | 'evening',
        pickupAddress?: {
            address: string;
            pincode: string;
            phone: string;
        }
    ): Promise<{ success: boolean; pickupId?: string; message: string }> {
        try {
            logger.info('Scheduling reverse shipment pickup', {
                rtoEventId,
                pickupDate,
                timeSlot
            });

            // Find RTO event
            const rtoEvent = await RTOEvent.findById(rtoEventId).populate('shipment');
            if (!rtoEvent) {
                throw new AppError('RTO event not found', 'RTO_NOT_FOUND', 404);
            }

            // Get shipment details
            const shipment = await Shipment.findById(rtoEvent.shipment);
            if (!shipment) {
                throw new AppError('Associated shipment not found', 'SHIPMENT_NOT_FOUND', 404);
            }

            const courierProvider = shipment.carrier || 'velocity-shipfast';

            const { CourierFactory } = await import('../courier/courier.factory.js');
            const courierAdapter = await CourierFactory.getProvider(
                courierProvider,
                new mongoose.Types.ObjectId(shipment.companyId)
            );

            let scheduleResult: { success: boolean; message?: string; pickupId?: string } | null = null;

            if (courierAdapter && typeof (courierAdapter as any).scheduleReversePickup === 'function') {
                scheduleResult = await (courierAdapter as any).scheduleReversePickup({
                    reverseAwb: rtoEvent.reverseAwb,
                    originalAwb: shipment.trackingNumber,
                    pickupDate,
                    timeSlot,
                    pickupAddress
                });

                logger.info('Reverse pickup scheduling result', {
                    rtoEventId,
                    courier: courierProvider,
                    result: scheduleResult
                });

                if (!scheduleResult?.success) {
                    return {
                        success: false,
                        message: scheduleResult?.message || 'Failed to schedule reverse pickup'
                    };
                }
            } else if (courierProvider.toLowerCase().includes('velocity')) {
                // Velocity auto-schedules pickup during reverse creation
                logger.info('Velocity RTO pickup is auto-scheduled on creation', { rtoEventId });
            } else {
                logger.info('Courier does not support reverse pickup scheduling', {
                    courier: courierProvider
                });
                return {
                    success: false,
                    message: 'Pickup scheduling not supported for this courier'
                };
            }

            // Update RTO event metadata to reflect confirmed schedule
            if (!rtoEvent.metadata) {
                rtoEvent.metadata = {};
            }
            rtoEvent.metadata.pickupScheduled = true;
            rtoEvent.metadata.pickupConfirmedAt = new Date().toISOString();
            await rtoEvent.save();

            return {
                success: true,
                pickupId: scheduleResult?.pickupId,
                message: scheduleResult?.message || 'Pickup scheduled successfully'
            };

        } catch (error) {
            logger.error('Error scheduling reverse pickup', {
                rtoEventId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to schedule pickup'
            };
        }
    }

    /**
     * Cancel reverse shipment
     *
     * Phase 5: Cancels RTO shipment before pickup
     */
    static async cancelReverseShipment(
        rtoEventId: string,
        reason?: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            logger.info('Cancelling reverse shipment', { rtoEventId, reason });

            // Find RTO event
            const rtoEvent = await RTOEvent.findById(rtoEventId).populate('shipment');
            if (!rtoEvent) {
                throw new AppError('RTO event not found', 'RTO_NOT_FOUND', 404);
            }

            // Check if RTO can be cancelled
            const cancellableStatuses = ['initiated', 'qc_pending'];
            if (!cancellableStatuses.includes(rtoEvent.returnStatus)) {
                return {
                    success: false,
                    message: `Cannot cancel RTO in status: ${rtoEvent.returnStatus}`
                };
            }

            // Get shipment details
            const shipment = await Shipment.findById(rtoEvent.shipment);
            if (!shipment) {
                throw new AppError('Associated shipment not found', 'SHIPMENT_NOT_FOUND', 404);
            }

            const courierProvider = shipment.carrier || 'velocity-shipfast';
            const { CourierFactory } = await import('../courier/courier.factory.js');
            const courierAdapter = await CourierFactory.getProvider(
                courierProvider,
                new mongoose.Types.ObjectId(shipment.companyId)
            );

            await courierAdapter.cancelReverseShipment(
                rtoEvent.reverseAwb || '',
                shipment.trackingNumber,
                reason
            );

            // Mark RTO as cancelled
            rtoEvent.returnStatus = 'cancelled' as any;
            if (!rtoEvent.metadata) {
                rtoEvent.metadata = {};
            }
            rtoEvent.metadata.cancellationReason = reason;
            rtoEvent.metadata.cancelledAt = new Date().toISOString();
            await rtoEvent.save();

            logger.info('Reverse shipment cancelled successfully', {
                rtoEventId,
                reverseAwb: rtoEvent.reverseAwb
            });

            return {
                success: true,
                message: 'Reverse shipment cancelled successfully'
            };

        } catch (error) {
            logger.error('Error cancelling reverse shipment', {
                rtoEventId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to cancel reverse shipment'
            };
        }
    }

    /**
     * Update RTO status
     */
    /**
     * Perform restock: update inventory for RTO items and then set status to restocked.
     * Called when status is updated to 'restocked'. Uses Order.products (sku, quantity).
     */
    static async performRestock(
        rtoEventId: string,
        performedBy: string = 'system'
    ): Promise<void> {
        const rtoEvent = await RTOEvent.findById(rtoEventId).populate('order');
        if (!rtoEvent) {
            throw new AppError('RTO event not found', 'RTO_NOT_FOUND', 404);
        }
        if (rtoEvent.returnStatus !== 'qc_completed') {
            throw new AppError(
                'RTO must be QC completed before restock',
                'INVALID_RTO_STATUS',
                400
            );
        }
        if (!rtoEvent.qcResult?.passed) {
            throw new AppError(
                'QC must be passed to restock',
                'QC_NOT_PASSED',
                400
            );
        }

        const order = await Order.findById(rtoEvent.order);
        if (!order || !order.products?.length) {
            logger.warn('RTO restock: order or products missing', { rtoEventId, orderId: rtoEvent.order });
            return;
        }

        const warehouseId = String(rtoEvent.warehouse);

        for (const item of order.products) {
            const sku = item.sku;
            const qty = item.quantity || 1;
            if (!sku) continue;

            try {
                const inventory = await InventoryService.getInventoryBySKU(warehouseId, sku);
                if (!inventory) {
                    logger.warn('RTO restock: no inventory record for SKU', {
                        rtoEventId,
                        sku,
                        warehouseId,
                    });
                    continue;
                }
                await InventoryService.adjustStock({
                    inventoryId: String(inventory._id),
                    quantity: qty,
                    reason: `RTO restocked: ${rtoEventId}`,
                    notes: `RTO ${rtoEventId} restocked after QC pass`,
                    performedBy,
                });
                logger.info('RTO restock: inventory updated', {
                    rtoEventId,
                    sku,
                    quantity: qty,
                });
            } catch (err: any) {
                logger.error('RTO restock: failed to adjust stock', {
                    rtoEventId,
                    sku,
                    error: err.message,
                });
                throw err;
            }
        }
    }

    static async updateRTOStatus(
        rtoEventId: string,
        status: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        try {
            logger.info('Attempting to update RTO status', { rtoEventId, status });

            const rtoEvent = await RTOEvent.findById(rtoEventId);

            if (!rtoEvent) {
                throw new AppError('RTO event not found', 'RTO_NOT_FOUND', 404);
            }

            const previousStatus = rtoEvent.returnStatus;

            if (status === 'restocked') {
                const performedBy = metadata?.performedBy ?? 'system';
                await this.performRestock(rtoEventId, performedBy);
            }

            await rtoEvent.updateReturnStatus(status, metadata);

            if (status === 'delivered_to_warehouse') {
                RTONotificationService.notifyRTODeliveredToWarehouse(rtoEventId).catch((err) =>
                    logger.warn('RTO delivered notification failed', { rtoEventId, error: err?.message })
                );
            }

            logger.info('RTO status updated successfully', {
                rtoEventId,
                previousStatus,
                newStatus: status,
                metadata,
            });
        } catch (error: any) {
            logger.error('Failed to update RTO status', {
                rtoEventId,
                status,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    /**
     * Record QC result
     */
    static async recordQCResult(
        rtoEventId: string,
        qcResult: { passed: boolean; remarks?: string; images?: string[]; inspectedBy: string }
    ): Promise<void> {
        try {
            logger.info('Attempting to record QC result', { rtoEventId, passed: qcResult.passed });

            const rtoEvent = await RTOEvent.findById(rtoEventId);

            if (!rtoEvent) {
                throw new AppError('RTO event not found', 'RTO_NOT_FOUND', 404);
            }

            if (rtoEvent.returnStatus !== 'delivered_to_warehouse' && rtoEvent.returnStatus !== 'qc_pending') {
                throw new AppError(
                    'RTO must be delivered to warehouse before QC',
                    'INVALID_RTO_STATUS',
                    400
                );
            }

            if (rtoEvent.qcResult) {
                logger.warn('QC already recorded, overwriting', { rtoEventId });
            }

            await rtoEvent.recordQC({
                ...qcResult,
                inspectedAt: new Date(),
            });

            RTONotificationService.notifyRTOQCCompleted(rtoEventId, { passed: qcResult.passed }).catch((err) =>
                logger.warn('RTO QC completed notification failed', { rtoEventId, error: err?.message })
            );

            logger.info('QC result recorded successfully', {
                rtoEventId,
                passed: qcResult.passed,
                inspectedBy: qcResult.inspectedBy,
            });
        } catch (error: any) {
            logger.error('Failed to record QC result', {
                rtoEventId,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    /**
     * Get RTO statistics
     */
    static async getRTOStats(
        companyId: string,
        dateRange?: { start: Date; end: Date }
    ): Promise<{
        total: number;
        byReason: Record<string, number>;
        avgCharges: number;
        returnRate: number;
    }> {
        const analytics = await RTOAnalyticsService.getAnalytics(companyId, {
            startDate: dateRange?.start?.toISOString(),
            endDate: dateRange?.end?.toISOString(),
        });
        return {
            total: analytics.stats.total,
            byReason: analytics.stats.byReason,
            avgCharges: analytics.stats.avgCharges,
            returnRate: analytics.summary.currentRate,
        };
    }

    /**
     * Get comprehensive RTO analytics for dashboard
     * Phase 4: Powers RTOAnalytics component with real data
     */
    static async getRTOAnalytics(companyId: string, dateRange?: AnalyticsDateRange): Promise<{
        summary: {
            currentRate: number;
            previousRate: number;
            change: number;
            industryAverage: number;
            totalRTO: number;
            totalOrders: number;
            estimatedLoss: number;
        };
        trend: Array<{ month: string; rate: number }>;
        byCourier: Array<{ courier: string; rate: number; count: number; total: number }>;
        byReason: Array<{ reason: string; label: string; percentage: number; count: number }>;
        recommendations: Array<{ type: string; message: string; impact?: string }>;
    }> {
        const analytics = await RTOAnalyticsService.getAnalytics(companyId, {
            startDate: dateRange?.start?.toISOString(),
            endDate: dateRange?.end?.toISOString(),
        });
        return {
            summary: {
                currentRate: analytics.summary.currentRate,
                previousRate: analytics.summary.previousRate,
                change: analytics.summary.change,
                industryAverage: analytics.summary.industryAverage,
                totalRTO: analytics.summary.totalRTO,
                totalOrders: analytics.summary.totalOrders,
                estimatedLoss: analytics.summary.estimatedLoss,
            },
            trend: analytics.trend,
            byCourier: analytics.byCourier,
            byReason: analytics.byReason,
            recommendations: analytics.recommendations,
        };
    }
}
