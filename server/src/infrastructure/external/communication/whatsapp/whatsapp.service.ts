/**
 * WhatsAppService
 *
 * WhatsApp Business API integration for NDR and RTO notifications.
 */

import axios, { AxiosInstance } from 'axios';
import logger from '../../../shared/../../../../shared/logger/winston.logger';

interface SendMessageResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

interface WhatsAppMessage {
    messaging_product: 'whatsapp';
    recipient_type?: 'individual';
    to: string;
    type: 'template' | 'text' | 'interactive';
    template?: {
        name: string;
        language: { code: string };
        components?: any[];
    };
    text?: {
        body: string;
        preview_url?: boolean;
    };
    interactive?: {
        type: 'button' | 'list';
        body: { text: string };
        action: {
            buttons?: { type: 'reply'; reply: { id: string; title: string } }[];
            sections?: { title: string; rows: { id: string; title: string; description?: string }[] }[];
        };
    };
}

export class WhatsAppService {
    private client: AxiosInstance;
    private phoneNumberId: string;
    private isConfigured: boolean;

    constructor() {
        const apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

        this.isConfigured = !!(accessToken && this.phoneNumberId);

        this.client = axios.create({
            baseURL: apiUrl,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
    }

    /**
     * Check if WhatsApp is configured
     */
    private checkConfigured(): boolean {
        if (!this.isConfigured) {
            logger.warn('WhatsApp not configured - messages will be simulated');
        }
        return this.isConfigured;
    }

    /**
     * Send text message
     */
    async sendMessage(toNumber: string, message: string): Promise<SendMessageResult> {
        if (!this.checkConfigured()) {
            return this.mockMessage(toNumber, message, 'text');
        }

        try {
            const payload: WhatsAppMessage = {
                messaging_product: 'whatsapp',
                to: this.formatPhoneNumber(toNumber),
                type: 'text',
                text: {
                    body: message,
                    preview_url: false,
                },
            };

            const response = await this.client.post(
                `/${this.phoneNumberId}/messages`,
                payload
            );

            const messageId = response.data.messages?.[0]?.id;

            logger.info('WhatsApp message sent', {
                messageId,
                toNumber,
            });

            return {
                success: true,
                messageId,
            };
        } catch (error: any) {
            logger.error('WhatsApp message failed', {
                toNumber,
                error: error.message,
                response: error.response?.data,
            });

            return {
                success: false,
                error: error.response?.data?.error?.message || error.message,
            };
        }
    }

    /**
     * Send template message
     */
    async sendTemplateMessage(
        toNumber: string,
        templateName: string,
        parameters: Record<string, string>
    ): Promise<SendMessageResult> {
        if (!this.checkConfigured()) {
            return this.mockMessage(toNumber, `Template: ${templateName}`, 'template');
        }

        try {
            const components = this.buildTemplateComponents(parameters);

            const payload: WhatsAppMessage = {
                messaging_product: 'whatsapp',
                to: this.formatPhoneNumber(toNumber),
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: 'en' },
                    components,
                },
            };

            const response = await this.client.post(
                `/${this.phoneNumberId}/messages`,
                payload
            );

            const messageId = response.data.messages?.[0]?.id;

            logger.info('WhatsApp template message sent', {
                messageId,
                toNumber,
                template: templateName,
            });

            return {
                success: true,
                messageId,
            };
        } catch (error: any) {
            logger.error('WhatsApp template message failed', {
                toNumber,
                template: templateName,
                error: error.message,
            });

            return {
                success: false,
                error: error.response?.data?.error?.message || error.message,
            };
        }
    }

    /**
     * Send interactive message with buttons
     */
    async sendInteractiveMessage(
        toNumber: string,
        bodyText: string,
        buttons: { id: string; title: string }[]
    ): Promise<SendMessageResult> {
        if (!this.checkConfigured()) {
            return this.mockMessage(toNumber, bodyText, 'interactive');
        }

        try {
            const payload: WhatsAppMessage = {
                messaging_product: 'whatsapp',
                to: this.formatPhoneNumber(toNumber),
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: { text: bodyText },
                    action: {
                        buttons: buttons.slice(0, 3).map((btn) => ({
                            type: 'reply' as const,
                            reply: { id: btn.id, title: btn.title.substring(0, 20) },
                        })),
                    },
                },
            };

            const response = await this.client.post(
                `/${this.phoneNumberId}/messages`,
                payload
            );

            const messageId = response.data.messages?.[0]?.id;

            logger.info('WhatsApp interactive message sent', {
                messageId,
                toNumber,
                buttonCount: buttons.length,
            });

            return {
                success: true,
                messageId,
            };
        } catch (error: any) {
            logger.error('WhatsApp interactive message failed', {
                toNumber,
                error: error.message,
            });

            return {
                success: false,
                error: error.response?.data?.error?.message || error.message,
            };
        }
    }

    /**
     * Send NDR notification
     */
    async sendNDRNotification(
        toNumber: string,
        customerName: string,
        orderId: string,
        ndrReason: string
    ): Promise<SendMessageResult> {
        // Use template if configured, otherwise send text
        const message = `Hi ${customerName},

We attempted to deliver your order #${orderId} but encountered an issue:
*Reason:* ${ndrReason}

*What would you like to do?*
Reply with:
1️⃣ - Reschedule delivery
2️⃣ - Update address
3️⃣ - Cancel order

Need help? Contact our support team.

-Shipcrowd`;

        return this.sendMessage(toNumber, message);
    }

    /**
     * Send RTO notification
     */
    async sendRTONotification(
        toNumber: string,
        customerName: string,
        orderId: string,
        rtoReason: string,
        reverseAwb?: string
    ): Promise<SendMessageResult> {
        const message = `Hi ${customerName},

Your order #${orderId} is being returned due to: ${rtoReason}

${reverseAwb ? `*Return AWB:* ${reverseAwb}` : ''}

For assistance, please contact our support team.

-Shipcrowd`;

        return this.sendMessage(toNumber, message);
    }

    /**
     * Handle incoming webhook
     */
    handleWebhook(payload: any): {
        type: 'message' | 'status' | 'unknown';
        from?: string;
        messageId?: string;
        messageType?: string;
        text?: string;
        buttonReply?: { id: string; title: string };
        status?: string;
    } {
        try {
            const entry = payload.entry?.[0];
            const change = entry?.changes?.[0];
            const value = change?.value;

            // Handle incoming messages
            if (value?.messages?.[0]) {
                const message = value.messages[0];
                const contact = value.contacts?.[0];

                return {
                    type: 'message',
                    from: contact?.wa_id || message.from,
                    messageId: message.id,
                    messageType: message.type,
                    text: message.text?.body,
                    buttonReply: message.interactive?.button_reply,
                };
            }

            // Handle status updates
            if (value?.statuses?.[0]) {
                const status = value.statuses[0];
                return {
                    type: 'status',
                    messageId: status.id,
                    status: status.status,
                };
            }

            return { type: 'unknown' };
        } catch (error) {
            logger.error('Error parsing WhatsApp webhook', { error });
            return { type: 'unknown' };
        }
    }

    /**
     * Build template components from parameters
     */
    private buildTemplateComponents(parameters: Record<string, string>): any[] {
        const params = Object.values(parameters).map((value) => ({
            type: 'text',
            text: value,
        }));

        if (params.length === 0) return [];

        return [
            {
                type: 'body',
                parameters: params,
            },
        ];
    }

    /**
     * Format phone number for WhatsApp API
     */
    private formatPhoneNumber(phone: string): string {
        // Remove non-digits
        let cleaned = phone.replace(/\D/g, '');

        // Add country code if missing (default to India)
        if (!cleaned.startsWith('91') && cleaned.length === 10) {
            cleaned = '91' + cleaned;
        }

        return cleaned;
    }

    /**
     * Mock message for development
     */
    private mockMessage(
        toNumber: string,
        content: string,
        type: string
    ): SendMessageResult {
        const mockMessageId = `MOCK_WA_${Date.now()}`;
        logger.info('Mock WhatsApp message sent (not configured)', {
            messageId: mockMessageId,
            toNumber,
            type,
            contentLength: content.length,
        });

        return {
            success: true,
            messageId: mockMessageId,
        };
    }

    /**
     * Check if service is active
     */
    isActive(): boolean {
        return this.isConfigured;
    }
}

export default WhatsAppService;
