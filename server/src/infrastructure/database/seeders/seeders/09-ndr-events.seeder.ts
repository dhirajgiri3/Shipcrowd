/**
 * NDR Events Seeder
 * 
 * Generates NDR (Non-Delivery Report) events for shipments with NDR status.
 */

import Shipment from '../../mongoose/models/logistics/shipping/core/shipment.model';
import NDREvent from '../../mongoose/models/logistics/shipping/exceptions/ndr-event.model';
import { SEED_CONFIG } from '../config';
import { addDays, addHours } from '../utils/date.utils';
import { createTimer, logger } from '../utils/logger.utils';
import { generateUUID, maybeExecute, randomInt, selectRandom, selectWeightedFromObject } from '../utils/random.utils';

type NDRType = 'address_issue' | 'customer_unavailable' | 'refused' | 'payment_issue' | 'other';
type NDRStatus = 'detected' | 'in_resolution' | 'resolved' | 'rto_triggered';

/**
 * Select NDR type based on configured distribution
 */
function selectNDRType(): NDRType {
    return selectWeightedFromObject(SEED_CONFIG.ndrTypes) as NDRType;
}

/**
 * Select NDR status based on configured distribution
 */
function selectNDRStatus(): NDRStatus {
    return selectWeightedFromObject(SEED_CONFIG.ndrStatus) as NDRStatus;
}

/**
 * Generate NDR reason text based on type
 */
function generateNDRReason(type: NDRType): string {
    const reasons: Record<NDRType, string[]> = {
        address_issue: [
            'Incomplete address - house number missing',
            'Wrong pincode provided',
            'Landmark not found',
            'Building name not found',
            'House locked/nobody available',
            'Unable to locate address',
        ],
        customer_unavailable: [
            'Customer not available at delivery time',
            'Phone switched off',
            'Customer did not respond to calls',
            'Customer out of station',
            'Customer busy in meeting',
            'Security denied entry',
        ],
        refused: [
            'Customer refused to accept delivery',
            'Customer refused - ordered by mistake',
            'Customer refused - quality concerns',
            'Customer refused - changed mind',
            'Customer refused - damaged packaging',
        ],
        payment_issue: [
            'COD amount not ready with customer',
            'Customer wants to pay via UPI but not accepted',
            'Customer expected less amount',
            'Customer denies placing COD order',
            'No change available for cash payment',
        ],
        other: [
            'Delivery vehicle breakdown',
            'Weather conditions preventing delivery',
            'Local strike/bandh',
            'Restricted area access',
            'Curfew in area',
        ],
    };

    return selectRandom(reasons[type]);
}

/**
 * Generate resolution actions based on NDR status
 */
function generateResolutionActions(
    type: NDRType,
    status: NDRStatus,
    detectedAt: Date
): any[] {
    const actions: any[] = [];

    // Always add initial customer contact attempt
    if (status !== 'detected') {
        actions.push({
            action: 'Attempted to contact customer via phone',
            actionType: 'call_customer',
            takenAt: addHours(detectedAt, randomInt(2, 6)),
            takenBy: 'system',
            result: selectRandom(['success', 'failed', 'pending']),
            metadata: {
                callDuration: randomInt(0, 180),
                callAttempts: randomInt(1, 3),
            },
        });

        actions.push({
            action: 'Sent WhatsApp notification about delivery issue',
            actionType: 'send_whatsapp',
            takenAt: addHours(detectedAt, randomInt(1, 4)),
            takenBy: 'system',
            result: 'success',
            metadata: {
                messageId: generateUUID(),
                delivered: true,
                read: Math.random() < 0.6,
            },
        });
    }

    // Add type-specific actions
    if (type === 'address_issue' && status !== 'detected') {
        actions.push({
            action: 'Customer updated delivery address',
            actionType: 'update_address',
            takenAt: addHours(detectedAt, randomInt(6, 24)),
            takenBy: 'customer',
            result: status === 'resolved' ? 'success' : 'pending',
        });
    }

    // Add reattempt request if in resolution
    if (status === 'in_resolution' || status === 'resolved') {
        actions.push({
            action: 'Scheduled reattempt for next business day',
            actionType: 'request_reattempt',
            takenAt: addHours(detectedAt, randomInt(12, 36)),
            takenBy: 'seller',
            result: status === 'resolved' ? 'success' : 'pending',
        });
    }

    // Add RTO trigger if applicable
    if (status === 'rto_triggered') {
        actions.push({
            action: 'RTO triggered after failed resolution attempts',
            actionType: 'trigger_rto',
            takenAt: addHours(detectedAt, SEED_CONFIG.ndrResolutionSLA + randomInt(0, 12)),
            takenBy: 'system',
            result: 'success',
            metadata: {
                rtoReason: 'Resolution deadline exceeded',
                attemptCount: randomInt(2, 3),
            },
        });
    }

    return actions;
}

/**
 * Generate NDR event data for a shipment
 */
function generateNDREventData(shipment: any): any {
    const type = selectNDRType();
    const status = selectNDRStatus();
    const ndrDate = shipment.ndrDetails?.ndrDate || addDays(shipment.createdAt, randomInt(2, 5));
    const detectedAt = ndrDate;
    const resolutionDeadline = addHours(detectedAt, SEED_CONFIG.ndrResolutionSLA);

    return {
        shipment: shipment._id,
        order: shipment.orderId, // Required field - linked to the order
        awb: shipment.trackingNumber,
        ndrReason: shipment.ndrDetails?.ndrReason || generateNDRReason(type),
        ndrReasonClassified: type,
        ndrType: type,
        detectedAt,
        status,
        resolutionActions: generateResolutionActions(type, status, detectedAt),
        customerContacted: status !== 'detected',
        customerResponse: status !== 'detected' ? maybeExecute(() => selectRandom([
            'Will receive tomorrow',
            'Address updated',
            'Will keep payment ready',
            'Cancel the order',
            'Reschedule to next week',
        ]), 0.7) : undefined,
        resolutionDeadline,
        company: shipment.companyId,
        attemptNumber: shipment.ndrDetails?.ndrAttempts || randomInt(1, 3),
        classificationSource: selectRandom(['openai', 'keyword', 'manual']),
        resolvedAt: status === 'resolved'
            ? addHours(detectedAt, randomInt(12, 48))
            : undefined,
        resolvedBy: status === 'resolved'
            ? selectRandom(['customer_response', 'reattempt_success', 'address_updated'])
            : undefined,
        autoRtoTriggered: status === 'rto_triggered' && Math.random() < 0.5,
        idempotencyKey: `NDR-${shipment.trackingNumber}-${Math.floor(detectedAt.getTime() / 1000)}`,
    };
}

/**
 * Main seeder function
 */
export async function seedNDREvents(): Promise<void> {
    const timer = createTimer();
    logger.step(9, 'Seeding NDR Events');

    try {
        // Get shipments with NDR status
        const ndrShipments = await Shipment.find({
            currentStatus: { $in: ['ndr', 'ndr_reattempt', 'rto_initiated', 'rto_in_transit', 'rto_delivered'] },
            isDeleted: false,
        }).lean();

        if (ndrShipments.length === 0) {
            logger.warn('No NDR shipments found. Skipping NDR events seeder.');
            return;
        }

        const ndrEvents: any[] = [];
        let detectedCount = 0;
        let inResolutionCount = 0;
        let resolvedCount = 0;
        let rtoTriggeredCount = 0;

        for (let i = 0; i < ndrShipments.length; i++) {
            const shipment = ndrShipments[i];
            const ndrData = generateNDREventData(shipment);
            ndrEvents.push(ndrData);

            // Count by status
            switch (ndrData.status) {
                case 'detected': detectedCount++; break;
                case 'in_resolution': inResolutionCount++; break;
                case 'resolved': resolvedCount++; break;
                case 'rto_triggered': rtoTriggeredCount++; break;
            }

            if ((i + 1) % 50 === 0 || i === ndrShipments.length - 1) {
                logger.progress(i + 1, ndrShipments.length, 'NDR Events');
            }
        }

        // Insert all NDR events
        await NDREvent.insertMany(ndrEvents);

        // Count by type
        const typeCount: Record<string, number> = {};
        ndrEvents.forEach((e) => {
            typeCount[e.ndrType] = (typeCount[e.ndrType] || 0) + 1;
        });

        logger.complete('NDR events', ndrEvents.length, timer.elapsed());
        logger.table({
            'Total NDR Events': ndrEvents.length,
            'Detected': `${detectedCount} (${((detectedCount / ndrEvents.length) * 100).toFixed(1)}%)`,
            'In Resolution': `${inResolutionCount} (${((inResolutionCount / ndrEvents.length) * 100).toFixed(1)}%)`,
            'Resolved': `${resolvedCount} (${((resolvedCount / ndrEvents.length) * 100).toFixed(1)}%)`,
            'RTO Triggered': `${rtoTriggeredCount} (${((rtoTriggeredCount / ndrEvents.length) * 100).toFixed(1)}%)`,
        });

        logger.info('NDR Types Distribution:');
        logger.table(typeCount);

    } catch (error) {
        logger.error('Failed to seed NDR events:', error);
        throw error;
    }
}

/**
 * Get NDR events by status
 */
export async function getNDREventsByStatus(status: string) {
    return NDREvent.find({ status }).lean();
}

/**
 * Get pending NDR events
 */
export async function getPendingNDREvents() {
    return NDREvent.find({ status: { $in: ['detected', 'in_resolution'] } }).lean();
}
