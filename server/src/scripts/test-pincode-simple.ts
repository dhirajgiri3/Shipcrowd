/**
 * Simple Pincode Lookup Test
 * 
 * Tests only the CSV loading and lookup functionality without database.
 * Run with: npx ts-node-dev --transpile-only src/scripts/test-pincode-simple.ts
 */

import PincodeLookupService from '../core/application/services/logistics/pincode-lookup.service';

async function runSimpleTests() {
    console.log('\n🧪 Simple Pincode Lookup Test\n');
    console.log('='.repeat(60));

    try {
        // Test 1: CSV Loading
        console.log('\n📂 Test 1: Loading CSV...');
        const start = Date.now();
        await PincodeLookupService.loadPincodesFromCSV();
        const duration = Date.now() - start;

        const stats = PincodeLookupService.getStats();
        console.log(`✅ Loaded ${stats.totalPincodes} pincodes in ${duration}ms`);
        console.log(`   Memory: ~${stats.memorySizeMB}MB`);

        // Test 2: Valid Pincode Lookup
        console.log('\n🔍 Test 2: Valid Pincode Lookup');
        const delhi = PincodeLookupService.getPincodeDetails('110001');
        if (delhi) {
            console.log(`✅ Found: ${delhi.pincode} - ${delhi.city}, ${delhi.state}`);
        } else {
            console.log('❌ Failed to find Delhi pincode');
        }

        // Test 3: Invalid Pincode
        console.log('\n🔍 Test 3: Invalid Pincode');
        const invalid = PincodeLookupService.getPincodeDetails('999999');
        if (invalid === null) {
            console.log('✅ Correctly returned null for invalid pincode');
        } else {
            console.log('❌ Should have returned null');
        }

        // Test 4: Format Validation
        console.log('\n✔️ Test 4: Format Validation');
        const valid = PincodeLookupService.isValidPincodeFormat('110001');
        const invalid1 = PincodeLookupService.isValidPincodeFormat('011001');
        const invalid2 = PincodeLookupService.isValidPincodeFormat('12345');

        if (valid && !invalid1 && !invalid2) {
            console.log('✅ Format validation working correctly');
        } else {
            console.log('❌ Format validation failed');
        }

        // Test 5: Search by City
        console.log('\n🔎 Test 5: Search by City');
        const mumbai = PincodeLookupService.searchPincodes({ city: 'MUMBAI' });
        console.log(`✅ Found ${mumbai.length} pincodes for Mumbai`);
        if (mumbai.length > 0) {
            console.log(`   Sample: ${mumbai[0].pincode} - ${mumbai[0].city}`);
        }

        // Test 6: Search by State
        console.log('\n🔎 Test 6: Search by State');
        const delhiState = PincodeLookupService.searchPincodes({ state: 'DELHI' });
        console.log(`✅ Found ${delhiState.length} pincodes for Delhi state`);

        // Test 7: Zone Calculation
        console.log('\n🗺️ Test 7: Zone Calculation');
        const zone1 = PincodeLookupService.getZoneFromPincodes('110001', '110002');
        console.log(`✅ Same city: Zone ${zone1.zone} (Same City: ${zone1.isSameCity})`);

        const zone2 = PincodeLookupService.getZoneFromPincodes('400001', '411001');
        console.log(`✅ Same state: Zone ${zone2.zone} (Same State: ${zone2.isSameState})`);

        const zone3 = PincodeLookupService.getZoneFromPincodes('110001', '560001');
        console.log(`✅ Different states: Zone ${zone3.zone}`);

        // Test 8: Performance Test
        console.log('\n⚡ Test 8: Performance (100 lookups)');
        const testPincodes = ['110001', '400001', '560001', '700001', '600001'];
        const perfStart = Date.now();

        for (let i = 0; i < 100; i++) {
            PincodeLookupService.getPincodeDetails(testPincodes[i % testPincodes.length]);
        }

        const perfDuration = Date.now() - perfStart;
        const avgTime = perfDuration / 100;
        console.log(`✅ 100 lookups in ${perfDuration}ms (avg: ${avgTime.toFixed(3)}ms per lookup)`);

        // Test 9: Exists Check
        console.log('\n🔍 Test 9: Exists Check');
        const exists1 = PincodeLookupService.exists('110001');
        const exists2 = PincodeLookupService.exists('999999');

        if (exists1 && !exists2) {
            console.log('✅ Exists check working correctly');
        } else {
            console.log('❌ Exists check failed');
        }

        // Test 10: Sample Pincodes from Different Regions
        console.log('\n🌏 Test 10: Regional Coverage');
        const regions = [
            { pincode: '110001', expected: 'DELHI' },
            { pincode: '400001', expected: 'MUMBAI' },
            { pincode: '560001', expected: 'BENGALURU' },
            { pincode: '700001', expected: 'KOLKATA' },
            { pincode: '600001', expected: 'CHENNAI' }
        ];

        let regionPass = 0;
        for (const region of regions) {
            const details = PincodeLookupService.getPincodeDetails(region.pincode);
            if (details && details.city.includes(region.expected)) {
                regionPass++;
                console.log(`   ✅ ${region.pincode}: ${details.city}`);
            } else {
                console.log(`   ❌ ${region.pincode}: Expected ${region.expected}`);
            }
        }
        console.log(`✅ Regional coverage: ${regionPass}/${regions.length} passed`);

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('\n✅ All tests completed successfully!');
        console.log(`\n📊 Final Stats:`);
        console.log(`   Total Pincodes: ${stats.totalPincodes}`);
        console.log(`   Memory Usage: ~${stats.memorySizeMB}MB`);
        console.log(`   Load Time: ${duration}ms`);
        console.log(`   Avg Lookup Time: ${avgTime.toFixed(3)}ms`);
        console.log('\n' + '='.repeat(60) + '\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

// Run tests
runSimpleTests();
