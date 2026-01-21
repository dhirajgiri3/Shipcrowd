/**
 * RTO Events Seeder
 * 
 * Generates RTO (Return To Origin) events for shipments with RTO status.
 */

import mongoose from 'mongoose';
import RTOEvent from '../../mongoose/models/logistics/shipping/exceptions/rto-event.model';
import Shipment from '../../mongoose/models/logistics/shipping/core/shipment.model';
import Warehouse from '../../mongoose/models/logistics/warehouse/structure/warehouse.model';
import Inventory from '../../mongoose/models/logistics/inventory/store/inventory.model';
import { SEED_CONFIG } from '../config';
import { randomInt, randomFloat, selectRandom, selectWeightedFromObject, maybeExecute } from '../utils/random.utils';
import { logger, createTimer } from '../utils/logger.utils';
import { addDays, addHours, randomDateBetween } from '../utils/date.utils';

type RTOReason = 'ndr_unresolved' | 'customer_cancellation' | 'damaged_in_transit' | 'refused' | 'other';
type RTOStatus = 'initiated' | 'in_transit' | 'delivered_to_warehouse' | 'qc_pending' | 'qc_completed' | 'restocked' | 'disposed';

/**
 * Select RTO reason based on configured distribution
 */
function selectRTOReason(): RTOReason {
    return selectWeightedFromObject(SEED_CONFIG.rtoReasons) as RTOReason;
}

/**
 * Generate return status based on timeline
 */
function selectReturnStatus(triggeredAt: Date): RTOStatus {
    const now = new Date();
    const hoursSinceTriggered = (now.getTime() - triggeredAt.getTime()) / (1000 * 60 * 60);

    // Based on time elapsed, determine likely status
    if (hoursSinceTriggered < 24) return 'initiated';
    if (hoursSinceTriggered < 72) return 'in_transit';
    if (hoursSinceTriggered < 120) return selectRandom(['delivered_to_warehouse', 'in_transit']);
    if (hoursSinceTriggered < 168) return selectRandom(['qc_pending', 'qc_completed']);

    // Older RTOs are either restocked or disposed
    return selectRandom(['restocked', 'disposed']);
}

/**
 * Generate QC result
 */
function generateQCResult(returnStatus: RTOStatus, rtoReason: RTOReason): any | undefined {
    if (!['qc_pending', 'qc_completed', 'restocked', 'disposed'].includes(returnStatus)) {
        return undefined;
    }

    const isPassed = Math.random() < (SEED_CONFIG.qcPassRate / 100);

    // Damaged in transit usually fails QC
    const passed = rtoReason === 'damaged_in_transit'
        ? Math.random() < 0.2
        : isPassed;

    return {
        passed,
        remarks: passed
            ? selectRandom([
                'Product in good condition, can be restocked',
                'Package intact, no damage observed',
                'All items verified and in sellable condition',
            ])
            : selectRandom([
                'Package damaged during transit',
                'Product seal broken',
                'Items missing from package',
                'Water damage observed',
                'Label/barcode damaged',
            ]),
        images: passed ? undefined : [
            `https://storage.Helix.com/qc/${Math.random().toString(36).substring(7)}_1.jpg`,
            `https://storage.Helix.com/qc/${Math.random().toString(36).substring(7)}_2.jpg`,
        ],
        inspectedBy: `QC-${randomInt(100, 999)}`,
        inspectedAt: new Date(Date.now() - randomInt(1, 48) * 60 * 60 * 1000),
    };
}

/**
 * Generate RTO event data for a shipment
 */
function generateRTOEventData(shipment: any, warehouses: Map<string, any>): any {
    const reason = selectRTOReason();
    const triggeredAt = shipment.rtoDetails?.rtoInitiatedDate || addDays(shipment.createdAt, randomInt(5, 10));
    const returnStatus = selectReturnStatus(triggeredAt);

    // Get warehouse for this shipment's company
    const warehouseId = shipment.pickupDetails?.warehouseId;
    const warehouse = warehouseId ? warehouses.get(warehouseId.toString()) : null;

    const forwardShippingCost = shipment.paymentDetails?.shippingCost || 100;
    const rtoCharges = Math.round(forwardShippingCost * randomFloat(
        SEED_CONFIG.wallet.rtoChargeMultiplier.min,
        SEED_CONFIG.wallet.rtoChargeMultiplier.max,
        2
    ));

    const expectedReturnDate = addDays(triggeredAt, randomInt(
        SEED_CONFIG.rtoTransitDays.min,
        SEED_CONFIG.rtoTransitDays.max
    ));

    const isDelivered = ['delivered_to_warehouse', 'qc_pending', 'qc_completed', 'restocked', 'disposed'].includes(returnStatus);
    const actualReturnDate = isDelivered
        ? randomDateBetween(triggeredAt, addDays(triggeredAt, 10))
        : undefined;

    const qcResult = generateQCResult(returnStatus, reason);

    return {
        shipment: shipment._id,
        order: shipment.orderId,
        reverseAwb: shipment.rtoDetails?.rtoTrackingNumber || `RTO-${shipment.trackingNumber}`,
        rtoReason: reason, // Add the required rtoReason field
        triggeredAt,
        triggeredBy: Math.random() < 0.7 ? 'auto' : 'manual', // Use valid enum values
        triggeredByUser: Math.random() < 0.7 ? undefined : `SELLER-${randomInt(1000, 9999)}`,
        returnStatus,
        forwardShippingCost,
        rtoCharges,
        chargesDeducted: isDelivered && Math.random() < 0.8,
        chargesDeductedAt: isDelivered ? addHours(triggeredAt, randomInt(24, 72)) : undefined,
        warehouse: warehouse?._id || warehouseId,
        expectedReturnDate,
        actualReturnDate,
        qcResult,
        company: shipment.companyId,
        warehouseNotified: isDelivered,
        metadata: {
            forwardAwb: shipment.trackingNumber,
            ndrAttempts: shipment.ndrDetails?.ndrAttempts || randomInt(1, 3),
            lastNdrReason: shipment.ndrDetails?.ndrReason,
            carrier: shipment.carrier,
        },
    };
}

/**
 * Main seeder function
 */
export async function seedRTOEvents(): Promise<void> {
    const timer = createTimer();
    logger.step(10, 'Seeding RTO Events');

    try {
        // Get shipments with RTO status
        const rtoShipments = await Shipment.find({
            currentStatus: { $in: ['rto_initiated', 'rto_in_transit', 'rto_delivered'] },
            isDeleted: false,
        }).lean();

        if (rtoShipments.length === 0) {
            logger.warn('No RTO shipments found. Skipping RTO events seeder.');
            return;
        }

        // Get warehouses for linking
        const warehouses = await Warehouse.find({ isActive: true, isDeleted: false }).lean();
        const warehouseMap = new Map<string, any>();
        for (const wh of warehouses) {
            warehouseMap.set(wh._id.toString(), wh);
        }

        const rtoEvents: any[] = [];
        const statusCount: Record<string, number> = {};
        let qcPassed = 0;
        let qcFailed = 0;

        for (let i = 0; i < rtoShipments.length; i++) {
            const shipment = rtoShipments[i];
            const rtoData = generateRTOEventData(shipment, warehouseMap);
            rtoEvents.push(rtoData);

            // Count statuses
            statusCount[rtoData.returnStatus] = (statusCount[rtoData.returnStatus] || 0) + 1;

            // Count QC results
            if (rtoData.qcResult) {
                if (rtoData.qcResult.passed) qcPassed++;
                else qcFailed++;
            }

            if ((i + 1) % 50 === 0 || i === rtoShipments.length - 1) {
                logger.progress(i + 1, rtoShipments.length, 'RTO Events');
            }
        }

        // Insert all RTO events
        const insertedRTOEvents = await RTOEvent.insertMany(rtoEvents);

        // Update inventory for restocked RTOs
        const inventoryUpdateOps: any[] = [];
        let restockedCount = 0;

        for (const rtoEvent of insertedRTOEvents) {
            // Only process if RTO is in restocked status and QC passed
            if (rtoEvent.returnStatus === 'restocked' && rtoEvent.qcResult?.passed) {
                const shipment = rtoShipments.find(s => (s._id as any).equals(rtoEvent.shipment)) as any;
                if (!shipment || !shipment.products || shipment.products.length === 0) continue;

                // Get inventory records matching the shipment's products
                const skuNames = shipment.products.map((p: any) => p.name || p.sku);

                for (const product of shipment.products as any[]) {
                    const qty = product.quantity || 1;

                    // Find matching inventory SKU and update
                    inventoryUpdateOps.push({
                        updateOne: {
                            filter: {
                                warehouseId: rtoEvent.warehouse,
                                productName: product.name || product.sku,
                                companyId: rtoEvent.company,
                            },
                            update: {
                                $inc: {
                                    onHand: qty,
                                    available: qty,
                                },
                                $set: {
                                    lastReceivedDate: rtoEvent.actualReturnDate || new Date(),
                                    lastMovementDate: new Date(),
                                },
                            },
                            upsert: false,
                        },
                    });

                    restockedCount++;
                }
            }
        }

        if (inventoryUpdateOps.length > 0) {
            await Inventory.bulkWrite(inventoryUpdateOps);
        }

        // Calculate RTO charges
        const totalCharges = rtoEvents.reduce((sum, e) => sum + e.rtoCharges, 0);
        const chargesDeducted = rtoEvents.filter(e => e.chargesDeducted).length;

        logger.complete('RTO events', rtoEvents.length, timer.elapsed());
        logger.table({
            'Total RTO Events': rtoEvents.length,
            'Total RTO Charges': `₹${totalCharges.toLocaleString()}`,
            'Charges Deducted': `${chargesDeducted} (${((chargesDeducted / rtoEvents.length) * 100).toFixed(1)}%)`,
            'QC Passed': qcPassed > 0 ? `${qcPassed} (${((qcPassed / (qcPassed + qcFailed)) * 100).toFixed(1)}%)` : 'N/A',
            'QC Failed': qcFailed > 0 ? `${qcFailed} (${((qcFailed / (qcPassed + qcFailed)) * 100).toFixed(1)}%)` : 'N/A',
            'Inventory Items Restocked': restockedCount,
        });

        logger.info('RTO Status Distribution:');
        logger.table(statusCount);

    } catch (error) {
        logger.error('Failed to seed RTO events:', error);
        throw error;
    }
}

/**
 * Get RTO events by status
 */
export async function getRTOEventsByStatus(status: string) {
    return RTOEvent.find({ returnStatus: status }).lean();
}

/**
 * Get pending RTO events
 */
export async function getPendingRTOEvents() {
    return RTOEvent.find({
        returnStatus: { $in: ['initiated', 'in_transit', 'qc_pending'] },
    }).lean();
}
