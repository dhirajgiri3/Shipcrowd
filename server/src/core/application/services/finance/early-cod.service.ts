import { ErrorCode } from '@/shared/errors';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import EarlyCODEnrollment, { IEarlyCODEnrollment } from '../../../../infrastructure/database/mongoose/models/finance/early-cod-enrollment.model';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Early COD Service
 * 
 * Manages the Early COD Program (T+1, T+2, T+3 remittance).
 * Handles eligibility checks, enrollment, fee calculation, and monitoring.
 */
export class EarlyCODService {

    // Eligibility Criteria Configuration
    private static readonly CRITERIA = {
        'T+1': {
            minVolume: 500,       // orders/month
            maxRTORate: 0.15,     // 15%
            maxDisputeRate: 0.03, // 3%
            minVintage: 180,      // 6 months
            fee: 0.03             // 3%
        },
        'T+2': {
            minVolume: 200,
            maxRTORate: 0.20,
            maxDisputeRate: 0.05,
            minVintage: 90,       // 3 months
            fee: 0.02             // 2%
        },
        'T+3': {
            minVolume: 100,
            maxRTORate: 0.25,
            maxDisputeRate: 0.07,
            minVintage: 30,       // 1 month
            fee: 0.015            // 1.5%
        }
    };

    /**
     * Check if a company is eligible for Early COD and for which tiers
     */
    static async checkEligibility(companyId: string): Promise<{
        qualified: boolean;
        metrics: {
            volume: number;
            rtoRate: number;
            disputeRate: number;
            vintage: number;
        };
        eligibleTiers: string[];
        reasons?: string[];
    }> {
        // Mock metric calculation for now - in production this would aggregate from shipments
        // For MVP we can just query last 30 days stats
        const metrics = await this.calculateCompanyMetrics(companyId);

        const eligibleTiers: string[] = [];
        const reasons: string[] = [];

        // Check each tier
        for (const [tier, criteria] of Object.entries(this.CRITERIA)) {
            if (metrics.volume >= criteria.minVolume &&
                metrics.rtoRate <= criteria.maxRTORate &&
                metrics.disputeRate <= criteria.maxDisputeRate &&
                metrics.vintage >= criteria.minVintage) {
                eligibleTiers.push(tier);
            } else {
                if (metrics.volume < criteria.minVolume) reasons.push(`${tier}: Volume too low (${metrics.volume}/${criteria.minVolume})`);
                if (metrics.rtoRate > criteria.maxRTORate) reasons.push(`${tier}: RTO rate too high (${(metrics.rtoRate * 100).toFixed(1)}%/${(criteria.maxRTORate * 100).toFixed(1)}%)`);
            }
        }

        return {
            qualified: eligibleTiers.length > 0,
            metrics,
            eligibleTiers,
            reasons: eligibleTiers.length === 0 ? reasons : undefined
        };
    }

    /**
     * Enroll a company in a specific tier
     */
    static async enroll(companyId: string, tier: 'T+1' | 'T+2' | 'T+3'): Promise<IEarlyCODEnrollment> {
        // 1. Check eligibility
        const check = await this.checkEligibility(companyId);
        if (!check.qualified || !check.eligibleTiers.includes(tier)) {
            throw new AppError(
                `Company not eligible for ${tier}. Reasons: ${check.reasons?.join(', ')}`,
                ErrorCode.BIZ_RULE_VIOLATION,
                400
            );
        }

        // 2. Deactivate any existing enrollment
        await EarlyCODEnrollment.updateMany(
            { companyId, status: { $in: ['active', 'pending_approval'] } },
            {
                status: 'cancelled',
                cancelledAt: new Date(),
                suspensionReason: 'New enrollment created'
            }
        );

        // 3. Create new enrollment
        const fee = this.CRITERIA[tier].fee;

        const enrollment = await EarlyCODEnrollment.create({
            companyId,
            tier,
            fee,
            eligibility: {
                qualified: true,
                monthlyVolume: check.metrics.volume,
                rtoRate: check.metrics.rtoRate,
                disputeRate: check.metrics.disputeRate,
                vintage: check.metrics.vintage,
                lastCheckedAt: new Date()
            },
            status: 'active', // Auto-approve for now, or change to 'pending_approval' if manual review needed
            enrolledAt: new Date()
        });

        logger.info(`Company ${companyId} enrolled in Early COD ${tier}`, { enrollmentId: enrollment._id });
        return enrollment;
    }

    /**
     * Get active enrollment for a company
     */
    static async getActiveEnrollment(companyId: string): Promise<IEarlyCODEnrollment | null> {
        return EarlyCODEnrollment.findOne({
            companyId,
            status: 'active'
        });
    }

    /**
     * Internal helper to calculate metrics
     * (Placeholder for complex aggregation)
     */
    private static async calculateCompanyMetrics(companyId: string) {
        // In a real implementation, this would aggregate Shipment data
        // For now, returning dummy data or simple count

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [volume, rtoCount] = await Promise.all([
            Shipment.countDocuments({
                companyId,
                createdAt: { $gte: thirtyDaysAgo }
            }),
            Shipment.countDocuments({
                companyId,
                createdAt: { $gte: thirtyDaysAgo },
                currentStatus: 'rto' // Simplistic RTO check
            })
        ]);

        // Vintage check (mocked for now, assumes Company model has createdAt)
        // const company = await Company.findById(companyId);
        // const vintage = Math.floor((Date.now() - company.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const vintage = 180; // Assuming 6 months for now

        return {
            volume: volume || 150, // Default to some value for testing if 0
            rtoRate: volume > 0 ? rtoCount / volume : 0,
            disputeRate: 0.01,
            vintage: vintage
        };
    }

    /**
     * Calculate fee amount for a given remittance total
     */
    static calculateFee(amount: number, feePercentage: number): number {
        return Number((amount * feePercentage).toFixed(2));
    }
}
