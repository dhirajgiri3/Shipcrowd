import mongoose from 'mongoose';
import Shipment from '../../../../infrastructure/database/mongoose/models/Shipment';
import Order from '../../../../infrastructure/database/mongoose/models/Order';
import Warehouse from '../../../../infrastructure/database/mongoose/models/Warehouse';
import { selectBestCarrier, CarrierSelectionResult } from './carrier.service';
import { generateTrackingNumber, validateStatusTransition } from '../../../../shared/helpers/controller.helpers';
import { SHIPMENT_STATUS_TRANSITIONS } from '../../../../shared/validation/schemas';

/**
 * ShipmentService - Business logic for shipment management
 * 
 * This service encapsulates pure business rules for shipments.
 * It is framework-agnostic and does not know about HTTP.
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
    static selectCarrierForShipment(args: {
        totalWeight: number;
        originPincode: string;
        destinationPincode: string;
        serviceType: 'express' | 'standard';
        carrierOverride?: string;
    }): { selectedCarrier: string; selectedOption: any; carrierResult: CarrierSelectionResult } {
        const { totalWeight, originPincode, destinationPincode, serviceType, carrierOverride } = args;

        const carrierResult: CarrierSelectionResult = selectBestCarrier(
            totalWeight,
            originPincode,
            destinationPincode,
            serviceType
        );

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
        const { order, companyId, userId, payload } = args;

        // Generate tracking number
        const trackingNumber = await this.getUniqueTrackingNumber();
        if (!trackingNumber) {
            throw new Error('Failed to generate unique tracking number');
        }

        // Determine warehouse and origin pincode
        const warehouseId = payload.warehouseId
            ? new mongoose.Types.ObjectId(payload.warehouseId)
            : order.warehouseId;

        const originPincode = await this.getWarehouseOriginPincode(warehouseId, companyId);

        // Calculate weight and select carrier
        const totalWeight = this.calculateTotalWeight(order.products);
        const serviceType = payload.serviceType as 'express' | 'standard';

        const { selectedOption, carrierResult } = this.selectCarrierForShipment({
            totalWeight,
            originPincode,
            destinationPincode: order.customerInfo.address.postalCode,
            serviceType,
            carrierOverride: payload.carrierOverride
        });

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
            currentStatus: 'created',
            estimatedDelivery,
        });

        await shipment.save();

        // Update order with optimistic locking
        const currentOrderVersion = order.__v;
        const shippedStatusEntry = {
            status: 'shipped',
            timestamp: new Date(),
            comment: `Shipment created via ${selectedOption.carrier}`,
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
            { new: true }
        );

        if (!updatedOrder) {
            throw new Error('Order was updated by another process during shipment creation. Please retry.');
        }

        return {
            shipment,
            carrierSelection: {
                selectedCarrier: selectedOption.carrier,
                selectedRate: selectedOption.rate,
                selectedDeliveryTime: selectedOption.deliveryTime,
                alternativeOptions: carrierResult.alternativeOptions,
            },
            updatedOrder
        };
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
     * Update shipment status with optimistic locking
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
            const shipment = await Shipment.findById(shipmentId);
            updateData.$set = {
                ...updateData.$set,
                'ndrDetails.ndrDate': new Date(),
                'ndrDetails.ndrStatus': 'pending',
                'ndrDetails.ndrAttempts': (shipment?.ndrDetails?.ndrAttempts || 0) + 1,
                'ndrDetails.ndrReason': description,
            };
        }

        // Update with optimistic locking
        const updatedShipment = await Shipment.findOneAndUpdate(
            {
                _id: shipmentId,
                __v: currentVersion
            },
            updateData,
            { new: true }
        );

        if (!updatedShipment) {
            return {
                success: false,
                error: 'Shipment was updated by another process. Please retry.',
                code: 'CONCURRENT_MODIFICATION'
            };
        }

        return {
            success: true,
            shipment: updatedShipment
        };
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
