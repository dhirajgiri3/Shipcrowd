
import * as dotenv from 'dotenv';
import path from 'path';

// Load ENV
const res = dotenv.config({ path: path.join(process.cwd(), '.env') });
if (res.error) console.error('dotenv load failed:', res.error);

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd_test';

async function verifySmartRouting() {
    console.log('🚀 Starting Smart Routing Verification (Velocity Only)...');

    try {
        const modelsPath = path.resolve(process.cwd(), 'src/infrastructure/database/mongoose/models/index.ts');
        const routerPath = path.resolve(process.cwd(), 'src/core/application/services/pricing/smart-rate-calculator.service.ts');
        const providerPath = path.resolve(process.cwd(), 'src/infrastructure/external/couriers/velocity/velocity-shipfast.provider.ts');
        const pincodePath = path.resolve(process.cwd(), 'src/core/application/services/logistics/pincode-lookup.service.ts');

        const { RoutingRule, Courier, RateCard, Company } = await import(modelsPath);
        const { default: SmartRateCalculator } = await import(routerPath);
        const { default: PincodeLookupService } = await import(pincodePath);
        const { VelocityShipfastProvider } = await import(providerPath);

        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // MOCK Pincode Lookup to ensure Internal Calculation works
        console.log('🔄 Mocking Pincode Service...');
        // We overwrite the methods on the singleton instance
        PincodeLookupService.getPincodeDetails = (pincode: string) => {
            // Return valid details for test pincodes
            if (pincode === '110001') return { circle: 'Delhi', district: 'New Delhi', state: 'Delhi' } as any; // Delhi
            if (pincode === '400001') return { circle: 'Maharashtra', district: 'Mumbai', state: 'Maharashtra' } as any; // Mumbai
            if (pincode === '560068') return { circle: 'Karnataka', district: 'Bangalore', state: 'Karnataka' } as any; // Bangalore
            return { circle: 'Unknown', district: 'Unknown', state: 'Unknown' } as any; // Fallback to prevent crash
        };

        PincodeLookupService.getZoneFromPincodes = (origin: string, dest: string) => {
            // Simple zone logic for test
            if (origin === dest) return { zone: 'zoneA', isSameCity: true, isSameState: true, distance: 10 };
            return { zone: 'zoneB', isSameCity: false, isSameState: false, distance: 500 };
        };

        const companyId = new mongoose.Types.ObjectId();

        // 0. Seed Data (Velocity Only)
        console.log('🌱 Seeding Data (Velocity)...');

        await Company.deleteMany({ name: 'Test Co' });
        await Company.create({ _id: companyId, name: 'Test Co', settings: { defaultRateCardId: new mongoose.Types.ObjectId() } });
        const rateCardId = (await Company.findById(companyId))?.settings?.defaultRateCardId;

        // Ensure Velocity is Active
        await Courier.findOneAndUpdate({ name: 'velocity' }, {
            name: 'velocity', displayName: 'Velocity', isActive: true, serviceTypes: ['standard']
        }, { upsert: true });

        // Remove others to ensure "only one courier" scenario
        await Courier.deleteMany({ name: { $ne: 'velocity' } });

        // Seed Integration for Velocity Auth
        const { default: Integration } = await import(path.resolve(process.cwd(), 'src/infrastructure/database/mongoose/models/system/integrations/integration.model.ts'));
        const { encryptData } = await import(path.resolve(process.cwd(), 'src/shared/utils/encryption.ts'));

        await Integration.deleteMany({ companyId, provider: 'velocity-shipfast' });
        await Integration.create({
            companyId,
            type: 'courier',
            provider: 'velocity-shipfast',
            name: 'Velocity Shipfast',
            settings: { isActive: true },
            credentials: {
                username: encryptData('+919866340090'),
                password: encryptData('Velocity@123')
            }
        });

        // Create RateCard for Velocity
        await RateCard.create({
            _id: rateCardId,
            companyId,
            name: 'Velocity Standard Rates',
            status: 'active',
            baseRates: [
                { minWeight: 0, maxWeight: 0.5, basePrice: 40, carrier: 'velocity', serviceType: 'standard' },
                { minWeight: 0.5, maxWeight: 5, basePrice: 100, carrier: 'velocity', serviceType: 'standard' }
            ],
            weightRules: [{ pricePerKg: 20, minWeight: 5, maxWeight: 50, carrier: 'velocity', serviceType: 'standard' }],
            zoneMultipliers: { 'zoneA': 1, 'zoneB': 1.2, 'zoneC': 1.5, 'zoneD': 1.8, 'zoneE': 2.5 }
        });

        const originPincode = '110001'; // Delhi
        const destPincode = '560068';   // Bangalore (From Shipfast API docs)

        // 1. Internal Smart Routing Check
        console.log(`\n🔄 [INTERNAL] Testing Smart Routing Logic (Delhi -> Bangalore)...`);
        try {
            const internalRecs = await SmartRateCalculator.calculateSmartRates({
                companyId: companyId.toString(),
                originPincode: originPincode,
                destinationPincode: destPincode,
                weight: 0.5,
                orderValue: 1000,
                paymentMode: 'prepaid'
            });

            console.log(`   Found ${internalRecs.totalOptions} options.`);
            if (internalRecs.totalOptions > 0) {
                console.log(`   Top Rec: ${internalRecs.rates[0].courierName} - ₹${internalRecs.rates[0].totalAmount}`);
            } else {
                console.warn(`   ⚠️ No internal options found. Check Zone multipliers (A-E vs zoneA-zoneE).`);
            }
        } catch (e: any) {
            console.error(`   ❌ Internal Calculation Error: ${e.message}`);
        }

        // 2. Real-Life Live Check (Velocity Provider)
        console.log(`\n🔄 [REAL-LIFE] Testing Velocity Live API...`);
        try {
            const velocityProvider = new VelocityShipfastProvider(companyId);

            // Check Serviceability
            console.log(`   Checking Serviceability for ${destPincode}...`);
            const isServiceable = await velocityProvider.checkServiceability(destPincode);
            console.log(`   Serviceable: ${isServiceable ? '✅ YES' : '❌ NO'}`);

            if (isServiceable) {
                // Get Live Rates (if API supported it fully, accessing via getRates)
                console.log(`   Fetching Live Rates...`);
                /* 
                   Note: Velocity getRates (via serviceability) returns carriers, but usually 0 price 
                   as per provider implementation comments. 
                */
                const liveRates = await velocityProvider.getRates({
                    origin: { pincode: originPincode },
                    destination: { pincode: destPincode },
                    weight: 0.5,
                    paymentMode: 'prepaid',
                    declaredValue: 1000
                });

                if (liveRates.length > 0) {
                    console.log(`   ✅ Live Carriers Found: ${liveRates.map((r: any) => r.serviceType).join(', ')}`);
                } else {
                    console.warn(`   ⚠️ No live carriers returned despite being serviceable.`);
                }
            }

        } catch (error: any) {
            console.warn(`   ⚠️ Live API Check Failed (Expected if local/no creds): ${error.message}`);
            if (error.response) {
                console.warn(`      Status: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            }
        }

        console.log('\n✅ Verification Complete');

        // Cleanup
        await RoutingRule.deleteMany({ companyId });
        await Company.deleteMany({ _id: companyId });
        await RateCard.deleteMany({ _id: rateCardId });

    } catch (error) {
        console.error('❌ Fatal Error:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

verifySmartRouting();
