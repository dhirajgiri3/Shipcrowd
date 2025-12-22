import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Order, { IOrder } from '../../../infrastructure/database/mongoose/models/Order';
import { AuthRequest } from '../middleware/auth';
import logger from '../../../shared/logger/winston.logger';
import { createAuditLog } from '../middleware/auditLog';
import mongoose from 'mongoose';
import csv from 'csv-parser';
import { Readable } from 'stream';

// Order number generator: ORD-YYYYMMDD-XXXX
const generateOrderNumber = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${year}${month}${day}-${random}`;
};

// Validation schemas
const productSchema = z.object({
    name: z.string().min(1),
    sku: z.string().optional(),
    quantity: z.number().int().min(1),
    price: z.number().min(0),
    weight: z.number().optional(),
    dimensions: z.object({
        length: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
    }).optional(),
});

const addressSchema = z.object({
    line1: z.string().min(3),
    line2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().min(2),
    country: z.string().min(2).default('India'),
    postalCode: z.string().min(5).max(10),
});

const customerInfoSchema = z.object({
    name: z.string().min(2),
    email: z.string().email().optional(),
    phone: z.string().min(10),
    address: addressSchema,
});

const createOrderSchema = z.object({
    customerInfo: customerInfoSchema,
    products: z.array(productSchema).min(1),
    paymentMethod: z.enum(['cod', 'prepaid']).optional(),
    warehouseId: z.string().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
});

const updateOrderSchema = z.object({
    customerInfo: customerInfoSchema.partial().optional(),
    products: z.array(productSchema).optional(),
    currentStatus: z.enum(['pending', 'ready_to_ship', 'shipped', 'delivered', 'cancelled', 'rto']).optional(),
    paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
    paymentMethod: z.enum(['cod', 'prepaid']).optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
});

// Valid status transitions
const validStatusTransitions: Record<string, string[]> = {
    pending: ['ready_to_ship', 'cancelled'],
    ready_to_ship: ['shipped', 'cancelled'],
    shipped: ['delivered', 'rto'],
    delivered: [],
    cancelled: [],
    rto: [],
};

/**
 * Create a new order
 * @route POST /api/v1/orders
 */
export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

        const validatedData = createOrderSchema.parse(req.body);

        // Calculate totals
        const subtotal = validatedData.products.reduce(
            (sum, product) => sum + product.price * product.quantity,
            0
        );
        const shipping = 0; // Will be calculated when shipment is created
        const tax = 0;
        const discount = 0;
        const total = subtotal + shipping + tax - discount;

        // Generate unique order number
        let orderNumber = generateOrderNumber();
        let attempts = 0;
        while (await Order.findOne({ orderNumber }) && attempts < 10) {
            orderNumber = generateOrderNumber();
            attempts++;
        }

        if (attempts >= 10) {
            res.status(500).json({ message: 'Failed to generate unique order number' });
            return;
        }

        const order = new Order({
            orderNumber,
            companyId,
            customerInfo: validatedData.customerInfo,
            products: validatedData.products,
            paymentMethod: validatedData.paymentMethod || 'prepaid',
            paymentStatus: validatedData.paymentMethod === 'cod' ? 'pending' : 'paid',
            source: 'manual',
            warehouseId: validatedData.warehouseId
                ? new mongoose.Types.ObjectId(validatedData.warehouseId)
                : undefined,
            currentStatus: 'pending',
            totals: { subtotal, tax, shipping, discount, total },
            notes: validatedData.notes,
            tags: validatedData.tags,
            shippingDetails: { shippingCost: 0 },
        });

        await order.save();

        await createAuditLog(
            req.user._id,
            companyId,
            'create',
            'order',
            String(order._id),
            { message: 'Order created', orderNumber },
            req
        );

        res.status(201).json({
            message: 'Order created successfully',
            order,
        });
    } catch (error) {
        logger.error('Error creating order:', error);
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: 'Validation error', errors: error.errors });
            return;
        }
        next(error);
    }
};

/**
 * Get all orders for the current user's company
 * @route GET /api/v1/orders
 */
export const getOrders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

        // Phone filter
        if (req.query.phone) {
            filter['customerInfo.phone'] = { $regex: req.query.phone, $options: 'i' };
        }

        // Warehouse filter
        if (req.query.warehouse) {
            filter.warehouseId = new mongoose.Types.ObjectId(req.query.warehouse as string);
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
                { orderNumber: { $regex: req.query.search, $options: 'i' } },
                { 'customerInfo.name': { $regex: req.query.search, $options: 'i' } },
                { 'customerInfo.phone': { $regex: req.query.search, $options: 'i' } },
            ];
        }

        // Get orders with pagination
        const [orders, total] = await Promise.all([
            Order.find(filter)
                .populate('warehouseId', 'name address')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Order.countDocuments(filter),
        ]);

        res.json({
            orders,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        logger.error('Error fetching orders:', error);
        next(error);
    }
};

/**
 * Get a single order by ID
 * @route GET /api/v1/orders/:orderId
 */
export const getOrderById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

        const orderId = req.params.orderId;
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            res.status(400).json({ message: 'Invalid order ID format' });
            return;
        }

        const order = await Order.findOne({
            _id: orderId,
            companyId,
            isDeleted: false,
        }).populate('warehouseId', 'name address');

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        res.json({ order });
    } catch (error) {
        logger.error('Error fetching order:', error);
        next(error);
    }
};

/**
 * Update an order
 * @route PATCH /api/v1/orders/:orderId
 */
export const updateOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

        const orderId = req.params.orderId;
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            res.status(400).json({ message: 'Invalid order ID format' });
            return;
        }

        const validatedData = updateOrderSchema.parse(req.body);

        // Get existing order
        const order = await Order.findOne({
            _id: orderId,
            companyId,
            isDeleted: false,
        });

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        // Validate status transition
        if (validatedData.currentStatus && validatedData.currentStatus !== order.currentStatus) {
            const allowedTransitions = validStatusTransitions[order.currentStatus] || [];
            if (!allowedTransitions.includes(validatedData.currentStatus)) {
                res.status(400).json({
                    message: `Invalid status transition from '${order.currentStatus}' to '${validatedData.currentStatus}'`,
                    allowedTransitions,
                });
                return;
            }

            // Add to status history
            order.statusHistory.push({
                status: validatedData.currentStatus,
                timestamp: new Date(),
                updatedBy: new mongoose.Types.ObjectId(req.user._id),
            });
            order.currentStatus = validatedData.currentStatus;
        }

        // Update other fields
        if (validatedData.customerInfo) {
            order.customerInfo = { ...order.customerInfo, ...validatedData.customerInfo } as any;
        }
        if (validatedData.products) {
            order.products = validatedData.products;
            // Recalculate totals
            const subtotal = validatedData.products.reduce(
                (sum, product) => sum + product.price * product.quantity,
                0
            );
            order.totals.subtotal = subtotal;
            order.totals.total = subtotal + order.totals.shipping + order.totals.tax - order.totals.discount;
        }
        if (validatedData.paymentStatus) {
            order.paymentStatus = validatedData.paymentStatus;
        }
        if (validatedData.paymentMethod) {
            order.paymentMethod = validatedData.paymentMethod;
        }
        if (validatedData.notes !== undefined) {
            order.notes = validatedData.notes;
        }
        if (validatedData.tags) {
            order.tags = validatedData.tags;
        }

        await order.save();

        await createAuditLog(
            req.user._id,
            companyId,
            'update',
            'order',
            orderId,
            { message: 'Order updated', changes: Object.keys(validatedData) },
            req
        );

        res.json({
            message: 'Order updated successfully',
            order,
        });
    } catch (error) {
        logger.error('Error updating order:', error);
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: 'Validation error', errors: error.errors });
            return;
        }
        next(error);
    }
};

/**
 * Soft delete an order
 * @route DELETE /api/v1/orders/:orderId
 */
export const deleteOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

        const orderId = req.params.orderId;
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            res.status(400).json({ message: 'Invalid order ID format' });
            return;
        }

        const order = await Order.findOne({
            _id: orderId,
            companyId,
            isDeleted: false,
        });

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        // Prevent deletion of shipped/delivered orders
        if (['shipped', 'delivered'].includes(order.currentStatus)) {
            res.status(400).json({
                message: `Cannot delete order with status '${order.currentStatus}'`,
            });
            return;
        }

        order.isDeleted = true;
        await order.save();

        await createAuditLog(
            req.user._id,
            companyId,
            'delete',
            'order',
            orderId,
            { message: 'Order deleted (soft delete)' },
            req
        );

        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        logger.error('Error deleting order:', error);
        next(error);
    }
};

/**
 * Bulk import orders from CSV
 * @route POST /api/v1/orders/bulk
 */
export const bulkImportOrders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

        if (!req.file) {
            res.status(400).json({ message: 'CSV file is required' });
            return;
        }

        const results: any[] = [];
        const created: any[] = [];
        const errors: any[] = [];

        const stream = Readable.from(req.file.buffer.toString());

        stream
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                // Use a transaction for atomicity
                const session = await mongoose.startSession();
                session.startTransaction();

                try {
                    for (let i = 0; i < results.length; i++) {
                        const row = results[i];
                        try {
                            // Validate required fields
                            if (!row.customer_name || !row.customer_phone || !row.address_line1 ||
                                !row.city || !row.state || !row.postal_code || !row.product_name ||
                                !row.quantity || !row.price) {
                                errors.push({ row: i + 1, error: 'Missing required fields', data: row });
                                continue;
                            }

                            // Generate order number
                            let orderNumber = generateOrderNumber();
                            let attempts = 0;
                            while (await Order.findOne({ orderNumber }) && attempts < 10) {
                                orderNumber = generateOrderNumber();
                                attempts++;
                            }

                            const quantity = parseInt(row.quantity);
                            const price = parseFloat(row.price);
                            const subtotal = quantity * price;

                            const order = new Order({
                                orderNumber,
                                companyId,
                                customerInfo: {
                                    name: row.customer_name,
                                    email: row.customer_email || undefined,
                                    phone: row.customer_phone,
                                    address: {
                                        line1: row.address_line1,
                                        line2: row.address_line2 || '',
                                        city: row.city,
                                        state: row.state,
                                        country: row.country || 'India',
                                        postalCode: row.postal_code,
                                    },
                                },
                                products: [{
                                    name: row.product_name,
                                    sku: row.sku || '',
                                    quantity,
                                    price,
                                    weight: row.weight ? parseFloat(row.weight) : undefined,
                                }],
                                paymentMethod: row.payment_method === 'cod' ? 'cod' : 'prepaid',
                                paymentStatus: row.payment_method === 'cod' ? 'pending' : 'paid',
                                source: 'manual',
                                currentStatus: 'pending',
                                totals: { subtotal, tax: 0, shipping: 0, discount: 0, total: subtotal },
                                shippingDetails: { shippingCost: 0 },
                            });

                            await order.save({ session });
                            created.push({ orderNumber, id: order._id });
                        } catch (rowError) {
                            errors.push({
                                row: i + 1,
                                error: rowError instanceof Error ? rowError.message : 'Unknown error',
                                data: row,
                            });
                        }
                    }

                    // If there are errors, rollback
                    if (errors.length > 0 && created.length === 0) {
                        await session.abortTransaction();
                        res.status(400).json({
                            message: 'Failed to import orders',
                            errors,
                        });
                        return;
                    }

                    await session.commitTransaction();

                    await createAuditLog(
                        req.user!._id,
                        companyId,
                        'create',
                        'order',
                        'bulk',
                        { message: `Bulk import: ${created.length} orders created, ${errors.length} errors` },
                        req
                    );

                    res.status(201).json({
                        message: `Imported ${created.length} orders with ${errors.length} errors`,
                        created,
                        errors,
                    });
                } catch (error) {
                    await session.abortTransaction();
                    throw error;
                } finally {
                    session.endSession();
                }
            })
            .on('error', (error) => {
                logger.error('Error parsing CSV:', error);
                res.status(400).json({ message: 'Failed to parse CSV file' });
            });
    } catch (error) {
        logger.error('Error importing orders:', error);
        next(error);
    }
};

export default {
    createOrder,
    getOrders,
    getOrderById,
    updateOrder,
    deleteOrder,
    bulkImportOrders,
};
