/**
 * Order Factory
 * Creates test data for Order model
 */
import mongoose from 'mongoose';
import {
    randomName,
    randomEmail,
    randomPhone,
    randomAddress,
    randomCity,
    randomState,
    randomPincode,
    randomProductName,
    randomString,
    randomInt,
    uniqueId,
} from '../helpers/randomData';

// Import model lazily
const getOrderModel = () => mongoose.model('Order');

export interface CreateTestOrderOptions {
    orderNumber?: string;
    companyId?: mongoose.Types.ObjectId | string;
    customerName?: string;
    customerPhone?: string;
    currentStatus?: string;
    paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
    paymentMethod?: 'cod' | 'prepaid';
    products?: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    source?: 'manual' | 'shopify' | 'woocommerce' | 'api';
}

/**
 * Create a test order with optional overrides
 */
export const createTestOrder = async (
    companyId: mongoose.Types.ObjectId | string,
    overrides: CreateTestOrderOptions = {}
): Promise<any> => {
    const Order = getOrderModel();

    const products = overrides.products || [
        {
            name: randomProductName(),
            sku: randomString(8).toUpperCase(),
            quantity: randomInt(1, 5),
            price: randomInt(100, 5000),
            weight: randomInt(1, 50) / 10,
        },
    ];

    const subtotal = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
    const tax = Math.round(subtotal * 0.18); // 18% GST
    const shipping = 50;
    const total = subtotal + tax + shipping;

    const orderData = {
        orderNumber: overrides.orderNumber || uniqueId('ORD-'),
        companyId: new mongoose.Types.ObjectId(companyId),
        customerInfo: {
            name: overrides.customerName || randomName(),
            email: randomEmail(),
            phone: overrides.customerPhone || randomPhone(),
            address: {
                line1: randomAddress(),
                line2: '',
                city: randomCity(),
                state: randomState(),
                country: 'India',
                postalCode: randomPincode(),
            },
        },
        products,
        shippingDetails: {
            provider: 'Velocity Shipfast',
            method: 'standard',
            shippingCost: shipping,
        },
        paymentStatus: overrides.paymentStatus || 'pending',
        paymentMethod: overrides.paymentMethod || 'prepaid',
        source: overrides.source || 'manual',
        currentStatus: overrides.currentStatus || 'pending',
        totals: {
            subtotal,
            tax,
            shipping,
            discount: 0,
            total,
        },
        ...overrides,
    };

    return Order.create(orderData);
};

/**
 * Create multiple test orders
 */
export const createTestOrders = async (
    companyId: mongoose.Types.ObjectId | string,
    count: number,
    overrides: CreateTestOrderOptions = {}
): Promise<any[]> => {
    const orders = [];
    for (let i = 0; i < count; i++) {
        orders.push(await createTestOrder(companyId, overrides));
    }
    return orders;
};

/**
 * Create a COD order
 */
export const createTestCodOrder = async (
    companyId: mongoose.Types.ObjectId | string,
    overrides: CreateTestOrderOptions = {}
): Promise<any> => {
    return createTestOrder(companyId, {
        ...overrides,
        paymentMethod: 'cod',
        paymentStatus: 'pending',
    });
};

/**
 * Create a paid prepaid order
 */
export const createTestPrepaidOrder = async (
    companyId: mongoose.Types.ObjectId | string,
    overrides: CreateTestOrderOptions = {}
): Promise<any> => {
    return createTestOrder(companyId, {
        ...overrides,
        paymentMethod: 'prepaid',
        paymentStatus: 'paid',
    });
};

/**
 * Create orders with various statuses for testing
 */
export const createTestOrdersWithStatuses = async (
    companyId: mongoose.Types.ObjectId | string
): Promise<Record<string, any>> => {
    const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    const orders: Record<string, any> = {};

    for (const status of statuses) {
        orders[status] = await createTestOrder(companyId, { currentStatus: status });
    }

    return orders;
};
