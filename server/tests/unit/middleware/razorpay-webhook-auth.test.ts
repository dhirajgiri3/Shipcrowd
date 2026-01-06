import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { verifyRazorpayWebhook } from '../../../src/presentation/http/middleware/webhooks/razorpay-webhook-auth.middleware';

describe('Razorpay Webhook Auth Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction = jest.fn();
    const webhookSecret = 'test_secret';

    beforeEach(() => {
        process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    afterEach(() => {
        delete process.env.RAZORPAY_WEBHOOK_SECRET;
        jest.clearAllMocks();
    });

    it('should call next() when signature is valid using rawBody', async () => {
        const payload = JSON.stringify({ event: 'payment.captured' });
        const signature = crypto
            .createHmac('sha256', webhookSecret)
            .update(payload)
            .digest('hex');

        mockRequest = {
            headers: {
                'x-razorpay-signature': signature,
            },
            body: { event: 'payment.captured' },
        };
        // Simulate rawBody from app.ts
        (mockRequest as any).rawBody = Buffer.from(payload);

        await verifyRazorpayWebhook(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 500 when rawBody is not provided', async () => {
        mockRequest = {
            headers: {
                'x-razorpay-signature': 'some_signature',
            },
            body: { event: 'payment.captured' },
        };
        // No rawBody - this is now required for security

        await verifyRazorpayWebhook(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: 'Webhook verification failed: raw body not captured' })
        );
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when signature is missing', async () => {
        mockRequest = {
            headers: {},
            body: {},
        };

        await verifyRazorpayWebhook(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: 'Missing X-Razorpay-Signature header' })
        );
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when signature is invalid', async () => {
        mockRequest = {
            headers: {
                'x-razorpay-signature': 'invalid_signature',
            },
            body: { event: 'payment.captured' },
        };
        (mockRequest as any).rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured' }));

        await verifyRazorpayWebhook(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: 'Invalid webhook signature' })
        );
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 500 when secret is not configured', async () => {
        delete process.env.RAZORPAY_WEBHOOK_SECRET;

        mockRequest = {
            headers: {
                'x-razorpay-signature': 'signature',
            },
        };

        await verifyRazorpayWebhook(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: 'Webhook secret not configured' })
        );
    });
});
