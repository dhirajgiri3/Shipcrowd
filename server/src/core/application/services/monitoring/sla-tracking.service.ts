import { Shipment, WalletTransaction } from '@/infrastructure/database/mongoose/models';
import logger from '@/shared/logger/winston.logger';
import { Types } from 'mongoose';

/**
 * SLA Tracking Service
 * 
 * Monitors shipment SLAs and creates alerts for violations.
 * Tracks: Pickup SLA, Delivery SLA, RTO SLA, NDR Resolution SLA
 */
export class SLATrackingService {
    // Default SLAs (in hours)
    private static readonly SLA_DEFAULTS = {
        pickup: 24,           // 24 hours from booking
        forwardDelivery: 96,  // 4 days from pickup
        rtoDelivery: 120,     // 5 days from RTO initiation
        ndrResolution: 48     // 48 hours to resolve NDR
    };

    /**
     * Check all shipments for SLA violations
     */
    static async checkSLAViolations(): Promise<{
        violations: Array<{
            shipmentId: string;
            awb: string;
            type: string;
            expectedAt: Date;
            currentStatus: string;
        }>;
    }> {
        const violations: any[] = [];

        try {
            // 1. Pickup SLA violations (booked but not picked up)
            const pickupViolations = await this.checkPickupSLA();
            violations.push(...pickupViolations);

            // 2. Delivery SLA violations (in transit too long)
            const deliveryViolations = await this.checkDeliverySLA();
            violations.push(...deliveryViolations);

            // 3. NDR Resolution SLA
            const ndrViolations = await this.checkNDRSLA();
            violations.push(...ndrViolations);

            // 4. RTO Delivery SLA
            const rtoViolations = await this.checkRTOSLA();
            violations.push(...rtoViolations);

            if (violations.length > 0) {
                await this.sendSLAAlert(violations);
            }

            return { violations };

        } catch (error: any) {
            logger.error('Error checking SLA violations', { error: error.message });
            return { violations: [] };
        }
    }

    /**
     * Check pickup SLA (24h from booking)
     */
    private static async checkPickupSLA() {
        const threshold = new Date(Date.now() - this.SLA_DEFAULTS.pickup * 60 * 60 * 1000);

        const shipments = await Shipment.find({
            currentStatus: 'pending',
            createdAt: { $lt: threshold },
            isDeleted: false
        })
            .select('trackingNumber createdAt currentStatus')
            .limit(50)
            .lean();

        return shipments.map(s => ({
            shipmentId: s._id.toString(),
            awb: s.trackingNumber,
            type: 'pickup_sla_breach',
            expectedAt: new Date(new Date(s.createdAt).getTime() + this.SLA_DEFAULTS.pickup * 60 * 60 * 1000),
            currentStatus: s.currentStatus
        }));
    }

    /**
     * Check delivery SLA (96h from pickup)
     */
    private static async checkDeliverySLA() {
        const threshold = new Date(Date.now() - this.SLA_DEFAULTS.forwardDelivery * 60 * 60 * 1000);

        const shipments = await Shipment.find({
            currentStatus: { $in: ['in_transit', 'out_for_delivery'] },
            'statusHistory.status': 'picked_up',
            isDeleted: false
        })
            .select('trackingNumber statusHistory currentStatus')
            .limit(50)
            .lean();

        const violations = [];
        for (const shipment of shipments) {
            const pickupEvent = shipment.statusHistory.find((h: any) => h.status === 'picked_up');
            if (pickupEvent && new Date(pickupEvent.timestamp) < threshold) {
                violations.push({
                    shipmentId: shipment._id.toString(),
                    awb: shipment.trackingNumber,
                    type: 'delivery_sla_breach',
                    expectedAt: new Date(new Date(pickupEvent.timestamp).getTime() + this.SLA_DEFAULTS.forwardDelivery * 60 * 60 * 1000),
                    currentStatus: shipment.currentStatus
                });
            }
        }

        return violations;
    }

    /**
     * Check NDR resolution SLA (48h)
     */
    private static async checkNDRSLA() {
        const threshold = new Date(Date.now() - this.SLA_DEFAULTS.ndrResolution * 60 * 60 * 1000);

        const shipments = await Shipment.find({
            currentStatus: 'ndr_pending',
            'ndrDetails.ndrDate': { $lt: threshold },
            isDeleted: false
        })
            .select('trackingNumber ndrDetails.ndrDate currentStatus')
            .limit(50)
            .lean();

        return shipments.map(s => ({
            shipmentId: s._id.toString(),
            awb: s.trackingNumber,
            type: 'ndr_resolution_sla_breach',
            expectedAt: new Date(new Date((s.ndrDetails as any)?.ndrDate).getTime() + this.SLA_DEFAULTS.ndrResolution * 60 * 60 * 1000),
            currentStatus: s.currentStatus
        }));
    }

    /**
     * Check RTO delivery SLA (120h from RTO initiation)
     */
    private static async checkRTOSLA() {
        const threshold = new Date(Date.now() - this.SLA_DEFAULTS.rtoDelivery * 60 * 60 * 1000);

        const shipments = await Shipment.find({
            currentStatus: { $in: ['rto_initiated', 'rto_in_transit'] },
            'statusHistory.status': 'rto_initiated',
            isDeleted: false
        })
            .select('trackingNumber statusHistory current Status')
            .limit(50)
            .lean();

        const violations = [];
        for (const shipment of shipments) {
            const rtoEvent = shipment.statusHistory.find((h: any) => h.status === 'rto_initiated');
            if (rtoEvent && new Date(rtoEvent.timestamp) < threshold) {
                violations.push({
                    shipmentId: shipment._id.toString(),
                    awb: shipment.trackingNumber,
                    type: 'rto_delivery_sla_breach',
                    expectedAt: new Date(new Date(rtoEvent.timestamp).getTime() + this.SLA_DEFAULTS.rtoDelivery * 60 * 60 * 1000),
                    currentStatus: shipment.currentStatus
                });
            }
        }

        return violations;
    }

    /**
     * Send SLA violation alert
     */
    private static async sendSLAAlert(violations: any[]): Promise<void> {
        try {
            const { default: EmailService } = await import(
                '@/core/application/services/communication/email.service.js'
            );

            const opsEmail = process.env.OPS_ALERT_EMAIL || 'ops@shipcrowd.com';

            const summary = violations
                .map(v => `- AWB: ${v.awb} | Type: ${v.type} | Expected: ${v.expectedAt.toISOString()}`)
                .join('\n');

            const subject = `⚠️ SLA Violations Detected: ${violations.length} shipments`;
            const htmlContent = `
                <h2>SLA Violation Alert</h2>
                <p>${violations.length} shipments have breached their SLAs:</p>
                <pre>${summary}</pre>
                <p><strong>Action Required:</strong> Review in admin dashboard and escalate as needed.</p>
            `;

            await EmailService.sendEmail(
                opsEmail,
                subject,
                htmlContent,
                'SLA Violation Alert'
            );

            logger.info('SLA violation alert sent', { violationCount: violations.length });

        } catch (error: any) {
            logger.error('Failed to send SLA alert', { error: error.message });
        }
    }
}
