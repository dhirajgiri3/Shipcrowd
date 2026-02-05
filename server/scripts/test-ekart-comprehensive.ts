/**
 * Comprehensive Ekart API Test Suite
 *
 * Tests multiple scenarios to identify what works in staging:
 * 1. Multiple pincode combinations
 * 2. COD vs Prepaid
 * 3. Warehouse creation
 * 4. Different package weights/dimensions
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { EkartProvider } from '../src/infrastructure/external/couriers/ekart/ekart.provider';

interface TestResult {
    name: string;
    passed: boolean;
    details?: any;
    error?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    console.log(`\n🧪 ${name}`);
    try {
        const result = await testFn();
        results.push({ name, passed: true, details: result });
        console.log(`   ✅ PASSED`);
        if (result) {
            console.log(`      ${JSON.stringify(result, null, 2).split('\n').slice(0, 5).join('\n      ')}`);
        }
    } catch (error: any) {
        results.push({ name, passed: false, error: error.message });
        console.log(`   ❌ FAILED: ${error.message}`);
        // Capture EkartError details or Axios details
        const details = error.response?.error || error.response?.data;
        if (details) {
            console.log(`      API Response: ${JSON.stringify(details, null, 2)}`);
        }
    }
}

async function comprehensiveTest() {
    console.log('\n🔬 Comprehensive Ekart API Testing\n');
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
        // SERVICEABILITY TESTS - Multiple Pincodes
        // =================================================================
        console.log('\n📍 SERVICEABILITY TESTS');
        console.log('-'.repeat(70));

        const testPincodes = [
            { code: '110001', name: 'Delhi - Connaught Place' },
            { code: '400001', name: 'Mumbai - Fort' },
            { code: '560001', name: 'Bangalore - MG Road' },
            { code: '600001', name: 'Chennai - Central' },
            { code: '700001', name: 'Kolkata - BBD Bagh' }
        ];

        for (const pincode of testPincodes) {
            await runTest(`Serviceability: ${pincode.name} (${pincode.code})`, async () => {
                const result = await provider.checkServiceability(pincode.code);
                return { serviceable: result };
            });
        }

        // =================================================================
        // RATE TESTS - Different Combinations
        // =================================================================
        console.log('\n\n💰 RATE ESTIMATION TESTS');
        console.log('-'.repeat(70));

        // Test 1: Standard Prepaid
        await runTest('Rates: Mumbai → Delhi (1kg, Prepaid)', async () => {
            return await provider.getRates({
                origin: { pincode: '400001' },
                destination: { pincode: '110001' },
                package: { weight: 1.0, length: 10, width: 10, height: 10 },
                paymentMode: 'prepaid'
            });
        });

        // Test 2: COD Mode
        await runTest('Rates: Mumbai → Delhi (1kg, COD)', async () => {
            return await provider.getRates({
                origin: { pincode: '400001' },
                destination: { pincode: '110001' },
                package: { weight: 1.0, length: 10, width: 10, height: 10 },
                paymentMode: 'cod',
                orderValue: 1000
            });
        });

        // Test 3: Heavier Package
        await runTest('Rates: Mumbai → Delhi (5kg, Prepaid)', async () => {
            return await provider.getRates({
                origin: { pincode: '400001' },
                destination: { pincode: '110001' },
                package: { weight: 5.0, length: 20, width: 15, height: 15 },
                paymentMode: 'prepaid'
            });
        });

        // Test 4: Different Route
        await runTest('Rates: Bangalore → Chennai (2kg, Prepaid)', async () => {
            return await provider.getRates({
                origin: { pincode: '560001' },
                destination: { pincode: '600001' },
                package: { weight: 2.0, length: 15, width: 12, height: 12 },
                paymentMode: 'prepaid'
            });
        });

        // =================================================================
        // WAREHOUSE CREATION TEST
        // =================================================================
        console.log('\n\n🏭 WAREHOUSE CREATION TEST');
        console.log('-'.repeat(70));

        await runTest('Create Warehouse: Test Mumbai Location', async () => {
            return await provider.createWarehouse({
                alias: `TEST_MUMBAI_${Date.now().toString().slice(-4)}`,
                phone: 9876543210,
                address_line1: '123 Test Street, Andheri',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: 400001,
                country: 'India'
            });
        });

        // =================================================================
        // TRACKING TEST (if we have an AWB)
        // =================================================================
        console.log('\n\n📦 TRACKING TEST');
        console.log('-'.repeat(70));

        // This will likely fail since we don't have a real AWB
        await runTest('Track Shipment: Dummy AWB', async () => {
            return await provider.trackShipment('EK123456789');
        });

        // =================================================================
        // SUMMARY
        // =================================================================
        console.log('\n\n' + '='.repeat(70));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(70));

        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;

        console.log(`\nTotal Tests: ${results.length}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

        console.log('\n' + '-'.repeat(70));
        console.log('DETAILED RESULTS:');
        console.log('-'.repeat(70));

        results.forEach((result, i) => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.name}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });

        console.log('\n' + '='.repeat(70));
        console.log('💡 RECOMMENDATIONS');
        console.log('='.repeat(70));

        if (failed > passed) {
            console.log('\n⚠️  Many tests failed. Possible issues:');
            console.log('   1. Staging environment has restricted features');
            console.log('   2. Additional API fields required (check Ekart docs)');
            console.log('   3. Warehouse registration needed before operations');
            console.log('   4. Account needs activation/setup in Ekart portal');
        } else {
            console.log('\n✅ Most tests passed! Integration is working well.');
            console.log('   Ready for controlled shipment creation testing.');
        }

        console.log('\n📝 Next Steps:');
        console.log('   1. Review failed test error messages');
        console.log('   2. Contact Ekart support for staging requirements');
        console.log('   3. Register warehouses in Ekart portal if needed');
        console.log('   4. Test shipment creation with working pincode combinations\n');

        await mongoose.disconnect();
        process.exit(0);

    } catch (error: any) {
        console.error('\n❌ Test suite failed:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
}

comprehensiveTest();
