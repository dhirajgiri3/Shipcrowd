/**
 * Pincode Integration Test Script
 * 
 * Tests the CSV-based pincode lookup functionality without Jest.
 * Run with: npx ts-node src/scripts/test-pincode-integration.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import connectDB from '../config/database';
import PincodeLookupService from '../core/application/services/logistics/pincode-lookup.service';
import AddressValidationService from '../core/application/services/logistics/address-validation.service';
import logger from '../shared/logger/winston.logger';

// Load environment variables
dotenv.config();

// Check for required environment variables
if (!process.env.MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI environment variable is required');
    process.exit(1);
}

if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32) {
    console.error('❌ Error: ENCRYPTION_KEY environment variable is required (min 32 characters)');
    process.exit(1);
}

interface TestResult {
    name: string;
    passed: boolean;
    message: string;
    duration?: number;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, message: string, duration?: number) {
    results.push({ name, passed, message, duration });
    const icon = passed ? '✅' : '❌';
    const durationStr = duration ? ` (${duration}ms)` : '';
    console.log(`${icon} ${name}${durationStr}: ${message}`);
}

async function runTests() {
    console.log('\n🧪 Starting Pincode Integration Tests...\n');
    console.log('='.repeat(60));

    try {
        // Test 1: Database Connection
        console.log('\n📊 Test 1: Database Connection');
        const dbStart = Date.now();
        await connectDB();
        logTest('Database Connection', true, 'Connected successfully', Date.now() - dbStart);

        // Test 2: CSV Loading
        console.log('\n📂 Test 2: CSV Loading');
        const csvStart = Date.now();
        await PincodeLookupService.loadPincodesFromCSV();
        const csvDuration = Date.now() - csvStart;
        const stats = PincodeLookupService.getStats();
        logTest(
            'CSV Loading',
            stats.isLoaded && stats.totalPincodes > 0,
            `Loaded ${stats.totalPincodes} pincodes (~${stats.memorySizeMB}MB)`,
            csvDuration
        );

        // Test 3: Cache Statistics
        console.log('\n📈 Test 3: Cache Statistics');
        const expectedPincodes = 154798;
        const tolerance = 1000; // Allow some variance
        const isCorrectCount = Math.abs(stats.totalPincodes - expectedPincodes) < tolerance;
        logTest(
            'Cache Statistics',
            isCorrectCount,
            `Expected ~${expectedPincodes}, got ${stats.totalPincodes}`
        );

        // Test 4: Single Pincode Lookup (Valid)
        console.log('\n🔍 Test 4: Single Pincode Lookup (Valid)');
        const lookupStart = Date.now();
        const delhi = PincodeLookupService.getPincodeDetails('110001');
        const lookupDuration = Date.now() - lookupStart;
        logTest(
            'Valid Pincode Lookup',
            delhi !== null && delhi.city.includes('DELHI'),
            delhi ? `Found: ${delhi.city}, ${delhi.state}` : 'Not found',
            lookupDuration
        );

        // Test 5: Single Pincode Lookup (Invalid)
        console.log('\n🔍 Test 5: Single Pincode Lookup (Invalid)');
        const invalid = PincodeLookupService.getPincodeDetails('999999');
        logTest(
            'Invalid Pincode Lookup',
            invalid === null,
            invalid === null ? 'Correctly returned null' : 'Should have returned null'
        );

        // Test 6: Pincode Format Validation
        console.log('\n✔️ Test 6: Pincode Format Validation');
        const validFormat = PincodeLookupService.isValidPincodeFormat('110001');
        const invalidFormat1 = PincodeLookupService.isValidPincodeFormat('011001'); // Starts with 0
        const invalidFormat2 = PincodeLookupService.isValidPincodeFormat('12345'); // Too short
        logTest(
            'Format Validation',
            validFormat && !invalidFormat1 && !invalidFormat2,
            'All format checks passed'
        );

        // Test 7: Search by City
        console.log('\n🔎 Test 7: Search by City');
        const searchStart = Date.now();
        const mumbaiPincodes = PincodeLookupService.searchPincodes({ city: 'MUMBAI' });
        const searchDuration = Date.now() - searchStart;
        logTest(
            'Search by City',
            mumbaiPincodes.length > 0,
            `Found ${mumbaiPincodes.length} pincodes for Mumbai`,
            searchDuration
        );

        // Test 8: Search by State
        console.log('\n🔎 Test 8: Search by State');
        const delhiPincodes = PincodeLookupService.searchPincodes({ state: 'DELHI' });
        logTest(
            'Search by State',
            delhiPincodes.length > 0,
            `Found ${delhiPincodes.length} pincodes for Delhi`
        );

        // Test 9: Zone Calculation (Same City)
        console.log('\n🗺️ Test 9: Zone Calculation (Same City)');
        const zone1 = PincodeLookupService.getZoneFromPincodes('110001', '110002');
        logTest(
            'Zone A (Same City)',
            zone1.zone === 'zoneA' && zone1.isSameCity,
            `Zone: ${zone1.zone}, Same City: ${zone1.isSameCity}`
        );

        // Test 10: Zone Calculation (Same State)
        console.log('\n🗺️ Test 10: Zone Calculation (Same State)');
        const zone2 = PincodeLookupService.getZoneFromPincodes('400001', '411001'); // Mumbai to Pune
        logTest(
            'Zone B (Same State)',
            zone2.zone === 'zoneB' && zone2.isSameState,
            `Zone: ${zone2.zone}, Same State: ${zone2.isSameState}`
        );

        // Test 11: Zone Calculation (Different States)
        console.log('\n🗺️ Test 11: Zone Calculation (Different States)');
        const zone3 = PincodeLookupService.getZoneFromPincodes('110001', '560001'); // Delhi to Bangalore
        logTest(
            'Zone D (Different States)',
            zone3.zone === 'zoneD',
            `Zone: ${zone3.zone}`
        );

        // Test 12: Address Validation Service Integration
        console.log('\n🏠 Test 12: Address Validation Service Integration');
        const validationStart = Date.now();
        const validation = await AddressValidationService.validatePincode('110001');
        const validationDuration = Date.now() - validationStart;
        logTest(
            'Address Validation',
            validation.valid && validation.city !== undefined,
            `Valid: ${validation.valid}, City: ${validation.city}`,
            validationDuration
        );

        // Test 13: Performance Test (Bulk Lookups)
        console.log('\n⚡ Test 13: Performance Test (100 Lookups)');
        const testPincodes = [
            '110001', '400001', '560001', '700001', '600001',
            '110002', '400002', '560002', '700002', '600002',
            // ... repeat pattern
        ];
        // Generate 100 test pincodes
        const bulkPincodes = Array.from({ length: 100 }, (_, i) => {
            const base = ['110001', '400001', '560001', '700001', '600001'];
            return base[i % base.length];
        });

        const bulkStart = Date.now();
        let successCount = 0;
        for (const pincode of bulkPincodes) {
            const result = PincodeLookupService.getPincodeDetails(pincode);
            if (result) successCount++;
        }
        const bulkDuration = Date.now() - bulkStart;
        const avgTime = bulkDuration / bulkPincodes.length;
        logTest(
            'Bulk Performance',
            avgTime < 1, // Should be sub-millisecond
            `100 lookups in ${bulkDuration}ms (avg: ${avgTime.toFixed(3)}ms per lookup)`,
            bulkDuration
        );

        // Test 14: Memory Usage Check
        console.log('\n💾 Test 14: Memory Usage Check');
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const expectedMaxMB = 200; // Should be well under 200MB for the cache
        logTest(
            'Memory Usage',
            heapUsedMB < expectedMaxMB,
            `Heap used: ${heapUsedMB}MB (Cache: ~${stats.memorySizeMB}MB)`
        );

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('\n📊 Test Summary\n');
        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;
        const total = results.length;
        const passRate = ((passed / total) * 100).toFixed(1);

        console.log(`Total Tests: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`Pass Rate: ${passRate}%`);

        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            results.filter(r => !r.passed).forEach(r => {
                console.log(`  - ${r.name}: ${r.message}`);
            });
        }

        console.log('\n' + '='.repeat(60));

        // Exit with appropriate code
        process.exit(failed > 0 ? 1 : 0);

    } catch (error) {
        console.error('\n❌ Test suite failed with error:', error);
        process.exit(1);
    }
}

// Run tests
runTests();
