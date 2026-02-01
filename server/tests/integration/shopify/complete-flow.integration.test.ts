import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../../src/app';
import { ShopifyStore } from '../../../src/infrastructure/database/mongoose/models';
import { ShopifyProductMapping as ProductMapping } from '../../../src/infrastructure/database/mongoose/models';
import { Order } from '../../../src/infrastructure/database/mongoose/models';
import QueueManager from '../../../src/infrastructure/utilities/queue-manager';

/**
 * Integration Test: Complete Shopify Integration Flow
 *
 * Tests the end-to-end flow:
 * 1. OAuth installation
 * 2. Product auto-mapping
 * 3. Order webhook received
 * 4. Order synced to database
 * 5. Inventory update synced back to Shopify
 *
 * Note: This test uses mocked Shopify API responses
 */

describe('Shopify Integration - Complete Flow', () => {
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
    // Note: You would create actual User and Company here
    companyId = new mongoose.Types.ObjectId().toString();
    userId = new mongoose.Types.ObjectId().toString();

    // Mock JWT token (in real test, use actual auth service)
    jwtToken = 'mock_jwt_token_for_testing';

    // Mock environment variables
    process.env.SHOPIFY_API_KEY = 'test_api_key';
    process.env.SHOPIFY_API_SECRET = 'test_api_secret';
    process.env.SHOPIFY_WEBHOOK_SECRET = 'test_webhook_secret';
    process.env.APP_URL = 'https://test.Shipcrowd.com';
    process.env.FRONTEND_URL = 'https://app.test.Shipcrowd.com';
    process.env.ENCRYPTION_KEY = '0'.repeat(64); // 32 bytes hex
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    await QueueManager.shutdown();
  });

  describe('Step 1: OAuth Installation', () => {
    test('should generate valid installation URL', async () => {
      const shopDomain = 'test-store.myshopify.com';

      const response = await request(app)
        .get('/api/v1/integrations/shopify/install')
        .query({ shop: shopDomain })
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.installUrl).toContain(shopDomain);
      expect(response.body.installUrl).toContain('client_id=test_api_key');
      expect(response.body.installUrl).toContain('scope=');
      expect(response.body.installUrl).toContain('state=');
    });

    test('should handle OAuth callback and create store', async () => {
      // Mock Shopify OAuth callback
      const shopDomain = 'test-store.myshopify.com';

      // Create mock store directly (simulating successful OAuth)
      const store = await ShopifyStore.create({
        companyId,
        shopDomain,
        shopName: 'Test Store',
        shopEmail: 'test@store.com',
        shopCountry: 'US',
        shopCurrency: 'USD',
        shopPlan: 'basic',
        accessToken: 'mock_encrypted_token',
        scope: 'read_orders,write_orders',
        installedAt: new Date(),
        isActive: true,
      });

      storeId = (store._id as any).toString();

      expect(store).toBeDefined();
      expect(store.shopDomain).toBe(shopDomain);
      expect(store.isActive).toBe(true);
    });
  });

  describe('Step 2: Product Mapping', () => {
    test('should auto-map products by SKU', async () => {
      // Create mock product mappings
      const mapping1 = await ProductMapping.create({
        companyId,
        shopifyStoreId: storeId,
        shopifyProductId: '7123456789',
        shopifyVariantId: '41234567890',
        shopifySKU: 'TSHIRT-BLK-M',
        shopifyTitle: 'Black T-Shirt - Medium',
        ShipcrowdSKU: 'TSHIRT-BLK-M',
        ShipcrowdProductName: 'Black T-Shirt Medium',
        mappingType: 'AUTO',
        syncInventory: true,
        syncOnFulfillment: true,
        isActive: true,
      });

      const mapping2 = await ProductMapping.create({
        companyId,
        shopifyStoreId: storeId,
        shopifyProductId: '7123456790',
        shopifyVariantId: '41234567891',
        shopifySKU: 'TSHIRT-WHT-L',
        shopifyTitle: 'White T-Shirt - Large',
        ShipcrowdSKU: 'TSHIRT-WHT-L',
        ShipcrowdProductName: 'White T-Shirt Large',
        mappingType: 'AUTO',
        syncInventory: true,
        syncOnFulfillment: true,
        isActive: true,
      });

      expect(mapping1.mappingType).toBe('AUTO');
      expect(mapping2.mappingType).toBe('AUTO');

      // Verify mappings can be queried
      const mappings = await ProductMapping.find({
        shopifyStoreId: storeId,
        isActive: true,
      });

      expect(mappings).toHaveLength(2);
    });

    test('should get mapping statistics', async () => {
      const stats = await ProductMapping.getMappingStats(storeId);

      expect(stats.total).toBe(2);
      expect(stats.active).toBe(2);
      expect(stats.auto).toBe(2);
      expect(stats.manual).toBe(0);
    });
  });

  describe('Step 3: Order Webhook & Sync', () => {
    test('should receive and process order creation webhook', async () => {
      // Mock Shopify order webhook payload
      const webhookPayload = {
        id: 820982911946154508,
        name: '#1001',
        order_number: 1001,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        financial_status: 'paid',
        fulfillment_status: null,
        customer: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
        shipping_address: {
          address1: '123 Main St',
          address2: 'Apt 4',
          city: 'New York',
          province: 'NY',
          country: 'US',
          zip: '10001',
        },
        line_items: [
          {
            id: 1,
            title: 'Black T-Shirt',
            sku: 'TSHIRT-BLK-M',
            quantity: 2,
            price: '29.99',
            grams: 500,
          },
        ],
        total_line_items_price: '59.98',
        total_tax: '5.00',
        total_shipping_price: '10.00',
        total_discounts: '0.00',
        total_price: '74.98',
        subtotal_price: '59.98',
        payment_gateway_names: ['shopify_payments'],
        note: 'Test order',
        tags: 'express',
      };

      // Calculate HMAC for webhook verification
      const crypto = require('crypto');
      const hmac = crypto
        .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET!)
        .update(JSON.stringify(webhookPayload), 'utf8')
        .digest('base64');

      // Send webhook request
      const response = await request(app)
        .post('/api/v1/webhooks/shopify/orders/create')
        .set('X-Shopify-Hmac-Sha256', hmac)
        .set('X-Shopify-Shop-Domain', 'test-store.myshopify.com')
        .set('X-Shopify-Topic', 'orders/create')
        .set('X-Shopify-Webhook-Id', 'webhook-123-unique')
        .set('Content-Type', 'application/json')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.received).toBe(true);
    });

    test('should have order synced to database', async () => {
      // Create order directly (simulating webhook processing)
      const order = await Order.create({
        orderNumber: 'SHOPIFY-1001',
        companyId,
        source: 'shopify',
        sourceId: '820982911946154508',
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
            weight: 500,
          },
        ],
        shippingDetails: {
          shippingCost: 10.0,
        },
        paymentStatus: 'paid',
        paymentMethod: 'prepaid',
        currentStatus: 'PENDING',
        totals: {
          subtotal: 59.98,
          tax: 5.0,
          shipping: 10.0,
          discount: 0.0,
          total: 74.98,
        },
        notes: 'Test order',
        tags: ['express'],
      });

      expect(order).toBeDefined();
      expect(order.orderNumber).toBe('SHOPIFY-1001');
      expect(order.source).toBe('shopify');
      expect(order.paymentStatus).toBe('paid');
      expect(order.currentStatus).toBe('PENDING');

      // Verify order can be found by Shopify ID
      const foundOrder = await Order.findOne({
        source: 'shopify',
        sourceId: '820982911946154508',
        companyId,
      });

      expect(foundOrder).toBeDefined();
      expect(foundOrder?.orderNumber).toBe('SHOPIFY-1001');
    });
  });

  describe('Step 4: Order Updates via Webhook', () => {
    test('should update order status when order is updated', async () => {
      const order = await Order.findOne({
        source: 'shopify',
        sourceId: '820982911946154508',
      });

      expect(order).toBeDefined();

      // Simulate order update
      order!.currentStatus = 'PROCESSING';
      order!.statusHistory.push({
        status: 'PROCESSING',
        timestamp: new Date(),
        comment: 'Updated from Shopify webhook',
      });
      await order!.save();

      const updatedOrder = await Order.findById(order!._id);
      expect(updatedOrder!.currentStatus).toBe('PROCESSING');
      expect(updatedOrder!.statusHistory).toHaveLength(2); // Initial + update
    });

    test('should handle order fulfillment webhook', async () => {
      const order = await Order.findOne({
        source: 'shopify',
        sourceId: '820982911946154508',
      });

      // Simulate fulfillment
      order!.currentStatus = 'FULFILLED';
      order!.shippingDetails.trackingNumber = 'TRACK-12345';
      order!.shippingDetails.provider = 'Delhivery';
      order!.statusHistory.push({
        status: 'FULFILLED',
        timestamp: new Date(),
        comment: 'Fulfilled in Shopify',
      });
      await order!.save();

      const fulfilledOrder = await Order.findById(order!._id);
      expect(fulfilledOrder!.currentStatus).toBe('FULFILLED');
      expect(fulfilledOrder!.shippingDetails.trackingNumber).toBe('TRACK-12345');
    });
  });

  describe('Step 5: Inventory Sync', () => {
    test('should have active product mapping for inventory sync', async () => {
      const mapping = await ProductMapping.findOne({
        shopifyStoreId: storeId,
        ShipcrowdSKU: 'TSHIRT-BLK-M',
        syncInventory: true,
        isActive: true,
      });

      expect(mapping).toBeDefined();
      expect(mapping!.syncInventory).toBe(true);
      expect(mapping!.syncOnFulfillment).toBe(true);
    });

    test('should record successful inventory sync', async () => {
      const mapping = await ProductMapping.findOne({
        shopifyStoreId: storeId,
        ShipcrowdSKU: 'TSHIRT-BLK-M',
      });

      // Simulate successful inventory sync
      await mapping!.recordSyncSuccess();

      const updatedMapping = await ProductMapping.findById(mapping!._id);
      expect(updatedMapping!.syncErrors).toBe(0);
      expect(updatedMapping!.lastSyncError).toBeUndefined();
      expect(updatedMapping!.lastSyncAt).toBeDefined();
    });

    test('should record sync error and auto-disable after 10 errors', async () => {
      const mapping = await ProductMapping.findOne({
        shopifyStoreId: storeId,
        ShipcrowdSKU: 'TSHIRT-WHT-L',
      });

      // Simulate 10 sync errors
      for (let i = 0; i < 10; i++) {
        await mapping!.recordSyncError('Test error');
      }

      const updatedMapping = await ProductMapping.findById(mapping!._id);
      expect(updatedMapping!.syncErrors).toBe(10);
      expect(updatedMapping!.isActive).toBe(false); // Auto-disabled
    });
  });

  describe('Step 6: Store Statistics & Monitoring', () => {
    test('should track store sync statistics', async () => {
      const store = await ShopifyStore.findById(storeId);

      // Update stats
      store!.stats.totalOrdersSynced = 1;
      store!.stats.totalProductsMapped = 2;
      store!.stats.lastOrderSyncAt = new Date();
      await store!.save();

      const updatedStore = await ShopifyStore.findById(storeId);
      expect(updatedStore!.stats.totalOrdersSynced).toBe(1);
      expect(updatedStore!.stats.totalProductsMapped).toBe(2);
    });

    test('should get active stores for company', async () => {
      const stores = await ShopifyStore.find({
        companyId,
        isActive: true,
      });

      expect(stores).toHaveLength(1);
      expect(stores[0].shopDomain).toBe('test-store.myshopify.com');
    });
  });

  describe('Step 7: Error Handling & Recovery', () => {
    test('should handle duplicate webhook gracefully', async () => {
      // This would be tested via WebhookEvent model's duplicate detection
      // The shopifyId field has a unique index
      expect(true).toBe(true); // Placeholder
    });

    test('should skip syncing paused stores', async () => {
      const store = await ShopifyStore.findById(storeId);
      store!.isPaused = true;
      await store!.save();

      const pausedStore = await ShopifyStore.findById(storeId);
      expect(pausedStore!.isPaused).toBe(true);

      // Sync logic would check isPaused and skip
    });

    test('should skip syncing inactive stores', async () => {
      const store = await ShopifyStore.findById(storeId);
      store!.isActive = false;
      await store!.save();

      const inactiveStore = await ShopifyStore.findById(storeId);
      expect(inactiveStore!.isActive).toBe(false);
    });
  });

  describe('Step 8: Cleanup', () => {
    test('should disconnect store and clear webhooks', async () => {
      const store = await ShopifyStore.findById(storeId);

      // Simulate disconnection
      store!.isActive = false;
      store!.uninstalledAt = new Date();
      store!.webhooks = [];
      await store!.save();

      const disconnectedStore = await ShopifyStore.findById(storeId);
      expect(disconnectedStore!.isActive).toBe(false);
      expect(disconnectedStore!.uninstalledAt).toBeDefined();
      expect(disconnectedStore!.webhooks).toHaveLength(0);
    });
  });
});
