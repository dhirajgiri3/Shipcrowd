/**
 * SendGrid Email API Mock
 * Mocks for the email service integration
 */

export interface SendGridEmailRequest {
    to: string | string[];
    from: string;
    subject: string;
    text?: string;
    html?: string;
    templateId?: string;
    dynamicTemplateData?: Record<string, any>;
}

export interface SendGridEmailResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}

/**
 * Generate a mock message ID
 */
const generateMessageId = (): string => {
    return `<${Date.now()}.${Math.random().toString(36).substring(2, 15)}@sendgrid.local>`;
};

/**
 * Mock successful email send response
 */
export const mockSendEmailSuccess = (to: string | string[]): SendGridEmailResponse => ({
    statusCode: 202,
    headers: {
        'x-message-id': generateMessageId(),
    },
    body: '',
});

/**
 * Mock email send failure
 */
export const mockSendEmailFailure = (
    code: string = 'INVALID_EMAIL',
    message: string = 'Invalid email address'
) => ({
    statusCode: 400,
    headers: {},
    body: JSON.stringify({
        errors: [{ field: 'to', message }],
    }),
});

/**
 * Mock batch email send success
 */
export const mockBatchSendSuccess = (recipients: string[]) => ({
    statusCode: 202,
    headers: {
        'x-message-id': generateMessageId(),
    },
    body: '',
    recipientCount: recipients.length,
});

/**
 * Mock email templates
 */
export const mockTemplates = {
    order_confirmation: 'd-order-confirmation-template-id',
    shipment_update: 'd-shipment-update-template-id',
    password_reset: 'd-password-reset-template-id',
    email_verification: 'd-email-verification-template-id',
    ndr_notification: 'd-ndr-notification-template-id',
    welcome_email: 'd-welcome-email-template-id',
};

/**
 * Create a mock SendGrid client for testing
 */
export const createSendGridMockClient = () => ({
    send: jest.fn().mockImplementation((msg: SendGridEmailRequest) =>
        Promise.resolve([mockSendEmailSuccess(msg.to)])
    ),
    sendMultiple: jest.fn().mockImplementation((msgs: SendGridEmailRequest[]) =>
        Promise.resolve(msgs.map(msg => mockSendEmailSuccess(msg.to)))
    ),
    setApiKey: jest.fn(),
    setSubstitutionWrappers: jest.fn(),
});

/**
 * Mock SendGrid Mail service
 */
export const createSendGridMailMock = () => ({
    setApiKey: jest.fn(),
    send: jest.fn().mockResolvedValue([mockSendEmailSuccess('')]),
    sendMultiple: jest.fn().mockResolvedValue([]),
});

/**
 * Reset all SendGrid mocks
 */
export const resetSendGridMocks = (client: ReturnType<typeof createSendGridMockClient>) => {
    client.send.mockClear();
    client.sendMultiple.mockClear();
    client.setApiKey.mockClear();
};

/**
 * Mock webhook event for email delivery
 */
export const mockWebhookEmailDelivered = (email: string, messageId: string) => ([{
    email,
    timestamp: Math.floor(Date.now() / 1000),
    event: 'delivered',
    sg_message_id: messageId,
    'smtp-id': messageId,
}]);

/**
 * Mock webhook event for email bounce
 */
export const mockWebhookEmailBounced = (email: string, messageId: string, reason: string = 'Invalid recipient') => ([{
    email,
    timestamp: Math.floor(Date.now() / 1000),
    event: 'bounce',
    sg_message_id: messageId,
    'smtp-id': messageId,
    reason,
    type: 'bounce',
}]);
