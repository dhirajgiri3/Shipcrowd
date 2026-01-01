/**
 * ExotelClient
 *
 * Exotel API client for automated customer calls.
 */

import axios, { AxiosInstance } from 'axios';
import logger from '../../../shared/logger/winston.logger';

interface ExotelCallResponse {
    CallSid: string;
    Status: string;
    DateCreated: string;
    DateUpdated: string;
}

interface CallResult {
    success: boolean;
    callSid?: string;
    status?: string;
    error?: string;
}

interface SMSResult {
    success: boolean;
    smsId?: string;
    error?: string;
}

export class ExotelClient {
    private client: AxiosInstance;
    private sid: string;
    private callerId: string;
    private baseUrl: string;
    private isConfigured: boolean;

    constructor() {
        this.sid = process.env.EXOTEL_SID || '';
        const apiKey = process.env.EXOTEL_API_KEY || '';
        const apiToken = process.env.EXOTEL_API_TOKEN || '';
        this.callerId = process.env.EXOTEL_CALLER_ID || '';
        this.baseUrl = `https://api.exotel.com/v1/Accounts/${this.sid}`;

        this.isConfigured = !!(this.sid && apiKey && apiToken && this.callerId);

        this.client = axios.create({
            baseURL: this.baseUrl,
            auth: {
                username: apiKey,
                password: apiToken,
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 30000,
        });
    }

    /**
     * Check if Exotel is configured
     */
    checkConfigured(): boolean {
        if (!this.isConfigured) {
            logger.warn('Exotel not configured - calls will be simulated');
        }
        return this.isConfigured;
    }

    /**
     * Initiate outbound call
     */
    async initiateCall(
        toNumber: string,
        callbackUrl?: string,
        customField?: string
    ): Promise<CallResult> {
        if (!this.checkConfigured()) {
            // Return mock response for development
            return this.mockCall(toNumber);
        }

        try {
            const params = new URLSearchParams({
                From: toNumber,
                To: this.callerId, // Agent number or IVR
                CallerId: this.callerId,
                CallType: 'trans',
            });

            if (callbackUrl) {
                params.append('StatusCallback', callbackUrl);
            }

            if (customField) {
                params.append('CustomField', customField);
            }

            const response = await this.client.post('/Calls/connect.json', params.toString());
            const data = response.data.Call as ExotelCallResponse;

            logger.info('Exotel call initiated', {
                callSid: data.CallSid,
                toNumber,
                status: data.Status,
            });

            return {
                success: true,
                callSid: data.CallSid,
                status: data.Status,
            };
        } catch (error: any) {
            logger.error('Exotel call failed', {
                toNumber,
                error: error.message,
                response: error.response?.data,
            });

            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get call status
     */
    async getCallStatus(callSid: string): Promise<{
        status: string;
        duration?: number;
        recordingUrl?: string;
    }> {
        if (!this.checkConfigured()) {
            return { status: 'completed', duration: 45 };
        }

        try {
            const response = await this.client.get(`/Calls/${callSid}.json`);
            const call = response.data.Call;

            return {
                status: call.Status,
                duration: parseInt(call.Duration, 10) || 0,
                recordingUrl: call.RecordingUrl,
            };
        } catch (error: any) {
            logger.error('Failed to get call status', {
                callSid,
                error: error.message,
            });

            return { status: 'unknown' };
        }
    }

    /**
     * Send SMS via Exotel
     */
    async sendSMS(toNumber: string, message: string): Promise<SMSResult> {
        if (!this.checkConfigured()) {
            return this.mockSMS(toNumber, message);
        }

        try {
            const params = new URLSearchParams({
                From: this.callerId,
                To: toNumber,
                Body: message,
            });

            const response = await this.client.post('/Sms/send.json', params.toString());
            const data = response.data.SMSMessage;

            logger.info('Exotel SMS sent', {
                smsId: data.Sid,
                toNumber,
            });

            return {
                success: true,
                smsId: data.Sid,
            };
        } catch (error: any) {
            logger.error('Exotel SMS failed', {
                toNumber,
                error: error.message,
            });

            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Handle call status webhook
     */
    handleCallStatusWebhook(payload: Record<string, any>): {
        callSid: string;
        status: string;
        duration: number;
        digits?: string;
    } {
        return {
            callSid: payload.CallSid || payload.call_sid || '',
            status: payload.Status || payload.status || '',
            duration: parseInt(payload.Duration || payload.duration || '0', 10),
            digits: payload.Digits || payload.digits,
        };
    }

    /**
     * Mock call for development
     */
    private mockCall(toNumber: string): CallResult {
        const mockCallSid = `MOCK_CALL_${Date.now()}`;
        logger.info('Mock call initiated (Exotel not configured)', {
            callSid: mockCallSid,
            toNumber,
        });

        return {
            success: true,
            callSid: mockCallSid,
            status: 'initiated',
        };
    }

    /**
     * Mock SMS for development
     */
    private mockSMS(toNumber: string, message: string): SMSResult {
        const mockSMSId = `MOCK_SMS_${Date.now()}`;
        logger.info('Mock SMS sent (Exotel not configured)', {
            smsId: mockSMSId,
            toNumber,
            messageLength: message.length,
        });

        return {
            success: true,
            smsId: mockSMSId,
        };
    }
}

export default ExotelClient;
