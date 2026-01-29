import * as dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import http from 'http';
import express from 'express';
import crypto from 'crypto';

// 1. Load Env
const res = dotenv.config({ path: path.join(process.cwd(), '.env') });
if (res.error) console.error('dotenv load failed:', res.error);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd_test';
const WEBHOOK_PORT = 9099;
const WEBHOOK_URL = `http://localhost:${WEBHOOK_PORT}/webhook`;
const WEBHOOK_SECRET = 'secret_key_123';

async function verifyOutboundWebhooks() {
    console.log('🚀 Starting Outbound Webhook Verification...');

    // 2. Start Local Webhook Receiver Server
    const app = express();
    app.use(express.json());

    let receivedPayload: any = null;
    let receivedSignature: string = '';

    const server = http.createServer(app);

    app.post('/webhook', (req, res) => {
        console.log('📨 Webhook Received!');
        receivedPayload = req.body;
        receivedSignature = req.headers['x-shipcrowd-signature'] as string;
        res.status(200).send('OK');
    });

    await new Promise<void>(resolve => server.listen(WEBHOOK_PORT, resolve));
    console.log(`📡 Local Webhook Server listening on ${WEBHOOK_URL}`);

    try {
        // 3. Connect DB & Imports
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const { Company, Shipment } = await import('../../src/infrastructure/database/mongoose/models');
        const { ShipmentService } = await import('../../src/core/application/services/shipping/shipment.service');
        const { default: WebhookDispatcherService } = await import('../../src/core/application/services/webhooks/webhook-dispatcher.service');
        const { default: QueueManager } = await import('../../src/infrastructure/utilities/queue-manager');
        const { RedisManager } = await import('../../src/infrastructure/redis/redis.manager');

        // Initialize Infrastructure
        await QueueManager.initialize();
        await WebhookDispatcherService.initializeWorker();

        // 4. Setup Company with Webhook Config
        const companyId = new mongoose.Types.ObjectId();
        await Company.create({
            _id: companyId,
            name: `Webhook Test Co ${Date.now()}`,
            settings: {
                webhook: {
                    url: WEBHOOK_URL,
                    secret: WEBHOOK_SECRET,
                    enabled: true,
                    events: ['shipment.status_updated']
                },
                risk: { blockBlacklisted: false }
            }
        });

        // 5. Create Shipment
        const shipmentId = new mongoose.Types.ObjectId();
        const shipment = await Shipment.create({
            _id: shipmentId,
            companyId,
            trackingNumber: `WH-${Date.now()}`,
            currentStatus: 'created',
            orderId: new mongoose.Types.ObjectId(),
            statusHistory: [{ status: 'created', timestamp: new Date() }],
            // Required fields validation fix
            carrier: 'Velocity',
            serviceType: 'express',
            packageDetails: {
                weight: 0.5,
                dimensions: { length: 10, width: 10, height: 10 },
                packageCount: 1,
                packageType: 'box',
                declaredValue: 500
            },
            deliveryDetails: {
                recipientName: 'Webhook Test User',
                recipientPhone: '9999999999',
                address: {
                    line1: '123 Test St',
                    city: 'Bangalore',
                    state: 'KA',
                    postalCode: '560001',
                    country: 'India'
                }
            },
            paymentDetails: {
                type: 'prepaid',
                shippingCost: 50,
                currency: 'INR'
            },
            weights: {
                declared: { value: 0.5, unit: 'kg' },
                verified: false
            }
        });

        console.log(`📦 Shipment Created: ${shipment.trackingNumber}`);

        // 6. Trigger Status Update -> Should fire Webhook
        console.log('🔄 Updating Shipment Status to "shipped"...');

        const updateResult = await ShipmentService.updateShipmentStatus({
            shipmentId: shipmentId.toString(),
            currentStatus: 'created',
            newStatus: 'cancelled', // valid transition
            currentVersion: shipment.__v || 0,
            userId: new mongoose.Types.ObjectId().toString(),
            description: 'Order pushed to carrier'
        });

        if (!updateResult.success) {
            throw new Error(`❌ Update Failed: ${updateResult.error}`);
        }

        console.log('✅ Shipment Status Updated');

        // 7. Wait for Webhook (Async)
        console.log('⏳ Waiting for webhook delivery (max 5s)...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        if (!receivedPayload) {
            throw new Error('❌ Webhook NOT received within timeout');
        }

        console.log('✅ Webhook Payload Received:', JSON.stringify(receivedPayload, null, 2));

        // 8. Verify Signature
        const expectedSignature = crypto
            .createHmac('sha256', WEBHOOK_SECRET)
            .update(JSON.stringify(receivedPayload))
            .digest('hex');

        if (receivedSignature === expectedSignature) {
            console.log('✅ Signature Verified: Valid HMAC');
        } else {
            console.error(`❌ Signature Mismatch! Got: ${receivedSignature}, Expected: ${expectedSignature}`);
            throw new Error('Signature Verification Failed');
        }

        // 9. Verify Event Type
        if (receivedPayload.event === 'shipment.status_updated') {
            console.log('✅ Event Type Verified');
        } else {
            throw new Error(`❌ Wrong Event Type: ${receivedPayload.event}`);
        }

        // Cleanup
        await Company.deleteMany({ _id: companyId });
        await Shipment.deleteMany({ _id: shipmentId });

        console.log('✅ VERIFICATION SUCCESSFUL: Outbound Webhooks Working!');

    } catch (error) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    } finally {
        server.close();
        await mongoose.disconnect();
    }
}

verifyOutboundWebhooks();
