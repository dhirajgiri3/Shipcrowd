import Shipment, { IShipment } from '../../../../infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model';
import { CODDiscrepancyService } from './cod-discrepancy.service';
import logger from '../../../../shared/logger/winston.logger';
import { AppError } from '../../../../shared/errors/app.error';

/**
 * COD Reconciliation Service
 * 
 * Handles real-time reconciliation of COD shipments:
 * - Auto-matches webhook data with shipment expectations
 * - Validates amounts with tolerance (±₹10)
 * - Auto-reconciles matching shipments
 * - Creates discrepancies for mismatches
 */
export class CODReconciliationService {

    // Configurable tolerance for small rounding errors
    private static readonly TOLERANCE_AMOUNT = 10;

    /**
     * Auto-reconcile delivered shipment from courier data
     * Called by Webhook Service when shipment is delivered
     */
    static async reconcileDeliveredShipment(
        shipmentId: string,
        courierData: {
            collectedAmount: number;
            collectionMethod?: string;
            pod?: any;
            deliveredAt: Date;
            source: 'webhook' | 'api' | 'mis';
        }
    ): Promise<{ reconciled: boolean; discrepancy?: string }> {

        const shipment = await Shipment.findById(shipmentId);
        if (!shipment) {
            logger.warn(`Reconciliation failed: Shipment ${shipmentId} not found`);
            return { reconciled: false };
        }

        if (shipment.paymentDetails.type !== 'cod') {
            return { reconciled: true }; // Skip prepaid
        }

        // 1. Update basic collection info
        const updateData: any = {
            'paymentDetails.collectedAt': courierData.deliveredAt,
            'paymentDetails.actualCollection': courierData.collectedAmount,
            // Only update method if provided and valid
            ...(courierData.collectionMethod && {
                'paymentDetails.collectionMethod': this.mapCollectionMethod(courierData.collectionMethod)
            })
        };

        // 2. Compare Expected vs Actual
        // Use totalCollection (codAmount + codCharges) if available, otherwise codAmount
        // Need to be careful: paymentDetails.codAmount is usually what we want to collect from customer
        const expectedAmount = shipment.paymentDetails.totalCollection || shipment.paymentDetails.codAmount || 0;
        const actualAmount = courierData.collectedAmount;
        const diff = actualAmount - expectedAmount;

        // 3. Check Tolerance
        const isMatch = Math.abs(diff) <= this.TOLERANCE_AMOUNT;

        if (isMatch) {
            // ✅ MATCH: Auto-reconcile
            updateData['paymentDetails.collectionStatus'] = 'reconciled';
            updateData['paymentDetails.reconciled'] = true;
            updateData['paymentDetails.reconciledAt'] = new Date();
            updateData['paymentDetails.reconciledBy'] = 'system_auto';
            updateData['paymentDetails.variance'] = diff;

            // Add timeline entry
            updateData.$push = {
                'paymentDetails.timeline': {
                    status: 'reconciled',
                    timestamp: new Date(),
                    source: courierData.source,
                    notes: `Auto-reconciled via ${courierData.source}. Amount: ₹${actualAmount} (Diff: ₹${diff})`
                }
            };

            // If diff exists but within tolerance, note it
            if (diff !== 0) {
                updateData['paymentDetails.varianceReason'] = 'Rounding difference within tolerance';
            }

            logger.info(`Auto-reconciled shipment ${shipment.trackingNumber} via webhook. Diff: ${diff}`);

            await Shipment.findByIdAndUpdate(shipmentId, updateData);
            return { reconciled: true };

        } else {
            // ❌ MISMATCH: Create Discrepancy
            // First update what we know
            updateData['paymentDetails.collectionStatus'] = 'disputed'; // Mark potential dispute

            // Raise Discrepancy
            const discrepancy = await CODDiscrepancyService.createDiscrepancy({
                shipmentId: String(shipment._id),
                awb: shipment.trackingNumber,
                companyId: String(shipment.companyId),
                carrier: shipment.carrier,
                expectedAmount,
                actualAmount,
                source: courierData.source,
                type: 'amount_mismatch',
                severity: Math.abs(diff) > 500 ? 'major' : 'medium'
            });

            updateData['paymentDetails.discrepancyId'] = String(discrepancy._id);

            // Timeline entry done in createDiscrepancy, but we update status here
            await Shipment.findByIdAndUpdate(shipmentId, updateData);

            return { reconciled: false, discrepancy: String(discrepancy._id) };
        }
    }

    private static mapCollectionMethod(method: string): string {
        const lower = method.toLowerCase();
        if (lower.includes('upi') || lower.includes('qr')) return 'upi';
        if (lower.includes('card') || lower.includes('debit') || lower.includes('credit')) return 'card';
        if (lower.includes('wallet')) return 'wallet';
        return 'cash';
    }
}
