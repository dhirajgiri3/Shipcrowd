/**
 * NDRClassificationService
 *
 * Classifies NDR reasons using OpenAI with keyword fallback.
 */

import NDREvent from '../../../../infrastructure/database/mongoose/models/ndr-event.model';
import OpenAIService from '../../../../infrastructure/integrations/ai/openai.service';
import logger from '../../../../shared/logger/winston.logger';

export default class NDRClassificationService {
    /**
     * Classify NDR reason
     */
    static async classifyNDRReason(
        ndrReason: string,
        courierRemarks?: string
    ): Promise<{
        category: string;
        explanation: string;
        confidence: number;
        source: 'openai' | 'keyword';
    }> {
        return OpenAIService.classifyNDRReason(ndrReason, courierRemarks);
    }

    /**
     * Classify and update an existing NDR event
     */
    static async classifyAndUpdate(ndrEventId: string): Promise<void> {
        const ndrEvent = await NDREvent.findById(ndrEventId);

        if (!ndrEvent) {
            logger.error('NDR event not found for classification', { ndrEventId });
            return;
        }

        try {
            const classification = await this.classifyNDRReason(
                ndrEvent.ndrReason,
                ndrEvent.courierRemarks
            );

            ndrEvent.ndrType = classification.category as any;
            ndrEvent.ndrReasonClassified = classification.explanation;
            ndrEvent.classificationConfidence = classification.confidence;
            ndrEvent.classificationSource = classification.source;

            await ndrEvent.save();

            logger.info('NDR classified successfully', {
                ndrEventId,
                category: classification.category,
                confidence: classification.confidence,
                source: classification.source,
            });
        } catch (error: any) {
            logger.error('Failed to classify NDR', {
                ndrEventId,
                error: error.message,
            });

            // Set default classification on failure
            ndrEvent.ndrType = 'other';
            ndrEvent.classificationSource = 'keyword';
            ndrEvent.classificationConfidence = 0;
            await ndrEvent.save();
        }
    }

    /**
     * Batch classify unclassified NDRs
     * Issue #13: Concurrent batch processing (was sequential)
     * Before: 50 NDRs × 200ms = 10+ seconds
     * After: 50 NDRs / 10 batches × 200ms = ~1 second
     */
    static async batchClassify(limit: number = 50): Promise<number> {
        const BATCH_SIZE = 10; // Process 10 NDRs concurrently

        const unclassifiedNDRs = await NDREvent.find({
            $or: [
                { ndrReasonClassified: { $exists: false } },
                { ndrReasonClassified: null },
            ],
        }).limit(limit);

        let classified = 0;
        let failed = 0;

        // Process in batches of BATCH_SIZE concurrently
        for (let i = 0; i < unclassifiedNDRs.length; i += BATCH_SIZE) {
            const batch = unclassifiedNDRs.slice(i, i + BATCH_SIZE);

            const results = await Promise.allSettled(
                batch.map((ndr) => this.classifyAndUpdate(String(ndr._id)))
            );

            results.forEach((result) => {
                if (result.status === 'fulfilled') {
                    classified++;
                } else {
                    failed++;
                    logger.error('Batch classification error', {
                        error: result.reason?.message || String(result.reason),
                    });
                }
            });

            // Rate limiting between batches - wait 200ms
            if (i + BATCH_SIZE < unclassifiedNDRs.length) {
                await new Promise((resolve) => setTimeout(resolve, 200));
            }
        }

        logger.info('Batch classification completed', {
            total: unclassifiedNDRs.length,
            classified,
            failed,
            batchSize: BATCH_SIZE,
        });

        return classified;
    }

    /**
     * Get classification statistics
     */
    static async getClassificationStats(companyId?: string): Promise<{
        bySource: Record<string, number>;
        byCategory: Record<string, number>;
        avgConfidence: number;
    }> {
        const matchFilter: any = {};
        if (companyId) {
            matchFilter.company = companyId;
        }

        const [sourceStats, categoryStats, confidenceStats] = await Promise.all([
            NDREvent.aggregate([
                { $match: matchFilter },
                { $group: { _id: '$classificationSource', count: { $sum: 1 } } },
            ]),
            NDREvent.aggregate([
                { $match: matchFilter },
                { $group: { _id: '$ndrType', count: { $sum: 1 } } },
            ]),
            NDREvent.aggregate([
                { $match: { ...matchFilter, classificationConfidence: { $exists: true } } },
                { $group: { _id: null, avgConfidence: { $avg: '$classificationConfidence' } } },
            ]),
        ]);

        const bySource: Record<string, number> = {};
        sourceStats.forEach((s) => {
            bySource[s._id || 'unknown'] = s.count;
        });

        const byCategory: Record<string, number> = {};
        categoryStats.forEach((s) => {
            byCategory[s._id || 'unknown'] = s.count;
        });

        return {
            bySource,
            byCategory,
            avgConfidence: confidenceStats[0]?.avgConfidence || 0,
        };
    }
}
