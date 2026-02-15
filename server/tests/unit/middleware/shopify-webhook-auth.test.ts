import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { ShopifyStore } from '../../../src/infrastructure/database/mongoose/models';
import { verifyShopifyWebhook } from '../../../src/presentation/http/middleware/webhooks/shopify-webhook-auth.middleware';

describe('Shopify Webhook Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.SHOPIFY_WEBHOOK_SECRET;
    delete process.env.SHOPIFY_API_SECRET;
    delete process.env.SHOPIFY_API_KEY;
  });

  it('should call next() when signature is valid using SHOPIFY_WEBHOOK_SECRET', async () => {
    process.env.SHOPIFY_WEBHOOK_SECRET = 'test_webhook_secret';
    const payload = JSON.stringify({ id: 123, topic: 'app/uninstalled' });
    const signature = crypto
      .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
      .update(payload, 'utf8')
      .digest('base64');

    jest.spyOn(ShopifyStore, 'findOne').mockResolvedValue({
      _id: 'store_1',
      companyId: 'company_1',
      isActive: true,
    } as any);

    mockRequest = {
      headers: {
        'x-shopify-hmac-sha256': signature,
        'x-shopify-shop-domain': 'test-store.myshopify.com',
        'x-shopify-topic': 'app/uninstalled',
        'x-shopify-webhook-id': 'webhook-1',
      } as any,
      body: {},
    };
    (mockRequest as any).rawBody = payload;

    await verifyShopifyWebhook(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
  });

  it('should fallback to SHOPIFY_API_SECRET when SHOPIFY_WEBHOOK_SECRET is missing', async () => {
    process.env.SHOPIFY_API_SECRET = 'test_api_secret';
    const payload = JSON.stringify({ id: 456, topic: 'orders/create' });
    const signature = crypto
      .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
      .update(payload, 'utf8')
      .digest('base64');

    jest.spyOn(ShopifyStore, 'findOne').mockResolvedValue({
      _id: 'store_2',
      companyId: 'company_2',
      isActive: true,
    } as any);

    mockRequest = {
      headers: {
        'x-shopify-hmac-sha256': signature,
        'x-shopify-shop-domain': 'test-store.myshopify.com',
        'x-shopify-topic': 'orders/create',
        'x-shopify-webhook-id': 'webhook-2',
      } as any,
      body: {},
    };
    (mockRequest as any).rawBody = payload;

    await verifyShopifyWebhook(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should return 401 for invalid signature', async () => {
    process.env.SHOPIFY_WEBHOOK_SECRET = 'test_webhook_secret';
    process.env.SHOPIFY_API_KEY = 'test_api_key';

    mockRequest = {
      headers: {
        'x-shopify-hmac-sha256': 'invalid_signature',
        'x-shopify-shop-domain': 'test-store.myshopify.com',
        'x-shopify-topic': 'app/uninstalled',
        'x-shopify-webhook-id': 'webhook-3',
      } as any,
      body: {},
    };
    (mockRequest as any).rawBody = JSON.stringify({ id: 789 });

    await verifyShopifyWebhook(mockRequest as Request, mockResponse as Response, nextFunction);

    if ((mockResponse.status as jest.Mock).mock.calls.length > 0) {
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          received: false,
          error: 'Authentication failed',
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    } else {
      expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
    }
  });
});
