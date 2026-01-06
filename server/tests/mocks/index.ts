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

// SendGrid mocks (email service)
export type {
    SendGridEmailRequest,
    SendGridEmailResponse,
} from './sendgrid.mock';

export {
    mockSendEmailSuccess as sendgridMockSendEmailSuccess,
    mockSendEmailFailure as sendgridMockSendEmailFailure,
    mockBatchSendSuccess as sendgridMockBatchSendSuccess,
    mockTemplates as sendgridMockTemplates,
    mockWebhookEmailDelivered as sendgridMockWebhookEmailDelivered,
    mockWebhookEmailBounced as sendgridMockWebhookEmailBounced,
    createSendGridMockClient,
    createSendGridMailMock,
    resetSendGridMocks,
} from './sendgrid.mock';

// DeepVue mocks (KYC verification)
export type {
    DeepVuePANResponse,
    DeepVueAadhaarResponse,
    DeepVueGSTINResponse,
    DeepVueBankAccountResponse,
} from './deepvue.mock';

export {
    mockVerifyPANSuccess as deepvueMockVerifyPANSuccess,
    mockVerifyPANFailure as deepvueMockVerifyPANFailure,
    mockVerifyAadhaarSuccess as deepvueMockVerifyAadhaarSuccess,
    mockVerifyAadhaarFailure as deepvueMockVerifyAadhaarFailure,
    mockVerifyGSTINSuccess as deepvueMockVerifyGSTINSuccess,
    mockVerifyGSTINFailure as deepvueMockVerifyGSTINFailure,
    mockVerifyBankAccountSuccess as deepvueMockVerifyBankAccountSuccess,
    mockVerifyBankAccountFailure as deepvueMockVerifyBankAccountFailure,
    createDeepVueMockClient,
    resetDeepVueMocks,
    configureDeepVueFailures,
} from './deepvue.mock';

// Shopify mocks (marketplace integration)
export type {
    ShopifyOrder,
    ShopifyLineItem,
    ShopifyAddress,
    ShopifyCustomer,
    ShopifyFulfillment,
} from './shopify.mock';

export {
    mockShopifyOrder,
    mockShopifyFulfillment,
    mockShopifyWebhookPayload,
    generateMockHmacSignature as shopifyGenerateMockHmacSignature,
    mockShopifyOAuthTokenResponse,
    createShopifyMockClient,
    resetShopifyMocks,
} from './shopify.mock';

// WooCommerce mocks (marketplace integration)
export type {
    WooCommerceOrder,
    WooCommerceAddress,
    WooCommerceLineItem,
    WooCommerceProduct,
} from './woocommerce.mock';

export {
    mockWooCommerceOrder,
    mockWooCommerceProduct,
    mockWooCommerceWebhookPayload,
    generateWooCommerceSignature,
    mockWooCommerceOAuthResponse,
    createWooCommerceMockClient,
    resetWooCommerceMocks,
    configureWooCommerceErrors,
} from './woocommerce.mock';
