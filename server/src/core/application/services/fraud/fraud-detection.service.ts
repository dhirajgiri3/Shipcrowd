/**
 * Fraud Detection Service
 * 
 * Core fraud detection logic with real-time risk scoring,
 * pattern matching, and blacklist verification.
 */

import { Order } from '@/infrastructure/database/mongoose/models';
import Blacklist, { IBlacklist } from '@/infrastructure/database/mongoose/models/fraud/blacklist.model';
import FraudAlert, { IFraudAlert } from '@/infrastructure/database/mongoose/models/fraud/fraud-alert.model';
import FraudRule, { IFraudRule } from '@/infrastructure/database/mongoose/models/fraud/fraud-rule.model';
import logger from '@/shared/logger/winston.logger';
import mongoose from 'mongoose';
import OpenAIFraudService from './openai-fraud.service';

// ============================================================================
// INTERFACES
// ============================================================================

export interface IOrderAnalysisInput {
    companyId: string;
    customerId?: string;
    customerDetails: {
        name: string;
        email?: string;
        phone: string;
        address: string;
    };
    orderValue: number;
    codAmount?: number;
    ipAddress?: string;
    userAgent?: string;
}

export interface IFraudAnalysisResult {
    score: number;                          // 0-100
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendation: 'approve' | 'review' | 'block';
    matchedRules: Array<{
        ruleId: string;
        ruleName: string;
        weight: number;
    }>;
    blacklistMatches: Array<{
        type: string;
        value: string;
    }>;
    details: {
        patternScore: number;
        blacklistScore: number;
        velocityScore: number;
        aiScore?: number;
    };
    aiAnalysis?: {
        summary: string;
        indicators: string[];
        recommendation: 'approve' | 'review' | 'block';
        confidence: number;
    };
}

export interface IBlacklistEntry {
    type: 'phone' | 'email' | 'address' | 'ip';
    value: string;
    reason: string;
    severity?: 'low' | 'medium' | 'high';
    expiresAt?: Date;
    createdBy: string;
}

// ============================================================================
// SERVICE
// ============================================================================

export default class FraudDetectionService {
    /**
     * Analyze order for fraud risk
     * Returns comprehensive risk assessment
     */
    static async analyzeOrder(data: IOrderAnalysisInput): Promise<IFraudAnalysisResult> {
        logger.info('Analyzing order for fraud risk', {
            companyId: data.companyId,
            orderValue: data.orderValue,
        });

        let totalScore = 0;
        const matchedRules: Array<{
            ruleId: string;
            ruleName: string;
            weight: number;
        }> = [];
        const blacklistMatches: Array<{
            type: string;
            value: string;
        }> = [];

        // 1. Check blacklist (0-30 points)
        const blacklistResult = await this.checkBlacklist(data);
        if (blacklistResult.isBlacklisted) {
            totalScore += 30;
            blacklistMatches.push(...blacklistResult.matches);
        }

        // 2. Check patterns (0-40 points)
        const patternResult = await this.checkPatterns(data);
        totalScore += patternResult.score;
        matchedRules.push(...patternResult.matchedRules);

        // 3. Check velocity (0-20 points)
        const velocityResult = await this.checkVelocity(data);
        totalScore += velocityResult.score;
        if (velocityResult.matched) {
            matchedRules.push({
                ruleId: 'velocity',
                ruleName: 'High Velocity Orders',
                weight: velocityResult.score,
            });
        }

        // 4. AI assessment (0-10 points)
        let aiScore = 0;
        let aiAnalysis: IFraudAnalysisResult['aiAnalysis'] | null = null;

        try {
            const aiAssessment = await OpenAIFraudService.analyzeOrder({
                customerName: data.customerDetails.name,
                email: data.customerDetails.email,
                phone: data.customerDetails.phone,
                address: data.customerDetails.address,
                orderValue: data.orderValue,
                codAmount: data.codAmount,
            });

            if (aiAssessment) {
                aiScore = aiAssessment.confidence * 10; // Convert 0-1 to 0-10
                totalScore += aiScore;
                aiAnalysis = {
                    summary: aiAssessment.summary,
                    indicators: aiAssessment.indicators,
                    recommendation: aiAssessment.recommendation,
                    confidence: aiAssessment.confidence,
                };
            }
        } catch (error) {
            logger.warn('OpenAI fraud analysis failed, continuing without AI', {
                error: error instanceof Error ? error.message : String(error),
            });
        }

        // Cap at 100
        totalScore = Math.min(totalScore, 100);

        // Determine risk level
        const riskLevel = this.calculateRiskLevel(totalScore);
        const recommendation = this.getRecommendation(riskLevel);

        logger.info('Fraud analysis complete', {
            score: totalScore,
            riskLevel,
            recommendation,
            rulesMatched: matchedRules.length,
        });

        return {
            score: totalScore,
            riskLevel,
            recommendation,
            matchedRules,
            blacklistMatches,
            details: {
                patternScore: patternResult.score,
                blacklistScore: blacklistResult.isBlacklisted ? 30 : 0,
                velocityScore: velocityResult.score,
                aiScore,
            },
            aiAnalysis: aiAnalysis || undefined,
        };
    }

    /**
     * Check if order matches fraud patterns
     */
    static async checkPatterns(
        data: IOrderAnalysisInput
    ): Promise<{
        score: number;
        matchedRules: Array<{
            ruleId: string;
            ruleName: string;
            weight: number;
        }>;
    }> {
        const matchedRules: Array<{
            ruleId: string;
            ruleName: string;
            weight: number;
        }> = [];
        let score = 0;

        try {
            // Get active fraud rules
            const rules = await FraudRule.find({ active: true });

            for (const rule of rules) {
                let matched = false;

                switch (rule.type) {
                    case 'value':
                        matched = await this.checkValuePattern(rule, data);
                        break;
                    case 'address':
                        matched = await this.checkAddressPattern(rule, data);
                        break;
                    case 'phone':
                        matched = await this.checkPhonePattern(rule, data);
                        break;
                    case 'behavioral':
                        matched = await this.checkBehavioralPattern(rule, data);
                        break;
                    default:
                        matched = false;
                }

                if (matched) {
                    score += rule.weight;
                    matchedRules.push({
                        ruleId: (rule._id as mongoose.Types.ObjectId).toString(),
                        ruleName: rule.name,
                        weight: rule.weight,
                    });

                    // Record match
                    await rule.recordMatch();
                }
            }
        } catch (error) {
            logger.error('Error checking fraud patterns', {
                error: error instanceof Error ? error.message : String(error),
            });
        }

        return { score: Math.min(score, 40), matchedRules };
    }

    /**
     * Check blacklist
     */
    static async checkBlacklist(
        data: IOrderAnalysisInput
    ): Promise<{
        isBlacklisted: boolean;
        matches: Array<{
            type: string;
            value: string;
        }>;
    }> {
        const matches: Array<{
            type: string;
            value: string;
        }> = [];

        try {
            // Check phone
            if (data.customerDetails.phone) {
                const normalizedPhone = Blacklist.normalizeValue('phone', data.customerDetails.phone);
                const phoneBlacklist = await Blacklist.findOne({
                    type: 'phone',
                    normalizedValue: normalizedPhone,
                });

                if (phoneBlacklist && phoneBlacklist.isActive()) {
                    matches.push({
                        type: 'phone',
                        value: data.customerDetails.phone,
                    });
                    await phoneBlacklist.recordBlock();
                }
            }

            // Check email
            if (data.customerDetails.email) {
                const normalizedEmail = Blacklist.normalizeValue('email', data.customerDetails.email);
                const emailBlacklist = await Blacklist.findOne({
                    type: 'email',
                    normalizedValue: normalizedEmail,
                });

                if (emailBlacklist && emailBlacklist.isActive()) {
                    matches.push({
                        type: 'email',
                        value: data.customerDetails.email,
                    });
                    await emailBlacklist.recordBlock();
                }
            }

            // Check IP
            if (data.ipAddress) {
                const normalizedIP = Blacklist.normalizeValue('ip', data.ipAddress);
                const ipBlacklist = await Blacklist.findOne({
                    type: 'ip',
                    normalizedValue: normalizedIP,
                });

                if (ipBlacklist && ipBlacklist.isActive()) {
                    matches.push({
                        type: 'ip',
                        value: data.ipAddress,
                    });
                    await ipBlacklist.recordBlock();
                }
            }
        } catch (error) {
            logger.error('Error checking blacklist', {
                error: error instanceof Error ? error.message : String(error),
            });
        }

        return {
            isBlacklisted: matches.length > 0,
            matches,
        };
    }

    /**
     * Check order velocity (frequency)
     */
    static async checkVelocity(
        data: IOrderAnalysisInput
    ): Promise<{
        score: number;
        matched: boolean;
    }> {
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

            const recentOrders = await Order.countDocuments({
                companyId: new mongoose.Types.ObjectId(data.companyId),
                createdAt: { $gte: oneHourAgo },
            });

            const velocityLimit = parseInt(process.env.FRAUD_VELOCITY_LIMIT || '5', 10);

            if (recentOrders >= velocityLimit) {
                return { score: 20, matched: true };
            }

            return { score: 0, matched: false };
        } catch (error) {
            logger.error('Error checking velocity', {
                error: error instanceof Error ? error.message : String(error),
            });
            return { score: 0, matched: false };
        }
    }

    /**
     * Create fraud alert
     */
    static async createAlert(
        orderId: string,
        analysis: IFraudAnalysisResult,
        orderData: any
    ): Promise<IFraudAlert> {
        try {
            const alertId = await FraudAlert.generateAlertId();

            const alert = await FraudAlert.create({
                alertId,
                orderId: new mongoose.Types.ObjectId(orderId),
                companyId: new mongoose.Types.ObjectId(orderData.companyId),
                customerId: orderData.customerId ? new mongoose.Types.ObjectId(orderData.customerId) : undefined,
                riskLevel: analysis.riskLevel,
                fraudScore: analysis.score,
                matchedRules: analysis.matchedRules as any,
                blacklistMatches: analysis.blacklistMatches,
                status: 'pending',
                confidence: 0,
                metadata: {
                    orderData,
                    ipAddress: orderData.ipAddress,
                    userAgent: orderData.userAgent,
                },
            });

            logger.info('Fraud alert created', {
                alertId: alert.alertId,
                riskLevel: alert.riskLevel,
                score: alert.fraudScore,
            });

            return alert;
        } catch (error) {
            logger.error('Error creating fraud alert', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * Add to blacklist
     */
    static async addToBlacklist(entry: IBlacklistEntry): Promise<IBlacklist> {
        try {
            const blacklist = await Blacklist.create({
                ...entry,
                isPermanent: !entry.expiresAt,
                source: 'manual',
                createdBy: 'system',
            });

            logger.info('Added to blacklist', {
                type: entry.type,
                value: entry.value,
            });

            return blacklist;
        } catch (error) {
            logger.error('Error adding to blacklist', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * Remove from blacklist
     */
    static async removeFromBlacklist(id: string): Promise<void> {
        try {
            await Blacklist.findByIdAndDelete(new mongoose.Types.ObjectId(id));
            logger.info('Removed from blacklist', { id });
        } catch (error) {
            logger.error('Error removing from blacklist', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    // ========================================================================
    // PRIVATE HELPER METHODS
    // ========================================================================

    private static async checkValuePattern(
        rule: IFraudRule,
        data: IOrderAnalysisInput
    ): Promise<boolean> {
        try {
            // Example: High COD amount for new accounts
            if (rule.condition.includes('cod_amount') && data.codAmount) {
                const threshold = rule.threshold || 50000;
                return data.codAmount > threshold;
            }
            return false;
        } catch (error) {
            logger.error('Error checking value pattern', {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }

    private static async checkAddressPattern(
        rule: IFraudRule,
        data: IOrderAnalysisInput
    ): Promise<boolean> {
        try {
            // Example: Multiple orders to same address
            const recentOrders = await Order.countDocuments({
                'deliveryAddress.address': data.customerDetails.address,
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            });

            return recentOrders > (rule.threshold || 3);
        } catch (error) {
            logger.error('Error checking address pattern', {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }

    private static async checkPhonePattern(
        rule: IFraudRule,
        data: IOrderAnalysisInput
    ): Promise<boolean> {
        try {
            // Example: Multiple accounts with same phone
            const accountCount = await Order.distinct('companyId', {
                'customerDetails.phone': data.customerDetails.phone,
            }).then(ids => ids.length);

            return accountCount > (rule.threshold || 3);
        } catch (error) {
            logger.error('Error checking phone pattern', {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }

    private static async checkBehavioralPattern(
        _rule: IFraudRule,
        _data: IOrderAnalysisInput
    ): Promise<boolean> {
        try {
            // Placeholder for behavioral analysis
            // Future implementation: Analyze customer behavior patterns
            // - Purchase frequency changes
            // - Item category patterns
            // - Delivery location patterns
            // - Time of order patterns
            return false;
        } catch (error) {
            logger.error('Error checking behavioral pattern', {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }

    private static calculateRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
        if (score >= 76) return 'critical';
        if (score >= 51) return 'high';
        if (score >= 26) return 'medium';
        return 'low';
    }

    private static getRecommendation(
        riskLevel: 'low' | 'medium' | 'high' | 'critical'
    ): 'approve' | 'review' | 'block' {
        switch (riskLevel) {
            case 'critical':
                return 'block';
            case 'high':
                return 'review';
            case 'medium':
                return 'review';
            case 'low':
            default:
                return 'approve';
        }
    }
}
