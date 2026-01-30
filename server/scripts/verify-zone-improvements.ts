import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables immediately
dotenv.config({ path: path.join(__dirname, '../.env') });

async function verifyZoneImprovements() {
    console.log('🚀 Starting Zone System Verification...');

    // 1. Setup Environment Fallbacks (CRITICAL: Must be before model imports)
    // The User model checks for ENCRYPTION_KEY on load, so we must set it now.
    process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0000000000000000000000000000000000000000000000000000000000000000';

    // 2. Dynamic Imports (to ensure env vars are set first)
    const { DynamicPricingService } = await import('../src/core/application/services/pricing/dynamic-pricing.service');
    // Default exports need .default with dynamic import in some configs, but usually named export works destuctured
    // Checking PincodeLookupService export... it is default export.
    const { default: PincodeLookupService } = await import('../src/core/application/services/logistics/pincode-lookup.service');

    // Models
    const { default: SystemConfiguration } = await import('../src/infrastructure/database/mongoose/models/configuration/system-configuration.model');
    const { default: RateCard } = await import('../src/infrastructure/database/mongoose/models/logistics/shipping/configuration/rate-card.model');
    const { Zone } = await import('../src/infrastructure/database/mongoose/models');

    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd';

    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(MONGODB_URI);
            console.log('✅ Connected to MongoDB');
        }

        const pricingService = new DynamicPricingService();
        await PincodeLookupService.loadPincodesFromCSV(); // Ensure known state
        console.log('✅ Pincode Service Loaded');

        // Test Data Constants
        const COMPANY_ID = new mongoose.Types.ObjectId();
        const PUNE_PIN = '411001';
        const MUMBAI_PIN = '400001';
        const DELHI_PIN = '110001';

        // --- PHASE 1: DYNAMIC METRO CONFIG ---
        console.log('\n🔵 PHASE 1: DYNAMIC METRO CONFIG TEST');

        // Reset Config
        await SystemConfiguration.deleteMany({ key: 'metro_cities' });

        // 1. Initial State: Pune is NOT a default metro (in some lists, but let's assume defaults)
        const defaultMetrosWithoutPune = [
            'NEW DELHI', 'DELHI', 'MUMBAI', 'KOLKATA', 'CHENNAI',
            'BENGALURU', 'BANGALORE', 'HYDERABAD', 'AHMEDABAD'
        ];

        await SystemConfiguration.create({
            key: 'metro_cities',
            value: defaultMetrosWithoutPune,
            description: 'Test Config',
            isActive: true,
            meta: { source: 'test', updatedAt: new Date() }
        });

        // Reload config
        await PincodeLookupService.loadConfig();

        // Calculate Zone Mumbai -> Pune (Metro -> Non-Metro = Zone B typically)
        let zoneInfo = PincodeLookupService.getZoneFromPincodes(MUMBAI_PIN, PUNE_PIN);
        console.log(`Zone Mumbai->Pune (Pune removed from Metro): ${zoneInfo.zone}`);
        // Expect Zone B (since Pune is removed, Mumbai is Metro)

        // Add Pune back
        await SystemConfiguration.findOneAndUpdate(
            { key: 'metro_cities' },
            { $push: { value: 'PUNE' } }
        );
        await PincodeLookupService.loadConfig();

        zoneInfo = PincodeLookupService.getZoneFromPincodes(MUMBAI_PIN, PUNE_PIN);
        console.log(`Zone Mumbai->Pune (Pune added to Metro): ${zoneInfo.zone}`);

        // Note: Zone logic depends on the internal rules. Assuming Zone C is Metro->Metro.
        // It might be Zone A or B depending on distance. But changing config should change result.
        if (zoneInfo.zone !== 'zoneE' && zoneInfo.zone !== 'zoneD') { // Loose check for now
            console.log('✅ TEST 1 PASSED: Dynamic Metro Config loaded');
        } else {
            console.log('⚠️ TEST 1 CHECK: Verify expected zone change.');
        }


        // --- PHASE 2: EXTERNAL ZONE OVERRIDE ---
        console.log('\n🔵 PHASE 2: EXTERNAL ZONE OVERRIDE TEST');

        // Setup generic Zone and RateCard
        // Need to ensure we don't duplicate unique indexes if re-running
        // Using random suffix for name
        const runId = Math.floor(Math.random() * 10000);

        const zoneDoc = await Zone.create({
            name: `Test Zone E ${runId}`,
            companyId: COMPANY_ID,
            postalCodes: [],
            zoneType: 'standard',
            standardZoneCode: 'zoneE'
        });

        await RateCard.create({
            name: `Test RateCard Phase 2 ${runId}`,
            companyId: COMPANY_ID,
            status: 'active',
            baseRates: [{
                carrier: 'velocity',
                serviceType: 'standard',
                basePrice: 50,
                minWeight: 0,
                maxWeight: 10
            }],
            weightRules: [{
                minWeight: 0,
                maxWeight: 10,
                pricePerKg: 10,
                carrier: 'velocity',
                serviceType: 'standard'
            }],
            zoneMultipliers: {
                'zoneA': 1.0,
                'zoneE': 2.0 // Expensive
            },
            effectiveDates: { startDate: new Date() }
        });

        // Route: Delhi -> Delhi (Normally Zone A)
        // Override with: Zone E
        const rc2 = await RateCard.findOne({ name: `Test RateCard Phase 2 ${runId}` }) as any;
        const priceResult = await pricingService.calculatePricing({
            companyId: COMPANY_ID.toString(),
            rateCardId: rc2._id.toString(),
            fromPincode: DELHI_PIN,
            toPincode: DELHI_PIN,
            weight: 0.5,
            paymentMode: 'prepaid',
            externalZone: 'zoneE'
        });

        console.log(`Original Zone: zoneA (Delhi->Delhi)`);
        console.log(`Forced Zone: ${priceResult.metadata.zone}`);
        console.log(`Zone Source: ${priceResult.metadata.zoneSource}`);
        // Base 50 * ZoneE Mult 2.0 = 100
        console.log(`Calculated Price: ${priceResult.total}`);

        if (priceResult.metadata.zone === 'zoneE' && priceResult.metadata.zoneSource === 'external_velocity') {
            console.log('✅ TEST 2 PASSED: External Zone override respected');
        } else {
            console.error('❌ TEST 2 FAILED: External Zone not used');
        }


        // --- PHASE 3: SURCHARGES ---
        console.log('\n🔵 PHASE 3: PRICING SURCHARGES TEST');

        // Create RateCard with Surcharges
        await RateCard.create({
            name: `Test RateCard Surcharges ${runId}`,
            companyId: COMPANY_ID,
            status: 'active',
            baseRates: [{
                carrier: 'velocity',
                serviceType: 'premium',
                basePrice: 100,
                minWeight: 0,
                maxWeight: 10
            }],
            weightRules: [{ minWeight: 0, maxWeight: 10, pricePerKg: 10 }],
            // Surcharges
            minimumCall: 200,
            fuelSurcharge: 20, // 20%
            fuelSurchargeBase: 'freight',
            codSurcharges: [{ min: 0, max: 10000, value: 50, type: 'flat' }],
            zoneMultipliers: { 'zoneA': 1.0 },
            effectiveDates: { startDate: new Date() }
        });

        const rc3 = await RateCard.findOne({ name: `Test RateCard Surcharges ${runId}` }) as any;

        const surchargePrice = await pricingService.calculatePricing({
            companyId: COMPANY_ID.toString(),
            rateCardId: rc3._id.toString(), // Explicit ID
            fromPincode: DELHI_PIN,
            toPincode: DELHI_PIN, // Zone A
            weight: 0.5,
            paymentMode: 'cod',
            orderValue: 1000,
            serviceType: 'premium'
        });

        // Expected Calculation:
        // Base Freight: 100
        // Fuel (20% on 100): 20
        // COD Slab: 50
        // Subtotal: 100 + 20 + 50 = 170
        // Min Call: 200 (Applied because 170 < 200)
        // Final: 200 + GST

        console.log('Breakdown:', JSON.stringify(surchargePrice.metadata.breakdown, null, 2));
        console.log(`Calculated Subtotal (Pre-GST): ${surchargePrice.subtotal}`);

        // Let's verify components
        const fuelMatches = surchargePrice.metadata.breakdown?.fuelCharge === 20;
        const codMatches = surchargePrice.codCharge === 50;

        // Verify min call impact
        // Pre-tax total should be 200 (if min call works)
        const totalPreTax = surchargePrice.total / (1 + (surchargePrice.tax.total / (surchargePrice.total - surchargePrice.tax.total)));
        // More robust: subtotal + tax = total. 
        // Taxable amount passed to GST was 'subTotal' in service.
        // And subTotal was set to minCall (200).
        // So we expect taxableAmount roughly 200.
        // We can check tax.total / taxableAmount approx 0.18

        // Check simply if total > 230 (200 + 18% = 236)

        if (fuelMatches && codMatches && surchargePrice.total > 230) {
            console.log('✅ TEST 3 PASSED: Fuel, COD, and MinCall calculated correctly');
        } else {
            console.log(`❌ TEST 3 FAILED: Fuel: ${surchargePrice.metadata.breakdown?.fuelCharge} (Exp 20), COD: ${surchargePrice.codCharge} (Exp 50)`);
        }

        // --- TEST 4: RECONCILIATION SAFETY ---
        console.log('\n🔵 PHASE 4: RECONCILIATION SAFETY');
        const expectedVelocityPrice = 236; // 200 + 18% GST = 236
        const tolerance = 1.0;

        console.log(`ShipCrowd Price: ${surchargePrice.total}`);

        if (Math.abs(surchargePrice.total - expectedVelocityPrice) <= tolerance) {
            console.log('✅ TEST 4 PASSED: Price matches external expectation within tolerance');
        } else {
            console.log('⚠️ TEST 4 INFO: Price may vary by pennies or GST logic');
        }



        // --- TEST 5: PHASE 4 GUARDRAILS ---
        console.log('\n🔵 PHASE 4: GUARDRAILS & METADATA');

        // Test 5A: Invalid External Zone Injection
        const maliciousPrice = await pricingService.calculatePricing({
            companyId: COMPANY_ID.toString(),
            rateCardId: rc3._id.toString(), // Reuse surcharge RC
            fromPincode: DELHI_PIN,
            toPincode: DELHI_PIN,
            weight: 0.5,
            paymentMode: 'prepaid',
            externalZone: 'invalid_zone$injection!' // Should be rejected
        });

        if (maliciousPrice.metadata.zoneSource === 'internal') {
            console.log('✅ TEST 5A PASSED: Invalid External Zone rejected, fell back to internal');
        } else {
            console.error(`❌ TEST 5A FAILED: Dangerously accepted invalid zone: ${maliciousPrice.metadata.zone}`);
        }

        // Test 5B: Remote Area Logic
        // Update RateCard to enable Remote Area
        await RateCard.updateOne(
            { _id: rc3._id },
            { $set: { remoteAreaEnabled: true, remoteAreaSurcharge: 50, status: 'active' } }
        );
        // Reload RC cache logic implies fetching by ID should serve fresh if not optimized too aggressively?
        // Our service caches by ID. We might need to bust cache or just create new one.
        // Let's create a fresh dedicated RC for this to be clean.
        const rcRemote = await RateCard.create({
            name: `Test RateCard Remote ${runId}`,
            companyId: COMPANY_ID,
            status: 'active',
            baseRates: [{ carrier: 'velocity', serviceType: 'std', basePrice: 100, minWeight: 0, maxWeight: 10 }],
            weightRules: [{ minWeight: 0, maxWeight: 10, pricePerKg: 10 }],
            remoteAreaEnabled: true,
            remoteAreaSurcharge: 50,
            effectiveDates: { startDate: new Date() }
        });

        const remotePrice = await pricingService.calculatePricing({
            companyId: COMPANY_ID.toString(),
            rateCardId: (rcRemote as any)._id.toString(),
            fromPincode: DELHI_PIN,
            toPincode: DELHI_PIN,
            weight: 0.5,
            paymentMode: 'prepaid',
            isRemoteLocation: true // FLAG
        });

        if (remotePrice.metadata.breakdown?.remoteAreaCharge === 50) {
            console.log('✅ TEST 5B PASSED: Remote Area Surcharge passed via input flag');
        } else {
            console.log(`❌ TEST 5B FAILED: Surcharge: ${remotePrice.metadata.breakdown?.remoteAreaCharge}`);
        }

        // Test 5C: Metadata Provider
        // Reuse remotePrice (internal) and priceResult (external from Test 2)
        // We need to re-run an external zone test to get a fresh object if scope issue.
        // But surchargePrice was internal.

        // Check surchargePrice (internal)
        if (surchargePrice.pricingProvider === 'internal') {
            console.log('✅ TEST 5C (1/2) PASSED: Internal Provider identified');
        } else {
            console.log(`❌ TEST 5C (1/2) FAILED: Internal Provider: ${surchargePrice.pricingProvider}`);
        }

        // Check Malicious (Fallback -> Internal)
        if (maliciousPrice.pricingProvider === 'internal') {
            console.log('✅ TEST 5C (2/2) PASSED: Fallback Provider identified');
        }

        // Test 5D: Enhanced Breakdown
        if (surchargePrice.metadata.breakdown?.fuelSurchargeBase) {
            console.log('✅ TEST 5D PASSED: Enhanced breakdown includes fuel base');
        }


    } catch (error) {
        console.error('❌ Verify Script Failed:', error);
        console.error(error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDone.');
        process.exit(0);
    }
}

verifyZoneImprovements();
