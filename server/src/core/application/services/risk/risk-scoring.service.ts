/**
 * Risk Scoring Service
 *
 * Aggregates risk signals from address validation, phone verification, and COD checks
 * to calculate a comprehensive risk score for an order.
 */

import logger from '../../../../shared/logger/winston.logger';
import CODVerificationService from '../payment/cod-verification.service';
import AddressValidationService from '../validation/address-validation.service';
import PhoneVerificationService from '../validation/phone-verification.service';

interface OrderContext {
    orderValue: number;
    paymentMethod: 'COD' | 'PREPAID';
    customer: {
        name: string;
        phone: string;
        email?: string;
    };
    shippingAddress: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        pincode: string;
    };
    companyId: string;
}

interface RiskAssessment {
    riskScore: number; // 0 (Safe) to 1 (High Risk)
    level: 'low' | 'medium' | 'high' | 'critical';
    flags: string[];
    recommendation: 'approve' | 'flag_for_review' | 'reject_cod' | 'reject';
    details: {
        addressScore: number;
        codRisk?: number;
        phoneValid: boolean;
    };
    validationResults?: {
        address?: any;
        cod?: any;
    };
}

export class RiskScoringService {

    /**
     * Calculate risk score for an order
     */
    static async assessOrder(context: OrderContext): Promise<RiskAssessment> {
        const flags: string[] = [];
        let riskScore = 0;

        // 1. Address Validation
        const addressResult = await AddressValidationService.validate(context.shippingAddress);
        if (!addressResult.isValid) {
            flags.push(...addressResult.issues);
            riskScore += 0.4; // Significant risk if address is bad
        } else if (addressResult.type === 'suspicious') {
            flags.push(...addressResult.issues);
            riskScore += 0.2;
        }

        // 2. Phone Verification
        // Note: We only check format here. OTP verification typically happens earlier in checkout.
        if (!PhoneVerificationService.isValidFormat(context.customer.phone)) {
            flags.push('Invalid phone number format');
            riskScore += 0.3;
        }

        // 3. COD Risk
        let codRisk = 0;
        let codResult; // Store for return
        if (context.paymentMethod === 'COD') {
            codResult = await CODVerificationService.verify({
                orderValue: context.orderValue,
                customerPhone: context.customer.phone,
                customerEmail: context.customer.email,
                pincode: context.shippingAddress.pincode,
                companyId: context.companyId
            });

            if (!codResult.isAllowed) {
                flags.push(...codResult.reasons);
                riskScore += codResult.riskScore; // Add COD specific risk
                codRisk = codResult.riskScore;
            } else if (codResult.requiresConfirmation) {
                flags.push(...codResult.reasons);
                riskScore += 0.1; // Minor bump for warnings
            }
        }

        // Cap score at 1
        riskScore = Math.min(riskScore, 1);

        // Determine Level and Recommendation
        let level: RiskAssessment['level'] = 'low';
        let recommendation: RiskAssessment['recommendation'] = 'approve';

        if (riskScore >= 0.8) {
            level = 'critical';
            recommendation = context.paymentMethod === 'COD' ? 'reject_cod' : 'flag_for_review';
        } else if (riskScore >= 0.5) {
            level = 'high';
            recommendation = 'flag_for_review';
        } else if (riskScore >= 0.3) {
            level = 'medium';
        }

        logger.info('Risk assessment completed', {
            orderValue: context.orderValue,
            riskScore,
            level,
            flagsCount: flags.length
        });

        return {
            riskScore,
            level,
            flags,
            recommendation,
            details: {
                addressScore: addressResult.score,
                codRisk,
                phoneValid: !flags.includes('Invalid phone number format')
            },
            validationResults: {
                address: addressResult,
                cod: codResult
            }
        };
    }
}

export default RiskScoringService;
