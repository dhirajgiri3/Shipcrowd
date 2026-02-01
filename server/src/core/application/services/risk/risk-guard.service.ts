
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
            status = 'BLOCKED';
        }

        // 4. Check History (RTO Rate) - Only for COD
        if (input.paymentMode === 'cod' && status !== 'BLOCKED') {
            const { Shipment } = await import('../../../../infrastructure/database/mongoose/models/index.js');

            // Performance optimization: Limit history check to last 50 orders or last 6 months
            const history = await Shipment.find({
                'deliveryDetails.recipientPhone': input.customerPhone,
                companyId: input.companyId
            })
                .select('currentStatus')
                .sort({ createdAt: -1 })
                .limit(50)
                .lean();

            if (history.length >= 5) { // Only check if enough history exists
                const total = history.length;
                const rtoCount = history.filter((s: any) =>
                    s.currentStatus === 'rto' ||
                    s.currentStatus === 'rto_initiated' ||
                    s.currentStatus === 'rto_delivered'
                ).length;

                const rtoRate = (rtoCount / total) * 100;

                // Configurable threshold (hardcoded 30% for now, ideally in settings.risk.maxRtoPercent)
                const maxRtoPercent = 30;

                if (rtoRate > maxRtoPercent) {
                    reasons.push(`High RTO Risk: ${rtoRate.toFixed(1)}% RTO rate on last ${total} orders.`);
                    status = 'BLOCKED';
                }
            }
        }

        return { status, reasons };
    }
}
