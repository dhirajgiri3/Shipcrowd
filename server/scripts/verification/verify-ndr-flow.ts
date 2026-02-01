
import * as dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

const res = dotenv.config({ path: path.join(process.cwd(), '.env') });
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd_test';

async function verifyNDRFlow() {
    console.log('🚀 Starting NDR Flow Verification...');

    try {
        const modelsPath = path.resolve(process.cwd(), 'src/infrastructure/database/mongoose/models/index.ts');
        const webhookServicePath = path.resolve(process.cwd(), 'src/core/application/services/webhooks/velocity-webhook.service.ts');

        const { Shipment, NDREvent, Company, Order, User, NDRWorkflow } = await import(modelsPath);
        const { VelocityWebhookService } = await import(webhookServicePath);

        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Seed Workflows
        console.log('🛠 Seeding Default Workflows...');
        await NDRWorkflow.seedDefaultWorkflows();

        // 1. Setup Test Data
        const companyId = new mongoose.Types.ObjectId();
        const orderId = new mongoose.Types.ObjectId();

        console.log('🌱 Seeding Mock Shipment...');
        await Shipment.deleteMany({ trackingNumber: 'TEST_NDR_ORDER_123' });
        await NDREvent.deleteMany({ awb: 'TEST_AWB_NDR_123' });

        const shipment = await Shipment.create({
            trackingNumber: 'TEST_NDR_ORDER_123',
            carrierDetails: {
                carrierTrackingNumber: 'TEST_AWB_NDR_123'
            },
            companyId: companyId,
            orderId: orderId,
            currentStatus: 'shipped',
            statusHistory: [],
            packageDetails: {
                weight: 0.5,
                dimensions: { length: 10, width: 10, height: 10 },
                packageType: 'box',
                declaredValue: 500
            },
            weights: {
                declared: {
                    value: 0.5,
                    unit: 'kg'
                },
                verified: false
            },
            deliveryDetails: {
                recipientName: 'Test User',
                recipientPhone: '9999999999',
                address: {
                    line1: 'Test Address',
                    city: 'Delhi',
                    state: 'Delhi',
                    country: 'India',
                    postalCode: '110001'
                }
            },
            pickupDetails: {
                warehouseId: new mongoose.Types.ObjectId(),
                pickupDate: new Date(),
                contactPerson: 'Warehouse Manager',
                contactPhone: '9876543210'
            },
            carrier: 'velocity',
            serviceType: 'standard',
            channelOrderId: 'DEV_TEST',
            shipmentType: 'forward',
            paymentDetails: {
                type: 'prepaid',
                shippingCost: 50,
                currency: 'INR'
            }
        });

        // 2. Simulate Webhook
        console.log('🔄 Simulating Velocity NDR Webhook...');
        const service = new VelocityWebhookService();

        const payload = {
            event_type: 'SHIPMENT_STATUS_UPDATE',
            shipment_data: {
                awb: 'TEST_AWB_NDR_123',
                order_id: 'TEST_NDR_ORDER_123',
                status: 'Undelivered',
                status_code: 'NDR',
                current_location: 'Delhi Hub',
                description: 'Customer Not Available - Phone Switched Off'
            },
            timestamp: new Date().toISOString()
        };

        const result = await service.handleStatusUpdate(payload as any);
        console.log('Webhook Result:', result);

        // 3. Verify NDREvent Creation
        console.log('🔍 Verifying NDREvent in DB...');
        // Wait a bit because NDR processing is async inside webhook handler (if not awaited properly in service logic, but it was awaited in my edit)
        // Wait 1s just in case
        await new Promise(r => setTimeout(r, 1000));

        const event = await NDREvent.findOne({ awb: 'TEST_AWB_NDR_123' });

        if (event) {
            console.log('✅ PASS: NDREvent Created!');
            console.log(`   ID: ${event._id}`);
            console.log(`   Type: ${event.ndrType}`); // Should be 'customer_unavailable'
            console.log(`   Status: ${event.status}`); // Should be 'in_resolution' if workflow ran, or 'detected'

            if (event.ndrType === 'customer_unavailable') {
                console.log('✅ PASS: Classification Correct (customer_unavailable)');
            } else {
                console.error(`❌ FAIL: Wrong Classification: ${event.ndrType}`);
            }

            if (event.resolutionActions && event.resolutionActions.length > 0) {
                console.log(`✅ PASS: Workflow Actions Executed: ${event.resolutionActions.length} actions.`);
                event.resolutionActions.forEach((a: any) => console.log(`      - ${a.actionType}: ${a.result}`));
            } else {
                console.warn('⚠️ WARNING: No Actions Executed (Check if default workflow exists or blocked by stub?)');
            }

        } else {
            console.error('❌ FAIL: NDREvent NOT Found!');
        }


        // 4. Verify Manual Resolution
        console.log('🛠 Verifying Manual Resolution (Reattempt)...');
        // Dynamic import logic reused for testing
        const { default: NDRService } = await import('../../src/core/application/services/logistics/ndr.service');
        const ndrService = new NDRService();

        await ndrService.resolveNDR(event._id as string, 'reattempt', 'Customer promised to be available');

        const updatedEvent = await NDREvent.findById(event._id);
        if (updatedEvent?.status === 'resolved' && updatedEvent.resolutionMethod === 'reattempt_requested') {
            console.log('✅ PASS: Manual Resolution (Reattempt) Success!');
        } else {
            console.error('❌ FAIL: Manual Resolution Failed', updatedEvent);
        }

    } catch (error) {
        console.error('❌ Fatal Error:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

verifyNDRFlow();
