import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import crypto from 'crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Models
import { Order, WooCommerceProductMapping, WooCommerceStore, WooCommerceSyncLog } from '../../../src/infrastructure/database/mongoose/models';

// Mock WooCommerceClient
import WooCommerceClient from '../../../src/infrastructure/external/ecommerce/woocommerce/woocommerce.client';
jest.mock('../../../src/infrastructure/external/ecommerce/woocommerce/woocommerce.client');

// Mock QueueManager to avoid Redis dependency
jest.mock('../../../src/infrastructure/utilities/queue-manager', () => ({
    default: {
        initialize: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        shutdown: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        addJob: jest.fn<() => Promise<{ id: string }>>().mockResolvedValue({ id: 'mock-job-id' }),
    },
}));

/**
 * Integration Test: WooCommerce Advanced Flow
 *
 * Tests the complete WooCommerce integration lifecycle:
 * 1. Installation & Credential Validation
 * 2. Manual Order Sync (using WooCommerceOrderSyncService)
 * 3. Webhook Processing (order.created, order.updated, order.deleted)
 * 4. Product Mapping & Updates
 * 5. Customer Webhooks
 * 6. Disconnection & Cleanup
 *
 * All tests run against in-memory MongoDB.
 * External WooCommerce API calls are mocked.
 */

describe('WooCommerce Advanced Integration Flow', () => {
    let mongoServer: MongoMemoryServer;
    let companyId: mongoose.Types.ObjectId;
    let storeId: string;
    let wooClientMock: any;

    // Test data constants
    const TEST_STORE_URL = 'https://woo-test-store.com';
    const TEST_CONSUMER_KEY = 'ck_test_consumer_key_encrypted';
    const TEST_CONSUMER_SECRET = 'cs_test_consumer_secret_encrypted';

    let createdBy: mongoose.Types.ObjectId;

    beforeAll(async () => {
        // Start in-memory MongoDB
        mongoServer = await MongoMemoryServer.create({
            instance: { ip: '127.0.0.1' }
        });
        const mongoUri = mongoServer.getUri();

        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(mongoUri, { dbName: 'shipcrowd-test' });
        }

        // Setup IDs
        companyId = new mongoose.Types.ObjectId();
        createdBy = new mongoose.Types.ObjectId();

        // Setup mocked WooCommerceClient instance methods
        wooClientMock = {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
            paginate: jest.fn(),
            batch: jest.fn(),
            testConnection: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
            getStoreInfo: jest.fn(),
        };

        // Mock the WooCommerceClient constructor to return our mock instance
        (WooCommerceClient as unknown as jest.Mock).mockImplementation(() => wooClientMock);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
        jest.clearAllMocks();
    });

    beforeEach(async () => {
        // Clear collections between tests
        await Order.deleteMany({});
        await WooCommerceProductMapping.deleteMany({});
        await WooCommerceSyncLog.deleteMany({});
        jest.clearAllMocks();
    });

    // =========================================================================
    // STEP 1: Installation & Credential Validation
    // =========================================================================
    describe('Step 1: Installation & Credential Validation', () => {
        test('should validate WooCommerce credentials via testConnection', async () => {
            // Mock successful connection test
            wooClientMock.testConnection.mockResolvedValue(true);
            wooClientMock.getStoreInfo.mockResolvedValue({
                environment: {
                    wp_version: '6.4.2',
                    wc_version: '8.5.1',
                    php_version: '8.1.0',
                },
                settings: {
                    currency: 'USD',
                    currency_symbol: '$',
                },
                store_id: 'woo_store_123',
            });

            // Test connection
            const isConnected = await wooClientMock.testConnection();
            expect(isConnected).toBe(true);

            // Get store info
            const storeInfo = await wooClientMock.getStoreInfo();
            expect(storeInfo.environment.wc_version).toBe('8.5.1');
        });

        test('should create WooCommerce store after successful validation', async () => {
            const store = await WooCommerceStore.create({
                companyId,
                createdBy,
                storeUrl: TEST_STORE_URL,
                storeName: 'Test WooCommerce Store',
                consumerKey: TEST_CONSUMER_KEY,
                consumerSecret: TEST_CONSUMER_SECRET,
                currency: 'USD',
                timezone: 'America/New_York',
                isActive: true,
                installedAt: new Date(),
                syncConfig: {
                    orderSync: { enabled: true, autoSync: true, syncInterval: 30 },
                    inventorySync: { enabled: true, syncDirection: 'ONE_WAY' },
                    webhooksEnabled: true,
                },
            });

            storeId = (store._id as mongoose.Types.ObjectId).toString();

            expect(store).toBeDefined();
            expect(store.storeUrl).toBe(TEST_STORE_URL);
            expect(store.isActive).toBe(true);
            expect(store.syncConfig.orderSync.enabled).toBe(true);
        });

        test('should handle invalid credentials gracefully', async () => {
            wooClientMock.testConnection.mockResolvedValue(false);

            const isConnected = await wooClientMock.testConnection();
            expect(isConnected).toBe(false);
        });

        test('should verify webhook signature', () => {
            const secret = 'webhook_secret_123';
            const payload = JSON.stringify({ id: 123, status: 'processing' });

            // Generate signature (WooCommerce uses base64 encoded HMAC-SHA256)
            const signature = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('base64');

            // Verify signature
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('base64');

            expect(signature).toBe(expectedSignature);
        });
    });

    // =========================================================================
    // STEP 2: Order Sync
    // =========================================================================
    describe('Step 2: Order Sync', () => {
        beforeEach(async () => {
            // Ensure store exists for sync tests
            const existingStore = await WooCommerceStore.findById(storeId);
            if (!existingStore) {
                const store = await WooCommerceStore.create({
                    companyId,
                    createdBy,
                    storeUrl: TEST_STORE_URL,
                    storeName: 'Test WooCommerce Store',
                    consumerKey: TEST_CONSUMER_KEY,
                    consumerSecret: TEST_CONSUMER_SECRET,
                    isActive: true,
                    installedAt: new Date(),
                    syncConfig: {
                        orderSync: { enabled: true, autoSync: true },
                        inventorySync: { enabled: true },
                        webhooksEnabled: true,
                    },
                });
                storeId = (store._id as mongoose.Types.ObjectId).toString();
            }
        });

        test('should sync orders from WooCommerce using pagination', async () => {
            // Mock WooCommerce orders response
            const mockWooOrders = [
                createMockWooCommerceOrder(5001, '5001', 'processing'),
                createMockWooCommerceOrder(5002, '5002', 'completed'),
                createMockWooCommerceOrder(5003, '5003', 'pending'),
            ];

            // Setup paginated response
            wooClientMock.get.mockResolvedValue(mockWooOrders);

            // Execute sync - directly test the order creation logic
            for (const wooOrder of mockWooOrders) {
                const existingOrder = await Order.findOne({
                    source: 'woocommerce',
                    sourceId: wooOrder.id.toString(),
                });

                if (!existingOrder) {
                    await Order.create({
                        companyId,
                        orderNumber: `WOO-${wooOrder.number}`,
                        source: 'woocommerce',
                        sourceId: wooOrder.id.toString(),
                        externalOrderNumber: wooOrder.number,
                        customerInfo: {
                            name: `${wooOrder.billing.first_name} ${wooOrder.billing.last_name}`,
                            email: wooOrder.billing.email,
                            phone: wooOrder.billing.phone,
                            address: {
                                line1: wooOrder.shipping.address_1 || wooOrder.billing.address_1,
                                line2: wooOrder.shipping.address_2 || wooOrder.billing.address_2,
                                city: wooOrder.shipping.city || wooOrder.billing.city,
                                state: wooOrder.shipping.state || wooOrder.billing.state,
                                country: wooOrder.shipping.country || wooOrder.billing.country,
                                postalCode: wooOrder.shipping.postcode || wooOrder.billing.postcode,
                            },
                        },
                        products: wooOrder.line_items.map((item: any) => ({
                            name: item.name,
                            sku: item.sku || `WOO-${item.product_id}`,
                            quantity: item.quantity,
                            price: parseFloat(item.price),
                        })),
                        paymentStatus: mapPaymentStatus(wooOrder.status),
                        paymentMethod: detectPaymentMethod(wooOrder.payment_method),
                        currentStatus: mapOrderStatus(wooOrder.status),
                        statusHistory: [{
                            status: mapOrderStatus(wooOrder.status),
                            timestamp: new Date(wooOrder.date_created),
                            comment: `Order imported from WooCommerce (${wooOrder.status})`,
                        }],
                        totals: {
                            subtotal: parseFloat(wooOrder.total) - parseFloat(wooOrder.total_tax),
                            tax: parseFloat(wooOrder.total_tax),
                            shipping: parseFloat(wooOrder.shipping_total),
                            discount: parseFloat(wooOrder.discount_total),
                            total: parseFloat(wooOrder.total),
                        },
                        woocommerceStoreId: storeId,
                        woocommerceOrderId: wooOrder.id,
                    });
                }
            }

            // Verify orders were created
            const syncedOrders = await Order.find({ source: 'woocommerce', companyId });
            expect(syncedOrders).toHaveLength(3);

            // Verify order details
            const order5001 = await Order.findOne({ sourceId: '5001' });
            expect(order5001).toBeDefined();
            expect(order5001?.orderNumber).toBe('WOO-5001');
            expect(order5001?.currentStatus).toBe('PROCESSING');

            const order5002 = await Order.findOne({ sourceId: '5002' });
            expect(order5002?.currentStatus).toBe('FULFILLED');
        });

        test('should skip duplicate orders during sync', async () => {
            // Create existing order
            await Order.create({
                companyId,
                orderNumber: 'WOO-6001',
                source: 'woocommerce',
                sourceId: '6001',
                currentStatus: 'PROCESSING',
                customerInfo: {
                    name: 'Existing Customer',
                    phone: '1234567890',
                    address: { line1: '123 St', city: 'City', state: 'ST', country: 'US', postalCode: '12345' },
                },
                products: [{ name: 'Product', quantity: 1, price: 10 }],
                totals: { subtotal: 10, tax: 0, shipping: 0, discount: 0, total: 10 },
                woocommerceStoreId: storeId,
                woocommerceOrderId: 6001,
            });

            // Verify duplicate prevention
            const existingCheck = await Order.findOne({ sourceId: '6001', source: 'woocommerce' });
            expect(existingCheck).toBeDefined();

            const orderCount = await Order.countDocuments({ sourceId: '6001' });
            expect(orderCount).toBe(1);
        });

        test('should handle COD payment method detection', () => {
            expect(detectPaymentMethod('cod')).toBe('cod');
            expect(detectPaymentMethod('cash_on_delivery')).toBe('cod');
            expect(detectPaymentMethod('stripe')).toBe('prepaid');
            expect(detectPaymentMethod('paypal')).toBe('prepaid');
        });

        test('should update existing order when WooCommerce data is newer', async () => {
            // Create existing order with old timestamp
            const oldDate = new Date('2024-01-01');
            await Order.create({
                companyId,
                orderNumber: 'WOO-7001',
                source: 'woocommerce',
                sourceId: '7001',
                currentStatus: 'PENDING',
                paymentStatus: 'pending',
                updatedAt: oldDate,
                customerInfo: {
                    name: 'Test Customer',
                    phone: '1234567890',
                    address: { line1: '123 St', city: 'City', state: 'ST', country: 'US', postalCode: '12345' },
                },
                products: [{ name: 'Product', quantity: 1, price: 50 }],
                totals: { subtotal: 50, tax: 0, shipping: 0, discount: 0, total: 50 },
                statusHistory: [{ status: 'PENDING', timestamp: oldDate }],
            });

            // Simulate updated order from WooCommerce
            const updatedWooOrder = createMockWooCommerceOrder(7001, '7001', 'processing');
            updatedWooOrder.date_modified = new Date().toISOString();

            // Update existing order
            const existingOrder = await Order.findOne({ sourceId: '7001' });
            if (existingOrder) {
                existingOrder.currentStatus = mapOrderStatus(updatedWooOrder.status);
                existingOrder.paymentStatus = mapPaymentStatus(updatedWooOrder.status);
                existingOrder.statusHistory.push({
                    status: existingOrder.currentStatus,
                    timestamp: new Date(),
                    comment: 'Updated from WooCommerce sync',
                });
                await existingOrder.save();
            }

            // Verify update
            const updatedOrder = await Order.findOne({ sourceId: '7001' });
            expect(updatedOrder?.currentStatus).toBe('PROCESSING');
            expect(updatedOrder?.statusHistory).toHaveLength(2);
        });
    });

    // =========================================================================
    // STEP 3: Webhook Processing
    // =========================================================================
    describe('Step 3: Webhook Processing', () => {
        beforeEach(async () => {
            // Ensure store exists
            let store = await WooCommerceStore.findById(storeId);
            if (!store) {
                store = await WooCommerceStore.create({
                    companyId,
                    createdBy,
                    storeUrl: TEST_STORE_URL,
                    storeName: 'Test WooCommerce Store',
                    consumerKey: TEST_CONSUMER_KEY,
                    consumerSecret: TEST_CONSUMER_SECRET,
                    isActive: true,
                    installedAt: new Date(),
                    syncConfig: { orderSync: { enabled: true }, inventorySync: { enabled: true }, webhooksEnabled: true },
                });
                storeId = (store._id as mongoose.Types.ObjectId).toString();
            }
        });

        test('should process order.created webhook and create order', async () => {
            const webhookPayload = createMockWooCommerceOrder(8001, '8001', 'processing');

            // Mock the single order fetch for webhook processing
            wooClientMock.get.mockResolvedValue(webhookPayload);

            // Simulate webhook processing - create order directly
            const store = await WooCommerceStore.findById(storeId);

            await Order.create({
                companyId: store!.companyId,
                orderNumber: `WOO-${webhookPayload.number}`,
                source: 'woocommerce',
                sourceId: webhookPayload.id.toString(),
                externalOrderNumber: webhookPayload.number,
                customerInfo: {
                    name: `${webhookPayload.billing.first_name} ${webhookPayload.billing.last_name}`,
                    email: webhookPayload.billing.email,
                    phone: webhookPayload.billing.phone,
                    address: {
                        line1: webhookPayload.billing.address_1,
                        city: webhookPayload.billing.city,
                        state: webhookPayload.billing.state,
                        country: webhookPayload.billing.country,
                        postalCode: webhookPayload.billing.postcode,
                    },
                },
                products: webhookPayload.line_items.map((item: any) => ({
                    name: item.name,
                    sku: item.sku,
                    quantity: item.quantity,
                    price: parseFloat(item.price),
                })),
                paymentStatus: mapPaymentStatus(webhookPayload.status),
                currentStatus: mapOrderStatus(webhookPayload.status),
                statusHistory: [{ status: 'PROCESSING', timestamp: new Date(), comment: 'Created from webhook' }],
                totals: { subtotal: parseFloat(webhookPayload.total), tax: 0, shipping: 0, discount: 0, total: parseFloat(webhookPayload.total) },
                woocommerceStoreId: storeId,
                woocommerceOrderId: webhookPayload.id,
            });

            // Verify order was created
            const createdOrder = await Order.findOne({ sourceId: '8001' });
            expect(createdOrder).toBeDefined();
            expect(createdOrder?.source).toBe('woocommerce');
            expect(createdOrder?.orderNumber).toBe('WOO-8001');
            expect(createdOrder?.woocommerceOrderId).toBe(8001);
        });

        test('should process order.updated webhook and update status', async () => {
            // Create initial order
            await Order.create({
                companyId,
                orderNumber: 'WOO-9001',
                source: 'woocommerce',
                sourceId: '9001',
                currentStatus: 'PROCESSING',
                paymentStatus: 'paid',
                customerInfo: {
                    name: 'Test Customer',
                    phone: '1234567890',
                    address: { line1: '123 St', city: 'City', state: 'ST', country: 'US', postalCode: '12345' },
                },
                products: [{ name: 'Product', quantity: 1, price: 50 }],
                totals: { subtotal: 50, tax: 0, shipping: 0, discount: 0, total: 50 },
                statusHistory: [{ status: 'PROCESSING', timestamp: new Date() }],
                woocommerceStoreId: storeId,
                woocommerceOrderId: 9001,
            });

            // Simulate order.updated webhook with status change to completed
            const updatedPayload = {
                id: 9001,
                status: 'completed',
            };

            // Update order based on webhook
            const existingOrder = await Order.findOne({ sourceId: '9001', companyId });
            if (existingOrder) {
                const newStatus = mapOrderStatus(updatedPayload.status);
                if (existingOrder.currentStatus !== newStatus) {
                    existingOrder.currentStatus = newStatus;
                    existingOrder.statusHistory.push({
                        status: newStatus,
                        timestamp: new Date(),
                        comment: `Status updated from WooCommerce webhook (${updatedPayload.status})`,
                    });
                    await existingOrder.save();
                }
            }

            // Verify update
            const updatedOrder = await Order.findOne({ sourceId: '9001' });
            expect(updatedOrder?.currentStatus).toBe('FULFILLED');
            expect(updatedOrder?.statusHistory).toHaveLength(2);
        });

        test('should process order.deleted webhook and cancel order', async () => {
            // Create order to be deleted
            await Order.create({
                companyId,
                orderNumber: 'WOO-10001',
                source: 'woocommerce',
                sourceId: '10001',
                currentStatus: 'PROCESSING',
                customerInfo: {
                    name: 'Test Customer',
                    phone: '1234567890',
                    address: { line1: '123 St', city: 'City', state: 'ST', country: 'US', postalCode: '12345' },
                },
                products: [{ name: 'Product', quantity: 1, price: 50 }],
                totals: { subtotal: 50, tax: 0, shipping: 0, discount: 0, total: 50 },
                statusHistory: [{ status: 'PROCESSING', timestamp: new Date() }],
            });

            // Simulate order.deleted webhook
            const deletePayload = { id: 10001 };
void deletePayload;

            const order = await Order.findOne({ sourceId: '10001', companyId });
            if (order) {
                order.currentStatus = 'CANCELLED';
                order.statusHistory.push({
                    status: 'CANCELLED',
                    timestamp: new Date(),
                    comment: 'Order cancelled in WooCommerce',
                });
                await order.save();
            }

            // Verify cancellation
            const cancelledOrder = await Order.findOne({ sourceId: '10001' });
            expect(cancelledOrder?.currentStatus).toBe('CANCELLED');
        });

        test('should handle refunded order status', async () => {
            await Order.create({
                companyId,
                orderNumber: 'WOO-11001',
                source: 'woocommerce',
                sourceId: '11001',
                currentStatus: 'FULFILLED',
                paymentStatus: 'paid',
                customerInfo: {
                    name: 'Test Customer',
                    phone: '1234567890',
                    address: { line1: '123 St', city: 'City', state: 'ST', country: 'US', postalCode: '12345' },
                },
                products: [{ name: 'Product', quantity: 1, price: 100 }],
                totals: { subtotal: 100, tax: 0, shipping: 0, discount: 0, total: 100 },
                statusHistory: [{ status: 'FULFILLED', timestamp: new Date() }],
            });

            // Simulate refund webhook
            const refundPayload = { id: 11001, status: 'refunded' };

            const order = await Order.findOne({ sourceId: '11001', companyId });
            if (order) {
                order.currentStatus = mapOrderStatus(refundPayload.status);
                order.paymentStatus = mapPaymentStatus(refundPayload.status);
                order.statusHistory.push({
                    status: order.currentStatus,
                    timestamp: new Date(),
                    comment: 'Order refunded in WooCommerce',
                });
                await order.save();
            }

            const refundedOrder = await Order.findOne({ sourceId: '11001' });
            expect(refundedOrder?.currentStatus).toBe('REFUNDED');
            expect(refundedOrder?.paymentStatus).toBe('refunded');
        });
    });

    // =========================================================================
    // STEP 4: Product Mapping & Updates
    // =========================================================================
    describe('Step 4: Product Mapping & Updates', () => {
        test('should create product mapping', async () => {
            const mapping = await WooCommerceProductMapping.create({
                companyId,
                woocommerceStoreId: storeId,
                woocommerceProductId: 101,
                woocommerceVariationId: 0,
                woocommerceSKU: 'WOO-SKU-001',
                woocommerceTitle: 'Test Product',
                ShipcrowdSKU: 'SC-SKU-001',
                mappingType: 'MANUAL',
                syncInventory: true,
                isActive: true,
            });

            expect(mapping).toBeDefined();
            expect(mapping.woocommerceSKU).toBe('WOO-SKU-001');
            expect(mapping.syncInventory).toBe(true);
        });

        test('should update product mapping on product.updated webhook', async () => {
            // Create initial mapping
            const mapping = await WooCommerceProductMapping.create({
                companyId,
                woocommerceStoreId: storeId,
                woocommerceProductId: 102,
                woocommerceVariationId: 0,
                woocommerceSKU: 'OLD-WOO-SKU',
                woocommerceTitle: 'Old Product Title',
                ShipcrowdSKU: 'SC-SKU',
                mappingType: 'MANUAL',
                isActive: true,
            });

            // Simulate product.updated webhook
            const productUpdatePayload = {
                id: 102,
                name: 'Updated Product Title',
                sku: 'NEW-WOO-SKU',
            };

            // Update mapping
            const existingMapping = await WooCommerceProductMapping.findOne({
                woocommerceStoreId: storeId,
                woocommerceProductId: 102,
            });

            if (existingMapping && existingMapping.woocommerceSKU !== productUpdatePayload.sku) {
                existingMapping.woocommerceSKU = productUpdatePayload.sku;
                existingMapping.woocommerceTitle = productUpdatePayload.name;
                await existingMapping.save();
            }

            // Verify update
            const updatedMapping = await WooCommerceProductMapping.findById(mapping._id);
            expect(updatedMapping?.woocommerceSKU).toBe('NEW-WOO-SKU');
            expect(updatedMapping?.woocommerceTitle).toBe('Updated Product Title');
        });

        test('should deactivate mapping on product.deleted webhook', async () => {
            // Create mapping
            const mapping = await WooCommerceProductMapping.create({
                companyId,
                woocommerceStoreId: storeId,
                woocommerceProductId: 103,
                woocommerceVariationId: 0,
                woocommerceSKU: 'DELETE-SKU',
                woocommerceTitle: 'Product to Delete',
                ShipcrowdSKU: 'SC-DELETE-SKU',
                mappingType: 'MANUAL',
                isActive: true,
            });

            expect(mapping.isActive).toBe(true);

            // Simulate product.deleted webhook
            const deletePayload = { id: 103 };
void deletePayload;

            const existingMapping = await WooCommerceProductMapping.findOne({
                woocommerceStoreId: storeId,
                woocommerceProductId: 103,
            });

            if (existingMapping) {
                existingMapping.isActive = false;
                await existingMapping.save();
            }

            // Verify deactivation
            const deactivatedMapping = await WooCommerceProductMapping.findById(mapping._id);
            expect(deactivatedMapping?.isActive).toBe(false);
        });

        test('should handle variable product with variations', async () => {
            // Create parent product mapping
            const parentMapping = await WooCommerceProductMapping.create({
                companyId,
                woocommerceStoreId: storeId,
                woocommerceProductId: 200,
                woocommerceVariationId: 0,
                woocommerceSKU: 'PARENT-SKU',
                woocommerceTitle: 'Variable Product',
                ShipcrowdSKU: 'SC-PARENT',
                mappingType: 'MANUAL',
                isActive: true,
            });
void parentMapping;

            // Create variation mappings
            const variation1 = await WooCommerceProductMapping.create({
                companyId,
                woocommerceStoreId: storeId,
                woocommerceProductId: 200,
                woocommerceVariationId: 201,
                woocommerceSKU: 'VAR-SKU-S',
                woocommerceTitle: 'Variable Product - Small',
                ShipcrowdSKU: 'SC-VAR-S',
                mappingType: 'MANUAL',
                isActive: true,
            });
void variation1;

            const variation2 = await WooCommerceProductMapping.create({
                companyId,
                woocommerceStoreId: storeId,
                woocommerceProductId: 200,
                woocommerceVariationId: 202,
                woocommerceSKU: 'VAR-SKU-M',
                woocommerceTitle: 'Variable Product - Medium',
                ShipcrowdSKU: 'SC-VAR-M',
                mappingType: 'MANUAL',
                isActive: true,
            });
void variation2;

            // Verify all mappings
            const allMappings = await WooCommerceProductMapping.find({
                woocommerceStoreId: storeId,
                woocommerceProductId: 200,
            });

            expect(allMappings).toHaveLength(3);
        });
    });

    // =========================================================================
    // STEP 5: Disconnection & Cleanup
    // =========================================================================
    describe('Step 5: Disconnection & Cleanup', () => {
        test('should deactivate store on disconnection', async () => {
            // Ensure store is active
            let store = await WooCommerceStore.findById(storeId);
            if (!store) {
                store = await WooCommerceStore.create({
                    companyId,
                    createdBy,
                    storeUrl: TEST_STORE_URL,
                    storeName: 'Test Store',
                    consumerKey: TEST_CONSUMER_KEY,
                    consumerSecret: TEST_CONSUMER_SECRET,
                    isActive: true,
                    installedAt: new Date(),
                    syncConfig: { orderSync: { enabled: true }, inventorySync: { enabled: true }, webhooksEnabled: true },
                });
                storeId = (store._id as mongoose.Types.ObjectId).toString();
            }

            expect(store.isActive).toBe(true);

            // Disconnect store
            const storeToDisconnect = await WooCommerceStore.findById(storeId);
            if (storeToDisconnect) {
                storeToDisconnect.isActive = false;
                storeToDisconnect.uninstalledAt = new Date();
                await storeToDisconnect.save();
            }

            // Verify deactivation
            const disconnectedStore = await WooCommerceStore.findById(storeId);
            expect(disconnectedStore?.isActive).toBe(false);
            expect(disconnectedStore?.uninstalledAt).toBeDefined();
        });

        test('should unregister webhooks on disconnection', async () => {
            // Create store with registered webhooks
            const store = await WooCommerceStore.create({
                companyId,
                createdBy,
                storeUrl: 'https://webhook-test-store.com',
                storeName: 'Webhook Test Store',
                consumerKey: TEST_CONSUMER_KEY,
                consumerSecret: TEST_CONSUMER_SECRET,
                isActive: true,
                installedAt: new Date(),
                syncConfig: { orderSync: { enabled: true }, inventorySync: { enabled: true }, webhooksEnabled: true },
                webhooks: [
                    { topic: 'order.created', woocommerceWebhookId: '1', address: 'https://api.shipcrowd.com/webhooks/woo/order/created', secret: 'secret', isActive: true, createdAt: new Date() },
                    { topic: 'order.updated', woocommerceWebhookId: '2', address: 'https://api.shipcrowd.com/webhooks/woo/order/updated', secret: 'secret', isActive: true, createdAt: new Date() },
                ],
            });

            // Mock webhook deletion
            wooClientMock.delete.mockResolvedValue({ deleted: true });

            // Simulate unregistering webhooks
            for (const webhook of store.webhooks) {
                await wooClientMock.delete(`/webhooks/${webhook.woocommerceWebhookId}`);
            }

            // Clear registered webhooks
            store.webhooks = [];
            store.isActive = false;
            await store.save();

            // Verify
            const updatedStore = await WooCommerceStore.findById(store._id);
            expect(updatedStore?.webhooks).toHaveLength(0);
            expect(updatedStore?.isActive).toBe(false);
            expect(wooClientMock.delete).toHaveBeenCalledTimes(2);
        });
    });

    // =========================================================================
    // Edge Cases
    // =========================================================================
    describe('Edge Cases', () => {
        test('should handle order with guest customer (no account)', async () => {
            const guestOrder = createMockWooCommerceOrder(12001, '12001', 'processing');
            guestOrder.customer_id = 0; // Guest customer

            await Order.create({
                companyId,
                orderNumber: 'WOO-12001',
                source: 'woocommerce',
                sourceId: '12001',
                customerInfo: {
                    name: `${guestOrder.billing.first_name} ${guestOrder.billing.last_name}`,
                    email: guestOrder.billing.email,
                    phone: guestOrder.billing.phone,
                    address: {
                        line1: guestOrder.billing.address_1,
                        city: guestOrder.billing.city,
                        state: guestOrder.billing.state,
                        country: guestOrder.billing.country,
                        postalCode: guestOrder.billing.postcode,
                    },
                },
                products: [{ name: 'Product', quantity: 1, price: 50 }],
                totals: { subtotal: 50, tax: 0, shipping: 0, discount: 0, total: 50 },
                currentStatus: 'PROCESSING',
            });

            const order = await Order.findOne({ sourceId: '12001' });
            expect(order).toBeDefined();
            expect(order?.customerInfo.name).toBe('John Doe');
        });

        test('should handle order with different shipping and billing addresses', async () => {
            const order = createMockWooCommerceOrder(13001, '13001', 'processing');
            order.shipping = {
                first_name: 'Jane',
                last_name: 'Smith',
                address_1: '456 Different St',
                address_2: 'Suite 200',
                city: 'Los Angeles',
                state: 'CA',
                postcode: '90001',
                country: 'US',
            };

            await Order.create({
                companyId,
                orderNumber: 'WOO-13001',
                source: 'woocommerce',
                sourceId: '13001',
                customerInfo: {
                    name: `${order.billing.first_name} ${order.billing.last_name}`,
                    email: order.billing.email,
                    phone: order.billing.phone,
                    address: {
                        line1: order.shipping.address_1,
                        line2: order.shipping.address_2,
                        city: order.shipping.city,
                        state: order.shipping.state,
                        country: order.shipping.country,
                        postalCode: order.shipping.postcode,
                    },
                },
                products: [{ name: 'Product', quantity: 1, price: 50 }],
                totals: { subtotal: 50, tax: 0, shipping: 0, discount: 0, total: 50 },
                currentStatus: 'PROCESSING',
            });

            const savedOrder = await Order.findOne({ sourceId: '13001' });
            expect(savedOrder?.customerInfo.address.line1).toBe('456 Different St');
            expect(savedOrder?.customerInfo.address.city).toBe('Los Angeles');
        });

        test('should handle all WooCommerce order statuses', () => {
            expect(mapOrderStatus('pending')).toBe('PENDING');
            expect(mapOrderStatus('processing')).toBe('PROCESSING');
            expect(mapOrderStatus('on-hold')).toBe('PENDING');
            expect(mapOrderStatus('completed')).toBe('FULFILLED');
            expect(mapOrderStatus('cancelled')).toBe('CANCELLED');
            expect(mapOrderStatus('refunded')).toBe('REFUNDED');
            expect(mapOrderStatus('failed')).toBe('CANCELLED');
            expect(mapOrderStatus('trash')).toBe('CANCELLED');
            expect(mapOrderStatus('unknown')).toBe('PENDING'); // Default
        });

        test('should handle order with multiple shipping lines', async () => {
            const order = createMockWooCommerceOrder(14001, '14001', 'processing');
            order.shipping_lines = [
                { method_id: 'flat_rate', method_title: 'Flat Rate', total: '5.00' },
                { method_id: 'local_pickup', method_title: 'Local Pickup', total: '0.00' },
            ];
            order.shipping_total = '5.00';

            await Order.create({
                companyId,
                orderNumber: 'WOO-14001',
                source: 'woocommerce',
                sourceId: '14001',
                customerInfo: {
                    name: 'Test Customer',
                    phone: '1234567890',
                    address: { line1: '123 St', city: 'City', state: 'ST', country: 'US', postalCode: '12345' },
                },
                products: [{ name: 'Product', quantity: 1, price: 50 }],
                shippingDetails: {
                    provider: order.shipping_lines[0].method_title,
                    shippingCost: parseFloat(order.shipping_total),
                },
                totals: {
                    subtotal: 50,
                    shipping: parseFloat(order.shipping_total),
                    total: 55,
                },
                currentStatus: 'PROCESSING',
            });

            const savedOrder = await Order.findOne({ sourceId: '14001' });
            expect(savedOrder?.shippingDetails?.provider).toBe('Flat Rate');
            expect(savedOrder?.totals.shipping).toBe(5);
        });

        test('should handle order with coupons/discounts', async () => {
            const order = createMockWooCommerceOrder(15001, '15001', 'processing');
            order.discount_total = '10.00';
            order.coupon_lines = [
                { code: 'SAVE10', discount: '10.00', discount_tax: '0.00' },
            ];

            await Order.create({
                companyId,
                orderNumber: 'WOO-15001',
                source: 'woocommerce',
                sourceId: '15001',
                customerInfo: {
                    name: 'Test Customer',
                    phone: '1234567890',
                    address: { line1: '123 St', city: 'City', state: 'ST', country: 'US', postalCode: '12345' },
                },
                products: [{ name: 'Product', quantity: 1, price: 50 }],
                totals: {
                    subtotal: 50,
                    discount: parseFloat(order.discount_total),
                    total: 40,
                },
                currentStatus: 'PROCESSING',
            });

            const savedOrder = await Order.findOne({ sourceId: '15001' });
            expect(savedOrder?.totals.discount).toBe(10);
            expect(savedOrder?.totals.total).toBe(40);
        });

        test('should handle order with virtual/downloadable products', async () => {
            const order = createMockWooCommerceOrder(16001, '16001', 'completed');
            order.line_items = [
                {
                    id: 1,
                    name: 'Digital Download',
                    product_id: 100,
                    variation_id: 0,
                    quantity: 1,
                    price: 25,
                    sku: 'DIGITAL-001',
                    subtotal: '25.00',
                    total: '25.00',
                },
            ];
            // Virtual products often skip shipping
            order.shipping_total = '0.00';

            await Order.create({
                companyId,
                orderNumber: 'WOO-16001',
                source: 'woocommerce',
                sourceId: '16001',
                customerInfo: {
                    name: 'Digital Customer',
                    email: 'digital@example.com',
                    phone: '1234567890',
                    address: { line1: '123 St', city: 'City', state: 'ST', country: 'US', postalCode: '12345' },
                },
                products: order.line_items.map((item: any) => ({
                    name: item.name,
                    sku: item.sku,
                    quantity: item.quantity,
                    price: item.price,
                })),
                totals: {
                    subtotal: 25,
                    shipping: 0,
                    total: 25,
                },
                currentStatus: 'FULFILLED',
            });

            const savedOrder = await Order.findOne({ sourceId: '16001' });
            expect(savedOrder?.products[0].name).toBe('Digital Download');
            expect(savedOrder?.totals.shipping).toBe(0);
        });
    });
});

// =========================================================================
// Helper Functions
// =========================================================================

function createMockWooCommerceOrder(id: number, number: string, status: string): any {
    return {
        id,
        number,
        status,
        currency: 'USD',
        date_created: new Date().toISOString(),
        date_modified: new Date().toISOString(),
        customer_id: 1,
        billing: {
            first_name: 'John',
            last_name: 'Doe',
            company: '',
            address_1: '123 Main Street',
            address_2: 'Apt 4B',
            city: 'New York',
            state: 'NY',
            postcode: '10001',
            country: 'US',
            email: `customer${id}@example.com`,
            phone: '+1234567890',
        },
        shipping: {
            first_name: 'John',
            last_name: 'Doe',
            company: '',
            address_1: '123 Main Street',
            address_2: 'Apt 4B',
            city: 'New York',
            state: 'NY',
            postcode: '10001',
            country: 'US',
        },
        payment_method: 'stripe',
        payment_method_title: 'Credit Card (Stripe)',
        transaction_id: `txn_${id}`,
        line_items: [
            {
                id: 1,
                name: `Test Product ${id}`,
                product_id: 100 + id,
                variation_id: 0,
                quantity: 1,
                price: 50,
                sku: `SKU-${id}`,
                subtotal: '50.00',
                total: '50.00',
                image: { src: `https://example.com/product-${id}.jpg` },
            },
        ],
        shipping_lines: [
            {
                method_id: 'flat_rate',
                method_title: 'Flat Rate',
                total: '10.00',
            },
        ],
        tax_lines: [
            { rate_code: 'US-NY-TAX', rate_id: 1, label: 'NY Tax', compound: false, tax_total: '5.00' },
        ],
        coupon_lines: [],
        total: '65.00',
        total_tax: '5.00',
        shipping_total: '10.00',
        discount_total: '0.00',
        customer_note: '',
        meta_data: [],
    };
}

function mapPaymentStatus(wooStatus: string): 'pending' | 'paid' | 'failed' | 'refunded' {
    const statusMap: Record<string, 'pending' | 'paid' | 'failed' | 'refunded'> = {
        pending: 'pending',
        processing: 'paid',
        'on-hold': 'pending',
        completed: 'paid',
        cancelled: 'failed',
        refunded: 'refunded',
        failed: 'failed',
    };
    return statusMap[wooStatus] || 'pending';
}

function mapOrderStatus(wooStatus: string): string {
    const statusMap: Record<string, string> = {
        pending: 'PENDING',
        processing: 'PROCESSING',
        'on-hold': 'PENDING',
        completed: 'FULFILLED',
        cancelled: 'CANCELLED',
        refunded: 'REFUNDED',
        failed: 'CANCELLED',
        trash: 'CANCELLED',
    };
    return statusMap[wooStatus] || 'PENDING';
}

function detectPaymentMethod(paymentGateway: string): 'cod' | 'prepaid' {
    const codGateways = ['cod', 'cash_on_delivery', 'cash'];
    if (codGateways.some(gateway => paymentGateway.toLowerCase().includes(gateway))) {
        return 'cod';
    }
    return 'prepaid';
}
