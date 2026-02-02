import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import ShopifyOAuthService from '../../../../src/core/application/services/shopify/shopify-oauth.service';
import { ShopifyStore } from '../../../../src/infrastructure/database/mongoose/models';
import ShopifyClient from '../../../../src/infrastructure/external/ecommerce/shopify/shopify.client';
import { AppError } from '../../../../src/shared/errors/app.error';
import crypto from 'crypto';

// Mock dependencies
jest.mock('../../../../src/infrastructure/database/mongoose/models/marketplaces/shopify/shopify-store.model');
jest.mock('../../../../src/infrastructure/external/ecommerce/shopify/shopify.client');

describe('ShopifyOAuthService', () => {
  const mockCompanyId = '507f1f77bcf86cd799439011';
  const mockShopDomain = 'test-store.myshopify.com';
  const mockAccessToken = 'shpat_test_token_123';
  const mockStoreId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Setup environment variables
    process.env.SHOPIFY_API_KEY = 'test_api_key';
    process.env.SHOPIFY_API_SECRET = 'test_api_secret';
    process.env.SHOPIFY_WEBHOOK_SECRET = 'test_webhook_secret';
    process.env.BACKEND_URL = 'https://test.Shipcrowd.com';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateInstallUrl', () => {
    test('should generate valid OAuth installation URL', () => {
      const url = ShopifyOAuthService.generateInstallUrl({
        shop: mockShopDomain,
        companyId: mockCompanyId,
      });

      expect(url).toContain(`https://${mockShopDomain}/admin/oauth/authorize`);
      expect(url).toContain('client_id=test_api_key');
      expect(url).toContain('scope=');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('state=');
    });

    test('should include all required scopes', () => {
      const url = ShopifyOAuthService.generateInstallUrl({
        shop: mockShopDomain,
        companyId: mockCompanyId,
      });

      const scopeMatch = url.match(/scope=([^&]+)/);
      expect(scopeMatch).toBeTruthy();

      const scopes = decodeURIComponent(scopeMatch![1]).split(',');
      expect(scopes).toContain('read_orders');
      expect(scopes).toContain('write_orders');
      expect(scopes).toContain('read_products');
      expect(scopes).toContain('write_products');
      expect(scopes).toContain('write_inventory');
    });

    test('should reject invalid shop domain', () => {
      expect(() => {
        ShopifyOAuthService.generateInstallUrl({
          shop: 'invalid-domain.com',
          companyId: mockCompanyId,
        });
      }).toThrow('Invalid shop domain format');
    });

    test('should include base64-encoded state parameter', () => {
      const url = ShopifyOAuthService.generateInstallUrl({
        shop: mockShopDomain,
        companyId: mockCompanyId,
      });

      const stateMatch = url.match(/state=([^&]+)/);
      expect(stateMatch).toBeTruthy();

      const state = stateMatch![1];
      const decoded = Buffer.from(state, 'base64').toString('utf8');
      expect(decoded).toContain(mockCompanyId);
      expect(decoded).toContain(':');
    });
  });

  describe('verifyHmac', () => {
    test('should verify authentic HMAC signature', () => {
      const query = {
        shop: mockShopDomain,
        code: 'test_code_123',
        state: 'test_state',
        timestamp: '1234567890',
      };

      // Calculate correct HMAC
      const message = Object.keys(query)
        .sort()
        .map((key) => `${key}=${query[key as keyof typeof query]}`)
        .join('&');

      const hmac = crypto
        .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
        .update(message, 'utf8')
        .digest('hex');

      const isValid = ShopifyOAuthService.verifyHmac(query, hmac);
      expect(isValid).toBe(true);
    });

    test('should reject tampered HMAC signature', () => {
      const query = {
        shop: mockShopDomain,
        code: 'test_code_123',
        state: 'test_state',
        timestamp: '1234567890',
      };

      const fakeHmac = 'fake_hmac_signature';
      const isValid = ShopifyOAuthService.verifyHmac(query, fakeHmac);
      expect(isValid).toBe(false);
    });

    test('should reject HMAC with different length', () => {
      const query = {
        shop: mockShopDomain,
        code: 'test_code_123',
      };

      const shortHmac = 'abc123';
      const isValid = ShopifyOAuthService.verifyHmac(query, shortHmac);
      expect(isValid).toBe(false);
    });

    test('should ignore hmac and signature fields in verification', () => {
      const query = {
        shop: mockShopDomain,
        code: 'test_code_123',
        hmac: 'should_be_ignored',
        signature: 'should_also_be_ignored',
      };

      // Calculate HMAC without hmac and signature fields
      const { hmac: _h, signature: _s, ...params } = query;
      const message = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key as keyof typeof params]}`)
        .join('&');

      const correctHmac = crypto
        .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
        .update(message, 'utf8')
        .digest('hex');

      const isValid = ShopifyOAuthService.verifyHmac(query, correctHmac);
      expect(isValid).toBe(true);
    });
  });

  describe('installStore', () => {
    test('should create new store with encrypted token', async () => {
      const mockShopInfo = {
        name: 'Test Store',
        email: 'test@store.com',
        country_code: 'US',
        currency: 'USD',
        plan_name: 'basic',
      };

      // Mock ShopifyClient
      const mockClient = {
        getShopInfo: jest.fn<any>().mockResolvedValue(mockShopInfo),
        post: jest.fn<any>().mockResolvedValue({ webhook: { id: 123 } }),
      };
      (ShopifyClient as any).mockImplementation(() => mockClient);

      // Mock ShopifyStore.findOne to return null (new store)
      (ShopifyStore.findOne as any) = jest.fn<any>().mockResolvedValue(null);
      // Mock findById for registerWebhooks call
      (ShopifyStore.findById as any) = jest.fn().mockReturnValue({
        select: jest.fn<any>().mockResolvedValue({
          _id: mockStoreId,
          shopDomain: mockShopDomain,
          webhooks: [],
          decryptAccessToken: jest.fn().mockReturnValue(mockAccessToken),
          save: jest.fn<any>().mockResolvedValue(true)
        })
      });

      // Mock ShopifyStore constructor and save
      const mockSave = jest.fn<any>().mockResolvedValue(true);
      const mockStoreInstance = {
        _id: mockStoreId,
        webhooks: [],
        save: mockSave,
      };
      (ShopifyStore as any).mockImplementation(() => mockStoreInstance);

      const result = await ShopifyOAuthService.installStore({
        shop: mockShopDomain,
        accessToken: mockAccessToken,
        companyId: mockCompanyId,
      });

      expect(ShopifyStore.findOne).toHaveBeenCalledWith({
        companyId: mockCompanyId,
        shopDomain: mockShopDomain,
      });
      expect(mockSave).toHaveBeenCalled();
      expect(mockClient.getShopInfo).toHaveBeenCalled();
    });

    test('should update existing store', async () => {
      const mockShopInfo = {
        name: 'Updated Store',
        email: 'updated@store.com',
        country_code: 'CA',
        currency: 'CAD',
        plan_name: 'professional',
      };

      const mockClient = {
        getShopInfo: jest.fn<any>().mockResolvedValue(mockShopInfo),
        post: jest.fn<any>().mockResolvedValue({ webhook: { id: 123 } }),
      };
      (ShopifyClient as any).mockImplementation(() => mockClient);

      const mockSave = jest.fn<any>().mockResolvedValue(true);
      const mockExistingStore = {
        _id: mockStoreId,
        accessToken: 'old_token',
        shopName: 'Old Name',
        webhooks: [],
        save: mockSave,
        decryptAccessToken: jest.fn().mockReturnValue(mockAccessToken),
      };

      (ShopifyStore.findOne as any) = jest.fn<any>().mockResolvedValue(mockExistingStore);

      // Mock findById for registerWebhooks call
      (ShopifyStore.findById as any) = jest.fn().mockReturnValue({
        select: jest.fn<any>().mockResolvedValue(mockExistingStore)
      });

      await ShopifyOAuthService.installStore({
        shop: mockShopDomain,
        accessToken: mockAccessToken,
        companyId: mockCompanyId,
      });

      expect(mockExistingStore.shopName).toBe('Updated Store');
      expect(mockExistingStore.accessToken).toBe(mockAccessToken);
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('registerWebhooks', () => {
    test('should register all required webhook topics', async () => {
      const mockStore = {
        _id: mockStoreId,
        shopDomain: mockShopDomain,
        webhooks: [],
        decryptAccessToken: jest.fn().mockReturnValue(mockAccessToken),
        save: jest.fn<any>().mockResolvedValue(true),
      };

      (ShopifyStore.findById as any) = jest.fn().mockReturnValue({
        select: jest.fn<any>().mockResolvedValue(mockStore),
      });

      const mockPost = jest.fn<any>().mockResolvedValue({
        webhook: { id: 123, topic: 'orders/create' },
      });

      const mockClient = {
        post: mockPost,
      };
      (ShopifyClient as any).mockImplementation(() => mockClient);

      await ShopifyOAuthService.registerWebhooks(mockStoreId);

      // Should register 8 webhooks
      expect(mockPost).toHaveBeenCalledTimes(8);

      // Verify webhook topics
      const topics = mockPost.mock.calls.map((call) => (call[1] as any).webhook.topic);
      expect(topics).toContain('orders/create');
      expect(topics).toContain('orders/updated');
      expect(topics).toContain('orders/cancelled');
      expect(topics).toContain('orders/fulfilled');
      expect(topics).toContain('products/update');
      expect(topics).toContain('inventory_levels/update');
      expect(topics).toContain('app/uninstalled');
      expect(topics).toContain('shop/update');
    });

    test('should handle duplicate webhook registration gracefully', async () => {
      const mockStore = {
        _id: mockStoreId,
        shopDomain: mockShopDomain,
        webhooks: [],
        decryptAccessToken: jest.fn().mockReturnValue(mockAccessToken),
        save: jest.fn<any>().mockResolvedValue(true),
      };

      (ShopifyStore.findById as any) = jest.fn().mockReturnValue({
        select: jest.fn<any>().mockResolvedValue(mockStore),
      });

      const duplicateError = new Error('Webhook already exists');
      (duplicateError as any).response = {
        data: {
          errors: {
            address: ['already taken'],
          },
        },
      };

      const mockPost = jest.fn<any>().mockRejectedValue(duplicateError);
      const mockClient = { post: mockPost };
      (ShopifyClient as any).mockImplementation(() => mockClient);

      // Should not throw error
      await expect(
        ShopifyOAuthService.registerWebhooks(mockStoreId)
      ).resolves.not.toThrow();
    });
  });

  describe('disconnectStore', () => {
    test('should unregister webhooks and deactivate store', async () => {
      const mockWebhooks = [
        { topic: 'orders/create', shopifyWebhookId: '123' },
        { topic: 'orders/updated', shopifyWebhookId: '456' },
      ];

      const mockStore = {
        _id: mockStoreId,
        shopDomain: mockShopDomain,
        webhooks: mockWebhooks,
        decryptAccessToken: jest.fn().mockReturnValue(mockAccessToken),
        save: jest.fn<any>().mockResolvedValue(true),
        isActive: true,
      };

      (ShopifyStore.findById as any) = jest.fn().mockReturnValue({
        select: jest.fn<any>().mockResolvedValue(mockStore),
      });

      const mockDelete = jest.fn<any>().mockResolvedValue(true);
      const mockClient = { delete: mockDelete };
      (ShopifyClient as any).mockImplementation(() => mockClient);

      await ShopifyOAuthService.disconnectStore(mockStoreId);

      expect(mockDelete).toHaveBeenCalledTimes(2);
      expect(mockStore.isActive).toBe(false);
      expect(mockStore.webhooks).toHaveLength(0);
      expect(mockStore.save).toHaveBeenCalled();
    });

    test('should throw error if store not found', async () => {
      (ShopifyStore.findById as any) = jest.fn().mockReturnValue({
        select: jest.fn<any>().mockResolvedValue(null),
      });

      await expect(
        ShopifyOAuthService.disconnectStore(mockStoreId)
      ).rejects.toThrow('Store not found');
    });
  });

  describe('refreshConnection', () => {
    test('should validate connection and return true if valid', async () => {
      const mockStore = {
        _id: mockStoreId,
        shopDomain: mockShopDomain,
        decryptAccessToken: jest.fn().mockReturnValue(mockAccessToken),
        save: jest.fn<any>().mockResolvedValue(true),
        isActive: true,
      };

      (ShopifyStore.findById as any) = jest.fn().mockReturnValue({
        select: jest.fn<any>().mockResolvedValue(mockStore),
      });

      const mockClient = {
        testConnection: jest.fn<any>().mockResolvedValue(true),
      };
      (ShopifyClient as any).mockImplementation(() => mockClient);

      const isValid = await ShopifyOAuthService.refreshConnection(mockStoreId);

      expect(isValid).toBe(true);
      expect(mockClient.testConnection).toHaveBeenCalled();
    });

    test('should deactivate store if connection is invalid', async () => {
      const mockStore = {
        _id: mockStoreId,
        shopDomain: mockShopDomain,
        decryptAccessToken: jest.fn().mockReturnValue(mockAccessToken),
        save: jest.fn<any>().mockResolvedValue(true),
        isActive: true,
      };

      (ShopifyStore.findById as any) = jest.fn().mockReturnValue({
        select: jest.fn<any>().mockResolvedValue(mockStore),
      });

      const mockClient = {
        testConnection: jest.fn<any>().mockResolvedValue(false),
      };
      (ShopifyClient as any).mockImplementation(() => mockClient);

      const isValid = await ShopifyOAuthService.refreshConnection(mockStoreId);

      expect(isValid).toBe(false);
      expect(mockStore.isActive).toBe(false);
      expect(mockStore.save).toHaveBeenCalled();
    });
  });

  describe('getActiveStores', () => {
    test('should return all active stores for company', async () => {
      const mockStores = [
        { _id: '1', shopDomain: 'store1.myshopify.com', isActive: true },
        { _id: '2', shopDomain: 'store2.myshopify.com', isActive: true },
      ];

      (ShopifyStore.find as any) = jest.fn().mockReturnValue({
        select: jest.fn<any>().mockResolvedValue(mockStores),
      });

      const stores = await ShopifyOAuthService.getActiveStores(mockCompanyId);

      expect(ShopifyStore.find).toHaveBeenCalledWith({
        companyId: mockCompanyId,
        isActive: true,
      });
      expect(stores).toHaveLength(2);
    });
  });

  describe('togglePauseSync', () => {
    test('should pause sync for store', async () => {
      const mockStore = {
        _id: mockStoreId,
        isPaused: false,
        save: jest.fn<any>().mockResolvedValue(true),
      };

      (ShopifyStore.findById as any) = jest.fn<any>().mockResolvedValue(mockStore);

      await ShopifyOAuthService.togglePauseSync(mockStoreId, true);

      expect(mockStore.isPaused).toBe(true);
      expect(mockStore.save).toHaveBeenCalled();
    });

    test('should resume sync for store', async () => {
      const mockStore = {
        _id: mockStoreId,
        isPaused: true,
        save: jest.fn<any>().mockResolvedValue(true),
      };

      (ShopifyStore.findById as any) = jest.fn<any>().mockResolvedValue(mockStore);

      await ShopifyOAuthService.togglePauseSync(mockStoreId, false);

      expect(mockStore.isPaused).toBe(false);
      expect(mockStore.save).toHaveBeenCalled();
    });
  });
});
