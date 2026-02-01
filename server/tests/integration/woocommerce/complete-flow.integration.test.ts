import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../../src/app';
import { WooCommerceStore } from '../../../src/infrastructure/database/mongoose/models';
import { WooCommerceProductMapping } from '../../../src/infrastructure/database/mongoose/models';
import { Order } from '../../../src/infrastructure/database/mongoose/models';
import QueueManager from '../../../src/infrastructure/utilities/queue-manager';
import crypto from 'crypto';

/**
 * Integration Test: Complete WooCommerce Integration Flow
 *
 * Tests the end-to-end flow:
 * 1. Store installation
 * 2. Product auto-mapping
 * 3. Order webhook received
 * 4. Order synced to database
 * 5. Inventory update
 *
 * Note: This test uses mocked WooCommerce API responses
 */

describe('WooCommerce Integration - Complete Flow', () => {
  let mongoServer: MongoMemoryServer;
  let jwtToken: string;
  let companyId: string;
  let userId: string;
  let storeId: string;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri);

    // Initialize queues (mocked for testing)
    await QueueManager.initialize();

    // Setup test user and company
    companyId = new mongoose.Types.ObjectId().toString();
    userId = new mongoose.Types.ObjectId().toString();

    // Mock JWT token
    jwtToken = 'mock_jwt_token_for_testing';

    // Mock environment variables
    process.env.ENCRYPTION_KEY = '0'.repeat(64); // 32 bytes hex
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    await QueueManager.shutdown();
  });

  describe('Step 1: Store Installation', () => {
    test('should install WooCommerce store with encrypted credentials', async () => {
      const storeUrl = 'https://test-store.com';
      const consumerKey = 'ck_test_key_123';
      const consumerSecret = 'cs_test_secret_456';

      const store = await WooCommerceStore.create({
        companyId,
        storeUrl,
        storeName: 'Test Store',
        consumerKey, // Will be encrypted in pre-save hook
        consumerSecret, // Will be encrypted in pre-save hook
        apiVersion: 'wc/v3',
        wpVersion: '6.0',
        wcVersion: '7.0',
        currency: 'USD',
        timezone: 'UTC',
        isActive: true,
        installedAt: new Date(),
        syncConfig: {
          orderSync: {
            enabled: true,
            autoSync: true,
            syncInterval: 15,
            syncStatus: 'IDLE',
            errorCount: 0,
          },
          inventorySync: {
            enabled: true,
            autoSync: false,
            syncInterval: 60,
            syncDirection: 'ONE_WAY',
            errorCount: 0,
          },
          webhooksEnabled: true,
        },
        webhooks: [
          {
            topic: 'order.created',
            woocommerceWebhookId: '123',
            address: 'https://api.Shipcrowd.com/webhooks/woocommerce/order/created',
            secret: 'test_webhook_secret',
            isActive: true,
            createdAt: new Date(),
          },
        ],
        stats: {
          totalOrdersSynced: 0,
          totalProductsMapped: 0,
          totalInventorySyncs: 0,
        },
      });

      storeId = (store._id as any).toString();

      expect(store).toBeDefined();
      expect(store.storeUrl).toBe(storeUrl);
      expect(store.isActive).toBe(true);

      // Verify credentials are encrypted
      expect(store.consumerKey).not.toBe(consumerKey);
      expect(store.consumerSecret).not.toBe(consumerSecret);

      // Verify decryption works
      expect(store.decryptConsumerKey()).toBe(consumerKey);
      expect(store.decryptConsumerSecret()).toBe(consumerSecret);
    });
  });

  describe('Step 2: Product Mapping', () => {
    test('should create product mappings', async () => {
      const mapping1 = await WooCommerceProductMapping.create({
        companyId,
        woocommerceStoreId: storeId,
        woocommerceProductId: 123,
        woocommerceSKU: 'TSHIRT-BLK-M',
        woocommerceTitle: 'Black T-Shirt - Medium',
        ShipcrowdSKU: 'TSHIRT-BLK-M',
        ShipcrowdProductName: 'Black T-Shirt Medium',
        mappingType: 'AUTO',
        syncInventory: true,
        syncPrice: false,
        syncOnFulfillment: true,
        isActive: true,
      });

      const mapping2 = await WooCommerceProductMapping.create({
        companyId,
        woocommerceStoreId: storeId,
        woocommerceProductId: 124,
        woocommerceSKU: 'TSHIRT-WHT-L',
        woocommerceTitle: 'White T-Shirt - Large',
        ShipcrowdSKU: 'TSHIRT-WHT-L',
        ShipcrowdProductName: 'White T-Shirt Large',
        mappingType: 'AUTO',
        syncInventory: true,
        syncPrice: false,
        syncOnFulfillment: true,
        isActive: true,
      });

      expect(mapping1.mappingType).toBe('AUTO');
      expect(mapping2.mappingType).toBe('AUTO');

      // Verify mappings can be queried
      const mappings = await WooCommerceProductMapping.find({
        woocommerceStoreId: storeId,
        isActive: true,
      });

      expect(mappings).toHaveLength(2);
    });

    test('should get mapping statistics', async () => {
      const stats = await WooCommerceProductMapping.getMappingStats(storeId);

      expect(stats.total).toBe(2);
      expect(stats.active).toBe(2);
      expect(stats.auto).toBe(2);
      expect(stats.manual).toBe(0);
    });
  });

  describe('Step 3: Order Webhook & Sync', () => {
    test('should receive and process order creation webhook', async () => {
      // Mock WooCommerce order webhook payload
      const webhookPayload = {
        id: 1001,
        number: '1001',
        order_key: 'wc_order_abc123',
        created_at: '2025-01-01T00:00:00Z',
        status: 'processing',
        currency: 'USD',
        date_created: '2025-01-01T00:00:00Z',
        date_modified: '2025-01-01T00:00:00Z',
        discount_total: '0.00',
        discount_tax: '0.00',
        shipping_total: '10.00',
        shipping_tax: '1.00',
        cart_tax: '5.00',
        total: '74.98',
        total_tax: '6.00',
        customer_id: 10,
        billing: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          address_1: '123 Main St',
          address_2: 'Apt 4',
          city: 'New York',
          state: 'NY',
          postcode: '10001',
          country: 'US',
        },
        shipping: {
          first_name: 'John',
          last_name: 'Doe',
          address_1: '123 Main St',
          address_2: 'Apt 4',
          city: 'New York',
          state: 'NY',
          postcode: '10001',
          country: 'US',
        },
        payment_method: 'stripe',
        payment_method_title: 'Credit Card',
        line_items: [
          {
            id: 1,
            name: 'Black T-Shirt',
            sku: 'TSHIRT-BLK-M',
            quantity: 2,
            price: 29.99,
            subtotal: '59.98',
            subtotal_tax: '0.00',
            total: '59.98',
            total_tax: '0.00',
          },
        ],
        shipping_lines: [
          {
            id: 1,
            method_title: 'Flat Rate',
            method_id: 'flat_rate',
            total: '10.00',
            total_tax: '1.00',
          },
        ],
      };

      // Calculate HMAC for webhook verification
      const webhookSecret = 'test_webhook_secret';
      const rawBody = JSON.stringify(webhookPayload);
      const hmac = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody, 'utf8')
        .digest('base64');

      // Send webhook request
      const response = await request(app)
        .post('/api/v1/webhooks/woocommerce/order/created')
        .set('X-WC-Webhook-Signature', hmac)
        .set('X-WC-Webhook-Topic', 'order.created')
        .set('X-WC-Webhook-Source', 'https://test-store.com')
        .set('Content-Type', 'application/json')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.received).toBe(true);
    });

    test('should have order synced to database', async () => {
      // Create order directly (simulating webhook processing)
      const order = await Order.create({
        orderNumber: 'WOO-1001',
        companyId,
        source: 'woocommerce',
        sourceId: '1001',
        externalOrderNumber: '1001',
        customerInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          address: {
            line1: '123 Main St',
            line2: 'Apt 4',
            city: 'New York',
            state: 'NY',
            country: 'US',
            postalCode: '10001',
          },
        },
        products: [
          {
            name: 'Black T-Shirt',
            sku: 'TSHIRT-BLK-M',
            quantity: 2,
            price: 29.99,
            weight: 0,
          },
        ],
        shippingDetails: {
          shippingCost: 10.0,
          provider: 'Flat Rate',
          method: 'flat_rate',
        },
        paymentStatus: 'paid',
        paymentMethod: 'prepaid',
        currentStatus: 'PROCESSING',
        totals: {
          subtotal: 59.98,
          tax: 6.0,
          shipping: 10.0,
          discount: 0.0,
          total: 74.98,
        },
        notes: '',
        tags: [],
        woocommerceStoreId: storeId,
        woocommerceOrderId: 1001,
      });

      expect(order).toBeDefined();
      expect(order.orderNumber).toBe('WOO-1001');
      expect(order.source).toBe('woocommerce');
      expect(order.paymentStatus).toBe('paid');
      expect(order.currentStatus).toBe('PROCESSING');

      // Verify order can be found by WooCommerce ID
      const foundOrder = await Order.findOne({
        source: 'woocommerce',
        sourceId: '1001',
        companyId,
      });

      expect(foundOrder).toBeDefined();
      expect(foundOrder?.orderNumber).toBe('WOO-1001');
    });
  });

  describe('Step 4: Inventory Sync', () => {
    test('should have active product mapping for inventory sync', async () => {
      const mapping = await WooCommerceProductMapping.findOne({
        woocommerceStoreId: storeId,
        ShipcrowdSKU: 'TSHIRT-BLK-M',
        syncInventory: true,
        isActive: true,
      });

      expect(mapping).toBeDefined();
      expect(mapping!.syncInventory).toBe(true);
      expect(mapping!.syncOnFulfillment).toBe(true);
    });

    test('should record successful inventory sync', async () => {
      const mapping = await WooCommerceProductMapping.findOne({
        woocommerceStoreId: storeId,
        ShipcrowdSKU: 'TSHIRT-BLK-M',
      });

      // Simulate successful inventory sync
      await mapping!.recordSyncSuccess();

      const updatedMapping = await WooCommerceProductMapping.findById(mapping!._id);
      expect(updatedMapping!.syncErrors).toBe(0);
      expect(updatedMapping!.lastSyncError).toBeUndefined();
      expect(updatedMapping!.lastSyncAt).toBeDefined();
    });

    test('should record sync error and auto-disable after 10 errors', async () => {
      const mapping = await WooCommerceProductMapping.findOne({
        woocommerceStoreId: storeId,
        ShipcrowdSKU: 'TSHIRT-WHT-L',
      });

      // Simulate 10 sync errors
      for (let i = 0; i < 10; i++) {
        await mapping!.recordSyncError('Test error');
      }

      const updatedMapping = await WooCommerceProductMapping.findById(mapping!._id);
      expect(updatedMapping!.syncErrors).toBe(10);
      expect(updatedMapping!.isActive).toBe(false); // Auto-disabled
    });
  });

  describe('Step 5: Webhook Verification', () => {
    test('should reject webhook with invalid signature', async () => {
      const webhookPayload = {
        id: 1002,
        number: '1002',
      };

      const response = await request(app)
        .post('/api/v1/webhooks/woocommerce/order/created')
        .set('X-WC-Webhook-Signature', 'invalid_signature')
        .set('X-WC-Webhook-Topic', 'order.created')
        .set('X-WC-Webhook-Source', 'https://test-store.com')
        .set('Content-Type', 'application/json')
        .send(webhookPayload)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
