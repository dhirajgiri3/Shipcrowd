/**
 * WooCommerce API Mock
 * Mocks for the WooCommerce marketplace integration
 */

export interface WooCommerceOrder {
    id: number;
    number: string;
    status: 'pending' | 'processing' | 'on-hold' | 'completed' | 'cancelled' | 'refunded' | 'failed';
    date_created: string;
    date_modified: string;
    currency: string;
    total: string;
    subtotal: string;
    total_tax: string;
    shipping_total: string;
    payment_method: string;
    payment_method_title: string;
    transaction_id: string;
    customer_id: number;
    billing: WooCommerceAddress;
    shipping: WooCommerceAddress;
    line_items: WooCommerceLineItem[];
    meta_data: WooCommerceMetaData[];
}

export interface WooCommerceAddress {
    first_name: string;
    last_name: string;
    company?: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email?: string;
    phone?: string;
}

export interface WooCommerceLineItem {
    id: number;
    name: string;
    product_id: number;
    variation_id: number;
    quantity: number;
    tax_class: string;
    subtotal: string;
    total: string;
    sku: string;
    price: number;
    meta_data: WooCommerceMetaData[];
}

export interface WooCommerceMetaData {
    id: number;
    key: string;
    value: string;
}

export interface WooCommerceProduct {
    id: number;
    name: string;
    sku: string;
    price: string;
    regular_price: string;
    stock_quantity: number;
    stock_status: 'instock' | 'outofstock' | 'onbackorder';
    manage_stock: boolean;
    weight: string;
    dimensions: {
        length: string;
        width: string;
        height: string;
    };
}

/**
 * Generate mock WooCommerce order
 */
export const mockWooCommerceOrder = (overrides: Partial<WooCommerceOrder> = {}): WooCommerceOrder => ({
    id: Math.floor(Math.random() * 10000),
    number: `${1000 + Math.floor(Math.random() * 1000)}`,
    status: 'processing',
    date_created: new Date().toISOString(),
    date_modified: new Date().toISOString(),
    currency: 'INR',
    total: '1500.00',
    subtotal: '1400.00',
    total_tax: '50.00',
    shipping_total: '50.00',
    payment_method: 'razorpay',
    payment_method_title: 'Razorpay',
    transaction_id: `pay_${Date.now()}`,
    customer_id: Math.floor(Math.random() * 1000),
    billing: {
        first_name: 'Test',
        last_name: 'Customer',
        address_1: '123 Test Street',
        city: 'Mumbai',
        state: 'MH',
        postcode: '400001',
        country: 'IN',
        email: 'customer@example.com',
        phone: '+919876543210',
    },
    shipping: {
        first_name: 'Test',
        last_name: 'Customer',
        address_1: '123 Test Street',
        city: 'Mumbai',
        state: 'MH',
        postcode: '400001',
        country: 'IN',
    },
    line_items: [
        {
            id: Date.now(),
            name: 'Test Product',
            product_id: 123,
            variation_id: 0,
            quantity: 2,
            tax_class: 'standard',
            subtotal: '1400.00',
            total: '1400.00',
            sku: 'TEST-SKU-001',
            price: 700,
            meta_data: [],
        },
    ],
    meta_data: [],
    ...overrides,
});

/**
 * Generate mock WooCommerce product
 */
export const mockWooCommerceProduct = (overrides: Partial<WooCommerceProduct> = {}): WooCommerceProduct => ({
    id: Math.floor(Math.random() * 10000),
    name: 'Test Product',
    sku: 'TEST-SKU-001',
    price: '700.00',
    regular_price: '800.00',
    stock_quantity: 100,
    stock_status: 'instock',
    manage_stock: true,
    weight: '0.5',
    dimensions: {
        length: '20',
        width: '15',
        height: '10',
    },
    ...overrides,
});

/**
 * Mock WooCommerce webhook payload
 */
export const mockWooCommerceWebhookPayload = (
    topic: 'order.created' | 'order.updated' | 'order.deleted',
    order: WooCommerceOrder = mockWooCommerceOrder()
) => ({
    webhook_id: Math.floor(Math.random() * 1000),
    delivery_id: `delivery_${Date.now()}`,
    topic,
    order,
});

/**
 * Generate mock WooCommerce webhook signature
 */
export const generateWooCommerceSignature = (
    payload: string,
    secret: string = 'test_webhook_secret'
): string => {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', secret).update(payload).digest('base64');
};

/**
 * Create a mock WooCommerce API client for testing
 */
export const createWooCommerceMockClient = () => ({
    orders: {
        list: jest.fn().mockResolvedValue({ data: [mockWooCommerceOrder()] }),
        retrieve: jest.fn().mockImplementation((orderId: number) =>
            Promise.resolve({ data: mockWooCommerceOrder({ id: orderId }) })
        ),
        update: jest.fn().mockImplementation((orderId: number, updates: Partial<WooCommerceOrder>) =>
            Promise.resolve({ data: mockWooCommerceOrder({ id: orderId, ...updates }) })
        ),
        create: jest.fn().mockImplementation((data: Partial<WooCommerceOrder>) =>
            Promise.resolve({ data: mockWooCommerceOrder(data) })
        ),
    },
    products: {
        list: jest.fn().mockResolvedValue({ data: [mockWooCommerceProduct()] }),
        retrieve: jest.fn().mockImplementation((productId: number) =>
            Promise.resolve({ data: mockWooCommerceProduct({ id: productId }) })
        ),
        update: jest.fn().mockImplementation((productId: number, updates: any) =>
            Promise.resolve({ data: mockWooCommerceProduct({ id: productId, ...updates }) })
        ),
    },
    orderNotes: {
        create: jest.fn().mockResolvedValue({
            data: {
                id: Date.now(),
                note: 'Order note created',
                customer_note: false,
            },
        }),
        list: jest.fn().mockResolvedValue({ data: [] }),
    },
    webhooks: {
        list: jest.fn().mockResolvedValue({ data: [] }),
        create: jest.fn().mockResolvedValue({
            data: {
                id: Date.now(),
                topic: 'order.created',
                delivery_url: 'https://example.com/webhook',
            },
        }),
        delete: jest.fn().mockResolvedValue({}),
    },
    system: {
        status: jest.fn().mockResolvedValue({
            data: {
                environment: {
                    wp_version: '6.4',
                    wc_version: '8.4',
                },
            },
        }),
    },
});

/**
 * Mock WooCommerce OAuth responses
 */
export const mockWooCommerceOAuthResponse = () => ({
    key_id: Date.now(),
    user_id: 1,
    consumer_key: 'ck_test_consumer_key',
    consumer_secret: 'cs_test_consumer_secret',
    key_permissions: 'read_write',
});

/**
 * Reset all WooCommerce mocks
 */
export const resetWooCommerceMocks = (client: ReturnType<typeof createWooCommerceMockClient>) => {
    client.orders.list.mockClear();
    client.orders.retrieve.mockClear();
    client.orders.update.mockClear();
    client.orders.create.mockClear();
    client.products.list.mockClear();
    client.products.retrieve.mockClear();
    client.orderNotes.create.mockClear();
    client.webhooks.list.mockClear();
    client.webhooks.create.mockClear();
    client.system.status.mockClear();
};

/**
 * Configure WooCommerce mock to return errors
 */
export const configureWooCommerceErrors = (client: ReturnType<typeof createWooCommerceMockClient>) => {
    const error = { code: 'woocommerce_api_error', message: 'API Error' };
    client.orders.list.mockRejectedValue(error);
    client.orders.retrieve.mockRejectedValue(error);
    client.orders.update.mockRejectedValue(error);
};
