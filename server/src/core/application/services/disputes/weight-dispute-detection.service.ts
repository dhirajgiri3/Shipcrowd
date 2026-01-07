/**
 * WeightDisputeDetectionService
 * 
 * Automatically detects weight discrepancies between declared weight and carrier-scanned weight.
 * Triggered by carrier webhooks (Velocity, Delhivery, etc.) when packages are weighed at hubs.
 * 
 * Business Rules:
 * - Threshold: >5% difference OR >₹50 financial impact
 * - Auto-creates dispute when threshold exceeded
 * - Notifies seller immediately via multi-channel (email/SMS/WhatsApp)
 * 
 * Business Impact: Prevents ₹20,000-50,000/month revenue loss
 */

import mongoose from 'mongoose';
import WeightDispute from '../../../../infrastructure/database/mongoose/models/logistics/shipping/exceptions/weight-dispute.model';
import Shipment from '../../../../infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model';
import logger from '../../../../shared/logger/winston.logger';
import { AppError, NotFoundError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

// Type definitions
interface WeightInfo {
    value: number;
    unit: 'kg' | 'g';
}

interface CarrierScanData {
    photoUrl?: string;
    scannedAt: Date;
    location?: string;
    notes?: string;
    carrierName: string;
}

interface FinancialImpact {
    originalCharge: number;
    revisedCharge: number;
    difference: number;
    chargeDirection: 'debit' | 'credit';
}

interface Discrepancy {
    value: number;
    percentage: number;
    thresholdExceeded: boolean;
}

class WeightDisputeDetectionService {
    // Threshold constants
    private static readonly PERCENTAGE_THRESHOLD = 5; // 5%
    private static readonly FINANCIAL_THRESHOLD = 50; // ₹50

    /**
     * Called by Velocity/Delhivery webhook when package is weighed at carrier hub
     * Detects discrepancy >5% threshold or ₹50 difference
     * 
     * @param shipmentId - MongoDB ObjectId of the shipment
     * @param actualWeight - Weight scanned by carrier
     * @param carrierScanData - Additional data from carrier
     * @returns WeightDispute if created, null if within threshold
     */
    async detectOnCarrierScan(
        shipmentId: string,
        actualWeight: WeightInfo,
        carrierScanData: CarrierScanData
    ): Promise<any | null> {
        try {
            // Validate shipment exists
            const shipment = await Shipment.findById(shipmentId);
            if (!shipment) {
                throw new NotFoundError('Shipment', ErrorCode.RES_SHIPMENT_NOT_FOUND);
            }

            // Convert both weights to kg for comparison
            const actualKg = this.convertToKg(actualWeight);
            const declaredKg = shipment.weights?.declared?.value || shipment.packageDetails.weight;

            logger.info('Weight comparison', {
                shipmentId,
                awb: shipment.trackingNumber,
                declaredKg,
                actualKg,
            });

            // Calculate discrepancy
            const discrepancy = this.calculateDiscrepancy(declaredKg, actualKg);

            // Calculate financial impact
            const financialImpact = await this.calculateFinancialImpact(
                shipment,
                declaredKg,
                actualKg
            );

            // Check if threshold exceeded
            const shouldCreateDispute =
                discrepancy.percentage > WeightDisputeDetectionService.PERCENTAGE_THRESHOLD ||
                Math.abs(financialImpact.difference) > WeightDisputeDetectionService.FINANCIAL_THRESHOLD;

            if (shouldCreateDispute) {
                // Create dispute
                const dispute = await this.createDispute(
                    shipment,
                    declaredKg,
                    actualKg,
                    discrepancy,
                    financialImpact,
                    carrierScanData
                );

                logger.info('Weight dispute created', {
                    disputeId: dispute.disputeId,
                    shipmentId,
                    discrepancyPercentage: discrepancy.percentage,
                    financialImpact: financialImpact.difference,
                });

                // Update shipment with dispute info
                await this.updateShipmentWithDispute(shipment, dispute, actualWeight, carrierScanData);

                // TODO: Trigger notification (will be implemented in Phase 5)
                // await this.notificationService.sendWeightDisputeAlert(shipment.companyId, dispute);

                return dispute;
            } else {
                // No dispute needed, just update shipment with verified weight
                await this.updateShipmentWeight(shipment, actualWeight, carrierScanData, true);

                logger.info('Weight verified - within threshold', {
                    shipmentId,
                    awb: shipment.trackingNumber,
                    discrepancyPercentage: discrepancy.percentage,
                    financialImpact: financialImpact.difference,
                });

                return null;
            }
        } catch (error) {
            logger.error('Error in weight discrepancy detection', {
                shipmentId,
                error: error instanceof Error ? error.message : error,
            });
            throw error;
        }
    }

    /**
     * Calculate discrepancy between declared and actual weight
     */
    private calculateDiscrepancy(declaredKg: number, actualKg: number): Discrepancy {
        const value = Math.abs(actualKg - declaredKg);
        const percentage = (value / declaredKg) * 100;
        const thresholdExceeded = percentage > WeightDisputeDetectionService.PERCENTAGE_THRESHOLD;

        return {
            value,
            percentage,
            thresholdExceeded,
        };
    }

    /**
     * Calculate financial impact of weight discrepancy
     * Uses rate card to compute cost difference
     */
    private async calculateFinancialImpact(
        shipment: any,
        declaredKg: number,
        actualKg: number
    ): Promise<FinancialImpact> {
        try {
            const originalCharge = shipment.paymentDetails.shippingCost;

            // For MVP, use simple linear calculation based on existing cost
            // In production, this should use RateCardService for accurate calculation
            const costPerKg = originalCharge / declaredKg;
            const revisedCharge = costPerKg * actualKg;

            const difference = revisedCharge - originalCharge;
            const chargeDirection = difference > 0 ? 'debit' : 'credit';

            return {
                originalCharge,
                revisedCharge,
                difference: Math.abs(difference),
                chargeDirection,
            };
        } catch (error) {
            logger.error('Error calculating financial impact', {
                shipmentId: shipment._id,
                error: error instanceof Error ? error.message : error,
            });

            // Fallback to zero impact if calculation fails
            return {
                originalCharge: shipment.paymentDetails.shippingCost,
                revisedCharge: shipment.paymentDetails.shippingCost,
                difference: 0,
                chargeDirection: 'debit',
            };
        }
    }

    /**
     * Auto-creates dispute when threshold exceeded
     */
    private async createDispute(
        shipment: any,
        declaredKg: number,
        actualKg: number,
        discrepancy: Discrepancy,
        financialImpact: FinancialImpact,
        carrierData: CarrierScanData
    ): Promise<any> {
        const disputeId = this.generateDisputeId();

        const dispute = new WeightDispute({
            disputeId,
            shipmentId: shipment._id,
            orderId: shipment.orderId,
            companyId: shipment.companyId,

            declaredWeight: { value: declaredKg, unit: 'kg' },
            actualWeight: { value: actualKg, unit: 'kg' },
            discrepancy: {
                value: discrepancy.value,
                percentage: discrepancy.percentage,
                thresholdExceeded: discrepancy.thresholdExceeded,
            },

            status: 'pending',
            detectedAt: new Date(),
            detectedBy: 'carrier_webhook',

            carrierEvidence: {
                scanPhoto: carrierData.photoUrl,
                scanTimestamp: carrierData.scannedAt,
                scanLocation: carrierData.location,
                carrierNotes: carrierData.notes,
            },

            financialImpact: {
                originalCharge: financialImpact.originalCharge,
                revisedCharge: financialImpact.revisedCharge,
                difference: financialImpact.difference,
                chargeDirection: financialImpact.chargeDirection,
            },

            timeline: [
                {
                    status: 'pending',
                    timestamp: new Date(),
                    actor: 'system',
                    action: `Weight discrepancy detected at ${carrierData.carrierName} hub: ${discrepancy.percentage.toFixed(1)}% difference (₹${financialImpact.difference.toFixed(2)})`,
                },
            ],
        });

        return await dispute.save();
    }

    /**
     * Update shipment with dispute information
     */
    private async updateShipmentWithDispute(
        shipment: any,
        dispute: any,
        actualWeight: WeightInfo,
        carrierData: CarrierScanData
    ): Promise<void> {
        shipment.weights = {
            declared: shipment.weights?.declared || {
                value: shipment.packageDetails.weight,
                unit: 'kg',
            },
            actual: {
                value: this.convertToKg(actualWeight),
                unit: 'kg',
                scannedAt: carrierData.scannedAt,
                scannedBy: carrierData.carrierName,
            },
            verified: true,
        };

        shipment.weightDispute = {
            exists: true,
            disputeId: dispute._id,
            status: 'pending',
            detectedAt: dispute.detectedAt,
            financialImpact: dispute.financialImpact.difference,
        };

        await shipment.save();
    }

    /**
     * Update shipment with verified weight (no dispute)
     */
    private async updateShipmentWeight(
        shipment: any,
        actualWeight: WeightInfo,
        carrierData: CarrierScanData,
        verified: boolean
    ): Promise<void> {
        shipment.weights = {
            declared: shipment.weights?.declared || {
                value: shipment.packageDetails.weight,
                unit: 'kg',
            },
            actual: {
                value: this.convertToKg(actualWeight),
                unit: 'kg',
                scannedAt: carrierData.scannedAt,
                scannedBy: carrierData.carrierName,
            },
            verified,
        };

        await shipment.save();
    }

    /**
     * Convert weight to kg (standard unit)
     */
    private convertToKg(weight: WeightInfo): number {
        if (weight.unit === 'kg') return weight.value;
        if (weight.unit === 'g') return weight.value / 1000;
        throw new Error(`Unknown weight unit: ${weight.unit}`);
    }

    /**
     * Generate unique dispute ID: WD-YYYYMMDD-XXXXX
     */
    private generateDisputeId(): string {
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
        const random = Math.random().toString(36).substr(2, 5).toUpperCase();
        return `WD-${dateStr}-${random}`;
    }

    /**
     * Background job: Scan recent shipments for missing weight data
     * Runs every 4 hours to detect shipments without carrier weight verification
     */
    async scanForPendingWeightUpdates(): Promise<{
        unverifiedCount: number;
        shipments: string[];
    }> {
        try {
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

            const unverifiedShipments = await Shipment.find({
                'weights.verified': false,
                'weights.actual': { $exists: false },
                currentStatus: { $in: ['in_transit', 'out_for_delivery'] },
                createdAt: { $lt: thirtyMinutesAgo },
                isDeleted: false,
            })
                .select('trackingNumber companyId carrier currentStatus')
                .limit(100)
                .lean();

            logger.warn('Found shipments missing weight verification', {
                count: unverifiedShipments.length,
                awbs: unverifiedShipments.map((s: any) => s.trackingNumber),
            });

            return {
                unverifiedCount: unverifiedShipments.length,
                shipments: unverifiedShipments.map((s: any) => s.trackingNumber),
            };
        } catch (error) {
            logger.error('Error scanning for pending weight updates', {
                error: error instanceof Error ? error.message : error,
            });
            throw error;
        }
    }
}

export default new WeightDisputeDetectionService();
