import mongoose from 'mongoose';
import Order from '../../../../infrastructure/database/mongoose/models/order.model';
import { generateOrderNumber, validateStatusTransition } from '../../../../shared/helpers/controller.helpers';
import { ORDER_STATUS_TRANSITIONS } from '../../../../shared/validation/schemas';
import eventBus from '../../../../shared/events/eventBus.js';

/**
 * OrderService - Business logic for order management
 * 
 * This service encapsulates pure business rules for orders.
 * It is framework-agnostic and does not know about HTTP.
 */
export class OrderService {
    /**
     * Calculate order totals from products
     */
    static calculateTotals(products: Array<{ price: number; quantity: number }>) {
        const subtotal = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
        return { subtotal, tax: 0, shipping: 0, discount: 0, total: subtotal };
    }

    /**
     * Generate a unique order number with retry logic
     * @param maxAttempts Maximum number of attempts to generate unique number
     * @returns Unique order number or null if failed
     */
    static async getUniqueOrderNumber(maxAttempts = 10): Promise<string | null> {
        for (let i = 0; i < maxAttempts; i++) {
            const orderNumber = generateOrderNumber();
            const exists = await Order.exists({ orderNumber });
            if (!exists) return orderNumber;
        }
        return null;
    }

    /**
     * Create a new order
     * @param args Order creation parameters
     * @returns Created order document
     */
    static async createOrder(args: {
        companyId: mongoose.Types.ObjectId;
        userId: string;
        payload: {
            customerInfo: any;
            products: Array<{ name: string; sku?: string; quantity: number; price: number; weight?: number }>;
            paymentMethod?: string;
            warehouseId?: string;
            notes?: string;
            tags?: string[];
            salesRepId?: string; // NEW: optional sales rep assignment
        };
    }) {
        const { companyId, payload } = args;

        const orderNumber = await this.getUniqueOrderNumber();
        if (!orderNumber) {
            throw new Error('Failed to generate unique order number');
        }

        const totals = this.calculateTotals(payload.products);

        const order = new Order({
            orderNumber,
            companyId,
            customerInfo: payload.customerInfo,
            products: payload.products,
            paymentMethod: payload.paymentMethod || 'prepaid',
            paymentStatus: payload.paymentMethod === 'cod' ? 'pending' : 'paid',
            source: 'manual',
            warehouseId: payload.warehouseId ? new mongoose.Types.ObjectId(payload.warehouseId) : undefined,
            currentStatus: 'pending',
            totals,
            notes: payload.notes,
            tags: payload.tags,
            shippingDetails: { shippingCost: 0 },
            salesRepresentative: payload.salesRepId ? new mongoose.Types.ObjectId(payload.salesRepId) : undefined,
        });

        await order.save();

        // Emit order.created event
        eventBus.emitEvent('order.created', {
            orderId: order._id.toString(),
            companyId: companyId.toString(),
            orderNumber: order.orderNumber,
            salesRepId: payload.salesRepId,
        });

        return order;
    }

    /**
     * Update order status with optimistic locking
     * @param args Status update parameters
     * @returns Updated order or null if concurrent modification detected
     */
    static async updateOrderStatus(args: {
        orderId: string;
        currentStatus: string;
        newStatus: string;
        currentVersion: number;
        userId: string;
    }) {
        const { orderId, currentStatus, newStatus, currentVersion, userId } = args;

        // Validate status transition
        const { valid } = validateStatusTransition(
            currentStatus,
            newStatus,
            ORDER_STATUS_TRANSITIONS
        );

        if (!valid) {
            return {
                success: false,
                error: `Invalid status transition from '${currentStatus}' to '${newStatus}'`
            };
        }

        const statusEntry = {
            status: newStatus,
            timestamp: new Date(),
            updatedBy: new mongoose.Types.ObjectId(userId),
        };

        const updatedOrder = await Order.findOneAndUpdate(
            {
                _id: orderId,
                __v: currentVersion
            },
            {
                $set: { currentStatus: newStatus },
                $push: { statusHistory: statusEntry },
                $inc: { __v: 1 }
            },
            { new: true }
        );

        if (!updatedOrder) {
            return {
                success: false,
                error: 'Order was updated by another process. Please retry.',
                code: 'CONCURRENT_MODIFICATION'
            };
        }

        return {
            success: true,
            order: updatedOrder
        };
    }

    /**
     * Validate if an order can be deleted based on its status
     * @param currentStatus Current order status
     * @returns Validation result
     */
    static canDeleteOrder(currentStatus: string): { canDelete: boolean; reason?: string } {
        const nonDeletableStatuses = ['shipped', 'delivered'];
        if (nonDeletableStatuses.includes(currentStatus)) {
            return {
                canDelete: false,
                reason: `Cannot delete order with status '${currentStatus}'`
            };
        }
        return { canDelete: true };
    }

    /**
     * Process a single CSV row into an order
     * @param args CSV row processing parameters
     * @returns Created order or error
     */
    static async processBulkOrderRow(args: {
        row: any;
        rowIndex: number;
        companyId: mongoose.Types.ObjectId;
        session: mongoose.ClientSession;
    }): Promise<{ success: boolean; order?: any; error?: string }> {
        const { row, rowIndex, companyId, session } = args;

        try {
            const requiredFields = ['customer_name', 'customer_phone', 'address_line1', 'city', 'state', 'postal_code', 'product_name', 'quantity', 'price'];
            const missingFields = requiredFields.filter(f => !row[f]);

            if (missingFields.length > 0) {
                return {
                    success: false,
                    error: `Missing fields: ${missingFields.join(', ')}`
                };
            }

            const orderNumber = await this.getUniqueOrderNumber();
            if (!orderNumber) {
                return {
                    success: false,
                    error: 'Failed to generate order number'
                };
            }

            const quantity = parseInt(row.quantity, 10);
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

            return {
                success: true,
                order: { orderNumber, id: order._id }
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Process multiple CSV rows in a transaction
     * @param args Bulk import parameters
     * @returns Import results with created orders and errors
     */
    static async bulkImportOrders(args: {
        rows: any[];
        companyId: mongoose.Types.ObjectId;
    }): Promise<{
        created: Array<{ orderNumber: string; id: any }>;
        errors: Array<{ row: number; error: string; data?: any }>;
    }> {
        const { rows, companyId } = args;
        const created: Array<{ orderNumber: string; id: any }> = [];
        const errors: Array<{ row: number; error: string; data?: any }> = [];

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            for (let i = 0; i < rows.length; i++) {
                const result = await this.processBulkOrderRow({
                    row: rows[i],
                    rowIndex: i,
                    companyId,
                    session
                });

                if (result.success && result.order) {
                    created.push(result.order);
                } else {
                    errors.push({
                        row: i + 1,
                        error: result.error || 'Unknown error'
                    });
                }
            }

            if (created.length === 0 && errors.length > 0) {
                await session.abortTransaction();
                throw new Error('No orders imported');
            }

            await session.commitTransaction();

            return { created, errors };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}
