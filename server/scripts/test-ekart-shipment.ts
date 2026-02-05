/**
 * Ekart Shipment Creation Test
 *
 * CAUTION: This test creates REAL shipments in staging
 * Only run when explicitly instructed
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { EkartProvider } from '../src/infrastructure/external/couriers/ekart/ekart.provider';
import { CourierShipmentData } from '../src/infrastructure/external/couriers/base/courier.adapter';

async function testShipmentCreation() {
    console.log('\n⚠️  EKART SHIPMENT CREATION TEST\n');
    console.log('='.repeat(70));
    console.log('⚠️  WARNING: This creates REAL shipments in Ekart staging!');
    console.log('='.repeat(70));

    const allowShipmentCreation = process.env.EKART_ALLOW_SHIPMENT_CREATION === 'true';

    if (!allowShipmentCreation) {
        console.log('\n❌ Shipment creation is DISABLED');
        console.log('\n   To enable, set: EKART_ALLOW_SHIPMENT_CREATION=true');
        console.log('\n   This is a safety measure to prevent accidental shipment creation.\n');
        process.exit(0);
    }

    console.log('\n✅ Shipment creation ENABLED\n');

    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd');
        console.log('✅ Connected to Database\n');

        const mockCompanyId = new mongoose.Types.ObjectId();
        const provider = new EkartProvider(mockCompanyId, {
            baseUrl: process.env.EKART_BASE_URL,
            username: process.env.EKART_USERNAME,
            password: process.env.EKART_PASSWORD,
            clientId: process.env.EKART_CLIENT_ID
        });

        console.log('✅ EkartProvider initialized\n');

        // =================================================================
        // TEST 1: PREPAID SHIPMENT
        // =================================================================
        console.log('📦 TEST 1: Creating Prepaid Shipment');
        console.log('-'.repeat(70));

        const prepaidShipment: CourierShipmentData = {
            orderNumber: `TEST-PREPAID-${Date.now()}`,
            paymentMode: 'prepaid',
            origin: {
                name: 'Test Seller',
                phone: '9876543210',
                address: '123 Test Street, Andheri West',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400058',
                country: 'India'
            },
            destination: {
                name: 'Test Customer',
                phone: '9876543211',
                address: '456 Customer Lane, Koramangala',
                city: 'Bangalore',
                state: 'Karnataka',
                pincode: '560034',
                country: 'India'
            },
            package: {
                weight: 0.5, // 500g
                length: 10,
                width: 10,
                height: 10,
                description: 'Test Product - Prepaid',
            },
            carrierOptions: {
                delhivery: {
                    sellerName: 'Test Seller Pvt Ltd',
                    sellerAddress: '123 Test Street, Andheri West, Mumbai',
                    sellerInv: '27AAAAA0000A1Z5', // Sample GST
                    totalAmount: 1000,
                    hsn: '62046900'
                }
            }
        };

        try {
            console.log('\nRequest payload:');
            console.log(JSON.stringify(prepaidShipment, null, 2));

            const result1 = await provider.createShipment(prepaidShipment);

            console.log('\n✅ Shipment created successfully!');
            console.log(JSON.stringify(result1, null, 2));

            console.log('\n📋 Shipment Details:');
            console.log(`   Tracking Number: ${result1.trackingNumber}`);
            console.log(`   Provider ID: ${result1.providerShipmentId}`);
            if (result1.labelUrl) {
                console.log(`   Label URL: ${result1.labelUrl}`);
            }

        } catch (error: any) {
            console.log('\n❌ Prepaid shipment creation failed:');
            console.log(`   Error: ${error.message}`);
            if (error.response?.data) {
                console.log('   API Response:', JSON.stringify(error.response.data, null, 2));
            }
        }

        // =================================================================
        // TEST 2: COD SHIPMENT
        // =================================================================
        console.log('\n\n📦 TEST 2: Creating COD Shipment');
        console.log('-'.repeat(70));

        const codShipment: CourierShipmentData = {
            orderNumber: `TEST-COD-${Date.now()}`,
            paymentMode: 'cod',
            codAmount: 2500,
            origin: {
                name: 'Test Seller',
                phone: '9876543210',
                address: '123 Test Street, Andheri West',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400058',
                country: 'India'
            },
            destination: {
                name: 'Test Customer',
                phone: '9876543212',
                address: '789 Delivery Road, Indiranagar',
                city: 'Bangalore',
                state: 'Karnataka',
                pincode: '560038',
                country: 'India'
            },
            package: {
                weight: 1.0, // 1kg
                length: 15,
                width: 12,
                height: 10,
                description: 'Test Product - COD',
            },
            carrierOptions: {
                delhivery: {
                    sellerName: 'Test Seller Pvt Ltd',
                    sellerAddress: '123 Test Street, Andheri West, Mumbai',
                    sellerInv: '27AAAAA0000A1Z5',
                    totalAmount: 2500,
                    hsn: '62046900'
                }
            }
        };

        try {
            console.log('\nRequest payload:');
            console.log(JSON.stringify(codShipment, null, 2));

            const result2 = await provider.createShipment(codShipment);

            console.log('\n✅ COD Shipment created successfully!');
            console.log(JSON.stringify(result2, null, 2));

            console.log('\n📋 Shipment Details:');
            console.log(`   Tracking Number: ${result2.trackingNumber}`);
            console.log(`   Provider ID: ${result2.providerShipmentId}`);
            console.log(`   COD Amount: ₹${codShipment.codAmount}`);
            if (result2.labelUrl) {
                console.log(`   Label URL: ${result2.labelUrl}`);
            }

        } catch (error: any) {
            console.log('\n❌ COD shipment creation failed:');
            console.log(`   Error: ${error.message}`);
            if (error.response?.data) {
                console.log('   API Response:', JSON.stringify(error.response.data, null, 2));
            }
        }

        // =================================================================
        // SUMMARY
        // =================================================================
        console.log('\n\n' + '='.repeat(70));
        console.log('📊 SHIPMENT CREATION TEST SUMMARY');
        console.log('='.repeat(70));

        console.log('\n⚠️  IMPORTANT:');
        console.log('   - Check Ekart dashboard for created shipments');
        console.log('   - Cancel test shipments if not needed');
        console.log('   - Monitor for any charges or fees\n');

        await mongoose.disconnect();
        process.exit(0);

    } catch (error: any) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        await mongoose.disconnect();
        process.exit(1);
    }
}

testShipmentCreation();
