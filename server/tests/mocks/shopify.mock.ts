/**
 * Shopify API Mock
 * Mocks for the Shopify marketplace integration
 */

export interface ShopifyOrder {
    id: number;
    admin_graphql_api_id: string;
    order_number: number;
    name: string;
    email: string;
    created_at: string;
    updated_at: string;
    financial_status: 'pending' | 'authorized' | 'paid' | 'refunded' | 'voided';
    fulfillment_status: null | 'fulfilled' | 'partial' | 'restocked';
    currency: string;
    total_price: string;
    subtotal_price: string;
    total_tax: string;
    total_shipping_price_set: {
        shop_money: { amount: string; currency_code: string };
        presentment_money: { amount: string; currency_code: string };
    };
    line_items: ShopifyLineItem[];
    shipping_address: ShopifyAddress;
    billing_address: ShopifyAddress;
    customer: ShopifyCustomer;
}

export interface ShopifyLineItem {
    id: number;
    product_id: number;
    variant_id: number;
    title: string;
    sku: string;
    quantity: number;
    price: string;
    fulfillable_quantity: number;
}

export interface ShopifyAddress {
    first_name: string;
    last_name: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    country: string;
    zip: string;
    phone?: string;
}

export interface ShopifyCustomer {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
}

export interface ShopifyFulfillment {
    id: number;
    order_id: number;
    status: 'pending' | 'open' | 'success' | 'cancelled' | 'error' | 'failure';
    created_at: string;
    tracking_company?: string;
    tracking_number?: string;
    tracking_url?: string;
    line_items: ShopifyLineItem[];
}

/**
 * Generate mock Shopify order
 */
export const mockShopifyOrder = (overrides: Partial<ShopifyOrder> = {}): ShopifyOrder => ({
    id: Math.floor(Math.random() * 10000000000),
    admin_graphql_api_id: `gid://shopify/Order/${Date.now()}`,
    order_number: 1001 + Math.floor(Math.random() * 1000),
    name: `#${1001 + Math.floor(Math.random() * 1000)}`,
    email: 'customer@example.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    financial_status: 'paid',
    fulfillment_status: null,
    currency: 'INR',
    total_price: '1500.00',
    subtotal_price: '1400.00',
    total_tax: '50.00',
    total_shipping_price_set: {
        shop_money: { amount: '50.00', currency_code: 'INR' },
        presentment_money: { amount: '50.00', currency_code: 'INR' },
    },
    line_items: [
        {
            id: Date.now(),
            product_id: 123456789,
            variant_id: 987654321,
            title: 'Test Product',
            sku: 'TEST-SKU-001',
            quantity: 2,
            price: '700.00',
            fulfillable_quantity: 2,
        },
    ],
    shipping_address: {
        first_name: 'Test',
        last_name: 'Customer',
        address1: '123 Test Street',
        city: 'Mumbai',
        province: 'Maharashtra',
        country: 'India',
        zip: '400001',
        phone: '+919876543210',
    },
    billing_address: {
        first_name: 'Test',
        last_name: 'Customer',
        address1: '123 Test Street',
        city: 'Mumbai',
        province: 'Maharashtra',
        country: 'India',
        zip: '400001',
    },
    customer: {
        id: Math.floor(Math.random() * 10000000),
        email: 'customer@example.com',
        first_name: 'Test',
        last_name: 'Customer',
        phone: '+919876543210',
    },
    ...overrides,
});

/**
 * Generate mock Shopify fulfillment
 */
export const mockShopifyFulfillment = (
    orderId: number,
    trackingNumber: string
): ShopifyFulfillment => ({
    id: Date.now(),
    order_id: orderId,
    status: 'success',
    created_at: new Date().toISOString(),
    tracking_company: 'Velocity Shipfast',
    tracking_number: trackingNumber,
    tracking_url: `https://track.velocityshipfast.com/${trackingNumber}`,
    line_items: [],
});

/**
 * Mock Shopify webhook payload
 */
export const mockShopifyWebhookPayload = (
    topic: 'orders/create' | 'orders/updated' | 'orders/fulfilled' | 'orders/cancelled',
    order: ShopifyOrder = mockShopifyOrder()
) => ({
    topic,
    shop_domain: 'test-store.myshopify.com',
    api_version: '2023-10',
    payload: order,
});

/**
 * Generate mock HMAC signature for webhook verification
 */
export const generateMockHmacSignature = (body: string, secret: string = 'test_secret'): string => {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');
};

/**
 * Create a mock Shopify API client for testing
 */
export const createShopifyMockClient = () => ({
    orders: {
        list: jest.fn().mockResolvedValue({ orders: [mockShopifyOrder()] }),
        get: jest.fn().mockImplementation((orderId: number) =>
            Promise.resolve({ order: mockShopifyOrder({ id: orderId }) })
        ),
        update: jest.fn().mockImplementation((orderId: number, updates: Partial<ShopifyOrder>) =>
            Promise.resolve({ order: mockShopifyOrder({ id: orderId, ...updates }) })
        ),
    },
    fulfillments: {
        create: jest.fn().mockImplementation((orderId: number, data: any) =>
            Promise.resolve({ fulfillment: mockShopifyFulfillment(orderId, data.tracking_number) })
        ),
        update: jest.fn().mockResolvedValue({ fulfillment: {} }),
        complete: jest.fn().mockResolvedValue({ fulfillment: {} }),
        cancel: jest.fn().mockResolvedValue({ fulfillment: {} }),
    },
    webhooks: {
        list: jest.fn().mockResolvedValue({ webhooks: [] }),
        create: jest.fn().mockResolvedValue({ webhook: { id: Date.now(), topic: '' } }),
        delete: jest.fn().mockResolvedValue({}),
    },
    products: {
        list: jest.fn().mockResolvedValue({ products: [] }),
        get: jest.fn().mockResolvedValue({ product: {} }),
    },
    shop: {
        get: jest.fn().mockResolvedValue({
            shop: {
                id: 123456,
                name: 'Test Store',
                email: 'store@example.com',
                domain: 'test-store.myshopify.com',
                myshopify_domain: 'test-store.myshopify.com',
                currency: 'INR',
                timezone: 'Asia/Kolkata',
            },
        }),
    },
});

/**
 * Mock OAuth flow responses
 */
export const mockShopifyOAuthTokenResponse = (accessToken: string = 'shpat_test_token') => ({
    access_token: accessToken,
    scope: 'read_orders,write_orders,read_products,write_fulfillments',
    expires_in: null, // Offline tokens don't expire
    associated_user_scope: null,
    associated_user: null,
});

/**
 * Reset all Shopify mocks
 */
export const resetShopifyMocks = (client: ReturnType<typeof createShopifyMockClient>) => {
    client.orders.list.mockClear();
    client.orders.get.mockClear();
    client.orders.update.mockClear();
    client.fulfillments.create.mockClear();
    client.fulfillments.update.mockClear();
    client.webhooks.list.mockClear();
    client.webhooks.create.mockClear();
    client.products.list.mockClear();
    client.shop.get.mockClear();
};
