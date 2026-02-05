/**
 * Complete Ekart API Test Suite - Fixed Version
 *
 * Tests all Ekart API endpoints with proper error handling
 * and detailed reporting
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { EkartProvider } from '../src/infrastructure/external/couriers/ekart/ekart.provider';

interface TestResult {
    name: string;
    passed: boolean;
    details?: any;
    error?: string;
    apiResponse?: any;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    console.log(`\n🧪 ${name}`);
    try {
        const result = await testFn();
        results.push({ name, passed: true, details: result });
        console.log(`   ✅ PASSED`);
        if (result) {
            const resultStr = JSON.stringify(result, null, 2);
            const lines = resultStr.split('\n').slice(0, 10);
            console.log(`      ${lines.join('\n      ')}`);
            if (resultStr.split('\n').length > 10) {
                console.log('      ...');
            }
        }
    } catch (error: any) {
        const errorMessage = error.message || 'Unknown error';
        const apiResponse = error.response?.data || error.response || null;

        results.push({
            name,
            passed: false,
            error: errorMessage,
            apiResponse
        });

        console.log(`   ❌ FAILED: ${errorMessage}`);

        if (apiResponse) {
            console.log(`      API Response: ${JSON.stringify(apiResponse, null, 2)}`);
        }
    }
}

async function completeTest() {
    console.log('\n🔬 Complete Ekart API Testing Suite\n');
    console.log('='.repeat(70));

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

        console.log('✅ EkartProvider initialized');
        console.log('='.repeat(70));

        // =================================================================
        // 1. SERVICEABILITY TESTS
        // =================================================================
        console.log('\n📍 1. SERVICEABILITY TESTS');
        console.log('-'.repeat(70));

        const testPincodes = [
            { code: '110001', name: 'Delhi - Connaught Place' },
            { code: '400001', name: 'Mumbai - Fort' },
            { code: '560001', name: 'Bangalore - MG Road' },
            { code: '600001', name: 'Chennai - Central' },
            { code: '700001', name: 'Kolkata - BBD Bagh' },
            { code: '500001', name: 'Hyderabad - Abids' },
            { code: '380001', name: 'Ahmedabad - Ellis Bridge' },
        ];

        for (const pincode of testPincodes) {
            await runTest(`Serviceability: ${pincode.name} (${pincode.code})`, async () => {
                const result = await provider.checkServiceability(pincode.code);
                return { serviceable: result };
            });
        }

        // =================================================================
        // 2. RATE ESTIMATION TESTS (FIXED with shippingDirection)
        // =================================================================
        console.log('\n\n💰 2. RATE ESTIMATION TESTS (FIXED)');
        console.log('-'.repeat(70));

        // Test 1: Standard Prepaid - Short Distance
        await runTest('Rates: Mumbai → Pune (1kg, Prepaid, FORWARD)', async () => {
            return await provider.getRates({
                origin: { pincode: '400001' },
                destination: { pincode: '411001' },
                package: { weight: 1.0, length: 10, width: 10, height: 10 },
                paymentMode: 'prepaid',
                orderValue: 1000
            });
        });

        // Test 2: COD Mode - Long Distance
        await runTest('Rates: Mumbai → Delhi (1kg, COD, FORWARD)', async () => {
            return await provider.getRates({
                origin: { pincode: '400001' },
                destination: { pincode: '110001' },
                package: { weight: 1.0, length: 10, width: 10, height: 10 },
                paymentMode: 'cod',
                orderValue: 2000
            });
        });

        // Test 3: Heavier Package
        await runTest('Rates: Mumbai → Delhi (5kg, Prepaid)', async () => {
            return await provider.getRates({
                origin: { pincode: '400001' },
                destination: { pincode: '110001' },
                package: { weight: 5.0, length: 20, width: 15, height: 15 },
                paymentMode: 'prepaid',
                orderValue: 5000
            });
        });

        // Test 4: Different Route - South to South
        await runTest('Rates: Bangalore → Chennai (2kg, Prepaid)', async () => {
            return await provider.getRates({
                origin: { pincode: '560001' },
                destination: { pincode: '600001' },
                package: { weight: 2.0, length: 15, width: 12, height: 12 },
                paymentMode: 'prepaid',
                orderValue: 3000
            });
        });

        // Test 5: Very light package
        await runTest('Rates: Delhi → Mumbai (0.5kg, Prepaid)', async () => {
            return await provider.getRates({
                origin: { pincode: '110001' },
                destination: { pincode: '400001' },
                package: { weight: 0.5, length: 10, width: 8, height: 5 },
                paymentMode: 'prepaid',
                orderValue: 500
            });
        });

        // =================================================================
        // 3. WAREHOUSE MANAGEMENT
        // =================================================================
        console.log('\n\n🏭 3. WAREHOUSE MANAGEMENT');
        console.log('-'.repeat(70));

        await runTest('Create Warehouse: Mumbai Test Location', async () => {
            return await provider.createWarehouse({
                alias: `TEST_MUM_${Date.now().toString().slice(-4)}`,
                phone: 9876543210,
                address_line1: '123 Test Street, Andheri West',
                address_line2: 'Near Railway Station',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: 400058,
                country: 'India'
            });
        });

        await runTest('Create Warehouse: Delhi Test Location', async () => {
            return await provider.createWarehouse({
                alias: `TEST_DEL_${Date.now().toString().slice(-4)}`,
                phone: 9876543211,
                address_line1: '456 Commercial Complex, Connaught Place',
                city: 'New Delhi',
                state: 'Delhi',
                pincode: 110001,
                country: 'India'
            });
        });

        // =================================================================
        // 4. TRACKING TEST (FIXED endpoint)
        // =================================================================
        console.log('\n\n📦 4. TRACKING TEST (FIXED)');
        console.log('-'.repeat(70));

        // This will fail with dummy AWB but should now use correct endpoint
        await runTest('Track Shipment: Dummy AWB (Expected to Fail)', async () => {
            return await provider.trackShipment('EK123456789');
        });

        // =================================================================
        // 5. CANCELLATION TEST
        // =================================================================
        console.log('\n\n🚫 5. CANCELLATION TEST');
        console.log('-'.repeat(70));

        await runTest('Cancel Shipment: Dummy AWB (Expected to Fail)', async () => {
            return await provider.cancelShipment('EK123456789');
        });

        // =================================================================
        // COMPREHENSIVE SUMMARY
        // =================================================================
        console.log('\n\n' + '='.repeat(70));
        console.log('📊 COMPREHENSIVE TEST SUMMARY');
        console.log('='.repeat(70));

        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;
        const successRate = ((passed / results.length) * 100).toFixed(1);

        console.log(`\n📈 Overall Results:`);
        console.log(`   Total Tests: ${results.length}`);
        console.log(`   ✅ Passed: ${passed}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`   Success Rate: ${successRate}%\n`);

        // Category breakdown
        const categories = {
            'Serviceability': results.filter(r => r.name.includes('Serviceability')),
            'Rate Estimation': results.filter(r => r.name.includes('Rates')),
            'Warehouse': results.filter(r => r.name.includes('Warehouse')),
            'Tracking': results.filter(r => r.name.includes('Track')),
            'Cancellation': results.filter(r => r.name.includes('Cancel'))
        };

        console.log('📊 Category Breakdown:');
        console.log('-'.repeat(70));

        Object.entries(categories).forEach(([category, tests]) => {
            const catPassed = tests.filter(t => t.passed).length;
            const catTotal = tests.length;
            const catRate = catTotal > 0 ? ((catPassed / catTotal) * 100).toFixed(0) : '0';
            const status = catPassed === catTotal ? '✅' : catPassed > 0 ? '⚠️' : '❌';
            console.log(`${status} ${category.padEnd(20)} ${catPassed}/${catTotal} (${catRate}%)`);
        });

        console.log('\n' + '-'.repeat(70));
        console.log('📋 DETAILED RESULTS:');
        console.log('-'.repeat(70));

        results.forEach((result) => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.name}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });

        // =================================================================
        // ANALYSIS & RECOMMENDATIONS
        // =================================================================
        console.log('\n' + '='.repeat(70));
        console.log('💡 ANALYSIS & RECOMMENDATIONS');
        console.log('='.repeat(70));

        const servicePassed = categories['Serviceability'].filter(t => t.passed).length > 0;
        const ratesPassed = categories['Rate Estimation'].filter(t => t.passed).length > 0;
        const warehousePassed = categories['Warehouse'].filter(t => t.passed).length > 0;

        console.log('\n🔍 What We Learned:\n');

        if (servicePassed) {
            console.log('✅ Serviceability API: WORKING');
            console.log('   - Endpoint fixed and responding correctly');
            console.log('   - Can check pincode serviceability');
        } else {
            console.log('❌ Serviceability API: NOT WORKING');
            console.log('   - May require registered warehouses');
        }

        if (ratesPassed) {
            console.log('\n✅ Rate Estimation API: WORKING');
            console.log('   - Fixed shippingDirection parameter');
            console.log('   - Can fetch shipping rates');
            console.log('   - Ready for production use');
        } else {
            console.log('\n❌ Rate Estimation API: NOT WORKING');
            console.log('   - May require warehouse registration first');
            console.log('   - Contact Ekart support for staging activation');
        }

        if (warehousePassed) {
            console.log('\n✅ Warehouse Creation: WORKING');
            console.log('   - Can register warehouses programmatically');
            console.log('   - Ready for onboarding flow');
        } else {
            console.log('\n❌ Warehouse Creation: NOT WORKING');
            console.log('   - May need to register via Ekart portal first');
        }

        console.log('\n📝 Next Steps:\n');

        if (failed > passed) {
            console.log('⚠️  ACTION REQUIRED:');
            console.log('   1. Contact Ekart support for staging environment setup');
            console.log('   2. Request list of serviceable pincodes in staging');
            console.log('   3. Clarify warehouse registration requirements');
            console.log('   4. Ask for complete staging API documentation');
            console.log('   5. Request activation of all API features for testing');
        } else {
            console.log('✅ READY FOR NEXT PHASE:');
            console.log('   1. Test shipment creation with valid warehouse');
            console.log('   2. Set up webhook endpoints');
            console.log('   3. Test label generation');
            console.log('   4. Test manifest generation');
            console.log('   5. Prepare for production deployment');
        }

        console.log('\n📧 Support Contact Template:');
        console.log('-'.repeat(70));
        console.log(`
Subject: Staging Environment API Access - Integration Testing

Hello Ekart Team,

We're integrating with the Ekart Logistics API and have successfully
authenticated with staging credentials. However, we're encountering
validation errors on several endpoints.

Test Results:
- Authentication: ✅ Working
- Serviceability: ${servicePassed ? '✅' : '❌'} ${servicePassed ? 'Working' : 'Issues'}
- Rate Estimation: ${ratesPassed ? '✅' : '❌'} ${ratesPassed ? 'Working' : 'Issues'}
- Warehouse Creation: ${warehousePassed ? '✅' : '❌'} ${warehousePassed ? 'Working' : 'Issues'}

Questions:
1. Do we need to register warehouses via portal before API operations?
2. Which pincodes are serviceable in staging environment?
3. Are there additional account activations needed for full API access?
4. Can you provide staging-specific API documentation?

Credentials:
- Username: ${process.env.EKART_USERNAME}
- Client ID: ${process.env.EKART_CLIENT_ID}
- Environment: Staging

Thank you for your assistance!
`);

        console.log('='.repeat(70));
        console.log('\n✨ Test suite completed!\n');

        await mongoose.disconnect();
        process.exit(0);

    } catch (error: any) {
        console.error('\n❌ Test suite failed:', error.message);
        console.error(error.stack);
        await mongoose.disconnect();
        process.exit(1);
    }
}

completeTest();
