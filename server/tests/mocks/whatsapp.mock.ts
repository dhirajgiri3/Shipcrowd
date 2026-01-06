/**
 * WhatsApp Service Mock
 * Comprehensive mock for WhatsApp Business API integration
 */

export interface WhatsAppMessageResult {
    success: boolean;
    messageId: string;
    timestamp?: string;
    error?: string;
}

export interface WhatsAppTemplateParams {
    to: string;
    templateName: string;
    params: string[];
    language?: string;
}

export interface WhatsAppInteractiveMessage {
    to: string;
    type: 'button' | 'list';
    header?: string;
    body: string;
    footer?: string;
    buttons?: Array<{ id: string; title: string }>;
    listItems?: Array<{ id: string; title: string; description?: string }>;
}

// Create standalone mocks with enhanced functionality
export const mockSendMessage = jest.fn().mockImplementation((to: string, message: string) => {
    if (!to || !message) {
        return Promise.reject(new Error('Invalid parameters'));
    }
    return Promise.resolve({
        success: true,
        messageId: `MOCK_MSG_${Date.now()}`,
        timestamp: new Date().toISOString(),
    });
});

export const mockSendTemplateMessage = jest.fn().mockImplementation((params: WhatsAppTemplateParams) => {
    if (!params.to || !params.templateName) {
        return Promise.reject(new Error('Invalid template parameters'));
    }
    return Promise.resolve({
        success: true,
        messageId: `MOCK_TEMPLATE_${Date.now()}`,
        timestamp: new Date().toISOString(),
    });
});

export const mockSendInteractiveMessage = jest.fn().mockImplementation((message: WhatsAppInteractiveMessage) => {
    if (!message.to || !message.body) {
        return Promise.reject(new Error('Invalid interactive message'));
    }
    return Promise.resolve({
        success: true,
        messageId: `MOCK_INTERACTIVE_${Date.now()}`,
        timestamp: new Date().toISOString(),
    });
});

export const mockSendNDRNotification = jest.fn().mockImplementation(
    (orderId: string, customerPhone: string, ndrReason: string, actionUrl?: string) => {
        if (!orderId || !customerPhone || !ndrReason) {
            return Promise.reject(new Error('Missing NDR notification parameters'));
        }
        return Promise.resolve({
            success: true,
            messageId: `MOCK_NDR_${orderId}`,
            timestamp: new Date().toISOString(),
        });
    }
);

export const mockSendRTONotification = jest.fn().mockImplementation(
    (orderId: string, customerPhone: string, rtoReason: string) => {
        if (!orderId || !customerPhone || !rtoReason) {
            return Promise.reject(new Error('Missing RTO notification parameters'));
        }
        return Promise.resolve({
            success: true,
            messageId: `MOCK_RTO_${orderId}`,
            timestamp: new Date().toISOString(),
        });
    }
);

export const mockHandleWebhook = jest.fn().mockImplementation((webhookData: any) => {
    // Mock webhook handling logic
    if (webhookData?.entry?.[0]?.changes?.[0]?.value?.messages) {
        return { type: 'message_received', data: webhookData };
    }
    if (webhookData?.entry?.[0]?.changes?.[0]?.value?.statuses) {
        return { type: 'status_update', data: webhookData };
    }
    return { type: 'unknown', data: webhookData };
});

export const mockIsActive = jest.fn().mockReturnValue(true);

export const mockGetMessageStatus = jest.fn().mockImplementation((messageId: string) => {
    return Promise.resolve({
        messageId,
        status: 'delivered',
        timestamp: new Date().toISOString(),
    });
});

export const mockSendMediaMessage = jest.fn().mockImplementation(
    (to: string, mediaUrl: string, caption?: string, type: 'image' | 'document' | 'video' = 'image') => {
        if (!to || !mediaUrl) {
            return Promise.reject(new Error('Invalid media message parameters'));
        }
        return Promise.resolve({
            success: true,
            messageId: `MOCK_MEDIA_${Date.now()}`,
            timestamp: new Date().toISOString(),
        });
    }
);

// Mock templates for testing
export const mockTemplates = {
    ndr_notification: 'ndr_customer_action_required',
    rto_notification: 'rto_initiated_notification',
    delivery_update: 'delivery_status_update',
    address_update: 'address_update_required',
    order_confirmation: 'order_confirmed',
};

/**
 * WhatsApp Service Mock Class
 */
export class WhatsAppService {
    // Method declarations for TypeScript
    isActive!: typeof mockIsActive;
    sendMessage!: typeof mockSendMessage;
    sendTemplateMessage!: typeof mockSendTemplateMessage;
    sendInteractiveMessage!: typeof mockSendInteractiveMessage;
    sendNDRNotification!: typeof mockSendNDRNotification;
    sendRTONotification!: typeof mockSendRTONotification;
    handleWebhook!: typeof mockHandleWebhook;
    getMessageStatus!: typeof mockGetMessageStatus;
    sendMediaMessage!: typeof mockSendMediaMessage;

    constructor() {
        // Mock constructor - no initialization needed
    }
}

// Define methods on prototype for proper mocking
WhatsAppService.prototype.isActive = mockIsActive;
WhatsAppService.prototype.sendMessage = mockSendMessage;
WhatsAppService.prototype.sendTemplateMessage = mockSendTemplateMessage;
WhatsAppService.prototype.sendInteractiveMessage = mockSendInteractiveMessage;
WhatsAppService.prototype.sendNDRNotification = mockSendNDRNotification;
WhatsAppService.prototype.sendRTONotification = mockSendRTONotification;
WhatsAppService.prototype.handleWebhook = mockHandleWebhook;
WhatsAppService.prototype.getMessageStatus = mockGetMessageStatus;
WhatsAppService.prototype.sendMediaMessage = mockSendMediaMessage;

/**
 * Factory function to create WhatsApp service mock
 */
export const createWhatsAppServiceMock = () => new WhatsAppService();

/**
 * Reset all WhatsApp mocks to their initial state
 */
export const resetWhatsAppMocks = () => {
    mockSendMessage.mockClear();
    mockSendTemplateMessage.mockClear();
    mockSendInteractiveMessage.mockClear();
    mockSendNDRNotification.mockClear();
    mockSendRTONotification.mockClear();
    mockHandleWebhook.mockClear();
    mockIsActive.mockClear();
    mockGetMessageStatus.mockClear();
    mockSendMediaMessage.mockClear();
};

/**
 * Configure WhatsApp mock to simulate failures
 */
export const configureWhatsAppFailure = (
    type: 'service_unavailable' | 'invalid_phone' | 'rate_limit' | 'template_not_found' = 'service_unavailable'
) => {
    const errorMessages = {
        service_unavailable: 'WhatsApp service temporarily unavailable',
        invalid_phone: 'Invalid phone number format',
        rate_limit: 'Rate limit exceeded for WhatsApp API',
        template_not_found: 'WhatsApp template not found',
    };

    const error = new Error(errorMessages[type]);
    (error as any).code = type.toUpperCase();

    mockSendMessage.mockRejectedValue(error);
    mockSendTemplateMessage.mockRejectedValue(error);
    mockSendInteractiveMessage.mockRejectedValue(error);
    mockSendNDRNotification.mockRejectedValue(error);
    mockSendRTONotification.mockRejectedValue(error);
};

/**
 * Configure WhatsApp mock to succeed after N failures
 */
export const configureWhatsAppRetry = (failCount: number = 2) => {
    let callCount = 0;
    const implementation = (...args: any[]) => {
        callCount++;
        if (callCount <= failCount) {
            return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({
            success: true,
            messageId: `MOCK_MSG_RETRY_${Date.now()}`,
            timestamp: new Date().toISOString(),
        });
    };

    mockSendMessage.mockImplementation(implementation);
    mockSendTemplateMessage.mockImplementation(implementation);
};

/**
 * Mock webhook payloads for testing
 */
export const mockWebhookPayloads = {
    messageReceived: {
        entry: [{
            changes: [{
                value: {
                    messages: [{
                        from: '919876543210',
                        id: 'wamid.test123',
                        timestamp: Date.now(),
                        text: { body: 'Test message' },
                        type: 'text',
                    }],
                },
            }],
        }],
    },
    statusUpdate: {
        entry: [{
            changes: [{
                value: {
                    statuses: [{
                        id: 'wamid.test123',
                        status: 'delivered',
                        timestamp: Date.now(),
                        recipient_id: '919876543210',
                    }],
                },
            }],
        }],
    },
    messageRead: {
        entry: [{
            changes: [{
                value: {
                    statuses: [{
                        id: 'wamid.test123',
                        status: 'read',
                        timestamp: Date.now(),
                        recipient_id: '919876543210',
                    }],
                },
            }],
        }],
    },
};

export default WhatsAppService;
