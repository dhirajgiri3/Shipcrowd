/**
 * COD Verification Service
 *
 * Analyzes COD orders to detect high-risk transactions.
 * Checks improved customer history and RTO probability.
 */

import logger from '../../../../shared/logger/winston.logger';

interface CODContext {
    orderValue: number;
    customerPhone: string;
    customerEmail?: string;
    pincode: string;
    companyId: string;
}

interface CODVerificationResult {
    isAllowed: boolean;
    riskScore: number; // 0 to 1 (1 = high risk)
    reasons: string[];
    requiresConfirmation: boolean;
}

export class CODVerificationService {

    // Thresholds
    private static MAX_COD_AMOUNT = 50000; // INR
    private static HIGH_RISK_PINCODE_PREFIXES = ['110001', '400001']; // Example

    /**
     * Verify if COD should be allowed for this order
     */
    static async verify(context: CODContext): Promise<CODVerificationResult> {
        const reasons: string[] = [];
        let riskScore = 0;
        let requiresConfirmation = false;

        // 1. Amount Check
        if (context.orderValue > this.MAX_COD_AMOUNT) {
            reasons.push(`Order value ₹${context.orderValue} exceeds COD limit of ₹${this.MAX_COD_AMOUNT}`);
            riskScore = 1.0;
            return { isAllowed: false, riskScore, reasons, requiresConfirmation: false };
        }

        if (context.orderValue > 10000) {
            reasons.push('High value COD order');
            riskScore += 0.4;
            requiresConfirmation = true;
        }

        // 2. High Risk Pincode Check (Mock data/logic)
        // In real app, query historical RTO stats for this pincode
        if (this.HIGH_RISK_PINCODE_PREFIXES.includes(context.pincode)) {
            reasons.push('Delivery location marked as high RTO risk area');
            riskScore += 0.3;
            requiresConfirmation = true;
        }

        // 3. Customer History Check
        // Ideally DB lookup: await Order.countDocuments({ customerPhone, status: 'rto' })
        // Mocking for Phase 3 implementation
        const customerRtoCount = await this.getCustomerRTOCount(context.customerPhone);
        if (customerRtoCount > 2) {
            reasons.push('Customer has history of frequent returns (RTO)');
            riskScore += 0.5;
            requiresConfirmation = true;
        }

        // Decision
        const isAllowed = riskScore < 0.8;

        return {
            isAllowed,
            riskScore: Math.min(riskScore, 1),
            reasons,
            requiresConfirmation: requiresConfirmation || !isAllowed
        };
    }

    /**
     * Mock helper to get customer RTO count
     */
    private static async getCustomerRTOCount(phone: string): Promise<number> {
        // Import Customer/Order model dynamically if needed
        return 0; // Default safe for now
    }
}

export default CODVerificationService;
