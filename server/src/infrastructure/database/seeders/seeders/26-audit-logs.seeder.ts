/**
 * Audit Logs Seeder
 * 
 * Generates audit trails for user activities, orders, and shipments.
 */

import mongoose from 'mongoose';
import AuditLog from '../../mongoose/models/system/audit/audit-log.model';
import Order from '../../mongoose/models/orders/core/order.model';
import Shipment from '../../mongoose/models/logistics/shipping/core/shipment.model';
import RateCard from '../../mongoose/models/logistics/shipping/configuration/rate-card.model';
import User from '../../mongoose/models/iam/users/user.model';
import { logger, createTimer } from '../utils/logger.utils';
import { selectRandom, randomInt } from '../utils/random.utils';
import { subMinutes, subHours, subDays, addDays } from '../utils/date.utils';

export async function seedAuditLogs(): Promise<void> {
    const timer = createTimer();
    logger.step(26, 'Seeding Audit Logs');

    try {
        const users = await User.find({ role: { $in: ['seller', 'staff', 'admin'] } }).lean();

        if (users.length === 0) {
            logger.warn('No users found. Skipping audit log seeding.');
            return;
        }

        let totalLogs = 0;
        const batchSize = 1000;
        let logsBuffer: any[] = [];

        // 1. Seed Order Audit Logs
        // Using cursor for memory efficiency
        const totalOrders = await Order.countDocuments();
        const orderCursor = Order.find().cursor();
        let orderCount = 0;

        for (let order = await orderCursor.next(); order != null; order = await orderCursor.next()) {
            const orderDoc = order as any;
            const createdBy = selectRandom(users);
            const createdAt = new Date(orderDoc.createdAt);

            // 1. Creation Log
            logsBuffer.push({
                userId: createdBy._id,
                companyId: orderDoc.companyId,
                action: 'create',
                resource: 'order',
                resourceId: orderDoc._id,
                details: {
                    message: `Order ${orderDoc.orderNumber} created`,
                    document: { orderNumber: orderDoc.orderNumber, amount: orderDoc.totals?.total }
                },
                timestamp: createdAt,
                ipAddress: '192.168.1.1',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
            });

            // 2. Status Updates
            // Simulate: Created -> Confirmed -> Processing
            const statuses = ['confirmed', 'processing'];
            if (orderDoc.currentStatus === 'shipped' || orderDoc.currentStatus === 'delivered') {
                statuses.push('shipped');
            }
            if (orderDoc.currentStatus === 'delivered') {
                statuses.push('delivered');
            }
            if (orderDoc.currentStatus === 'cancelled') {
                statuses.push('cancelled');
            }

            let lastTime = createdAt;
            for (const status of statuses) {
                // Advance time but clamp to now() to prevent future dates
                const timeAdvance = randomInt(10, 240) * 60 * 1000;
                let nextTime = new Date(lastTime.getTime() + timeAdvance);

                if (nextTime > new Date()) {
                    nextTime = new Date(); // Snap to now if future
                }

                // If snapping made it same as lastTime, add just 1 second to preserve order
                if (nextTime <= lastTime) {
                    nextTime = new Date(lastTime.getTime() + 1000);
                }

                // If still future (because lastTime was already now), break loop as event hasn't happened yet
                if (nextTime > new Date()) break;

                lastTime = nextTime;

                logsBuffer.push({
                    userId: selectRandom(users)._id,
                    companyId: orderDoc.companyId,
                    action: 'update',
                    resource: 'order',
                    resourceId: orderDoc._id,
                    details: {
                        message: `Order status updated to ${status}`,
                        changes: { status: { from: 'previous', to: status } }
                    },
                    timestamp: lastTime,
                    ipAddress: '192.168.1.1'
                });
            }

            orderCount++;
            if (logsBuffer.length >= batchSize) {
                await AuditLog.insertMany(logsBuffer, { ordered: false });
                totalLogs += logsBuffer.length;
                logsBuffer = [];
                logger.progress(orderCount, totalOrders, 'Orders Processed');
            }
        }

        // Flush remaining order logs
        if (logsBuffer.length > 0) {
            await AuditLog.insertMany(logsBuffer, { ordered: false });
            totalLogs += logsBuffer.length;
            logsBuffer = [];
        }

        // 2. Seed Shipment Audit Logs
        const totalShipments = await Shipment.countDocuments();
        const shipmentCursor = Shipment.find().cursor();
        let shipmentCount = 0;

        for (let shipment = await shipmentCursor.next(); shipment != null; shipment = await shipmentCursor.next()) {
            const shipmentDoc = shipment as any;
            const createdBy = selectRandom(users);
            const createdAt = new Date(shipmentDoc.createdAt);

            logsBuffer.push({
                userId: createdBy._id,
                companyId: shipmentDoc.companyId,
                action: 'create',
                resource: 'shipment',
                resourceId: shipmentDoc._id,
                details: {
                    message: `Shipment ${shipmentDoc.trackingNumber} created`,
                    document: { trackingNumber: shipmentDoc.trackingNumber, carrier: shipmentDoc.carrier }
                },
                timestamp: createdAt,
                ipAddress: '192.168.1.1',
            });

            shipmentCount++;
            if (logsBuffer.length >= batchSize) {
                await AuditLog.insertMany(logsBuffer, { ordered: false });
                totalLogs += logsBuffer.length;
                logsBuffer = [];
                logger.progress(shipmentCount, totalShipments, 'Shipments Processed');
            }
        }

        if (logsBuffer.length > 0) {
            await AuditLog.insertMany(logsBuffer, { ordered: false });
            totalLogs += logsBuffer.length;
            logsBuffer = [];
        }

        // 3. Seed Rate Card Audit Logs
        const rateCards = await RateCard.find({ isDeleted: false }).lean();
        for (const rateCard of rateCards) {
            const createdBy = selectRandom(users);
            const createdAt = new Date(rateCard.createdAt);

            logsBuffer.push({
                userId: createdBy._id,
                companyId: rateCard.companyId,
                action: 'create',
                resource: 'ratecard',
                resourceId: rateCard._id,
                details: {
                    message: `Rate card ${rateCard.name} created`,
                    document: { name: rateCard.name, status: rateCard.status }
                },
                timestamp: createdAt,
                ipAddress: '192.168.1.1',
            });

            if (Math.random() < 0.5) {
                const updatedAt = addDays(createdAt, randomInt(1, 20));
                logsBuffer.push({
                    userId: selectRandom(users)._id,
                    companyId: rateCard.companyId,
                    action: 'update',
                    resource: 'ratecard',
                    resourceId: rateCard._id,
                    details: {
                        message: `Rate card ${rateCard.name} updated`,
                        changes: { status: { from: rateCard.status, to: rateCard.status } }
                    },
                    timestamp: updatedAt,
                    ipAddress: '192.168.1.1',
                });
            }
        }

        if (logsBuffer.length > 0) {
            await AuditLog.insertMany(logsBuffer, { ordered: false });
            totalLogs += logsBuffer.length;
            logsBuffer = [];
        }

        // 4. Seed User Activity Logs (Login/Logout)
        // Generate some random activity for each user
        for (const user of users) {
            const userDoc = user as any;
            const loginCount = randomInt(5, 20);

            for (let i = 0; i < loginCount; i++) {
                const loginTime = subDays(new Date(), randomInt(0, 30));

                logsBuffer.push({
                    userId: userDoc._id,
                    companyId: userDoc.companyId,
                    action: 'login',
                    resource: 'auth',
                    details: { message: 'User logged in' },
                    timestamp: loginTime,
                    ipAddress: '192.168.1.1'
                });

                // Logout after some time
                logsBuffer.push({
                    userId: userDoc._id,
                    companyId: userDoc.companyId,
                    action: 'logout',
                    resource: 'auth',
                    details: { message: 'User logged out' },
                    timestamp: new Date(loginTime.getTime() + randomInt(10, 120) * 60000),
                    ipAddress: '192.168.1.1'
                });
            }
        }

        if (logsBuffer.length > 0) {
            await AuditLog.insertMany(logsBuffer, { ordered: false });
            totalLogs += logsBuffer.length;
            logsBuffer = [];
        }

        logger.complete('Audit Logs', totalLogs, timer.elapsed());
    } catch (error) {
        logger.error('Failed to seed audit logs:', error);
        throw error;
    }
}
