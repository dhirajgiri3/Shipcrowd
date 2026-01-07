/**
 * Inventory Analytics
 * 
 * Purpose: Inventory Analytics Service
 * 
 * DEPENDENCIES:
 * - Database Models, Logger
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import { Inventory } from '../../../../infrastructure/database/mongoose/models';
import { StockMovement } from '../../../../infrastructure/database/mongoose/models';
import AnalyticsService from './analytics.service';
import logger from '../../../../shared/logger/winston.logger';
import mongoose from 'mongoose';

export interface StockLevels {
    totalSKUs: number;
    totalStockValue: number;
    totalOnHand: number;
    lowStockCount: number;
    outOfStockCount: number;
}

export interface SlowMovingProduct {
    sku: string;
    productName: string;
    onHand: number;
    lastMovement: Date | null;
    daysSinceMovement: number;
}

export default class InventoryAnalyticsService {
    /**
     * Get stock level summary
     */
    static async getStockLevels(companyId: string, warehouseId?: string): Promise<StockLevels> {
        try {
            const companyObjectId = new mongoose.Types.ObjectId(companyId);
            const matchFilter: any = { companyId: companyObjectId };

            if (warehouseId) {
                matchFilter.warehouseId = new mongoose.Types.ObjectId(warehouseId);
            }

            const [stats] = await Inventory.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: null,
                        totalSKUs: { $sum: 1 },
                        totalOnHand: { $sum: '$onHand' },
                        totalStockValue: {
                            $sum: { $multiply: ['$onHand', { $ifNull: ['$unitCost', 0] }] }
                        },
                        lowStockCount: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $gt: ['$onHand', 0] },
                                            { $lte: ['$onHand', { $ifNull: ['$reorderPoint', 10] }] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },
                        outOfStockCount: {
                            $sum: { $cond: [{ $lte: ['$onHand', 0] }, 1, 0] }
                        }
                    }
                }
            ]);

            return stats || {
                totalSKUs: 0,
                totalStockValue: 0,
                totalOnHand: 0,
                lowStockCount: 0,
                outOfStockCount: 0
            };
        } catch (error) {
            logger.error('Error getting stock levels:', error);
            throw error;
        }
    }

    /**
     * Get slow-moving products (no movement in last 90 days)
     */
    static async getSlowMovingProducts(
        companyId: string,
        limit = 20
    ): Promise<SlowMovingProduct[]> {
        try {
            const companyObjectId = new mongoose.Types.ObjectId(companyId);
            const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

            // Get inventory with last movement date
            const results = await Inventory.aggregate([
                { $match: { companyId: companyObjectId, onHand: { $gt: 0 } } },
                {
                    $lookup: {
                        from: 'stockmovements',
                        let: { invId: '$_id' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$inventory', '$$invId'] } } },
                            { $sort: { createdAt: -1 } },
                            { $limit: 1 }
                        ],
                        as: 'lastMovement'
                    }
                },
                { $unwind: { path: '$lastMovement', preserveNullAndEmptyArrays: true } },
                {
                    $match: {
                        $or: [
                            { 'lastMovement.createdAt': { $lt: ninetyDaysAgo } },
                            { lastMovement: null }
                        ]
                    }
                },
                { $sort: { 'lastMovement.createdAt': 1 } },
                { $limit: limit },
                {
                    $project: {
                        _id: 0,
                        sku: 1,
                        productName: 1,
                        onHand: 1,
                        lastMovement: { $ifNull: ['$lastMovement.createdAt', null] },
                        daysSinceMovement: {
                            $cond: [
                                { $ne: ['$lastMovement.createdAt', null] },
                                {
                                    $divide: [
                                        { $subtract: [new Date(), '$lastMovement.createdAt'] },
                                        1000 * 60 * 60 * 24
                                    ]
                                },
                                999
                            ]
                        }
                    }
                }
            ]);

            return results.map(r => ({
                ...r,
                daysSinceMovement: Math.floor(r.daysSinceMovement)
            }));
        } catch (error) {
            logger.error('Error getting slow-moving products:', error);
            throw error;
        }
    }
}
