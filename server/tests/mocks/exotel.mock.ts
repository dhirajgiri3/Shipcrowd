/**
 * Exotel Voice & SMS API Mock
 * Comprehensive mock for Exotel telephony service integration
 */

export interface ExotelCallResult {
    success: boolean;
    callSid: string;
    status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'failed' | 'no-answer';
    duration?: number;
    startTime?: string;
    endTime?: string;
    error?: string;
}

export interface ExotelSMSResult {
    success: boolean;
    smsId: string;
    status: 'queued' | 'sent' | 'delivered' | 'failed';
    timestamp?: string;
    error?: string;
}

export interface ExotelCallParams {
    from: string; // Exotel virtual number
    to: string; // Customer number
    callerId?: string; // Caller ID to display
    customField?: string;
    timeLimit?: number; // Call duration limit in seconds
    timeOut?: number; // Ring timeout in seconds
    record?: boolean;
}

export interface ExotelSMSParams {
    from: string; // Exotel SMS number
    to: string | string[]; // Recipient number(s)
    body: string; // SMS content
    priority?: 'high' | 'normal';
    customField?: string;
}

// Create standalone mocks with enhanced functionality
export const mockInitiateCall = jest.fn().mockImplementation((params: ExotelCallParams) => {
    if (!params.from || !params.to) {
        return Promise.reject(new Error('Invalid call parameters: from and to are required'));
    }

    // Validate phone number format
    if (!params.to.match(/^\+?[1-9]\d{1,14}$/)) {
        return Promise.reject(new Error('Invalid phone number format'));
    }

    return Promise.resolve({
        success: true,
        callSid: `MOCK_CALL_${Date.now()}`,
        status: 'queued' as const,
        startTime: new Date().toISOString(),
    });
});

export const mockGetCallStatus = jest.fn().mockImplementation((callSid: string) => {
    if (!callSid) {
        return Promise.reject(new Error('Call SID is required'));
    }

    return Promise.resolve({
        callSid,
        status: 'completed' as const,
        duration: 45,
        startTime: new Date(Date.now() - 60000).toISOString(),
        endTime: new Date().toISOString(),
    });
});

export const mockSendSMS = jest.fn().mockImplementation((params: ExotelSMSParams) => {
    if (!params.from || !params.to || !params.body) {
        return Promise.reject(new Error('Invalid SMS parameters: from, to, and body are required'));
    }

    // Validate SMS body length (160 characters for single SMS)
    if (params.body.length === 0) {
        return Promise.reject(new Error('SMS body cannot be empty'));
    }

    return Promise.resolve({
        success: true,
        smsId: `MOCK_SMS_${Date.now()}`,
        status: 'queued' as const,
        timestamp: new Date().toISOString(),
    });
});

export const mockCheckConfigured = jest.fn().mockImplementation(() => {
    // Check if Exotel credentials are configured
    return true;
});

export const mockHandleCallStatusWebhook = jest.fn().mockImplementation((webhookData: any) => {
    // Mock webhook data processing
    return {
        callSid: webhookData?.CallSid || 'MOCK_CALL_SID',
        status: webhookData?.Status || 'completed',
        duration: webhookData?.Duration ? parseInt(webhookData.Duration) : 45,
        dialCallStatus: webhookData?.DialCallStatus,
        recordingUrl: webhookData?.RecordingUrl,
    };
});

export const mockHandleSMSStatusWebhook = jest.fn().mockImplementation((webhookData: any) => {
    return {
        smsId: webhookData?.SmsSid || 'MOCK_SMS_SID',
        status: webhookData?.Status || 'delivered',
        to: webhookData?.To,
        from: webhookData?.From,
        timestamp: webhookData?.DateSent || new Date().toISOString(),
    };
});

export const mockGetSMSStatus = jest.fn().mockImplementation((smsId: string) => {
    if (!smsId) {
        return Promise.reject(new Error('SMS ID is required'));
    }

    return Promise.resolve({
        smsId,
        status: 'delivered' as const,
        timestamp: new Date().toISOString(),
    });
});

export const mockGetCallRecording = jest.fn().mockImplementation((callSid: string) => {
    if (!callSid) {
        return Promise.reject(new Error('Call SID is required'));
    }

    return Promise.resolve({
        callSid,
        recordingUrl: `https://exotel.mock/recordings/${callSid}.mp3`,
        duration: 45,
        fileSize: 720000, // ~720KB for 45 seconds
    });
});

/**
 * Exotel Client Mock Class
 */
export class ExotelClient {
    // Method declarations for TypeScript
    initiateCall!: typeof mockInitiateCall;
    getCallStatus!: typeof mockGetCallStatus;
    sendSMS!: typeof mockSendSMS;
    getSMSStatus!: typeof mockGetSMSStatus;
    checkConfigured!: typeof mockCheckConfigured;
    handleCallStatusWebhook!: typeof mockHandleCallStatusWebhook;
    handleSMSStatusWebhook!: typeof mockHandleSMSStatusWebhook;
    getCallRecording!: typeof mockGetCallRecording;

    constructor() {
        // Mock constructor - no initialization needed
    }
}

// Define methods on prototype for proper mocking
ExotelClient.prototype.initiateCall = mockInitiateCall;
ExotelClient.prototype.getCallStatus = mockGetCallStatus;
ExotelClient.prototype.sendSMS = mockSendSMS;
ExotelClient.prototype.getSMSStatus = mockGetSMSStatus;
ExotelClient.prototype.checkConfigured = mockCheckConfigured;
ExotelClient.prototype.handleCallStatusWebhook = mockHandleCallStatusWebhook;
ExotelClient.prototype.handleSMSStatusWebhook = mockHandleSMSStatusWebhook;
ExotelClient.prototype.getCallRecording = mockGetCallRecording;

/**
 * Factory function to create Exotel client mock
 */
export const createExotelClientMock = () => new ExotelClient();

/**
 * Reset all Exotel mocks to their initial state
 */
export const resetExotelMocks = () => {
    mockInitiateCall.mockClear();
    mockGetCallStatus.mockClear();
    mockSendSMS.mockClear();
    mockGetSMSStatus.mockClear();
    mockCheckConfigured.mockClear();
    mockHandleCallStatusWebhook.mockClear();
    mockHandleSMSStatusWebhook.mockClear();
    mockGetCallRecording.mockClear();
};

/**
 * Configure Exotel mock to simulate failures
 */
export const configureExotelFailure = (
    type: 'service_unavailable' | 'invalid_credentials' | 'invalid_number' | 'insufficient_balance' = 'service_unavailable'
) => {
    const errorMessages = {
        service_unavailable: 'Exotel service temporarily unavailable',
        invalid_credentials: 'Invalid Exotel API credentials',
        invalid_number: 'Invalid phone number',
        insufficient_balance: 'Insufficient Exotel account balance',
    };

    const error = new Error(errorMessages[type]);
    (error as any).code = type.toUpperCase();

    mockInitiateCall.mockRejectedValue(error);
    mockSendSMS.mockRejectedValue(error);
};

/**
 * Configure Exotel mock to simulate call failures
 */
export const configureCallFailure = (failureReason: 'busy' | 'no-answer' | 'failed' = 'no-answer') => {
    mockInitiateCall.mockResolvedValue({
        success: false,
        callSid: `MOCK_CALL_FAILED_${Date.now()}`,
        status: failureReason as any,
        error: `Call ${failureReason}`,
    });

    mockGetCallStatus.mockResolvedValue({
        callSid: `MOCK_CALL_FAILED`,
        status: failureReason as any,
        duration: 0,
    });
};

/**
 * Configure Exotel mock to simulate SMS delivery failures
 */
export const configureSMSFailure = (failureReason: 'failed' | 'undelivered' = 'failed') => {
    mockSendSMS.mockResolvedValue({
        success: false,
        smsId: `MOCK_SMS_FAILED_${Date.now()}`,
        status: failureReason as any,
        error: `SMS ${failureReason}`,
    });

    mockGetSMSStatus.mockResolvedValue({
        smsId: 'MOCK_SMS_FAILED',
        status: failureReason as any,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Mock webhook payloads for testing
 */
export const mockWebhookPayloads = {
    callCompleted: {
        CallSid: 'MOCK_CALL_123',
        Status: 'completed',
        Duration: '45',
        DialCallStatus: 'completed',
        From: '+919876543210',
        To: '+918765432109',
        DateCreated: new Date(Date.now() - 60000).toISOString(),
        DateUpdated: new Date().toISOString(),
    },
    callNoAnswer: {
        CallSid: 'MOCK_CALL_124',
        Status: 'no-answer',
        Duration: '0',
        DialCallStatus: 'no-answer',
        From: '+919876543210',
        To: '+918765432109',
        DateCreated: new Date().toISOString(),
        DateUpdated: new Date().toISOString(),
    },
    callBusy: {
        CallSid: 'MOCK_CALL_125',
        Status: 'busy',
        Duration: '0',
        DialCallStatus: 'busy',
        From: '+919876543210',
        To: '+918765432109',
        DateCreated: new Date().toISOString(),
        DateUpdated: new Date().toISOString(),
    },
    smsDelivered: {
        SmsSid: 'MOCK_SMS_123',
        Status: 'delivered',
        From: '+918765432109',
        To: '+919876543210',
        Body: 'Test SMS message',
        DateSent: new Date().toISOString(),
    },
    smsFailed: {
        SmsSid: 'MOCK_SMS_124',
        Status: 'failed',
        From: '+918765432109',
        To: '+919876543210',
        Body: 'Test SMS message',
        ErrorCode: '30003',
        ErrorMessage: 'Unreachable destination',
        DateSent: new Date().toISOString(),
    },
};

/**
 * Mock call scenarios for NDR notifications
 */
export const mockNDRCallScenarios = {
    successful: () => {
        mockInitiateCall.mockResolvedValue({
            success: true,
            callSid: `NDR_CALL_${Date.now()}`,
            status: 'queued' as const,
        });
        mockGetCallStatus.mockResolvedValue({
            callSid: 'NDR_CALL',
            status: 'completed' as const,
            duration: 120, // 2 minutes call
        });
    },
    customerBusy: () => {
        configureCallFailure('busy');
    },
    noAnswer: () => {
        configureCallFailure('no-answer');
    },
};

export default ExotelClient;
