/**
 * Mocks Index
 * Re-exports all mock modules with namespace prefixes to avoid naming collisions
 */

// Velocity Shipfast mocks (courier integration)
export type {
    VelocityShipfastOrder,
    VelocityTrackingEvent,
} from './velocityShipfast.mock';

export {
    mockCreateOrderSuccess as velocityMockCreateOrderSuccess,
    mockCreateOrderFailure as velocityMockCreateOrderFailure,
    mockTrackingResponse as velocityMockTrackingResponse,
    mockCancellationSuccess as velocityMockCancellationSuccess,
    mockCancellationFailure as velocityMockCancellationFailure,
    mockRateEstimation as velocityMockRateEstimation,
    mockLabelGeneration as velocityMockLabelGeneration,
    createVelocityMockClient,
    resetVelocityMocks,
} from './velocityShipfast.mock';

// Razorpay mocks (payment gateway)
export type {
    RazorpayOrder,
    RazorpayPayment,
} from './razorpay.mock';

export {
    mockCreateOrderSuccess as razorpayMockCreateOrderSuccess,
    mockPaymentCaptureSuccess as razorpayMockPaymentCaptureSuccess,
    mockRefundSuccess as razorpayMockRefundSuccess,
    mockPaymentVerification as razorpayMockPaymentVerification,
    mockWebhookPaymentCaptured as razorpayMockWebhookPaymentCaptured,
    mockWebhookPaymentFailed as razorpayMockWebhookPaymentFailed,
    createRazorpayMockClient,
    resetRazorpayMocks,
} from './razorpay.mock';
