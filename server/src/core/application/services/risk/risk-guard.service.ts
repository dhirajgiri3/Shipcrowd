
import mongoose from 'mongoose';
import BlacklistItem from '@/infrastructure/database/mongoose/models/risk/blacklist-item.model';
import { Company } from '@/infrastructure/database/mongoose/models';

interface RiskCheckInput {
    companyId: string;
    customerPhone: string;
    customerEmail?: string;
    destinationPincode: string;
    customerIp?: string;
    paymentMode: 'cod' | 'prepaid';
    orderValue: number;
}

interface RiskResult {
    status: 'ALLOWED' | 'BLOCKED' | 'FLAGGED';
    reasons: string[];
}

export default class RiskGuardService {
    /**
     * Evaluate an order against Blacklist and Company Rules
     */
    async evaluateOrder(input: RiskCheckInput): Promise<RiskResult> {
        const reasons: string[] = [];
        let status: 'ALLOWED' | 'BLOCKED' | 'FLAGGED' = 'ALLOWED';

        // 1. Fetch Company Settings
        const company = await Company.findById(input.companyId).select('settings.risk').lean();
        const settings = company?.settings?.risk || { maxCodAmount: 5000, blockBlacklisted: true };

        // 2. Check Blacklist (If enabled)
        if (settings.blockBlacklisted) {
            const blacklistMatches = await BlacklistItem.find({
                isActive: true,
                $or: [
                    { type: 'phone', value: input.customerPhone },
                    { type: 'email', value: input.customerEmail || '' },
                    { type: 'pincode', value: input.destinationPincode },
                    { type: 'ip', value: input.customerIp || '' }
                ]
            });

            if (blacklistMatches.length > 0) {
                const matchDetails = blacklistMatches.map(b => `${b.type}: ${b.value} (${b.reason})`).join(', ');
                reasons.push(`Blacklisted: ${matchDetails}`);
                return { status: 'BLOCKED', reasons }; // Immediate Block
            }
        }

        // 3. Check COD Threshold
        if (input.paymentMode === 'cod' && settings.maxCodAmount && input.orderValue > settings.maxCodAmount) {
            reasons.push(`COD Value ₹${input.orderValue} exceeds limit of ₹${settings.maxCodAmount}`);
            // We can FLAG or BLOCK based on policy. Usually high COD is just flagged or blocked.
            // Let's return BLOCKED for strictness as per "Guard" concept, or FLAGGED if configured.
            // For now, let's BLOCK to prevent loss.
            status = 'BLOCKED';
        }

        return { status, reasons };
    }
}
