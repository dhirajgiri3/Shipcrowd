/**
 * RTOService
 *
 * Manages Return To Origin workflow.
 */

import RTOEvent, { IRTOEvent } from '../../../../infrastructure/database/mongoose/models/RTOEvent';
import NDREvent from '../../../../infrastructure/database/mongoose/models/NDREvent';
import WhatsAppService from '../../../../infrastructure/integrations/communication/WhatsAppService';
import WarehouseNotificationService from '../warehouse/WarehouseNotificationService';
import logger from '../../../../shared/logger/winston.logger';

interface RTOResult {
    success: boolean;
    rtoEventId?: string;
    reverseAwb?: string;
    error?: string;
}

interface ShipmentInfo {
    _id: string;
    awb: string;
    orderId: string;
    companyId: string;
    warehouseId: string;
    status: string;
    customer?: {
        name: string;
        phone: string;
    };
}

export default class RTOService {
    private static whatsapp = new WhatsAppService();

    /**
     * Trigger RTO for a shipment
     */
    static async triggerRTO(
        shipmentId: string,
        reason: 'ndr_unresolved' | 'customer_cancellation' | 'qc_failure' | 'refused' | 'other',
        ndrEventId?: string,
        triggeredBy: 'auto' | 'manual' = 'manual',
        triggeredByUser?: string
    ): Promise<RTOResult> {
        try {
            // Get shipment details
            const shipment = await this.getShipmentInfo(shipmentId);

            if (!shipment) {
                return { success: false, error: 'Shipment not found' };
            }

            // Validate shipment can be RTO'd
            const validation = this.validateRTOEligibility(shipment);
            if (!validation.eligible) {
                return { success: false, error: validation.reason };
            }

            // Check for existing RTO
            const existingRTO = await RTOEvent.getByShipment(shipmentId);
            if (existingRTO) {
                return { success: false, error: 'RTO already triggered for this shipment' };
            }

            // Create reverse shipment via courier API
            const reverseAwb = await this.createReverseShipment(shipment);

            // Calculate RTO charges
            const rtoCharges = await this.calculateRTOCharges(shipment);

            // Create RTO event
            const rtoEvent = await RTOEvent.create({
                shipment: shipmentId,
                order: shipment.orderId,
                reverseAwb,
                rtoReason: reason,
                ndrEvent: ndrEventId,
                triggeredBy,
                triggeredByUser,
                rtoCharges,
                warehouse: shipment.warehouseId,
                expectedReturnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                company: shipment.companyId,
                returnStatus: 'initiated',
            });

            // Update order status
            await this.updateOrderStatus(shipment.orderId, 'RTO_INITIATED');

            // Update NDR event if applicable
            if (ndrEventId) {
                await NDREvent.findByIdAndUpdate(ndrEventId, {
                    status: 'rto_triggered',
                    autoRtoTriggered: triggeredBy === 'auto',
                });
            }

            // Notify warehouse
            await this.notifyWarehouse(shipment.warehouseId, rtoEvent);
            rtoEvent.warehouseNotified = true;
            await rtoEvent.save();

            // Notify customer
            if (shipment.customer?.phone) {
                await this.notifyCustomer(shipment.customer, shipment.orderId, reason, reverseAwb);
                rtoEvent.customerNotified = true;
                await rtoEvent.save();
            }

            logger.info('RTO triggered successfully', {
                rtoEventId: rtoEvent._id,
                shipmentId,
                reason,
                triggeredBy,
                reverseAwb,
            });

            return {
                success: true,
                rtoEventId: String(rtoEvent._id),
                reverseAwb,
            };
        } catch (error: any) {
            logger.error('Failed to trigger RTO', {
                shipmentId,
                error: error.message,
            });

            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Validate shipment is eligible for RTO
     */
    private static validateRTOEligibility(shipment: ShipmentInfo): {
        eligible: boolean;
        reason?: string;
    } {
        // Can't RTO delivered shipments
        if (shipment.status === 'delivered') {
            return { eligible: false, reason: 'Cannot RTO delivered shipment' };
        }

        // Can't RTO if already in RTO
        if (shipment.status === 'rto_initiated' || shipment.status === 'rto_in_transit') {
            return { eligible: false, reason: 'Shipment already in RTO process' };
        }

        return { eligible: true };
    }

    /**
     * Create reverse shipment via courier API
     */
    private static async createReverseShipment(shipment: ShipmentInfo): Promise<string> {
        // TODO: Integrate with actual courier API
        // For now, generate mock reverse AWB
        const reverseAwb = `RTO-${shipment.awb}`;

        logger.info('Reverse shipment created', {
            originalAwb: shipment.awb,
            reverseAwb,
        });

        return reverseAwb;
    }

    /**
     * Calculate RTO charges
     */
    private static async calculateRTOCharges(shipment: ShipmentInfo): Promise<number> {
        // TODO: Calculate based on rate card
        // For now, return flat rate
        return 50; // ₹50 flat RTO charge
    }

    /**
     * Update order status
     */
    private static async updateOrderStatus(orderId: string, status: string): Promise<void> {
        // TODO: Use OrderService to update
        logger.info('Order status updated', { orderId, status });
    }

    private static async notifyWarehouse(
        warehouseId: string,
        rtoEvent: IRTOEvent
    ): Promise<void> {
        await WarehouseNotificationService.notifyRTOIncoming(
            String(rtoEvent._id),
            warehouseId,
            {
                awb: rtoEvent.shipment.toString(), // TODO: Get actual AWB from shipment
                reverseAwb: rtoEvent.reverseAwb,
                expectedReturnDate: rtoEvent.expectedReturnDate || new Date(), // Fallback to current date
                rtoReason: rtoEvent.rtoReason,
                requiresQC: true, // Always require QC for RTO
            }
        );
    }

    /**
     * Notify customer about RTO
     */
    private static async notifyCustomer(
        customer: { name: string; phone: string },
        orderId: string,
        reason: string,
        reverseAwb?: string
    ): Promise<void> {
        const reasonText = this.getRTOReasonText(reason);

        await this.whatsapp.sendRTONotification(
            customer.phone,
            customer.name,
            orderId,
            reasonText,
            reverseAwb
        );
    }

    /**
     * Get human-readable RTO reason
     */
    private static getRTOReasonText(reason: string): string {
        const reasonMap: Record<string, string> = {
            ndr_unresolved: 'Delivery attempts exhausted',
            customer_cancellation: 'Order cancelled by customer',
            qc_failure: 'Quality check failed',
            refused: 'Delivery refused by customer',
            other: 'Unable to complete delivery',
        };

        return reasonMap[reason] || 'Unable to complete delivery';
    }

    /**
     * Get shipment info (mock for now)
     */
    private static async getShipmentInfo(shipmentId: string): Promise<ShipmentInfo | null> {
        // TODO: Use ShipmentService
        // For now, return mock data or fetch from Shipment model
        try {
            const ShipmentModule = await import('../../../../infrastructure/database/mongoose/models/Shipment.js') as any;
            const Shipment = ShipmentModule.default;
            const shipment = await Shipment.findById(shipmentId);

            if (!shipment) return null;

            return {
                _id: shipment._id.toString(),
                awb: shipment.awb,
                orderId: shipment.orderId?.toString() || '',
                companyId: shipment.companyId?.toString() || '',
                warehouseId: shipment.warehouseId?.toString() || '',
                status: shipment.status,
                customer: {
                    name: shipment.recipientName || 'Customer',
                    phone: shipment.recipientPhone || '',
                },
            };
        } catch (error) {
            logger.error('Error fetching shipment', { shipmentId, error });
            return null;
        }
    }

    /**
     * Update RTO status
     */
    static async updateRTOStatus(
        rtoEventId: string,
        status: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        const rtoEvent = await RTOEvent.findById(rtoEventId);

        if (!rtoEvent) {
            throw new Error('RTO event not found');
        }

        await rtoEvent.updateReturnStatus(status, metadata);

        logger.info('RTO status updated', {
            rtoEventId,
            status,
        });
    }

    /**
     * Record QC result
     */
    static async recordQCResult(
        rtoEventId: string,
        qcResult: { passed: boolean; remarks?: string; images?: string[]; inspectedBy: string }
    ): Promise<void> {
        const rtoEvent = await RTOEvent.findById(rtoEventId);

        if (!rtoEvent) {
            throw new Error('RTO event not found');
        }

        await rtoEvent.recordQC({
            ...qcResult,
            inspectedAt: new Date(),
        });

        logger.info('QC result recorded', {
            rtoEventId,
            passed: qcResult.passed,
        });
    }

    /**
     * Get RTO statistics
     */
    static async getRTOStats(
        companyId: string,
        dateRange?: { start: Date; end: Date }
    ): Promise<{
        total: number;
        byReason: Record<string, number>;
        avgCharges: number;
        returnRate: number;
    }> {
        const matchFilter: any = { company: companyId };

        if (dateRange) {
            matchFilter.triggeredAt = {
                $gte: dateRange.start,
                $lte: dateRange.end,
            };
        }

        const [totalStats, reasonStats] = await Promise.all([
            RTOEvent.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        avgCharges: { $avg: '$rtoCharges' },
                    },
                },
            ]),
            RTOEvent.aggregate([
                { $match: matchFilter },
                { $group: { _id: '$rtoReason', count: { $sum: 1 } } },
            ]),
        ]);

        const byReason: Record<string, number> = {};
        reasonStats.forEach((r) => {
            byReason[r._id] = r.count;
        });

        return {
            total: totalStats[0]?.total || 0,
            byReason,
            avgCharges: totalStats[0]?.avgCharges || 0,
            returnRate: 0, // TODO: Calculate based on total shipments
        };
    }
}
