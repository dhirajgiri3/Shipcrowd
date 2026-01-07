/**
 * OpenAIService
 *
 * Reusable OpenAI integration for AI operations.
 *
 * Features:
 * - NDR reason classification
 * - Customer message generation
 * - Fallback to rule-based if API fails
 * - Token usage tracking
 */

import OpenAI from 'openai';
import logger from '../../../../shared/logger/winston.logger';

interface ClassificationResult {
    category: string;
    explanation: string;
    confidence: number;
    source: 'openai' | 'keyword';
}

interface MessageGenerationResult {
    message: string;
    source: 'openai' | 'template';
}

export class OpenAIService {
    private static client: OpenAI | null = null;
    private static model: string = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    private static maxTokens: number = parseInt(process.env.OPENAI_MAX_TOKENS || '150', 10);
    private static temperature: number = parseFloat(process.env.OPENAI_TEMPERATURE || '0.3');

    /**
     * Initialize OpenAI client
     */
    private static getClient(): OpenAI {
        if (!this.client) {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                logger.warn('OpenAI API key not configured, will use fallback methods');
                throw new Error('OpenAI API key not configured');
            }
            this.client = new OpenAI({ apiKey });
        }
        return this.client;
    }

    /**
     * Classify NDR reason using OpenAI
     */
    static async classifyNDRReason(
        ndrReason: string,
        courierRemarks?: string
    ): Promise<ClassificationResult> {
        try {
            const client = this.getClient();

            const prompt = `You are an expert logistics analyst. Classify the following delivery failure reason into exactly one category.

Raw NDR Reason: "${ndrReason}"
${courierRemarks ? `Courier Remarks: "${courierRemarks}"` : ''}

Categories:
1. address_issue - Wrong/incomplete address, house locked, address not found
2. customer_unavailable - Customer not available, not reachable, phone switched off
3. refused - Customer refused delivery, rejected package
4. payment_issue - COD not accepted, payment declined
5. other - Any other reason

Respond in this exact format:
Category: <category_name>
Explanation: <one sentence explanation>`;

            const response = await client.chat.completions.create({
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: this.maxTokens,
                temperature: this.temperature,
            });

            const content = response.choices[0]?.message?.content || '';

            // Parse response
            const categoryMatch = content.match(/Category:\s*(\w+)/i);
            const explanationMatch = content.match(/Explanation:\s*(.+)/i);

            const category = categoryMatch?.[1]?.toLowerCase() || 'other';
            const explanation = explanationMatch?.[1] || 'Classified by AI';

            // Log token usage
            const usage = response.usage;
            if (usage) {
                logger.info('OpenAI classification completed', {
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                    totalTokens: usage.total_tokens,
                    category,
                });
            }

            return {
                category: this.validateCategory(category),
                explanation,
                confidence: 85, // AI classification confidence
                source: 'openai',
            };
        } catch (error: any) {
            logger.warn('OpenAI classification failed, using keyword fallback', {
                error: error.message,
            });

            // Fallback to keyword-based classification
            return this.keywordClassify(ndrReason, courierRemarks);
        }
    }

    /**
     * Keyword-based NDR classification fallback
     */
    private static keywordClassify(
        ndrReason: string,
        courierRemarks?: string
    ): ClassificationResult {
        const text = `${ndrReason} ${courierRemarks || ''}`.toLowerCase();

        // Address issues
        if (
            text.includes('address') ||
            text.includes('wrong') ||
            text.includes('incomplete') ||
            text.includes('not found') ||
            text.includes('locked') ||
            text.includes('door closed')
        ) {
            return {
                category: 'address_issue',
                explanation: 'Classified by keyword matching: address-related terms found',
                confidence: 70,
                source: 'keyword',
            };
        }

        // Customer unavailable
        if (
            text.includes('not available') ||
            text.includes('unavailable') ||
            text.includes('unreachable') ||
            text.includes('switched off') ||
            text.includes('no response') ||
            text.includes('not at home')
        ) {
            return {
                category: 'customer_unavailable',
                explanation: 'Classified by keyword matching: customer availability terms found',
                confidence: 70,
                source: 'keyword',
            };
        }

        // Refused
        if (
            text.includes('refused') ||
            text.includes('rejected') ||
            text.includes('deny') ||
            text.includes('declined') ||
            text.includes('not accepted')
        ) {
            return {
                category: 'refused',
                explanation: 'Classified by keyword matching: refusal terms found',
                confidence: 70,
                source: 'keyword',
            };
        }

        // Payment issue
        if (
            text.includes('cod') ||
            text.includes('payment') ||
            text.includes('cash') ||
            text.includes('money')
        ) {
            return {
                category: 'payment_issue',
                explanation: 'Classified by keyword matching: payment terms found',
                confidence: 70,
                source: 'keyword',
            };
        }

        // Default
        return {
            category: 'other',
            explanation: 'No specific keywords matched, classified as other',
            confidence: 50,
            source: 'keyword',
        };
    }

    /**
     * Validate category is one of the allowed values
     */
    private static validateCategory(category: string): string {
        const validCategories = ['address_issue', 'customer_unavailable', 'refused', 'payment_issue', 'other'];
        return validCategories.includes(category) ? category : 'other';
    }

    /**
     * Generate personalized customer message for NDR notification
     */
    static async generateCustomerMessage(
        ndrType: string,
        customerName: string,
        orderId: string,
        additionalContext?: string
    ): Promise<MessageGenerationResult> {
        try {
            const client = this.getClient();

            const prompt = `Generate a brief, friendly WhatsApp message for a customer about a delivery issue.

Customer Name: ${customerName}
Order ID: ${orderId}
Issue Type: ${ndrType}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}

The message should:
- Be polite and empathetic
- Be under 150 words
- Include the order ID
- Suggest next steps
- Not use formal salutations like "Dear"

Generate only the message text, no quotation marks.`;

            const response = await client.chat.completions.create({
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200,
                temperature: 0.7,
            });

            const message = response.choices[0]?.message?.content || '';

            return {
                message: message.trim(),
                source: 'openai',
            };
        } catch (error: any) {
            logger.warn('OpenAI message generation failed, using template', {
                error: error.message,
            });

            // Fallback to template
            return {
                message: this.getTemplateMessage(ndrType, customerName, orderId),
                source: 'template',
            };
        }
    }

    /**
     * Template message fallback
     */
    private static getTemplateMessage(
        ndrType: string,
        customerName: string,
        orderId: string
    ): string {
        const templates: Record<string, string> = {
            address_issue: `Hi ${customerName},

We tried to deliver your order #${orderId} but couldn't locate the address.

Please update your address or provide landmarks to help our delivery partner. Reply to this message with the correct address.

- Shipcrowd Team`,

            customer_unavailable: `Hi ${customerName},

We attempted to deliver your order #${orderId} but you weren't available.

Reply with:
1 - Reschedule tomorrow
2 - Different time preference
3 - Cancel order

- Shipcrowd Team`,

            refused: `Hi ${customerName},

Our records show order #${orderId} was refused during delivery.

If this was a mistake, please let us know and we'll arrange redelivery.

- Shipcrowd Team`,

            payment_issue: `Hi ${customerName},

There was a payment issue with your COD order #${orderId}.

Please confirm if you'd like us to attempt delivery again with the exact amount ready.

- Shipcrowd Team`,

            other: `Hi ${customerName},

We encountered an issue delivering order #${orderId}.

Please contact us or reply to this message so we can resolve it quickly.

- Shipcrowd Team`,
        };

        return templates[ndrType] || templates.other;
    }

    /**
     * Generate resolution suggestion for NDR
     */
    static async generateResolutionSuggestion(
        ndrType: string,
        attemptNumber: number,
        previousActions: string[]
    ): Promise<string> {
        try {
            const client = this.getClient();

            const prompt = `As a logistics expert, suggest the next best action for resolving this delivery issue.

NDR Type: ${ndrType}
Attempt Number: ${attemptNumber}
Previous Actions Taken: ${previousActions.length > 0 ? previousActions.join(', ') : 'None'}

Suggest ONE specific action from these options:
- Call customer
- Send WhatsApp
- Update address
- Request reattempt
- Trigger RTO (return)

Respond with just the action name and a brief reason.`;

            const response = await client.chat.completions.create({
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 100,
                temperature: 0.3,
            });

            return response.choices[0]?.message?.content?.trim() || 'Send WhatsApp for customer response';
        } catch (error) {
            // Default suggestion based on attempt number
            if (attemptNumber === 1) return 'Send WhatsApp notification';
            if (attemptNumber === 2) return 'Call customer';
            if (attemptNumber >= 3) return 'Consider triggering RTO';
            return 'Contact customer for resolution';
        }
    }

    /**
     * Analyze commission trends for forecasting
     * Used by CommissionAIInsightsService for forecast enhancement
     */
    static async analyzeCommissionTrends(prompt: string): Promise<string> {
        try {
            const client = this.getClient();

            const response = await client.chat.completions.create({
                model: this.model,
                messages: [{
                    role: 'system',
                    content: 'You are a financial analyst specializing in sales commission forecasting. Provide accurate, conservative predictions based on data.'
                }, {
                    role: 'user',
                    content: prompt
                }],
                max_tokens: 300,
                temperature: 0.2, // Low temperature for numerical accuracy
                response_format: { type: 'json_object' }
            });

            return response.choices[0]?.message?.content || '{"adjustmentFactor": 1.0, "confidence": 70, "insight": "Statistical forecast confirmed", "reasoning": "Insufficient context for adjustment"}';
        } catch (error: any) {
            logger.warn('Commission trends analysis failed', { error: error.message });
            // Return conservative fallback
            return '{"adjustmentFactor": 1.0, "confidence": 60, "insight": "Using statistical forecast only", "reasoning": "AI analysis unavailable"}';
        }
    }

    /**
     * Analyze anomalies with AI context
     * Used by CommissionAIInsightsService for anomaly validation
     */
    static async analyzeAnomalies(prompt: string): Promise<string> {
        try {
            const client = this.getClient();

            const response = await client.chat.completions.create({
                model: this.model,
                messages: [{
                    role: 'system',
                    content: 'You are a risk analyst. Determine if statistical anomalies are genuinely concerning or have valid explanations.'
                }, {
                    role: 'user',
                    content: prompt
                }],
                max_tokens: 200,
                temperature: 0.3,
                response_format: { type: 'json_object' }
            });

            return response.choices[0]?.message?.content || '{"isGenuineAnomaly": true, "adjustedSeverity": "warning", "explanation": "Statistical anomaly detected", "suggestedAction": "Review manually"}';
        } catch (error: any) {
            logger.warn('Anomaly analysis failed', { error: error.message });
            return '{"isGenuineAnomaly": true, "adjustedSeverity": "warning", "explanation": "Unable to analyze context", "suggestedAction": "Review manually"}';
        }
    }

    /**
     * Generate performance recommendations
     * Used by CommissionAIInsightsService for personalized suggestions
     */
    static async generatePerformanceRecommendations(prompt: string): Promise<string> {
        try {
            const client = this.getClient();

            const response = await client.chat.completions.create({
                model: this.model,
                messages: [{
                    role: 'system',
                    content: 'You are a sales performance coach. Generate specific, actionable recommendations based on metrics.'
                }, {
                    role: 'user',
                    content: prompt
                }],
                max_tokens: 400,
                temperature: 0.5, // Moderate creativity for suggestions
                response_format: { type: 'json_object' }
            });

            const content = response.choices[0]?.message?.content;
            if (content) {
                // Ensure the response is an array
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                    return content;
                } else if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
                    return JSON.stringify(parsed.recommendations);
                }
            }

            // Fallback
            return '[{"priority": "medium", "category": "strategy", "title": "Maintain consistency", "description": "Continue current performance level", "expectedImpact": "Stable growth", "actionItems": ["Track metrics weekly"], "estimatedEffort": "low"}]';
        } catch (error: any) {
            logger.warn('Performance recommendations failed', { error: error.message });
            return '[{"priority": "medium", "category": "strategy", "title": "Review performance metrics", "description": "AI recommendations unavailable", "expectedImpact": "N/A", "actionItems": ["Consult with manager"], "estimatedEffort": "low"}]';
        }
    }

    /**
     * Check if OpenAI is configured
     */
    static isConfigured(): boolean {
        return !!process.env.OPENAI_API_KEY;
    }
}

export default OpenAIService;
