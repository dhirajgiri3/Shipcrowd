import mongoose from 'mongoose';
import CODDiscrepancy, { ICODDiscrepancy } from '../../../../infrastructure/database/mongoose/models/finance/cod-discrepancy.model';
import Shipment from '../../../../infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model';
import logger from '../../../../shared/logger/winston.logger';
import { AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { ICODDiscrepancyResolution } from './cod-discrepancy.types';

/**
 * COD Discrepancy Service
 * 
 * Manages the lifecycle of COD discrepancies:
 * - Creation (detection)
 * - Resolution (auto-accept, adjustment)
 * - Escalation
 * - Reporting
 */
export class CODDiscrepancyService {

    /**
     * Create a new discrepancy
     * Idempotent: Checks if active discrepancy already exists for this shipment
     */
    static async createDiscrepancy(data: {
        shipmentId: string;
        awb: string;
        companyId: string;
        carrier: string;
        expectedAmount: number;
        actualAmount: number;
        source: 'webhook' | 'api' | 'mis' | 'manual';
        type?: ICODDiscrepancy['type'];
        severity?: ICODDiscrepancy['severity'];
        evidence?: any[];
    }): Promise<ICODDiscrepancy> {

        // Check for existing active discrepancy
        const existing = await CODDiscrepancy.findOne({
            shipmentId: data.shipmentId,
            status: { $in: ['detected', 'under_review', 'courier_queried', 'disputed'] }
        });

        if (existing) {
            logger.info(`Discrepancy already exists for shipment ${data.awb}`, { discrepancyId: existing._id });
            return existing;
        }

        const diff = data.actualAmount - data.expectedAmount;
        const percentage = data.expectedAmount > 0
            ? ((diff) / data.expectedAmount) * 100
            : 0;

        // Auto-determine type if not provided
        let type = data.type;
        if (!type) {
            if (diff !== 0) type = 'amount_mismatch';
            else type = 'payment_method_mismatch'; // Amounts match but something else triggered it
        }

        // Auto-determine severity
        let severity = data.severity || 'medium';
        if (Math.abs(diff) < 50) severity = 'minor';
        else if (Math.abs(diff) > 500) severity = 'major';
        else if (Math.abs(diff) > 2000) severity = 'critical';

        const discrepancyNumber = `CODD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const discrepancy = await CODDiscrepancy.create({
            discrepancyNumber,
            shipmentId: data.shipmentId,
            awb: data.awb,
            companyId: data.companyId,
            carrier: data.carrier,
            amounts: {
                expected: {
                    cod: data.expectedAmount, // Simplified for now
                    total: data.expectedAmount
                },
                actual: {
                    collected: data.actualAmount,
                    reported: data.actualAmount,
                    source: data.source
                },
                difference: diff,
                percentage: Number(percentage.toFixed(2))
            },
            type,
            severity,
            status: 'detected',
            evidence: data.evidence || [],
            autoResolveAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        });

        // Update shipment
        await Shipment.findByIdAndUpdate(data.shipmentId, {
            'paymentDetails.collectionStatus': 'disputed',
            'paymentDetails.discrepancyId': discrepancy._id,
            $push: {
                'paymentDetails.timeline': {
                    status: 'disputed',
                    timestamp: new Date(),
                    source: 'system',
                    notes: `Discrepancy detected: ₹${diff} (${type})`
                }
            }
        });

        logger.info(`Created COD discrepancy ${discrepancyNumber} for AWB ${data.awb}`);
        return discrepancy;
    }

    /**
     * Resolve a discrepancy
     */
    static async resolveDiscrepancy(
        discrepancyId: string,
        resolution: ICODDiscrepancyResolution
    ): Promise<void> {
        const discrepancy = await CODDiscrepancy.findById(discrepancyId);
        if (!discrepancy) throw new AppError('Discrepancy not found', ErrorCode.BIZ_DISCREPANCY_NOT_FOUND, 404);

        if (discrepancy.status === 'resolved' || discrepancy.status === 'accepted') {
            throw new AppError('Discrepancy already resolved', ErrorCode.BIZ_DISCREPANCY_ALREADY_RESOLVED, 400);
        }

        discrepancy.status = resolution.method === 'auto_accept' ? 'accepted' : 'resolved';
        discrepancy.resolution = {
            method: resolution.method,
            adjustedAmount: resolution.adjustedAmount,
            resolvedBy: resolution.resolvedBy,
            remarks: resolution.remarks,
            resolvedAt: new Date()
        };
        discrepancy.autoResolveAt = undefined; // Clear TTL

        await discrepancy.save();

        // Update Shipment
        const shipmentUpdate: any = {
            'paymentDetails.collectionStatus': 'reconciled', // Now reconciled
            'paymentDetails.reconciled': true,
            'paymentDetails.reconciledAt': new Date(),
            'paymentDetails.reconciledBy': resolution.resolvedBy,
            $push: {
                'paymentDetails.timeline': {
                    status: 'resolved',
                    timestamp: new Date(),
                    source: 'manual',
                    notes: `Discrepancy resolved: ${resolution.method}`
                }
            }
        };

        // If adjusted amount provided, update actual collection
        if (resolution.adjustedAmount !== undefined) {
            shipmentUpdate['paymentDetails.actualCollection'] = resolution.adjustedAmount;
        }

        await Shipment.findByIdAndUpdate(discrepancy.shipmentId, shipmentUpdate);

        logger.info(`Resolved discrepancy ${discrepancy.discrepancyNumber} via ${resolution.method}`);
    }

    /**
     * Get discrepancies for a company
     */
    static async getDiscrepancies(
        companyId: string,
        filters: {
            status?: string;
            severity?: string;
            startDate?: Date;
            endDate?: Date;
            page?: number;
            limit?: number;
        }
    ) {
        const query: any = { companyId };

        if (filters.status) query.status = filters.status;
        if (filters.severity) query.severity = filters.severity;
        if (filters.startDate || filters.endDate) {
            query.createdAt = {};
            if (filters.startDate) query.createdAt.$gte = filters.startDate;
            if (filters.endDate) query.createdAt.$lte = filters.endDate;
        }

        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;

        const [discrepancies, total] = await Promise.all([
            CODDiscrepancy.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            CODDiscrepancy.countDocuments(query)
        ]);

        return {
            discrepancies,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Cron Job: Auto-resolve expired discrepancies
     * Accepting the courier's value (or merchant write-off depending on policy)
     * For now, we'll mark them as 'timeout' which requires manual action, 
     * but strictly speaking documentation says "Auto-accept courier amount"
     */
    static async autoResolveExpired(): Promise<number> {
        const expired = await CODDiscrepancy.find({
            status: { $in: ['detected', 'under_review', 'courier_queried'] },
            autoResolveAt: { $lte: new Date() }
        });

        let count = 0;
        for (const disc of expired) {
            // Auto accept courier amount
            disc.status = 'timeout';
            disc.resolution = {
                method: 'auto_accept',
                adjustedAmount: disc.amounts.actual.collected,
                resolvedAt: new Date(),
                resolvedBy: 'system_timeout',
                remarks: 'Auto-resolved due to timeout (7 days)'
            };
            await disc.save();

            // Reconcile shipment with actual amount
            await Shipment.findByIdAndUpdate(disc.shipmentId, {
                'paymentDetails.collectionStatus': 'reconciled',
                'paymentDetails.reconciled': true,
                'paymentDetails.reconciledAt': new Date(),
                'paymentDetails.reconciledBy': 'system_timeout',
                'paymentDetails.actualCollection': disc.amounts.actual.collected
            });

            count++;
        }

        return count;
    }
}
