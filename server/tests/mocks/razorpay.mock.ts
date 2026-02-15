/**
 * Razorpay API Mock
 * Mocks for the payment gateway integration
 */

export interface RazorpayOrder {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    status: 'created' | 'attempted' | 'paid';
    created_at: number;
}

export interface RazorpayPayment {
    id: string;
    entity: string;
    amount: number;
    currency: string;
    status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
    order_id: string;
    method: string;
    captured: boolean;
    refund_status: 'null' | 'partial' | 'full';
    created_at: number;
}

/**
 * Generate a mock Razorpay order ID
 */
const generateOrderId = (): string => {
    return `order_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`;
};

/**
 * Generate a mock Razorpay payment ID
 */
const generatePaymentId = (): string => {
    return `pay_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`;
};

/**
 * Mock order creation success
 */
export const mockCreateOrderSuccess = (
    amount: number,
    currency: string = 'INR',
    receipt?: string
): RazorpayOrder => ({
    id: generateOrderId(),
    entity: 'order',
    amount: amount * 100, // Razorpay uses paise
    amount_paid: 0,
    amount_due: amount * 100,
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
    status: 'created',
    created_at: Math.floor(Date.now() / 1000),
});

/**
 * Mock payment capture success
 */
export const mockPaymentCaptureSuccess = (
    paymentId: string,
    orderId: string,
    amount: number
): RazorpayPayment => ({
    id: paymentId || generatePaymentId(),
    entity: 'payment',
    amount: amount * 100,
    currency: 'INR',
    status: 'captured',
    order_id: orderId,
    method: 'card',
    captured: true,
    refund_status: 'null',
    created_at: Math.floor(Date.now() / 1000),
});

/**
 * Mock refund success
 */
export const mockRefundSuccess = (
    paymentId: string,
    amount: number,
    _isPartial: boolean = false
) => ({
    id: `rfnd_${Date.now().toString(36)}`,
    entity: 'refund',
    amount: amount * 100,
    currency: 'INR',
    payment_id: paymentId,
    status: 'processed',
    speed_requested: 'normal',
    speed_processed: 'normal',
    created_at: Math.floor(Date.now() / 1000),
});

/**
 * Mock payment verification
 */
export const mockPaymentVerification = (
    orderId: string,
    paymentId: string,
    _signature: string
) => ({
    success: true,
    orderId,
    paymentId,
    verified: true,
});

/**
 * Mock webhook event for payment captured
 */
export const mockWebhookPaymentCaptured = (
    paymentId: string,
    orderId: string,
    amount: number
) => ({
    entity: 'event',
    account_id: 'acc_test',
    event: 'payment.captured',
    contains: ['payment'],
    payload: {
        payment: {
            entity: mockPaymentCaptureSuccess(paymentId, orderId, amount),
        },
    },
    created_at: Math.floor(Date.now() / 1000),
});

/**
 * Mock webhook event for payment failed
 */
export const mockWebhookPaymentFailed = (
    paymentId: string,
    orderId: string,
    amount: number,
    errorDescription: string = 'Payment declined by bank'
) => ({
    entity: 'event',
    account_id: 'acc_test',
    event: 'payment.failed',
    contains: ['payment'],
    payload: {
        payment: {
            entity: {
                id: paymentId,
                entity: 'payment',
                amount: amount * 100,
                currency: 'INR',
                status: 'failed',
                order_id: orderId,
                error_code: 'BAD_REQUEST_ERROR',
                error_description: errorDescription,
                created_at: Math.floor(Date.now() / 1000),
            },
        },
    },
    created_at: Math.floor(Date.now() / 1000),
});

/**
 * Create a mock Razorpay client for testing
 */
export const createRazorpayMockClient = () => ({
    orders: {
        create: jest.fn().mockImplementation((options) =>
            Promise.resolve(mockCreateOrderSuccess(options.amount / 100, options.currency, options.receipt))
        ),
        fetch: jest.fn().mockImplementation((orderId) =>
            Promise.resolve({ id: orderId, status: 'created' })
        ),
        fetchAll: jest.fn().mockResolvedValue({ items: [], count: 0 }),
    },
    payments: {
        capture: jest.fn().mockImplementation((paymentId, amount, options) =>
            Promise.resolve(mockPaymentCaptureSuccess(paymentId, options?.orderId || '', amount / 100))
        ),
        fetch: jest.fn().mockImplementation((paymentId) =>
            Promise.resolve({ id: paymentId, status: 'captured' })
        ),
        refund: jest.fn().mockImplementation((paymentId, options) =>
            Promise.resolve(mockRefundSuccess(paymentId, options?.amount / 100 || 0))
        ),
    },
    webhookSignatureVerify: jest.fn().mockReturnValue(true),
});

/**
 * Reset all Razorpay mocks
 */
export const resetRazorpayMocks = (client: ReturnType<typeof createRazorpayMockClient>) => {
    client.orders.create.mockClear();
    client.orders.fetch.mockClear();
    client.orders.fetchAll.mockClear();
    client.payments.capture.mockClear();
    client.payments.fetch.mockClear();
    client.payments.refund.mockClear();
    client.webhookSignatureVerify.mockClear();
};
