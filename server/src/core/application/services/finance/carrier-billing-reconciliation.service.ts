import mongoose from 'mongoose';
import CarrierBillingRecord from '../../../../infrastructure/database/mongoose/models/finance/reconciliation/carrier-billing-record.model';
import PricingVarianceCase from '../../../../infrastructure/database/mongoose/models/finance/reconciliation/pricing-variance-case.model';
import Shipment from '../../../../infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model';
import { AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import ServiceLevelPricingMetricsService from '../metrics/service-level-pricing-metrics.service';
import {
    BillingImportShipmentCostSnapshot,
    CarrierBillingBreakdown,
    ServiceLevelProvider,
} from '../../../domain/types/service-level-pricing.types';

type Provider = ServiceLevelProvider;

export interface CarrierBillingImportRecordInput {
    shipmentId?: string;
    provider: string;
    awb: string;
    invoiceRef?: string;
    remittanceRef?: string;
    billedComponents?: CarrierBillingBreakdown;
    billedTotal: number;
    source?: 'api' | 'webhook' | 'mis' | 'manual';
    billedAt?: string | Date;
    rawProviderPayload?: Record<string, unknown>;
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
    private readonly allowedProviders = new Set<Provider>([
        'velocity',
        'delhivery',
        'ekart',
    ]);

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
            if (Number.isNaN(billedAt.getTime())) {
                skippedCount += 1;
                continue;
            }

            const source = record.source || 'manual';
            const shipmentObjectId = this.safeObjectId(record.shipmentId);
            if (record.shipmentId && !shipmentObjectId) {
                skippedCount += 1;
                continue;
            }

            const setOnInsert = {
                companyId: companyObjectId,
                shipmentId: shipmentObjectId,
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

            const shipment = await this.findShipment({
                companyId: companyObjectId,
                awb: record.awb,
                shipmentId: shipmentObjectId,
            });

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
            const variancePercent =
                expectedCost > 0 ? (varianceAmount / expectedCost) * 100 : 0;
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
                        ...(withinThreshold
                            ? {
                                  resolution: {
                                      outcome: 'auto_closed_within_threshold',
                                      adjustedCost: billedTotal,
                                      refundAmount: 0,
                                      resolvedBy: userObjectId,
                                      resolvedAt: new Date(),
                                      notes: `Auto-closed because variance ${variancePercent.toFixed(
                                          2
                                      )}% is within ${thresholdPercent}% threshold.`,
                                  },
                              }
                            : {}),
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

    private safeObjectId(value?: string): mongoose.Types.ObjectId | null {
        if (!value) return null;
        if (!mongoose.Types.ObjectId.isValid(value)) return null;
        return new mongoose.Types.ObjectId(value);
    }

    private async findShipment(args: {
        companyId: mongoose.Types.ObjectId;
        awb: string;
        shipmentId?: mongoose.Types.ObjectId | null;
    }): Promise<BillingImportShipmentCostSnapshot | null> {
        const query: {
            companyId: mongoose.Types.ObjectId;
            isDeleted: boolean;
            $or: Array<
                | { trackingNumber: string }
                | { 'carrierDetails.carrierTrackingNumber': string }
                | { _id: mongoose.Types.ObjectId }
            >;
        } = {
            companyId: args.companyId,
            isDeleted: false,
            $or: [
                { trackingNumber: args.awb },
                { 'carrierDetails.carrierTrackingNumber': args.awb },
            ],
        };

        if (args.shipmentId) {
            query.$or.push({ _id: args.shipmentId });
        }

        return Shipment.findOne(query).lean<BillingImportShipmentCostSnapshot | null>();
    }

    private extractExpectedCost(shipment: BillingImportShipmentCostSnapshot): number {
        const fromQuote = Number(
            shipment.pricingDetails?.selectedQuote?.expectedCostAmount || 0
        );
        if (fromQuote > 0) {
            return fromQuote;
        }
        return Number(shipment.paymentDetails?.shippingCost || 0);
    }
}

export default new CarrierBillingReconciliationService();
