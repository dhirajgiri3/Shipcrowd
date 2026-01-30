import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Ensure ENCRYPTION_KEY is present
if (!process.env.ENCRYPTION_KEY) {
    if (!process.env.FIELD_ENCRYPTION_SECRET) {
        process.env.ENCRYPTION_KEY = '02207fcc1b5ce31788490e5cebf0deafb7000b20223942900fffd2c1bbb780';
    } else {
        process.env.ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_SECRET;
    }
}

const runVerification = async () => {
    try {
        console.log('🧪 Starting Multi-Courier Pricing Verification...');

        // 1. Connect DB manually
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Shipcrowd';
        await mongoose.connect(mongoUri);
        console.log('✓ Connected to MongoDB');

        // 2. Dynamic Imports
        const RateCardModule = await import('../infrastructure/database/mongoose/models/logistics/shipping/configuration/rate-card.model.js');
        const RateCard = RateCardModule.default as any;

        const CompanyModule = await import('../infrastructure/database/mongoose/models/organization/core/company.model.js');
        const Company = CompanyModule.default as any;

        const ServiceModule = await import('../core/application/services/pricing/dynamic-pricing.service.js');
        const DynamicPricingService = ServiceModule.DynamicPricingService;

        const PincodeServiceModule = await import('../core/application/services/logistics/pincode-lookup.service.js');
        const PincodeLookupService = PincodeServiceModule.default as any;

        if (!DynamicPricingService) throw new Error('Failed to import DynamicPricingService (Named export missing)');

        // 3. Initialize Services
        console.log('Loading Pincode Data for Verification...');
        await PincodeLookupService.loadPincodesFromCSV();
        console.log('✓ Pincode Data Loaded');

        const pricingService = new DynamicPricingService();

        // 4. Get a Test Company
        const company = await Company.findOne({}).lean();
        if (!company) throw new Error('No company found to run test against.');
        const companyId = company._id;

        console.log(`Using Company: ${company.name} (${companyId})`);

        // 5. Create a Test Rate Card
        const testCardName = `Test_Multi_Courier_${Date.now()}`;
        console.log(`Creating Test Rate Card: ${testCardName}...`);

        const testCard = new RateCard({
            name: testCardName,
            companyId: companyId,
            type: 'customer_specific',
            status: 'active',
            baseRates: [
                { minWeight: 0, maxWeight: 5, basePrice: 50, carrier: 'velocity', serviceType: 'standard' },
                { minWeight: 0, maxWeight: 5, basePrice: 100, carrier: 'bluedart', serviceType: 'express' },
                { minWeight: 0, maxWeight: 5, basePrice: 60, carrier: 'delhivery' }, // Carrier Default
                { minWeight: 0, maxWeight: 5, basePrice: 200 } // Generic
            ],
            weightRules: [
                { minWeight: 0, maxWeight: 100, pricePerKg: 10, carrier: 'velocity' },
                { minWeight: 0, maxWeight: 100, pricePerKg: 20 } // Generic
            ],
            zoneMultipliers: {
                local: 1, metro: 1, national: 1, special: 1, custom: 1, region: 1, rest_of_india: 1
            },
            codSurcharges: [],
            effectiveDates: { startDate: new Date() }
        });

        await testCard.save();
        console.log(`Created Rate Card: ${testCard._id}`);

        // 6. Run Pricing Tests
        const checks = [
            {
                name: 'Exact Match (Velocity/Standard)',
                input: { carrier: 'velocity', serviceType: 'standard', weight: 1 },
                expectedBase: 50
            },
            {
                name: 'Exact Match (BlueDart/Express)',
                input: { carrier: 'bluedart', serviceType: 'express', weight: 1 },
                expectedBase: 100
            },
            {
                name: 'Carrier Default (Delhivery/Any)',
                input: { carrier: 'delhivery', serviceType: 'surface', weight: 1 },
                expectedBase: 60
            },
            {
                name: 'Generic Fallback (XpressBees/Standard)',
                input: { carrier: 'xpressbees', serviceType: 'standard', weight: 1 },
                expectedBase: 200
            },
            {
                name: 'Strict Mode Check (Should Fail)',
                input: { carrier: 'xpressbees', serviceType: 'standard', weight: 1 },
                strict: true,
                expectError: 'PRC_NO_RATE_FOR_CARRIER_SERVICE'
            }
        ];

        let failed = false;

        for (const check of checks) {
            console.log(`\nTesting: ${check.name}`);
            try {
                const result = await pricingService.calculatePricing({
                    companyId: companyId.toString(),
                    fromPincode: '110001',
                    toPincode: '400001',
                    weight: check.input.weight,
                    paymentMode: 'prepaid',
                    carrier: check.input.carrier,
                    serviceType: check.input.serviceType,
                    rateCardId: testCard._id.toString(),
                    strict: (check as any).strict // Pass strict flag
                });

                if ((check as any).expectError) {
                    console.error(`❌ Failed! Expected error ${(check as any).expectError} but got success.`);
                    failed = true;
                } else {
                    const baseCharge = result.metadata.breakdown?.baseCharge;
                    const resolution = result.metadata.pricingResolution;
                    console.log(`Resolution: ${resolution?.matchedLevel} (${resolution?.matchedCarrier}:${resolution?.matchedServiceType})`);

                    if (baseCharge === check.expectedBase) {
                        console.log(`✅ Passed! Base Charge: ${baseCharge}`);
                    } else {
                        console.error(`❌ Failed! Expected ${check.expectedBase}, got ${baseCharge}`);
                        failed = true;
                    }
                }
            } catch (err: any) {
                if ((check as any).expectError && err.code === (check as any).expectError) {
                    console.log(`✅ Passed! Caught Expected Error: ${err.code}`);
                } else {
                    console.error(`❌ Error during calculation:`);
                    console.error(err);
                    failed = true;
                }
            }
        }

        // 7. Cleanup
        console.log('\nCleaning up...');
        await RateCard.deleteOne({ _id: testCard._id });
        console.log('Test Rate Card deleted.');

        if (failed) {
            console.error('\n🚫 Verification Failed!');
            process.exit(1);
        } else {
            console.log('\n✅ Verification Successful! All multi-courier scenarios work as expected.');
            process.exit(0);
        }

    } catch (error) {
        console.error('Fatal Error:', error);
        process.exit(1);
    }
};

runVerification();
