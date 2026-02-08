import mongoose from 'mongoose';
import CarrierBillingRecord from '../../../../infrastructure/database/mongoose/models/finance/reconciliation/carrier-billing-record.model';
import PricingVarianceCase from '../../../../infrastructure/database/mongoose/models/finance/reconciliation/pricing-variance-case.model';
import Shipment from '../../../../infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model';
import { AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import ServiceLevelPricingMetricsService from '../metrics/service-level-pricing-metrics.service';

type Provider = 'velocity' | 'delhivery' | 'ekart';

export interface CarrierBillingImportRecordInput {
    shipmentId?: string;
    provider: string;
    awb: string;
    invoiceRef?: string;
    remittanceRef?: string;
    billedComponents?: Record<string, number>;
    billedTotal: number;
    source?: 'api' | 'webhook' | 'mis' | 'manual';
    billedAt?: string | Date;
    rawProviderPayload?: any;
}

export interface CarrierBillingImportSummary {
    importedCount: number;
    matchedShipmentCount: number;
    autoClosedCount: number;
    openCaseCount: number;
    skippedCount: number;
    importedIds: string[];
    varianceCaseIds: string[];
}

class CarrierBillingReconciliationService {
    private readonly allowedProviders = new Set<Provider>(['velocity', 'delhivery', 'ekart']);

    async importRecords(args: {
        companyId: string;
        userId: string;
        records: CarrierBillingImportRecordInput[];
        thresholdPercent?: number;
    }): Promise<CarrierBillingImportSummary> {
        const thresholdPercent = Number(args.thresholdPercent ?? 5);
        const companyObjectId = new mongoose.Types.ObjectId(args.companyId);
        const userObjectId = new mongoose.Types.ObjectId(args.userId);

        const importedIds: string[] = [];
        const varianceCaseIds: string[] = [];

        let matchedShipmentCount = 0;
        let autoClosedCount = 0;
        let openCaseCount = 0;
        let skippedCount = 0;

        for (const record of args.records) {
            if (!record?.provider || !record?.awb) {
                skippedCount += 1;
                continue;
            }

            const provider = this.normalizeProvider(record.provider);
            if (!provider) {
                skippedCount += 1;
                continue;
            }

            const billedTotal = Number(record.billedTotal || 0);
            if (!Number.isFinite(billedTotal) || billedTotal < 0) {
                skippedCount += 1;
                continue;
            }

            const billedAt = record.billedAt ? new Date(record.billedAt) : new Date();
            const source = record.source || 'manual';

            const setOnInsert: Record<string, any> = {
                companyId: companyObjectId,
                provider,
                awb: record.awb,
                source,
                billedTotal,
                billedAt,
                invoiceRef: record.invoiceRef,
                remittanceRef: record.remittanceRef,
                billedComponents: record.billedComponents || {},
                metadata: {
                    rawProviderPayload: record.rawProviderPayload,
                    importedBy: userObjectId,
                    importedAt: new Date(),
                },
            };
            if (record.shipmentId) {
                try {
                    setOnInsert.shipmentId = new mongoose.Types.ObjectId(record.shipmentId);
                } catch {
                    skippedCount += 1;
                    continue;
                }
            }

            const billingRecord = await CarrierBillingRecord.findOneAndUpdate(
                {
                    companyId: companyObjectId,
                    provider,
                    awb: record.awb,
                    source,
                    billedTotal,
                    billedAt,
                    invoiceRef: record.invoiceRef || null,
                    remittanceRef: record.remittanceRef || null,
                },
                {
                    $setOnInsert: setOnInsert,
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            importedIds.push(String(billingRecord._id));

            let shipment: any = null;
            try {
                shipment = await this.findShipment(companyObjectId, record.awb, record.shipmentId);
            } catch {
                skippedCount += 1;
                continue;
            }
            if (!shipment) {
                skippedCount += 1;
                continue;
            }

            matchedShipmentCount += 1;

            const expectedCost = this.extractExpectedCost(shipment);
            if (expectedCost <= 0) {
                skippedCount += 1;
                continue;
            }

            const varianceAmount = billedTotal - expectedCost;
            const variancePercent = expectedCost > 0 ? (varianceAmount / expectedCost) * 100 : 0;
            const withinThreshold = Math.abs(variancePercent) <= thresholdPercent;

            const varianceCase = await PricingVarianceCase.findOneAndUpdate(
                {
                    companyId: companyObjectId,
                    billingRecordId: billingRecord._id,
                },
                {
                    $set: {
                        shipmentId: shipment._id,
                        billingRecordId: billingRecord._id,
                        awb: record.awb,
                        provider,
                        expectedCost,
                        billedCost: billedTotal,
                        varianceAmount,
                        variancePercent,
                        thresholdPercent,
                        status: withinThreshold ? 'resolved' : 'open',
                        metadata: { source: 'system' },
                        ...(withinThreshold ? {
                            resolution: {
                                outcome: 'auto_closed_within_threshold',
                                adjustedCost: billedTotal,
                                refundAmount: 0,
                                resolvedBy: userObjectId,
                                resolvedAt: new Date(),
                                notes: `Auto-closed because variance ${variancePercent.toFixed(2)}% is within ${thresholdPercent}% threshold.`,
                            },
                        } : {}),
                    },
                    $setOnInsert: {
                        companyId: companyObjectId,
                    },
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            varianceCaseIds.push(String(varianceCase._id));
            ServiceLevelPricingMetricsService.recordVarianceCase({
                variancePercent,
                autoClosed: withinThreshold,
            });
            if (withinThreshold) {
                autoClosedCount += 1;
            } else {
                openCaseCount += 1;
            }
        }

        return {
            importedCount: importedIds.length,
            matchedShipmentCount,
            autoClosedCount,
            openCaseCount,
            skippedCount,
            importedIds,
            varianceCaseIds,
        };
    }

    private normalizeProvider(value: string): Provider | null {
        const provider = String(value || '').trim().toLowerCase() as Provider;
        if (!this.allowedProviders.has(provider)) {
            return null;
        }
        return provider;
    }

    private async findShipment(companyId: mongoose.Types.ObjectId, awb: string, shipmentId?: string) {
        const query: any = {
            companyId,
            isDeleted: false,
            $or: [
                { trackingNumber: awb },
                { 'carrierDetails.carrierTrackingNumber': awb },
            ],
        };

        if (shipmentId) {
            try {
                query.$or.push({ _id: new mongoose.Types.ObjectId(shipmentId) });
            } catch {
                throw new AppError('Invalid shipmentId in billing import record', ErrorCode.VAL_INVALID_INPUT, 400);
            }
        }

        return Shipment.findOne(query).lean();
    }

    private extractExpectedCost(shipment: any): number {
        const fromQuote = Number(shipment?.pricingDetails?.selectedQuote?.expectedCostAmount || 0);
        if (fromQuote > 0) {
            return fromQuote;
        }
        return Number(shipment?.paymentDetails?.shippingCost || 0);
    }
}

export default new CarrierBillingReconciliationService();
