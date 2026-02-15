/**
 * OpenAI Fraud Detection Service
 * 
 * AI-powered fraud risk assessment using OpenAI GPT-4.
 * Analyzes order patterns and provides intelligent fraud detection.
 */

import logger from '@/shared/logger/winston.logger';
import OpenAI from 'openai';

// ============================================================================
// INTERFACES
// ============================================================================

interface IOrderContext {
    customerName: string;
    email?: string;
    phone: string;
    address: string;
    orderValue: number;
    codAmount?: number;
    items?: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    customerHistory?: {
        totalOrders: number;
        accountAge: number;
        previousFlags: number;
    };
}

interface IAIFraudAssessment {
    summary: string;
    indicators: string[];
    recommendation: 'approve' | 'review' | 'block';
    confidence: number;  // 0-1
    reasoning: string;
}

// ============================================================================
// SERVICE
// ============================================================================

export default class OpenAIFraudService {
    private static client: OpenAI | null = null;
    private static isEnabled: boolean = process.env.OPENAI_FRAUD_ENABLED === 'true';

    /**
     * Initialize OpenAI client
     */
    private static getClient(): OpenAI | null {
        if (!this.isEnabled) {
            logger.warn('OpenAI fraud detection is disabled');
            return null;
        }

        if (!this.client) {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                logger.error('OPENAI_API_KEY not configured');
                return null;
            }

            this.client = new OpenAI({
                apiKey,
            });
        }

        return this.client;
    }

    /**
     * Analyze order for fraud using AI
     */
    static async analyzeOrder(orderContext: IOrderContext): Promise<IAIFraudAssessment | null> {
        const client = this.getClient();
        if (!client) {
            return null;
        }

        try {
            logger.info('Analyzing order with OpenAI', {
                orderValue: orderContext.orderValue,
            });

            const prompt = this.buildPrompt(orderContext);
            const model = process.env.OPENAI_MODEL || 'gpt-4';

            const completion = await client.chat.completions.create({
                model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a fraud detection expert analyzing e-commerce orders. Provide concise, actionable fraud risk assessments.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.3,  // Lower temperature for more consistent results
                max_tokens: 500,
            });

            const response = completion.choices[0]?.message?.content;
            if (!response) {
                logger.warn('No response from OpenAI');
                return null;
            }

            const assessment = this.parseResponse(response);

            logger.info('OpenAI fraud analysis complete', {
                recommendation: assessment.recommendation,
                confidence: assessment.confidence,
            });

            return assessment;
        } catch (error) {
            logger.error('OpenAI fraud analysis failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }

    /**
     * Build prompt for OpenAI
     */
    private static buildPrompt(context: IOrderContext): string {
        const parts: string[] = [
            'Analyze this e-commerce order for fraud risk:',
            '',
            `Customer: ${context.customerName}`,
            `Phone: ${context.phone}`,
            context.email ? `Email: ${context.email}` : '',
            `Address: ${context.address}`,
            `Order Value: ₹${context.orderValue.toLocaleString()}`,
            context.codAmount ? `COD Amount: ₹${context.codAmount.toLocaleString()}` : 'Payment: Prepaid',
        ];

        if (context.customerHistory) {
            parts.push('');
            parts.push('Customer History:');
            parts.push(`- Total Orders: ${context.customerHistory.totalOrders}`);
            parts.push(`- Account Age: ${context.customerHistory.accountAge} days`);
            parts.push(`- Previous Fraud Flags: ${context.customerHistory.previousFlags}`);
        }

        if (context.items && context.items.length > 0) {
            parts.push('');
            parts.push('Items:');
            context.items.forEach(item => {
                parts.push(`- ${item.name} (Qty: ${item.quantity}, Price: ₹${item.price})`);
            });
        }

        parts.push('');
        parts.push('Provide your assessment in this exact format:');
        parts.push('SUMMARY: [One sentence summary]');
        parts.push('INDICATORS: [Comma-separated list of fraud indicators, or "None"]');
        parts.push('RECOMMENDATION: [approve/review/block]');
        parts.push('CONFIDENCE: [0.0-1.0]');
        parts.push('REASONING: [Brief explanation]');

        return parts.filter(Boolean).join('\n');
    }

    /**
     * Parse OpenAI response
     */
    private static parseResponse(response: string): IAIFraudAssessment {
        const lines = response.split('\n').map(l => l.trim()).filter(Boolean);

        let summary = '';
        let indicators: string[] = [];
        let recommendation: 'approve' | 'review' | 'block' = 'review';
        let confidence = 0.5;
        let reasoning = '';

        for (const line of lines) {
            if (line.startsWith('SUMMARY:')) {
                summary = line.replace('SUMMARY:', '').trim();
            } else if (line.startsWith('INDICATORS:')) {
                const indicatorStr = line.replace('INDICATORS:', '').trim();
                if (indicatorStr.toLowerCase() !== 'none') {
                    indicators = indicatorStr.split(',').map(i => i.trim());
                }
            } else if (line.startsWith('RECOMMENDATION:')) {
                const rec = line.replace('RECOMMENDATION:', '').trim().toLowerCase();
                if (rec === 'approve' || rec === 'review' || rec === 'block') {
                    recommendation = rec;
                }
            } else if (line.startsWith('CONFIDENCE:')) {
                const confStr = line.replace('CONFIDENCE:', '').trim();
                const confNum = parseFloat(confStr);
                if (!isNaN(confNum) && confNum >= 0 && confNum <= 1) {
                    confidence = confNum;
                }
            } else if (line.startsWith('REASONING:')) {
                reasoning = line.replace('REASONING:', '').trim();
            }
        }

        return {
            summary: summary || 'AI analysis completed',
            indicators,
            recommendation,
            confidence,
            reasoning: reasoning || 'No specific reasoning provided',
        };
    }
}
