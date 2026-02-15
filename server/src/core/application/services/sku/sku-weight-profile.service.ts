/**
 * SKU Weight Profile Service
 * 
 * Implements intelligent weight learning and suggestion system to prevent disputes at source.
 * Uses Welford's online algorithm for running statistics (memory efficient).
 * 
 * BUSINESS RULES:
 * ===============
 * 1. Weight Learning
 *    - Only learn from VERIFIED shipments (weights.verified = true)
 *    - Minimum 10 samples before suggesting weights
 *    - Update statistics in real-time as shipments are verified
 * 
 * 2. Confidence Scoring
 *    - High confidence (80-100): 20+ samples, low std dev (<5%)
 *    - Medium confidence (50-79): 10-19 samples, moderate std dev (5-15%)
 *    - Low confidence (0-49): <10 samples or high std dev (>15%)
 * 
 * 3. Weight Suggestions
 *    - Only suggest if confidence >= 50%
 *    - Use mean weight as suggested value
 *    - Allow manual override by sellers
 * 
 * 4. Frozen Weights
 *    - Admin can freeze weight for consistent products
 *    - Frozen weights always used, ignore statistics
 *    - Prevents disputes for standardized items
 */

import mongoose from 'mongoose';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import { SKUWeightProfile } from '../../../../infrastructure/database/mongoose/models/logistics/shipping/configuration/sku-weight-profile.model';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

interface WeightSuggestion {
    value: number;
    unit: 'kg';
    confidenceScore: number;
    sampleCount: number;
    source: 'sku_profile' | 'frozen';
    variability: 'low' | 'medium' | 'high';
}

export class SKUWeightProfileService {
    private static readonly MIN_SAMPLES_FOR_SUGGESTION = 10;
    private static readonly MEDIUM_CONFIDENCE_THRESHOLD = 50;

    /**
     * Learn from a verified shipment weight
     * Uses Welford's algorithm for numerically stable running statistics
     * 
     * @param companyId - Company ID
     * @param sku - Product SKU
     * @param weightKg - Verified weight in kg
     * @param productName - Optional product name
     */
    async learnFromShipment(
        companyId: string,
        sku: string,
        weightKg: number,
        productName?: string
    ): Promise<void> {
        try {
            // Find or create SKU weight profile record
            let skuProfile = await SKUWeightProfile.findOne({
                companyId: new mongoose.Types.ObjectId(companyId),
                sku,
                isDeleted: false
            });

            if (!skuProfile) {
                // Create new record
                skuProfile = new SKUWeightProfile({
                    companyId: new mongoose.Types.ObjectId(companyId),
                    sku,
                    productName,
                    statistics: {
                        sampleCount: 0,
                        mean: 0,
                        m2: 0,
                        standardDeviation: 0,
                        min: weightKg,
                        max: weightKg,
                        lastUpdated: new Date()
                    },
                    firstShipmentDate: new Date(),
                    lastShipmentDate: new Date()
                });
            }

            // Skip learning if frozen
            if (skuProfile.frozen?.isFrozen) {
                logger.info('[SKU Profile] Weight is frozen, skipping learning', {
                    sku,
                    frozenWeight: skuProfile.frozen.frozenWeight
                });
                return;
            }

            // Welford's algorithm for online mean and variance
            const n = skuProfile.statistics.sampleCount + 1;
            const oldMean = skuProfile.statistics.mean;
            const delta = weightKg - oldMean;
            const newMean = oldMean + delta / n;
            const delta2 = weightKg - newMean;
            const newM2 = skuProfile.statistics.m2 + delta * delta2;

            // Update statistics
            skuProfile.statistics.sampleCount = n;
            skuProfile.statistics.mean = newMean;
            skuProfile.statistics.m2 = newM2;
            skuProfile.statistics.standardDeviation = n > 1 ? Math.sqrt(newM2 / (n - 1)) : 0;
            skuProfile.statistics.min = Math.min(skuProfile.statistics.min || weightKg, weightKg);
            skuProfile.statistics.max = Math.max(skuProfile.statistics.max || weightKg, weightKg);
            skuProfile.statistics.lastUpdated = new Date();

            // Update suggested weight
            const confidenceScore = this.calculateConfidenceScore(
                skuProfile.statistics.sampleCount,
                skuProfile.statistics.standardDeviation,
                skuProfile.statistics.mean
            );

            skuProfile.suggestedWeight = {
                value: newMean,
                unit: 'kg',
                confidenceScore,
                lastCalculated: new Date()
            };

            skuProfile.lastShipmentDate = new Date();

            await skuProfile.save();

            logger.info('[SKU Profile] Weight learned from shipment', {
                sku,
                weightKg,
                sampleCount: n,
                mean: newMean,
                stdDev: skuProfile.statistics.standardDeviation,
                confidenceScore
            });
        } catch (error: any) {
            logger.error('[SKU Profile] Failed to learn from shipment', {
                sku,
                error: error.message
            });
            // Don't throw - learning failures shouldn't block shipment processing
        }
    }

    /**
     * Get weight suggestion for order creation
     * 
     * @param companyId - Company ID
     * @param sku - Product SKU
     * @returns Weight suggestion or null if not enough data
     */
    async suggestWeight(companyId: string, sku: string): Promise<WeightSuggestion | null> {
        try {
            const skuProfile = await SKUWeightProfile.findOne({
                companyId: new mongoose.Types.ObjectId(companyId),
                sku,
                isDeleted: false,
                isActive: true
            });

            if (!skuProfile) {
                return null;
            }

            // If frozen, always use frozen weight
            if (skuProfile.frozen?.isFrozen && skuProfile.frozen.frozenWeight) {
                return {
                    value: skuProfile.frozen.frozenWeight,
                    unit: 'kg',
                    confidenceScore: 100, // Frozen weights have 100% confidence
                    sampleCount: skuProfile.statistics.sampleCount,
                    source: 'frozen',
                    variability: 'low'
                };
            }

            // Check minimum sample requirement
            if (skuProfile.statistics.sampleCount < SKUWeightProfileService.MIN_SAMPLES_FOR_SUGGESTION) {
                logger.debug('[SKU Profile] Insufficient samples for suggestion', {
                    sku,
                    sampleCount: skuProfile.statistics.sampleCount,
                    required: SKUWeightProfileService.MIN_SAMPLES_FOR_SUGGESTION
                });
                return null;
            }

            // Check confidence threshold
            if (skuProfile.suggestedWeight.confidenceScore < SKUWeightProfileService.MEDIUM_CONFIDENCE_THRESHOLD) {
                logger.debug('[SKU Profile] Low confidence, not suggesting', {
                    sku,
                    confidenceScore: skuProfile.suggestedWeight.confidenceScore
                });
                return null;
            }

            // Calculate variability level
            const coefficientOfVariation = (skuProfile.statistics.standardDeviation / skuProfile.statistics.mean) * 100;
            const variability = coefficientOfVariation < 5 ? 'low' :
                               coefficientOfVariation < 15 ? 'medium' : 'high';

            return {
                value: skuProfile.suggestedWeight.value,
                unit: 'kg',
                confidenceScore: skuProfile.suggestedWeight.confidenceScore,
                sampleCount: skuProfile.statistics.sampleCount,
                source: 'sku_profile',
                variability
            };
        } catch (error: any) {
            logger.error('[SKU Profile] Failed to get weight suggestion', {
                sku,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Update SKU statistics based on dispute resolution
     * 
     * @param companyId - Company ID
     * @param sku - Product SKU
     * @param disputeOutcome - Resolution outcome
     */
    async updateFromDispute(
        companyId: string,
        sku: string,
        disputeOutcome: 'seller_favor' | 'Shipcrowd_favor' | 'split' | 'waived'
    ): Promise<void> {
        try {
            const skuProfile = await SKUWeightProfile.findOne({
                companyId: new mongoose.Types.ObjectId(companyId),
                sku,
                isDeleted: false
            });

            if (!skuProfile) {
                logger.warn('[SKU Profile] SKU not found for dispute update', { sku });
                return;
            }

            // Update dispute history
            skuProfile.disputeHistory.totalDisputes += 1;
            skuProfile.disputeHistory.lastDisputeDate = new Date();

            if (disputeOutcome === 'seller_favor') {
                skuProfile.disputeHistory.resolvedInSellerFavor += 1;
            } else if (disputeOutcome === 'Shipcrowd_favor') {
                skuProfile.disputeHistory.resolvedInCarrierFavor += 1;
            }

            // Recalculate confidence score (reduce confidence if disputes are frequent)
            const disputeRate = skuProfile.disputeHistory.totalDisputes / Math.max(skuProfile.statistics.sampleCount, 1);
            
            // Penalty: Reduce confidence by up to 20 points if dispute rate > 10%
            let confidencePenalty = 0;
            if (disputeRate > 0.1) {
                confidencePenalty = Math.min(20, (disputeRate - 0.1) * 100);
            }

            const baseConfidence = this.calculateConfidenceScore(
                skuProfile.statistics.sampleCount,
                skuProfile.statistics.standardDeviation,
                skuProfile.statistics.mean
            );

            skuProfile.suggestedWeight.confidenceScore = Math.max(0, baseConfidence - confidencePenalty);
            skuProfile.suggestedWeight.lastCalculated = new Date();

            await skuProfile.save();

            logger.info('[SKU Profile] Updated from dispute resolution', {
                sku,
                disputeOutcome,
                totalDisputes: skuProfile.disputeHistory.totalDisputes,
                disputeRate: (disputeRate * 100).toFixed(1) + '%',
                newConfidence: skuProfile.suggestedWeight.confidenceScore
            });
        } catch (error: any) {
            logger.error('[SKU Profile] Failed to update from dispute', {
                sku,
                error: error.message
            });
        }
    }

    /**
     * Freeze weight for a SKU (admin action)
     * 
     * @param companyId - Company ID
     * @param sku - Product SKU
     * @param frozenWeight - Fixed weight in kg
     * @param userId - Admin user ID
     * @param reason - Reason for freezing
     */
    async freezeWeight(
        companyId: string,
        sku: string,
        frozenWeight: number,
        userId: string,
        reason: string
    ): Promise<void> {
        const skuProfile = await SKUWeightProfile.findOne({
            companyId: new mongoose.Types.ObjectId(companyId),
            sku,
            isDeleted: false
        });

        if (!skuProfile) {
            throw new AppError(`SKU ${sku} not found`, 'BIZ_NOT_FOUND', 404);
        }

        skuProfile.frozen = {
            isFrozen: true,
            frozenWeight,
            frozenBy: new mongoose.Types.ObjectId(userId),
            frozenAt: new Date(),
            reason
        };

        await skuProfile.save();

        logger.info('[SKU Profile] Weight frozen', {
            sku,
            frozenWeight,
            reason,
            userId
        });
    }

    /**
     * Unfreeze weight for a SKU (admin action)
     */
    async unfreezeWeight(companyId: string, sku: string): Promise<void> {
        const skuProfile = await SKUWeightProfile.findOne({
            companyId: new mongoose.Types.ObjectId(companyId),
            sku,
            isDeleted: false
        });

        if (!skuProfile) {
            throw new AppError(`SKU ${sku} not found`, 'BIZ_NOT_FOUND', 404);
        }

        skuProfile.frozen = {
            isFrozen: false,
            frozenWeight: undefined,
            frozenBy: undefined,
            frozenAt: undefined,
            reason: undefined
        };

        await skuProfile.save();

        logger.info('[SKU Profile] Weight unfrozen', { sku });
    }

    /**
     * Get SKU weight master details
     */
    async getSKUMasterDetails(companyId: string, sku: string): Promise<any> {
        const skuProfile = await SKUWeightProfile.findOne({
            companyId: new mongoose.Types.ObjectId(companyId),
            sku,
            isDeleted: false
        }).lean();

        return skuProfile;
    }

    /**
     * List all SKU masters for a company
     */
    async listSKUMasters(
        companyId: string,
        filters?: {
            minConfidence?: number;
            onlyFrozen?: boolean;
            search?: string;
        }
    ): Promise<any[]> {
        const query: any = {
            companyId: new mongoose.Types.ObjectId(companyId),
            isDeleted: false
        };

        if (filters?.minConfidence) {
            query['suggestedWeight.confidenceScore'] = { $gte: filters.minConfidence };
        }

        if (filters?.onlyFrozen) {
            query['frozen.isFrozen'] = true;
        }

        if (filters?.search) {
            query.$or = [
                { sku: { $regex: filters.search, $options: 'i' } },
                { productName: { $regex: filters.search, $options: 'i' } }
            ];
        }

        return await SKUWeightProfile.find(query)
            .sort({ 'statistics.sampleCount': -1 })
            .lean();
    }

    /**
     * Calculate confidence score based on sample size and variability
     * 
     * Formula:
     * - Base score from sample count (0-60 points)
     * - Consistency bonus from low std dev (0-40 points)
     * 
     * @param sampleCount - Number of verified shipments
     * @param stdDev - Standard deviation in kg
     * @param mean - Mean weight in kg
     * @returns Confidence score (0-100)
     */
    private calculateConfidenceScore(sampleCount: number, stdDev: number, mean: number): number {
        if (sampleCount === 0 || mean === 0) return 0;

        // Sample count score (logarithmic, capped at 60)
        const sampleScore = Math.min(60, Math.log10(sampleCount + 1) * 30);

        // Consistency score (based on coefficient of variation)
        const coefficientOfVariation = (stdDev / mean) * 100;
        let consistencyScore = 0;

        if (coefficientOfVariation < 2) {
            consistencyScore = 40; // Very consistent
        } else if (coefficientOfVariation < 5) {
            consistencyScore = 30; // Consistent
        } else if (coefficientOfVariation < 10) {
            consistencyScore = 20; // Moderately consistent
        } else if (coefficientOfVariation < 15) {
            consistencyScore = 10; // Variable
        }
        // >15% CV = 0 points (too variable)

        const totalScore = Math.round(sampleScore + consistencyScore);

        return Math.min(100, totalScore);
    }

    /**
     * Bulk learn from existing shipments (one-time migration)
     * Run this once to populate SKU Master from historical data
     */
    async bulkLearnFromHistory(companyId: string, limit: number = 1000): Promise<number> {
        try {
            // Find all verified shipments with SKU info
            const shipments = await Shipment.find({
                companyId: new mongoose.Types.ObjectId(companyId),
                'weights.verified': true,
                'weights.actual.value': { $exists: true, $gt: 0 },
                'packageDetails.items': { $exists: true, $ne: [] },
                isDeleted: false
            })
            .select('packageDetails.items weights.actual')
            .limit(limit)
            .lean();

            logger.info('[SKU Profile] Starting bulk learning', {
                companyId,
                shipmentCount: shipments.length
            });

            const samplesBySku = new Map<string, { weights: number[]; name?: string }>();
            for (const shipment of shipments) {
                const items = (shipment as any).packageDetails?.items || [];
                const actualWeight = (shipment as any).weights?.actual?.value;

                if (items.length === 1 && actualWeight) {
                    const item = items[0];
                    if (!item.sku) continue;

                    const key = item.sku;
                    if (!samplesBySku.has(key)) {
                        samplesBySku.set(key, { weights: [], name: item.name });
                    }
                    samplesBySku.get(key)!.weights.push(actualWeight);
                }
            }

            const skus = Array.from(samplesBySku.keys());
            if (skus.length === 0) {
                return 0;
            }

            const existingProfiles = await SKUWeightProfile.find({
                companyId: new mongoose.Types.ObjectId(companyId),
                sku: { $in: skus },
                isDeleted: false
            });
            const existingBySku = new Map(existingProfiles.map(profile => [profile.sku, profile]));

            const now = new Date();
            const bulkOps: any[] = [];
            let processed = 0;

            for (const [sku, data] of samplesBySku.entries()) {
                const weights = data.weights;
                if (weights.length === 0) continue;

                const existing = existingBySku.get(sku);
                if (existing?.frozen?.isFrozen) {
                    continue;
                }

                let batchMean = 0;
                let batchM2 = 0;
                let batchMin = weights[0];
                let batchMax = weights[0];
                let batchCount = 0;
                for (const weight of weights) {
                    batchCount++;
                    const delta = weight - batchMean;
                    batchMean += delta / batchCount;
                    const delta2 = weight - batchMean;
                    batchM2 += delta * delta2;
                    batchMin = Math.min(batchMin, weight);
                    batchMax = Math.max(batchMax, weight);
                }

                if (!existing) {
                    bulkOps.push({
                        insertOne: {
                            document: {
                                companyId: new mongoose.Types.ObjectId(companyId),
                                sku,
                                productName: data.name,
                                statistics: {
                                    sampleCount: batchCount,
                                    mean: batchMean,
                                    m2: batchM2,
                                    standardDeviation: batchCount > 1 ? Math.sqrt(batchM2 / (batchCount - 1)) : 0,
                                    min: batchMin,
                                    max: batchMax,
                                    lastUpdated: now
                                },
                                firstShipmentDate: now,
                                lastShipmentDate: now
                            }
                        }
                    });
                    processed += batchCount;
                    continue;
                }

                const existingStats = existing.statistics;
                const totalCount = existingStats.sampleCount + batchCount;
                const deltaMean = batchMean - existingStats.mean;
                const combinedMean = (existingStats.mean * existingStats.sampleCount + batchMean * batchCount) / totalCount;
                const combinedM2 = existingStats.m2
                    + batchM2
                    + (deltaMean * deltaMean * existingStats.sampleCount * batchCount) / totalCount;
                const combinedStdDev = totalCount > 1 ? Math.sqrt(combinedM2 / (totalCount - 1)) : 0;
                const combinedMin = Math.min(existingStats.min ?? batchMin, batchMin);
                const combinedMax = Math.max(existingStats.max ?? batchMax, batchMax);

                bulkOps.push({
                    updateOne: {
                        filter: { _id: existing._id },
                        update: {
                            $set: {
                                productName: existing.productName || data.name,
                                'statistics.sampleCount': totalCount,
                                'statistics.mean': combinedMean,
                                'statistics.m2': combinedM2,
                                'statistics.standardDeviation': combinedStdDev,
                                'statistics.min': combinedMin,
                                'statistics.max': combinedMax,
                                'statistics.lastUpdated': now,
                                lastShipmentDate: now
                            }
                        }
                    }
                });
                processed += batchCount;
            }

            if (bulkOps.length > 0) {
                await SKUWeightProfile.bulkWrite(bulkOps);
            }

            logger.info('[SKU Profile] Bulk learning completed', {
                companyId,
                processed,
                total: shipments.length
            });

            return processed;
        } catch (error: any) {
            logger.error('[SKU Profile] Bulk learning failed', {
                companyId,
                error: error.message
            });
            throw error;
        }
    }
}
void SKUWeightProfileService;

export default new SKUWeightProfileService();
