
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

// Load Env
dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd_test';

async function verifyNDRWhatsapp() {
    console.log('🚀 Starting NDR WhatsApp Verification...');

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Dynamic Imports
        const { Shipment, NDREvent, NDRWorkflow, Company } = await import('../../src/infrastructure/database/mongoose/models');
        const { default: NDRService } = await import('../../src/core/application/services/logistics/ndr.service');

        // 1. Setup Test Data
        const companyId = new mongoose.Types.ObjectId();
        const uniqueName = `NDR Test Co ${Date.now()}`;
        await Company.create({ _id: companyId, name: uniqueName });

        // 2. Create Workflow Rule
        await NDRWorkflow.deleteMany({ company: companyId }); // Cleanup
        await NDRWorkflow.create({
            company: companyId,
            ndrType: 'customer_unavailable',
            isActive: true,
            isDefault: false,
            name: 'Verification Workflow', // Added required field
            actions: [
                {
                    sequence: 1, // Added required field
                    actionType: 'send_whatsapp',
                    autoExecute: true,
                    delayMinutes: 0,
                    description: 'Send WhatsApp Alert'
                }
            ]
        });
        console.log('✅ NDR Workflow Created');

        // 3. Create Shipment
        const shipmentId = new mongoose.Types.ObjectId();
        const shipment = await Shipment.create({
            _id: shipmentId,
            companyId,
            orderId: new mongoose.Types.ObjectId(), // Fixed: Must be ObjectId
            trackingNumber: `NDR-WA-${Date.now()}`,
            currentStatus: 'shipped',
            carrierDetails: { carrierTrackingNumber: `AWB-${Date.now()}` },
            carrier: 'velocity', // Added required field
            serviceType: 'surface', // Added required field
            deliveryDetails: {
                recipientName: 'Whatsapp Test User',
                recipientPhone: '9999999999', // Test phone
                address: { line1: 'Test St', city: 'Test City', state: 'Test State', postalCode: '123456', country: 'India' }
            },
            packageDetails: {
                weight: 0.5, dimensions: { length: 10, width: 10, height: 10 },
                packageCount: 1, packageType: 'box', declaredValue: 500
            },
            paymentDetails: { type: 'prepaid', shippingCost: 50, currency: 'INR' },
            weights: { declared: { value: 0.5, unit: 'kg' }, verified: false }
        });
        console.log(`📦 Shipment Created: ${shipment.trackingNumber}`);

        // 4. Trigger NDR Event
        const ndrService = new NDRService();
        console.log('🔄 Triggering NDR Event (Customer Unavailable)...');

        await ndrService.processNDREvent(shipment, {
            awb: shipment.carrierDetails.carrierTrackingNumber!,
            courierStatus: 'UNDELIVERED',
            remarks: 'Customer not available at location',
            timestamp: new Date(),
            courierCode: 'velocity',
            ndrType: 'customer_unavailable' // Matches workflow
        });

        // 5. Verification
        // We check if the event status moved to 'in_resolution' (meaning workflow executed)
        // And check if the action was logged in the event
        const event = await NDREvent.findOne({ awb: shipment.carrierDetails.carrierTrackingNumber });

        if (!event) throw new Error('NDR Event not created');

        console.log(`📋 NDR Event Status: ${event.status}`);

        const action = event.resolutionActions.find(a => a.actionType === 'send_whatsapp');
        if (!action) {
            throw new Error('❌ send_whatsapp action NOT found in resolution actions');
        }

        if (action.result === 'success') {
            console.log('✅ WhatsApp Notification Action executed successfully!');
            console.log('✅ Action Metadata:', action.metadata);
        } else {
            console.error('❌ Action Failed:', action.metadata);
            throw new Error('Action result was failed');
        }

        // Cleanup
        await Company.deleteMany({ _id: companyId });
        await Shipment.deleteMany({ _id: shipmentId });
        await NDREvent.deleteMany({ _id: event._id });
        await NDRWorkflow.deleteMany({ company: companyId });

        console.log('✅ VERIFICATION SUCCESSFUL: NDR WhatsApp Wired!');

    } catch (error) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

verifyNDRWhatsapp();
