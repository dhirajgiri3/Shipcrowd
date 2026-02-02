import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import ShopifyOrderSyncService from '../../../../src/core/application/services/shopify/shopify-order-sync.service';
import { ShopifyStore, SyncLog, Order } from '../../../../src/infrastructure/database/mongoose/models';
import ShopifyClient from '../../../../src/infrastructure/external/ecommerce/shopify/shopify.client';

// Mock dependencies
jest.mock('../../../../src/infrastructure/database/mongoose/models/marketplaces/shopify/shopify-store.model');
jest.mock('../../../../src/infrastructure/database/mongoose/models/marketplaces/sync-log.model');
jest.mock('../../../../src/infrastructure/database/mongoose/models/orders/core/order.model');
jest.mock('../../../../src/infrastructure/external/ecommerce/shopify/shopify.client');

describe('ShopifyOrderSyncService', () => {
  const mockStoreId = '507f1f77bcf86cd799439011';
  const mockCompanyId = '507f1f77bcf86cd799439012';
  const mockShopDomain = 'test-store.myshopify.com';
  const mockAccessToken = 'shpat_test_token';

  const mockShopifyOrder = {
    id: 123456789,
    name: '#1001',
    order_number: 1001,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T12:00:00Z',
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
        title: 'Test Product',
        sku: 'TEST-SKU-001',
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
    note: 'Test order note',
    tags: 'priority, express',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('syncOrders', () => {
    test('should sync orders successfully', async () => {
      const mockStore = {
        _id: mockStoreId,
        shopDomain: mockShopDomain,
        companyId: mockCompanyId,
        isActive: true,
        isPaused: false,
        decryptAccessToken: jest.fn<any>().mockReturnValue(mockAccessToken),
        updateSyncStatus: jest.fn<any>().mockResolvedValue(true),
        incrementSyncStats: jest.fn<any>().mockResolvedValue(true),
      };

      (ShopifyStore.findById as any) = jest.fn().mockReturnValue({
        select: jest.fn<any>().mockResolvedValue(mockStore),
      });

      const mockSyncLog = {
        _id: 'sync-log-123',
        completeSyncWithErrors: jest.fn<any>().mockResolvedValue(true),
      };

      (SyncLog.create as any) = jest.fn<any>().mockResolvedValue(mockSyncLog);

      const mockClient = {
        get: jest.fn<any>().mockResolvedValue({
          orders: [mockShopifyOrder],
        }),
      };

      (ShopifyClient as any).mockImplementation(() => mockClient);

      // Mock Order.findOne to return null (new order)
      (Order.findOne as any) = jest.fn<any>().mockResolvedValue(null);
      (Order.create as any) = jest.fn<any>().mockResolvedValue({
        _id: 'order-123',
        orderNumber: 'SHOPIFY-1001',
      });

      const result = await ShopifyOrderSyncService.syncOrders(mockStoreId);

      expect(result.itemsProcessed).toBe(1);
      expect(result.itemsSynced).toBe(1);
      expect(result.itemsFailed).toBe(0);
      expect(mockClient.get).toHaveBeenCalledWith('/orders.json', expect.any(Object));
      expect(Order.create).toHaveBeenCalled();
    });

    test('should skip sync if store is paused', async () => {
      const mockStore = {
        _id: mockStoreId,
        isActive: true,
        isPaused: true,
      };

      (ShopifyStore.findById as any) = jest.fn().mockReturnValue({
        select: jest.fn<any>().mockResolvedValue(mockStore),
      });

      const result = await ShopifyOrderSyncService.syncOrders(mockStoreId);

      expect(result.itemsProcessed).toBe(0);
      expect(result.itemsSynced).toBe(0);
    });

    test('should skip sync if store is not active', async () => {
      const mockStore = {
        _id: mockStoreId,
        isActive: false,
        isPaused: false,
      };

      (ShopifyStore.findById as any) = jest.fn().mockReturnValue({
        select: jest.fn<any>().mockResolvedValue(mockStore),
      });

      await expect(ShopifyOrderSyncService.syncOrders(mockStoreId)).rejects.toThrow(
        'Store is not active'
      );
    });

    test('should handle duplicate orders', async () => {
      const mockStore = {
        _id: mockStoreId,
        shopDomain: mockShopDomain,
        companyId: mockCompanyId,
        isActive: true,
        isPaused: false,
        decryptAccessToken: jest.fn().mockReturnValue(mockAccessToken),
        updateSyncStatus: jest.fn<any>().mockResolvedValue(true),
        incrementSyncStats: jest.fn<any>().mockResolvedValue(true),
      };

      (ShopifyStore.findById as any) = jest.fn().mockReturnValue({
        select: jest.fn<any>().mockResolvedValue(mockStore),
      });

      const mockSyncLog = {
        _id: 'sync-log-123',
        completeSyncWithErrors: jest.fn<any>().mockResolvedValue(true),
      };

      (SyncLog.create as any) = jest.fn<any>().mockResolvedValue(mockSyncLog);

      const mockClient = {
        get: jest.fn<any>().mockResolvedValue({
          orders: [mockShopifyOrder],
        }),
      };

      (ShopifyClient as any).mockImplementation(() => mockClient);

      // Mock existing order
      const mockExistingOrder = {
        _id: 'existing-order',
        currentStatus: 'DELIVERED',
        updatedAt: new Date(),
      };

      (Order.findOne as any) = jest.fn<any>().mockResolvedValue(mockExistingOrder);

      const result = await ShopifyOrderSyncService.syncOrders(mockStoreId);

      expect(result.itemsProcessed).toBe(1);
      expect(result.itemsSkipped).toBe(1);
      expect(result.itemsSynced).toBe(0);
    });
  });

  describe('Payment Status Mapping', () => {
    test('should map "paid" to paid status', async () => {
      const order = mockShopifyOrder;
      order.financial_status = 'paid';

      // Access private method through class instance
      const paymentStatus = (ShopifyOrderSyncService as any).mapPaymentStatus('paid');
      expect(paymentStatus).toBe('paid');
    });

    test('should map "pending" to pending status', async () => {
      const paymentStatus = (ShopifyOrderSyncService as any).mapPaymentStatus('pending');
      expect(paymentStatus).toBe('pending');
    });

    test('should map "refunded" to refunded status', async () => {
      const paymentStatus = (ShopifyOrderSyncService as any).mapPaymentStatus('refunded');
      expect(paymentStatus).toBe('refunded');
    });

    test('should map "voided" to failed status', async () => {
      const paymentStatus = (ShopifyOrderSyncService as any).mapPaymentStatus('voided');
      expect(paymentStatus).toBe('failed');
    });

    test('should default unknown status to pending', async () => {
      const paymentStatus = (ShopifyOrderSyncService as any).mapPaymentStatus(
        'unknown_status'
      );
      expect(paymentStatus).toBe('pending');
    });
  });

  describe('Fulfillment Status Mapping', () => {
    test('should map "fulfilled" to FULFILLED status', async () => {
      const status = (ShopifyOrderSyncService as any).mapFulfillmentStatus('fulfilled');
      expect(status).toBe('FULFILLED');
    });

    test('should map "partial" to PROCESSING status', async () => {
      const status = (ShopifyOrderSyncService as any).mapFulfillmentStatus('partial');
      expect(status).toBe('PROCESSING');
    });

    test('should map null to PENDING status', async () => {
      const status = (ShopifyOrderSyncService as any).mapFulfillmentStatus(null);
      expect(status).toBe('PENDING');
    });

    test('should map "restocked" to CANCELLED status', async () => {
      const status = (ShopifyOrderSyncService as any).mapFulfillmentStatus('restocked');
      expect(status).toBe('CANCELLED');
    });
  });

  describe('Payment Method Detection', () => {
    test('should detect COD payment method', async () => {
      const paymentMethod = (ShopifyOrderSyncService as any).detectPaymentMethod([
        'cash_on_delivery',
      ]);
      expect(paymentMethod).toBe('cod');
    });

    test('should detect COD from gateway name containing "cash"', async () => {
      const paymentMethod = (ShopifyOrderSyncService as any).detectPaymentMethod([
        'manual_cash_payment',
      ]);
      expect(paymentMethod).toBe('cod');
    });

    test('should default to prepaid for online gateways', async () => {
      const paymentMethod = (ShopifyOrderSyncService as any).detectPaymentMethod([
        'shopify_payments',
      ]);
      expect(paymentMethod).toBe('prepaid');
    });

    test('should default to prepaid for stripe', async () => {
      const paymentMethod = (ShopifyOrderSyncService as any).detectPaymentMethod(['stripe']);
      expect(paymentMethod).toBe('prepaid');
    });

    test('should default to prepaid when no gateway specified', async () => {
      const paymentMethod = (ShopifyOrderSyncService as any).detectPaymentMethod([]);
      expect(paymentMethod).toBe('prepaid');
    });
  });

  describe('Order Number Generation', () => {
    test('should generate order number with SHOPIFY prefix', () => {
      const orderNumber = (ShopifyOrderSyncService as any).generateOrderNumber({
        order_number: 1001,
      });
      expect(orderNumber).toBe('SHOPIFY-1001');
    });

    test('should handle large order numbers', () => {
      const orderNumber = (ShopifyOrderSyncService as any).generateOrderNumber({
        order_number: 999999,
      });
      expect(orderNumber).toBe('SHOPIFY-999999');
    });
  });

  describe('syncRecentOrders', () => {
    test('should sync orders from last 24 hours by default', async () => {
      const mockStore = {
        _id: mockStoreId,
        shopDomain: mockShopDomain,
        companyId: mockCompanyId,
        isActive: true,
        isPaused: false,
        decryptAccessToken: jest.fn().mockReturnValue(mockAccessToken),
        updateSyncStatus: jest.fn<any>().mockResolvedValue(true),
        incrementSyncStats: jest.fn<any>().mockResolvedValue(true),
      };

      (ShopifyStore.findById as any) = jest.fn().mockReturnValue({
        select: jest.fn<any>().mockResolvedValue(mockStore),
      });

      const mockSyncLog = {
        _id: 'sync-log-123',
        completeSyncWithErrors: jest.fn<any>().mockResolvedValue(true),
      };

      (SyncLog.create as any) = jest.fn<any>().mockResolvedValue(mockSyncLog);

      const mockClient = {
        get: jest.fn<any>().mockResolvedValue({ orders: [] }),
      };

      (ShopifyClient as any).mockImplementation(() => mockClient);

      await ShopifyOrderSyncService.syncRecentOrders(mockStoreId);

      expect(mockClient.get).toHaveBeenCalledWith(
        '/orders.json',
        expect.objectContaining({
          updated_at_min: expect.any(String),
        })
      );
    });

    test('should sync orders from custom time period', async () => {
      const mockStore = {
        _id: mockStoreId,
        shopDomain: mockShopDomain,
        companyId: mockCompanyId,
        isActive: true,
        isPaused: false,
        decryptAccessToken: jest.fn().mockReturnValue(mockAccessToken),
        updateSyncStatus: jest.fn<any>().mockResolvedValue(true),
        incrementSyncStats: jest.fn<any>().mockResolvedValue(true),
      };

      (ShopifyStore.findById as any) = jest.fn().mockReturnValue({
        select: jest.fn<any>().mockResolvedValue(mockStore),
      });

      const mockSyncLog = {
        _id: 'sync-log-123',
        completeSyncWithErrors: jest.fn<any>().mockResolvedValue(true),
      };

      (SyncLog.create as any) = jest.fn<any>().mockResolvedValue(mockSyncLog);

      const mockClient = {
        get: jest.fn<any>().mockResolvedValue({ orders: [] }),
      };

      (ShopifyClient as any).mockImplementation(() => mockClient);

      await ShopifyOrderSyncService.syncRecentOrders(mockStoreId, 48); // 48 hours

      expect(mockClient.get).toHaveBeenCalled();
    });
  });

  describe('syncSingleOrderById', () => {
    test('should sync specific order by Shopify ID', async () => {
      const mockStore = {
        _id: mockStoreId,
        shopDomain: mockShopDomain,
        companyId: mockCompanyId,
        decryptAccessToken: jest.fn().mockReturnValue(mockAccessToken),
      };

      (ShopifyStore.findById as any) = jest.fn().mockReturnValue({
        select: jest.fn<any>().mockResolvedValue(mockStore),
      });

      const mockClient = {
        get: jest.fn<any>().mockResolvedValue({ order: mockShopifyOrder }),
      };

      (ShopifyClient as any).mockImplementation(() => mockClient);

      (Order.findOne as any) = jest.fn<any>().mockResolvedValue(null);
      (Order.create as any) = jest.fn<any>().mockResolvedValue({
        _id: 'order-123',
        orderNumber: 'SHOPIFY-1001',
      });

      await ShopifyOrderSyncService.syncSingleOrderById(mockStoreId, '123456789');

      expect(mockClient.get).toHaveBeenCalledWith('/orders/123456789.json');
      expect(Order.create).toHaveBeenCalled();
    });

    test('should throw error if order not found in Shopify', async () => {
      const mockStore = {
        _id: mockStoreId,
        shopDomain: mockShopDomain,
        companyId: mockCompanyId,
        decryptAccessToken: jest.fn().mockReturnValue(mockAccessToken),
      };

      (ShopifyStore.findById as any) = jest.fn().mockReturnValue({
        select: jest.fn<any>().mockResolvedValue(mockStore),
      });

      const mockClient = {
        get: jest.fn<any>().mockResolvedValue({ order: null }),
      };

      (ShopifyClient as any).mockImplementation(() => mockClient);

      await expect(
        ShopifyOrderSyncService.syncSingleOrderById(mockStoreId, '999999')
      ).rejects.toThrow('Order not found in Shopify');
    });
  });
});
