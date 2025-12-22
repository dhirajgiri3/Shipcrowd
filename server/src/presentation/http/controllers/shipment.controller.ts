import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Shipment, { IShipment } from '../../../infrastructure/database/mongoose/models/Shipment';
import Order from '../../../infrastructure/database/mongoose/models/Order';
import Warehouse from '../../../infrastructure/database/mongoose/models/Warehouse';
import { AuthRequest } from '../middleware/auth';
import logger from '../../../shared/logger/winston.logger';
import { createAuditLog } from '../middleware/auditLog';
import mongoose from 'mongoose';
import { selectBestCarrier, CarrierSelectionResult } from '../../../lib/carrier-selection';

// AWB/Tracking number generator: SHP-YYYYMMDD-XXXX
const generateTrackingNumber = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `SHP-${year}${month}${day}-${random}`;
};

// Validation schemas
const createShipmentSchema = z.object({
    orderId: z.string().min(1),
    serviceType: z.enum(['express', 'standard']).default('standard'),
    carrierOverride: z.string().optional(),
    warehouseId: z.string().optional(),
    instructions: z.string().optional(),
});

const updateStatusSchema = z.object({
    status: z.enum(['created', 'picked', 'in_transit', 'out_for_delivery', 'delivered', 'rto', 'ndr']),
    location: z.string().optional(),
    description: z.string().optional(),
});

// Valid status transitions
const validStatusTransitions: Record<string, string[]> = {
    created: ['picked', 'cancelled'],
    picked: ['in_transit', 'rto'],
    in_transit: ['out_for_delivery', 'rto', 'ndr'],
    out_for_delivery: ['delivered', 'ndr', 'rto'],
    delivered: [],
    ndr: ['out_for_delivery', 'rto'],
    rto: [],
    cancelled: [],
};

/**
 * Create a new shipment from an order
 * @route POST /api/v1/shipments
 */
export const createShipment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            res.status(403).json({ message: 'User is not associated with any company' });
            return;
        }

        const validatedData = createShipmentSchema.parse(req.body);

        // Get the order
        const order = await Order.findOne({
            _id: validatedData.orderId,
            companyId,
            isDeleted: false,
        });

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        // Check if order can be shipped
        if (!['pending', 'ready_to_ship'].includes(order.currentStatus)) {
            res.status(400).json({
                message: `Cannot create shipment for order with status '${order.currentStatus}'`,
            });
            return;
        }

        // Check for existing shipment
        const existingShipment = await Shipment.findOne({
            orderId: order._id,
            isDeleted: false,
            currentStatus: { $nin: ['cancelled', 'rto'] },
        });

        if (existingShipment) {
            res.status(400).json({
                message: 'An active shipment already exists for this order',
                shipmentId: existingShipment._id,
                trackingNumber: existingShipment.trackingNumber,
            });
            return;
        }

        // Get warehouse
        const warehouseId = validatedData.warehouseId || order.warehouseId;
        let warehouse = null;
        let originPincode = '110001'; // Default to Delhi

        if (warehouseId) {
            warehouse = await Warehouse.findOne({
                _id: warehouseId,
                companyId,
                isDeleted: false,
            });
            if (warehouse) {
                originPincode = warehouse.address?.postalCode || originPincode;
            }
        }

        // Calculate total weight
        const totalWeight = order.products.reduce((sum, product) => {
            return sum + (product.weight || 0.5) * product.quantity;
        }, 0);

        // Run carrier selection algorithm
        const serviceType = validatedData.serviceType as 'express' | 'standard';
        const carrierResult: CarrierSelectionResult = selectBestCarrier(
            totalWeight,
            originPincode,
            order.customerInfo.address.postalCode,
            serviceType
        );

        // Allow carrier override
        const selectedCarrier = validatedData.carrierOverride || carrierResult.selectedCarrier;
        const selectedOption = carrierResult.alternativeOptions.find(
            opt => opt.carrier.toLowerCase() === selectedCarrier.toLowerCase()
        ) || carrierResult.alternativeOptions[0];

        // Generate unique tracking number
        let trackingNumber = generateTrackingNumber();
        let attempts = 0;
        while (await Shipment.findOne({ trackingNumber }) && attempts < 10) {
            trackingNumber = generateTrackingNumber();
            attempts++;
        }

        if (attempts >= 10) {
            res.status(500).json({ message: 'Failed to generate unique tracking number' });
            return;
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
                dimensions: { length: 20, width: 15, height: 10 }, // Default dimensions
                packageCount: 1,
                packageType: 'box',
                declaredValue: order.totals.total,
            },
            pickupDetails: warehouse ? {
                warehouseId: warehouse._id,
                contactPerson: warehouse.contactInfo?.name || 'N/A',
                contactPhone: warehouse.contactInfo?.phone || 'N/A',
            } : undefined,
            deliveryDetails: {
                recipientName: order.customerInfo.name,
                recipientPhone: order.customerInfo.phone,
                recipientEmail: order.customerInfo.email,
                address: order.customerInfo.address,
                instructions: validatedData.instructions,
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

        // Update order status
        order.currentStatus = 'shipped';
        order.statusHistory.push({
            status: 'shipped',
            timestamp: new Date(),
            comment: `Shipment created with ${selectedOption.carrier}`,
            updatedBy: new mongoose.Types.ObjectId(req.user._id),
        });
        order.shippingDetails = {
            provider: selectedOption.carrier,
            method: serviceType,
            trackingNumber,
            estimatedDelivery,
            shippingCost: selectedOption.rate,
        };
        order.totals.shipping = selectedOption.rate;
        order.totals.total = order.totals.subtotal + order.totals.shipping + order.totals.tax - order.totals.discount;
        await order.save();

        await createAuditLog(
            req.user._id,
            companyId,
            'create',
            'shipment',
            String(shipment._id),
            { message: 'Shipment created', trackingNumber, carrier: selectedOption.carrier },
            req
        );

        res.status(201).json({
            message: 'Shipment created successfully',
            shipment,
            carrierSelection: {
                selectedCarrier: selectedOption.carrier,
                selectedRate: selectedOption.rate,
                selectedDeliveryTime: selectedOption.deliveryTime,
                alternativeOptions: carrierResult.alternativeOptions,
            },
        });
    } catch (error) {
        logger.error('Error creating shipment:', error);
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: 'Validation error', errors: error.errors });
            return;
        }
        next(error);
    }
};

/**
 * Get all shipments for the current user's company
 * @route GET /api/v1/shipments
 */
export const getShipments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            res.status(403).json({ message: 'User is not associated with any company' });
            return;
        }

        // Pagination
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const skip = (page - 1) * limit;

        // Build filter
        const filter: any = {
            companyId,
            isDeleted: false,
        };

        // Status filter
        if (req.query.status) {
            filter.currentStatus = req.query.status;
        }

        // Carrier filter
        if (req.query.carrier) {
            filter.carrier = { $regex: req.query.carrier, $options: 'i' };
        }

        // Pincode filter
        if (req.query.pincode) {
            filter['deliveryDetails.address.postalCode'] = req.query.pincode;
        }

        // Date range filter
        if (req.query.startDate || req.query.endDate) {
            filter.createdAt = {};
            if (req.query.startDate) {
                filter.createdAt.$gte = new Date(req.query.startDate as string);
            }
            if (req.query.endDate) {
                filter.createdAt.$lte = new Date(req.query.endDate as string);
            }
        }

        // Search filter
        if (req.query.search) {
            filter.$or = [
                { trackingNumber: { $regex: req.query.search, $options: 'i' } },
                { 'deliveryDetails.recipientName': { $regex: req.query.search, $options: 'i' } },
                { 'deliveryDetails.recipientPhone': { $regex: req.query.search, $options: 'i' } },
            ];
        }

        // Get shipments with pagination
        const [shipments, total] = await Promise.all([
            Shipment.find(filter)
                .populate('orderId', 'orderNumber customerInfo totals')
                .populate('pickupDetails.warehouseId', 'name address')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Shipment.countDocuments(filter),
        ]);

        res.json({
            shipments,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        logger.error('Error fetching shipments:', error);
        next(error);
    }
};

/**
 * Get a single shipment by ID
 * @route GET /api/v1/shipments/:shipmentId
 */
export const getShipmentById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            res.status(403).json({ message: 'User is not associated with any company' });
            return;
        }

        const shipmentId = req.params.shipmentId;
        if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
            res.status(400).json({ message: 'Invalid shipment ID format' });
            return;
        }

        const shipment = await Shipment.findOne({
            _id: shipmentId,
            companyId,
            isDeleted: false,
        })
            .populate('orderId', 'orderNumber customerInfo products totals currentStatus')
            .populate('pickupDetails.warehouseId', 'name address contactInfo');

        if (!shipment) {
            res.status(404).json({ message: 'Shipment not found' });
            return;
        }

        res.json({ shipment });
    } catch (error) {
        logger.error('Error fetching shipment:', error);
        next(error);
    }
};

/**
 * Track a shipment by tracking number
 * @route GET /api/v1/shipments/tracking/:trackingNumber
 */
export const trackShipment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            res.status(403).json({ message: 'User is not associated with any company' });
            return;
        }

        const trackingNumber = req.params.trackingNumber;

        // Validate AWB format
        const awbRegex = /^SHP-\d{8}-\d{4}$/;
        if (!awbRegex.test(trackingNumber)) {
            res.status(400).json({ message: 'Invalid tracking number format. Expected: SHP-YYYYMMDD-XXXX' });
            return;
        }

        const shipment = await Shipment.findOne({
            trackingNumber,
            companyId,
            isDeleted: false,
        })
            .populate('orderId', 'orderNumber customerInfo')
            .select('trackingNumber carrier serviceType currentStatus statusHistory deliveryDetails estimatedDelivery actualDelivery');

        if (!shipment) {
            res.status(404).json({ message: 'Shipment not found' });
            return;
        }

        // Sort status history by timestamp ascending (oldest first)
        const timeline = [...shipment.statusHistory].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        res.json({
            trackingNumber: shipment.trackingNumber,
            carrier: shipment.carrier,
            serviceType: shipment.serviceType,
            currentStatus: shipment.currentStatus,
            estimatedDelivery: shipment.estimatedDelivery,
            actualDelivery: shipment.actualDelivery,
            recipient: {
                name: shipment.deliveryDetails.recipientName,
                city: shipment.deliveryDetails.address.city,
                state: shipment.deliveryDetails.address.state,
            },
            timeline,
        });
    } catch (error) {
        logger.error('Error tracking shipment:', error);
        next(error);
    }
};

/**
 * Update shipment status
 * @route PATCH /api/v1/shipments/:shipmentId/status
 */
export const updateShipmentStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            res.status(403).json({ message: 'User is not associated with any company' });
            return;
        }

        const shipmentId = req.params.shipmentId;
        if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
            res.status(400).json({ message: 'Invalid shipment ID format' });
            return;
        }

        const validatedData = updateStatusSchema.parse(req.body);

        const shipment = await Shipment.findOne({
            _id: shipmentId,
            companyId,
            isDeleted: false,
        });

        if (!shipment) {
            res.status(404).json({ message: 'Shipment not found' });
            return;
        }

        // Validate status transition
        const allowedTransitions = validStatusTransitions[shipment.currentStatus] || [];
        if (!allowedTransitions.includes(validatedData.status)) {
            res.status(400).json({
                message: `Invalid status transition from '${shipment.currentStatus}' to '${validatedData.status}'`,
                allowedTransitions,
            });
            return;
        }

        // Add to status history
        shipment.statusHistory.push({
            status: validatedData.status,
            timestamp: new Date(),
            location: validatedData.location,
            description: validatedData.description,
            updatedBy: new mongoose.Types.ObjectId(req.user._id),
        });
        shipment.currentStatus = validatedData.status;

        // Handle special status updates
        if (validatedData.status === 'delivered') {
            shipment.actualDelivery = new Date();

            // Update order status
            await Order.findByIdAndUpdate(shipment.orderId, {
                currentStatus: 'delivered',
                $push: {
                    statusHistory: {
                        status: 'delivered',
                        timestamp: new Date(),
                        comment: `Delivered via ${shipment.carrier}`,
                        updatedBy: new mongoose.Types.ObjectId(req.user._id),
                    },
                },
            });
        } else if (validatedData.status === 'rto') {
            // Update order status
            await Order.findByIdAndUpdate(shipment.orderId, {
                currentStatus: 'rto',
                $push: {
                    statusHistory: {
                        status: 'rto',
                        timestamp: new Date(),
                        comment: 'Return to origin initiated',
                        updatedBy: new mongoose.Types.ObjectId(req.user._id),
                    },
                },
            });
        } else if (validatedData.status === 'ndr') {
            // Set NDR details
            shipment.ndrDetails = {
                ndrDate: new Date(),
                ndrStatus: 'pending',
                ndrAttempts: (shipment.ndrDetails?.ndrAttempts || 0) + 1,
                ndrReason: validatedData.description,
            };
        }

        await shipment.save();

        await createAuditLog(
            req.user._id,
            companyId,
            'update',
            'shipment',
            shipmentId,
            { message: 'Shipment status updated', newStatus: validatedData.status },
            req
        );

        res.json({
            message: 'Shipment status updated successfully',
            shipment,
        });
    } catch (error) {
        logger.error('Error updating shipment status:', error);
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: 'Validation error', errors: error.errors });
            return;
        }
        next(error);
    }
};

/**
 * Soft delete a shipment
 * @route DELETE /api/v1/shipments/:shipmentId
 */
export const deleteShipment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            res.status(403).json({ message: 'User is not associated with any company' });
            return;
        }

        const shipmentId = req.params.shipmentId;
        if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
            res.status(400).json({ message: 'Invalid shipment ID format' });
            return;
        }

        const shipment = await Shipment.findOne({
            _id: shipmentId,
            companyId,
            isDeleted: false,
        });

        if (!shipment) {
            res.status(404).json({ message: 'Shipment not found' });
            return;
        }

        // Prevent deletion of in-transit or delivered shipments
        if (['in_transit', 'out_for_delivery', 'delivered'].includes(shipment.currentStatus)) {
            res.status(400).json({
                message: `Cannot delete shipment with status '${shipment.currentStatus}'`,
            });
            return;
        }

        shipment.isDeleted = true;
        await shipment.save();

        await createAuditLog(
            req.user._id,
            companyId,
            'delete',
            'shipment',
            shipmentId,
            { message: 'Shipment deleted (soft delete)' },
            req
        );

        res.json({ message: 'Shipment deleted successfully' });
    } catch (error) {
        logger.error('Error deleting shipment:', error);
        next(error);
    }
};

export default {
    createShipment,
    getShipments,
    getShipmentById,
    trackShipment,
    updateShipmentStatus,
    deleteShipment,
};
