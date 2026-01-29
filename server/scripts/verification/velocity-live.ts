
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Import Models and Provider
// Using relative paths to avoid alias issues in simple script execution
import Company from '../../src/infrastructure/database/mongoose/models/organization/core/company.model';
import Warehouse from '../../src/infrastructure/database/mongoose/models/logistics/warehouse/structure/warehouse.model';
import { VelocityShipfastProvider } from '../../src/infrastructure/external/couriers/velocity/velocity-shipfast.provider';
import { encryptData } from '../../src/shared/utils/encryption';
import logger from '../../src/shared/logger/winston.logger';
import { CourierShipmentData } from '../../src/infrastructure/external/couriers/base/courier.adapter';
import Integration from '../../src/infrastructure/database/mongoose/models/system/integrations/integration.model';

// Mock Logger to avoid clutter
// Mock Logger to avoid clutter
(logger as any).info = console.log;
(logger as any).error = console.error;
(logger as any).warn = console.warn;
(logger as any).debug = () => { };

const TEST_DB = 'mongodb://127.0.0.1:27017/Shipcrowd_velocity_live_test';

const CREDENTIALS = {
    username: '+919866340090',
    password: 'Velocity@123'
};

async function main() {
    console.log('🚀 Starting Velocity Live Verification...');

    try {
        // 1. Connect to DB
        await mongoose.connect(TEST_DB);
        console.log('✅ Connected to Test DB');

        // 2. Setup Data
        const companyId = new mongoose.Types.ObjectId();

        // Create Company
        await Company.create({
            _id: companyId,
            name: 'Velocity Test Company',
            slug: 'velocity-test',
            contacts: { email: 'test@shipcrowd.com', phone: '+919876543210' }
        });

        // Create Warehouse
        const warehouse = await Warehouse.create({
            companyId,
            name: 'Velocity Test Warehouse',
            code: 'WH-TEST-001',
            contactInfo: {
                name: 'Test Manager',
                phone: '9876543210',
                email: 'warehouse@shipcrowd.com'
            },
            address: {
                line1: 'Plot 123, Udyog Vihar',
                line2: 'Phase 4',
                city: 'Delhi',
                state: 'Delhi',
                postalCode: '110001',
                country: 'India'
            },
            status: 'active'
        });
        console.log('✅ Created Test Warehouse:', warehouse.name);

        // Create Integration
        await Integration.create({
            companyId,
            type: 'courier',
            provider: 'velocity-shipfast',
            name: 'Velocity Live',
            credentials: {
                username: encryptData(CREDENTIALS.username),
                password: encryptData(CREDENTIALS.password)
            },
            settings: { isActive: true, isPrimary: true }
        });
        console.log('✅ Created Integration with Live Credentials');

        // 3. Initialize Provider
        const provider = new VelocityShipfastProvider(companyId);

        // 4. Test Serviceability (Get Rates)
        console.log('\n📡 Testing Serviceability...');
        const isServiceable = await provider.checkServiceability('400001'); // Mumbai
        console.log(`Serviceability (400001): ${isServiceable ? '✅ Available' : '❌ Unavailable'}`);

        if (!isServiceable) {
            console.warn("⚠️ Warning: 400001 is not serviceable, trying rates anyway...");
        }

        const rates = await provider.getRates({
            origin: { pincode: '110001' }, // From Warehouse (Delhi)
            destination: { pincode: '400001' }, // To Mumbai
            package: { weight: 0.5, length: 10, width: 10, height: 10 },
            paymentMode: 'prepaid'
        });
        console.log('✅ Rates Fetched:', rates.length > 0 ? `${rates.length} options` : '0 options');
        rates.forEach(r => console.log(`   - ${r.serviceType}: ₹${r.total}`));

        // 5. Create Shipment
        console.log('\n📦 Testing Shipment Creation...');
        const orderId = `TEST-${Date.now()}`;
        const shipmentData = {
            orderNumber: orderId,
            paymentMode: 'prepaid',
            origin: {
                name: warehouse.name,
                phone: warehouse.contactInfo.phone,
                // email: warehouse.contactInfo.email, // Removed as not strictly in interface
                address: warehouse.address.line1,
                city: warehouse.address.city,
                state: warehouse.address.state,
                pincode: warehouse.address.postalCode,
                country: 'India'
            },
            destination: {
                name: 'Live Test User',
                phone: '9876543210',
                address: 'Fort',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
                country: 'India'
            },
            package: {
                weight: 0.5,
                length: 10,
                width: 10,
                height: 10,
                declaredValue: 500
            },
            warehouseId: warehouse._id as string
        } as CourierShipmentData;

        const shipment = await provider.createShipment(shipmentData);
        console.log('✅ Shipment Created!');
        console.log('   AWB:', shipment.trackingNumber);
        console.log('   Label:', shipment.labelUrl);

        // 6. Track Shipment
        console.log('\n🔍 Testing Tracking...');
        const tracking = await provider.trackShipment(shipment.trackingNumber);
        console.log('✅ Tracking Success!');
        console.log('   Status:', tracking.status);
        console.log('   Location:', tracking.currentLocation);

        // 7. Cancel Shipment
        console.log('\n🚫 Testing Cancellation...');
        // Velocity might not allow immediate cancellation of just-created orders, or might need a delay
        // We'll try immediately
        try {
            const cancelled = await provider.cancelShipment(shipment.trackingNumber);
            console.log(`Cancellation Result: ${cancelled ? '✅ Cancelled' : '❌ Failed'}`);
        } catch (e: any) {
            console.log('⚠️ Cancellation Error (Expected if too soon/not cancellable):', e.message);
        }

        // 8. Schedule Pickup
        console.log('\n🚚 Testing Schedule Pickup...');
        try {
            // Note: schedulePickup requires providerShipmentId ( Velocity's shipment_id )
            // We need to ensure CREATE returned it. Provider maps it to providerShipmentId.
            if (!shipment.providerShipmentId) {
                console.warn('⚠️ Skipping Schedule Pickup: No providerShipmentId returned from Create Shipment');
            } else {
                const pickup = await provider.schedulePickup({ providerShipmentId: shipment.providerShipmentId });
                console.log('✅ Pickup Scheduled!', pickup);
            }
        } catch (e: any) {
            console.log('❌ Schedule Pickup Failed:', e.message);
            if (e.response) console.log('   Response parts:', JSON.stringify(e.response.data));
        }

        // 9. Create Reverse Shipment (RTO)
        console.log('\n↩️ Testing Reverse Shipment (RTO)...');
        try {
            const reverseShipment = await provider.createReverseShipment(
                shipment.trackingNumber, // original AWB
                {
                    name: 'Rahul Sharma',
                    phone: '8860697807',
                    address: '123 MG Road Bandra West',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    pincode: '400050',
                    country: 'India',
                    email: 'rahul.sharma@gmail.com'
                },
                warehouse._id as string, // Return to same warehouse
                {
                    weight: 0.5,
                    length: 10,
                    width: 10,
                    height: 10
                },
                orderId,
                'Customer changed mind'
            );
            console.log('✅ Reverse Shipment Created!');
            console.log('   Reverse AWB:', reverseShipment.awb_code);
            console.log('   Courier:', reverseShipment.courier_name);
            console.log('   Label:', reverseShipment.label_url);
        } catch (e: any) {
            console.log('❌ Reverse Shipment Failed:', e.message);
            if (e.response) console.log('   Response parts:', JSON.stringify(e.response.data));
        }

    } catch (error: any) {
        console.error('\n❌ Verification Failed:', error.message);
        if (error.velocityError) {
            console.error('Velocity Error Details:', JSON.stringify(error.velocityError, null, 2));
        }
        if (error.response) {
            console.error('API Response:', JSON.stringify(error.response.data, null, 2));
        }
    } finally {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
        console.log('\n🏁 Verification Complete (Test DB Dropped)');
        process.exit(0);
    }
}

main();
