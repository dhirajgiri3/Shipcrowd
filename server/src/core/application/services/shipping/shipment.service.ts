import mongoose from 'mongoose';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import { Order } from '../../../../infrastructure/database/mongoose/models';
import { Warehouse } from '../../../../infrastructure/database/mongoose/models';
import { getCarrierService, CarrierSelectionResult } from './carrier.service';
import { generateTrackingNumber, validateStatusTransition } from '../../../../shared/helpers/controller.helpers';
import { SHIPMENT_STATUS_TRANSITIONS } from '../../../../shared/validation/schemas';
import { withTransaction } from '../../../../shared/utils/transactionHelper';
import { CourierFactory } from '../courier/courier.factory';
import logger from '../../../../shared/logger/winston.logger';
import { AuthenticationError, ValidationError, DatabaseError, AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

/**
 * ShipmentService - Business logic for shipment management
 * 
 * Framework-agnostic service encapsulating pure business rules for shipments.
 * Handles shipment creation, status management, carrier selection, and order synchronization.
 * 
 * BUSINESS RULES:
 * ===============
 * 1. Unique Tracking Number Generation
 *    - Condition: Every new shipment
 *    - Action: Retry up to 10 times if collision detected
 *    - Reason: Ensure globally unique shipment identifiers
 * 
 * 2. Order Status Validation
 *    - Condition: Shipment creation request
 *    - Action: Only allow for 'pending' or 'ready_to_ship' orders
 *    - Reason: Prevent shipment creation for invalid order states
 * 
 * 3. Active Shipment Prevention
 *    - Condition: Shipment creation for order
 *    - Action: Check for existing active shipments, reject if found
 *    - Reason: One active shipment per order (prevent duplicates)
 * 
 * 4. Transactional Status Updates
 *    - Condition: Shipment status change
 *    - Action: Update shipment + related order in single transaction
 *    - Reason: Prevent data inconsistency if one update fails
 * 
 * 5. Optimistic Locking
 *    - Condition: Status update requests
 *    - Action: Check __v field, fail if concurrent modification
 *    - Reason: Prevent lost updates in multi-user environment
 * 
 * 6. Status Transition Validation
 *    - Condition: Status update attempts
 *    - Action: Validate against SHIPMENT_STATUS_TRANSITIONS matrix
 *    - Reason: Enforce valid shipment lifecycle
 * 
 * 7. Carrier Selection Strategy
 *    - Primary: API-based rates (Velocity Shipfast) if enabled
 *    - Fallback: Static carrier selection algorithm
 *    - Reason: Real-time pricing when available, reliable fallback
 * 
 * 8. Deletion Protection
 *    - Condition: Delete request for in_transit/delivered shipments
 *    - Action: Reject deletion
 *    - Reason: Preserve audit trail for active/completed shipments
 * 
 * ERROR HANDLING:
 * ==============
 * Expected Errors:
 * - Error: Failed to generate unique tracking number (after 10 retries)
 * - Error: Invalid order status for shipment creation
 * - Error: Active shipment already exists
 * - Error: Concurrent modification (version conflict)
 * - Error: Invalid status transition
 * - Error: API rate fetch failure (falls back to static)
 * 
 * Recovery Strategy:
 * - Tracking Number Collision: Retry with new number (max 10 attempts)
 * - Version Conflict: Return error, client must retry
 * - Invalid Transition: Return validation error with reason
 * - API Failure: Log warning, fallback to static carrier selection
 * - Transaction Failure: Rollback all changes, throw error
 * 
 * DEPENDENCIES:
 * ============
 * Internal:
 * - Shipment Model: Shipment CRUD operations
 * - Order Model: Order status synchronization
 * - Warehouse Model: Origin pincode lookup
 * - CarrierService: Static carrier selection algorithm
 * - CourierFactory: API-based rate fetching (Velocity)
 * - TransactionHelper: MongoDB transaction wrapper
 * - Logger: Winston for structured logging
 * 
 * Used By:
 * - ShipmentController: HTTP API endpoints
 * - Webhook Handlers: Carrier status updates
 * - Bulk Shipment Creation: CSV imports
 * 
 * PERFORMANCE:
 * ===========
 * - Shipment Creation: <200ms (carrier selection + DB writes + transaction)
 * - Status Update: <100ms (transaction with shipment + order update)
 * - API Rate Fetch: <500ms (external API call)
 * - Static Selection: <10ms (in-memory algorithm)
 * - Tracking Number Generation: <10ms average (collision rate <1%)
 * 
 * TESTING:
 * =======
 * Unit Tests: tests/unit/services/shipping/shipment.service.test.ts
 * Coverage: TBD
 * 
 * Critical Test Cases:
 * - Unique tracking number generation with collisions
 * - Order status validation (valid/invalid states)
 * - Active shipment prevention
 * - Transactional updates (shipment + order atomicity)
 * - Optimistic locking (concurrent status updates)
 * - Status transition validation
 * - API rate fetch with fallback
 * - Deletion protection
 * 
 * Business Impact:
 * - Core shipment management for all orders
 * - Used in 100% of fulfillment flows
 * - Must maintain data integrity (transactions critical)
 */
export class ShipmentService {
    /**
     * Generate a unique tracking number with retry logic
     * @param maxAttempts Maximum number of attempts to generate unique number
     * @returns Unique tracking number or null if failed
     */
    static async getUniqueTrackingNumber(maxAttempts = 10): Promise<string | null> {
        for (let i = 0; i < maxAttempts; i++) {
            const trackingNumber = generateTrackingNumber();
            const exists = await Shipment.exists({ trackingNumber });
            if (!exists) return trackingNumber;
        }
        return null;
    }

    /**
     * Validate if an order can have a shipment created
     * @param order The order to validate
     * @returns Validation result with reason if invalid
     */
    static validateOrderForShipment(order: any): { canCreate: boolean; reason?: string; code?: string } {
        if (!['pending', 'ready_to_ship'].includes(order.currentStatus)) {
            return {
                canCreate: false,
                reason: `Cannot create shipment for order with status '${order.currentStatus}'`,
                code: 'INVALID_ORDER_STATUS'
            };
        }
        return { canCreate: true };
    }

    /**
     * Check if an active shipment already exists for an order
     * @param orderId Order ID to check
     * @returns Whether an active shipment exists
     */
    static async hasActiveShipment(orderId: mongoose.Types.ObjectId): Promise<boolean> {
        const existingShipment = await Shipment.findOne({
            orderId,
            isDeleted: false,
            currentStatus: { $nin: ['cancelled', 'rto'] },
        }).lean();

        return !!existingShipment;
    }

    /**
     * Get warehouse origin pincode
     * @param warehouseId Warehouse ID
     * @param companyId Company ID for validation
     * @returns Pincode or default
     */
    static async getWarehouseOriginPincode(
        warehouseId: mongoose.Types.ObjectId | undefined,
        companyId: mongoose.Types.ObjectId
    ): Promise<string> {
        if (!warehouseId) return '110001';

        const warehouse = await Warehouse.findOne({
            _id: warehouseId,
            companyId,
            isDeleted: false,
        }).lean();

        return warehouse?.address?.postalCode || '110001';
    }

    /**
     * Calculate total weight from order products
     * @param products Order products
     * @returns Total weight
     */
    static calculateTotalWeight(products: Array<{ weight?: number; quantity: number }>): number {
        return products.reduce((sum, p) => sum + (p.weight || 0.5) * p.quantity, 0);
    }

    /**
     * Select carrier for shipment
     * @param args Carrier selection parameters
     * @returns Selected carrier information
     */
    static async selectCarrierForShipment(args: {
        companyId: string;
        totalWeight: number;
        originPincode: string;
        destinationPincode: string;
        serviceType: 'express' | 'standard';
        paymentMode?: 'cod' | 'prepaid';
        orderValue?: number;
        carrierOverride?: string;
    }): Promise<{ selectedCarrier: string; selectedOption: any; carrierResult: CarrierSelectionResult }> {
        const { companyId, totalWeight, originPincode, destinationPincode, serviceType, paymentMode, orderValue, carrierOverride } = args;

        const carrierService = getCarrierService();
        const carrierResult: CarrierSelectionResult = await carrierService.selectBestCarrier({
            companyId,
            fromPincode: originPincode,
            toPincode: destinationPincode,
            weight: totalWeight,
            paymentMode: paymentMode || 'prepaid',
            orderValue,
            serviceType,
        });

        const selectedCarrier = carrierOverride || carrierResult.selectedCarrier;
        const selectedOption = carrierResult.alternativeOptions.find(
            (opt: any) => opt.carrier.toLowerCase() === selectedCarrier.toLowerCase()
        ) || carrierResult.alternativeOptions[0];

        return { selectedCarrier, selectedOption, carrierResult };
    }

    /**
     * Create a new shipment
     * @param args Shipment creation parameters
     * @returns Created shipment and carrier selection details
     */
    static async createShipment(args: {
        order: any;
        companyId: mongoose.Types.ObjectId;
        userId: string;
        payload: {
            warehouseId?: string;
            serviceType: string;
            carrierOverride?: string;
            instructions?: string;
        };
        pricingDetails?: any; // Added pricing details
    }): Promise<{
        shipment: any;
        carrierSelection: {
            selectedCarrier: string;
            selectedRate: number;
            selectedDeliveryTime: number;
            alternativeOptions: any[];
        };
        updatedOrder: any;
    }> {
        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            const { order, companyId, userId, payload, pricingDetails } = args;

            // Generate tracking number
            const trackingNumber = await this.getUniqueTrackingNumber();
            if (!trackingNumber) {
                throw new AppError('Failed to generate unique tracking number', ErrorCode.SYS_INTERNAL_ERROR, 500);
            }

            // Determine warehouse and origin pincode
            const warehouseId = payload.warehouseId
                ? new mongoose.Types.ObjectId(payload.warehouseId)
                : order.warehouseId;

            const originPincode = await this.getWarehouseOriginPincode(warehouseId, companyId);

            // Calculate weight and select carrier
            const totalWeight = this.calculateTotalWeight(order.products);
            const serviceType = payload.serviceType as 'express' | 'standard';

            let selectedOption: any;
            let carrierResult: CarrierSelectionResult | null = null;

            // NEW: API-based carrier selection (feature flagged)
            const useApiRates = (payload as any).useApiRates || process.env.USE_VELOCITY_API_RATES === 'true';

            if (useApiRates) {
                try {
                    logger.info('Using API-based carrier selection', {
                        orderId: order._id.toString(),
                        companyId: companyId.toString()
                    });

                    const provider = await CourierFactory.getProvider('velocity-shipfast', companyId);

                    const rates = await provider.getRates({
                        origin: { pincode: originPincode },
                        destination: { pincode: order.customerInfo.address.postalCode },
                        package: {
                            weight: totalWeight,
                            length: 20,
                            width: 15,
                            height: 10
                        },
                        paymentMode: order.paymentMethod || 'prepaid'
                    });

                    if (rates && rates.length > 0) {
                        selectedOption = {
                            carrier: rates[0].serviceType || 'Velocity Shipfast',
                            rate: rates[0].total,
                            deliveryTime: rates[0].estimatedDeliveryDays || 3
                        };

                        logger.info('API rates fetched successfully', {
                            orderId: order._id.toString(),
                            carrier: selectedOption.carrier,
                            rate: selectedOption.rate
                        });
                    }
                } catch (error) {
                    logger.warn('API rates failed, falling back to static selection', {
                        orderId: order._id.toString(),
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                    // Fall through to static selection
                }
            }

            // Fallback to static selection if API not used or failed
            if (!selectedOption) {
                // Use dynamic carrier selection
                const selection = await this.selectCarrierForShipment({
                    companyId: companyId.toString(),
                    totalWeight,
                    originPincode,
                    destinationPincode: order.deliveryAddress.pincode,
                    serviceType,
                    paymentMode: order.paymentMode,
                    orderValue: order.orderTotal,
                    carrierOverride: payload.carrierOverride,
                });
                selectedOption = selection.selectedOption;
                carrierResult = selection.carrierResult;
            }

            // Calculate estimated delivery
            const estimatedDelivery = new Date();
            estimatedDelivery.setDate(estimatedDelivery.getDate() + selectedOption.deliveryTime);

            // Create shipment
            const shipment = new Shipment({
                trackingNumber,
                orderId: order._id,
                companyId,
                carrier: selectedOption.carrier,
                serviceType,
                packageDetails: {
                    weight: totalWeight,
                    dimensions: { length: 20, width: 15, height: 10 },
                    packageCount: 1,
                    packageType: 'box',
                    declaredValue: order.totals.total,
                },
                pickupDetails: warehouseId ? { warehouseId } : undefined,
                deliveryDetails: {
                    recipientName: order.customerInfo.name,
                    recipientPhone: order.customerInfo.phone,
                    recipientEmail: order.customerInfo.email,
                    address: order.customerInfo.address,
                    instructions: payload.instructions,
                },
                paymentDetails: {
                    type: order.paymentMethod || 'prepaid',
                    codAmount: order.paymentMethod === 'cod' ? order.totals.total : undefined,
                    shippingCost: selectedOption.rate,
                    currency: 'INR',
                },
                pricingDetails, // Store pricing breakdown
                currentStatus: 'created',
                estimatedDelivery,
            });

            await shipment.save({ session });

            // ========================================================================
            // PHASE 1B: Call Velocity API to create shipment and get AWB/label
            // ========================================================================
            // This is the critical integration step - we call the carrier API AFTER
            // saving locally so we have a reference point for retries if API fails.
            // ========================================================================
            const isVelocityCarrier = selectedOption.carrier.toLowerCase().includes('velocity');
            const shouldCallCarrierApi = isVelocityCarrier && (useApiRates || process.env.USE_VELOCITY_API_RATES === 'true');

            if (shouldCallCarrierApi && warehouseId) {
                try {
                    logger.info('Creating shipment with Velocity API', {
                        shipmentId: (shipment as any)._id?.toString() || 'pending',
                        orderId: order._id.toString(),
                        warehouseId: warehouseId.toString()
                    });

                    // Get the Velocity provider
                    const velocityProvider = await CourierFactory.getProvider('velocity-shipfast', companyId);

                    // Build proper CourierShipmentData structure for Velocity API
                    // This matches the interface in courier.adapter.ts
                    const warehouse = warehouseId ? await Warehouse.findById(warehouseId).lean() : null;

                    const velocityShipmentData = {
                        // Origin (warehouse/pickup location)
                        origin: {
                            name: warehouse?.name || 'Shipcrowd Warehouse',
                            phone: warehouse?.contactInfo?.phone || '',
                            address: warehouse?.address?.line1 || '',
                            city: warehouse?.address?.city || '',
                            state: warehouse?.address?.state || '',
                            pincode: originPincode,
                            country: 'India'
                        },
                        // Destination (customer delivery address)
                        destination: {
                            name: order.customerInfo.name,
                            phone: order.customerInfo.phone,
                            email: order.customerInfo.email,
                            address: order.customerInfo.address.line1 + (order.customerInfo.address.line2 ? ', ' + order.customerInfo.address.line2 : ''),
                            city: order.customerInfo.address.city,
                            state: order.customerInfo.address.state,
                            pincode: order.customerInfo.address.postalCode || order.customerInfo.address.pincode,
                            country: order.customerInfo.address.country || 'India'
                        },
                        // Package details (separate fields, not nested object)
                        package: {
                            weight: totalWeight,
                            length: shipment.packageDetails.dimensions?.length || 20,
                            width: shipment.packageDetails.dimensions?.width || 15,
                            height: shipment.packageDetails.dimensions?.height || 10,
                            description: order.products?.[0]?.name || 'Product',
                            declaredValue: order.totals.subtotal
                        },
                        orderNumber: order.orderNumber,
                        paymentMode: (order.paymentMethod === 'cod' ? 'cod' : 'prepaid') as 'prepaid' | 'cod',
                        codAmount: order.paymentMethod === 'cod' ? order.totals.total : 0,
                        warehouseId: warehouseId?.toString()
                    };

                    // Call Velocity createShipment with proper data structure
                    const velocityResponse = await velocityProvider.createShipment(velocityShipmentData as any);

                    // Update shipment with AWB and label from Velocity response
                    if (velocityResponse.trackingNumber) {
                        shipment.carrierDetails = {
                            ...shipment.carrierDetails,
                            carrierTrackingNumber: velocityResponse.trackingNumber,
                            carrierServiceType: 'velocity-shipfast'
                        };

                        // Add label to documents if provided
                        if (velocityResponse.labelUrl) {
                            shipment.documents.push({
                                type: 'label',
                                url: velocityResponse.labelUrl,
                                createdAt: new Date()
                            });
                        }

                        // Update status to pending_pickup (carrier has the order)
                        shipment.currentStatus = 'pending_pickup';
                        shipment.statusHistory.push({
                            status: 'pending_pickup',
                            timestamp: new Date(),
                            description: `Carrier AWB assigned: ${velocityResponse.trackingNumber}`
                        });

                        await shipment.save({ session });

                        logger.info('Velocity shipment created successfully', {
                            shipmentId: (shipment as any)._id?.toString() || 'pending',
                            awb: velocityResponse.trackingNumber,
                            labelUrl: velocityResponse.labelUrl
                        });
                    }
                } catch (velocityError: any) {
                    // Don't fail the transaction - just log the error and continue
                    // Shipment is created locally, can retry carrier sync later
                    logger.error('Failed to create shipment with Velocity API', {
                        shipmentId: (shipment as any)._id?.toString() || 'pending',
                        orderId: order._id.toString(),
                        error: velocityError.message || velocityError
                    });

                    // Update shipment status to indicate carrier sync is pending
                    shipment.statusHistory.push({
                        status: 'created',
                        timestamp: new Date(),
                        description: 'Carrier API sync pending - will retry'
                    });
                    await shipment.save({ session });

                    // TODO: Add to retry queue for background processing
                    // await CarrierSyncQueue.add({ shipmentId: shipment._id });
                }
            }

            // Update order with optimistic locking
            const currentOrderVersion = order.__v;
            const shippedStatusEntry = {
                status: 'shipped',
                timestamp: new Date(),
                comment: `Shipment created via ${selectedOption.carrier}${shipment.carrierDetails?.carrierTrackingNumber ? ` (AWB: ${shipment.carrierDetails.carrierTrackingNumber})` : ''}`,
                updatedBy: new mongoose.Types.ObjectId(userId),
            };

            const updatedOrder = await Order.findOneAndUpdate(
                {
                    _id: order._id,
                    __v: currentOrderVersion
                },
                {
                    $set: {
                        currentStatus: 'shipped',
                        'shippingDetails.provider': selectedOption.carrier,
                        'shippingDetails.method': serviceType,
                        'shippingDetails.trackingNumber': trackingNumber,
                        'shippingDetails.estimatedDelivery': estimatedDelivery,
                        'shippingDetails.shippingCost': selectedOption.rate,
                        'totals.shipping': selectedOption.rate,
                        'total.total': order.totals.subtotal + selectedOption.rate + order.totals.tax - order.totals.discount
                    },
                    $push: { statusHistory: shippedStatusEntry },
                    $inc: { __v: 1 }
                },
                { new: true, session }
            );

            if (!updatedOrder) {
                throw new AppError(
                    'Order was updated by another process during shipment creation. Please retry.',
                    ErrorCode.BIZ_VERSION_CONFLICT,
                    409
                );
            }

            await session.commitTransaction();

            return {
                shipment,
                carrierSelection: {
                    selectedCarrier: selectedOption.carrier,
                    selectedRate: selectedOption.rate,
                    selectedDeliveryTime: selectedOption.deliveryTime,
                    alternativeOptions: carrierResult?.alternativeOptions || [],
                },
                updatedOrder
            };
        } catch (error) {
            await session.abortTransaction();
            logger.error('Error creating shipment (transaction rolled back):', error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Format tracking timeline
     * @param statusHistory Status history array
     * @returns Sorted timeline
     */
    static formatTrackingTimeline(statusHistory: any[]): any[] {
        return [...statusHistory].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    }

    /**
     * Update shipment status with optimistic locking and transaction support
     *
     * CRITICAL FIX (Phase 1): Wraps shipment + order updates in transaction
     * to prevent data inconsistency when one operation fails.
     *
     * @param args Status update parameters
     * @returns Updated shipment or error
     */
    static async updateShipmentStatus(args: {
        shipmentId: string;
        currentStatus: string;
        newStatus: string;
        currentVersion: number;
        userId: string;
        location?: string;
        description?: string;
    }): Promise<{
        success: boolean;
        shipment?: any;
        error?: string;
        code?: string;
    }> {
        const { shipmentId, currentStatus, newStatus, currentVersion, userId, location, description } = args;

        // Validate status transition
        const { valid } = validateStatusTransition(
            currentStatus,
            newStatus,
            SHIPMENT_STATUS_TRANSITIONS
        );

        if (!valid) {
            return {
                success: false,
                error: `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
                code: 'INVALID_STATUS_TRANSITION'
            };
        }

        try {
            // Wrap shipment + order update in transaction for atomicity
            const updatedShipment = await withTransaction(async (session) => {
                // Build status entry
                const statusEntry = {
                    status: newStatus,
                    timestamp: new Date(),
                    location,
                    description,
                    updatedBy: new mongoose.Types.ObjectId(userId),
                };

                // Build update data
                const updateData: Record<string, any> = {
                    $set: { currentStatus: newStatus },
                    $push: { statusHistory: statusEntry },
                    $inc: { __v: 1 }
                };

                // Handle delivered status
                if (newStatus === 'delivered') {
                    updateData.$set.actualDelivery = new Date();
                }

                // Handle NDR status
                if (newStatus === 'ndr') {
                    const shipment = await Shipment.findById(shipmentId).session(session);
                    updateData.$set = {
                        ...updateData.$set,
                        'ndrDetails.ndrDate': new Date(),
                        'ndrDetails.ndrStatus': 'pending',
                        'ndrDetails.ndrAttempts': (shipment?.ndrDetails?.ndrAttempts || 0) + 1,
                        'ndrDetails.ndrReason': description,
                    };
                }

                // Update shipment with optimistic locking
                const shipment = await Shipment.findOneAndUpdate(
                    {
                        _id: shipmentId,
                        __v: currentVersion
                    },
                    updateData,
                    { new: true, session }  // Use transaction session
                );

                if (!shipment) {
                    throw new AppError('CONCURRENT_MODIFICATION', ErrorCode.BIZ_VERSION_CONFLICT, 409);
                }

                // Update related order status if needed (in same transaction)
                const orderStatusMap: Record<string, string> = {
                    'delivered': 'delivered',
                    'rto': 'rto',
                    'cancelled': 'cancelled',
                    'in_transit': 'shipped',
                };

                const newOrderStatus = orderStatusMap[newStatus];
                if (newOrderStatus && shipment.orderId) {
                    await Order.findByIdAndUpdate(
                        shipment.orderId,
                        {
                            currentStatus: newOrderStatus,
                            $push: {
                                statusHistory: {
                                    status: newOrderStatus,
                                    timestamp: new Date(),
                                    comment: `Updated from shipment status: ${newStatus}`,
                                    updatedBy: new mongoose.Types.ObjectId(userId),
                                },
                            },
                        },
                        { session }  // Same transaction session
                    );
                }

                return shipment;
            });

            return {
                success: true,
                shipment: updatedShipment
            };
        } catch (error: any) {
            if (error.message?.includes('CONCURRENT_MODIFICATION')) {
                return {
                    success: false,
                    error: 'Shipment was updated by another process. Please retry.',
                    code: 'CONCURRENT_MODIFICATION'
                };
            }
            throw error;
        }
    }

    /**
     * Update related order status based on shipment status change
     * @param shipment Updated shipment
     * @param userId User ID for audit
     */
    static async updateRelatedOrderStatus(shipment: any, userId: string): Promise<void> {
        if (shipment.currentStatus === 'delivered') {
            await Order.findByIdAndUpdate(shipment.orderId, {
                currentStatus: 'delivered',
                $push: {
                    statusHistory: {
                        status: 'delivered',
                        timestamp: new Date(),
                        comment: `Delivered via ${shipment.carrier}`,
                        updatedBy: new mongoose.Types.ObjectId(userId),
                    },
                },
            });
        } else if (shipment.currentStatus === 'rto') {
            await Order.findByIdAndUpdate(shipment.orderId, {
                currentStatus: 'rto',
                $push: {
                    statusHistory: {
                        status: 'rto',
                        timestamp: new Date(),
                        comment: 'Return to origin initiated',
                        updatedBy: new mongoose.Types.ObjectId(userId),
                    },
                },
            });
        }
    }

    /**
     * Validate if a shipment can be deleted based on its status
     * @param currentStatus Current shipment status
     * @returns Validation result
     */
    static canDeleteShipment(currentStatus: string): { canDelete: boolean; reason?: string } {
        const nonDeletableStatuses = ['in_transit', 'out_for_delivery', 'delivered'];
        if (nonDeletableStatuses.includes(currentStatus)) {
            return {
                canDelete: false,
                reason: `Cannot delete shipment with status '${currentStatus}'`
            };
        }
        return { canDelete: true };
    }
}
