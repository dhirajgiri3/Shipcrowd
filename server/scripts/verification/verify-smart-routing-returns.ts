
import * as dotenv from 'dotenv';
import path from 'path';

// Load ENV
const res = dotenv.config({ path: path.join(process.cwd(), '.env') });

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd_test';

async function verifySmartRoutingReturns() {
    console.log('🚀 Starting Smart Routing Verification (Returns)...');

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

        // MOCK Pincode Service
        PincodeLookupService.getPincodeDetails = (pincode: string) => {
            if (pincode === '110001') return { circle: 'Delhi', district: 'New Delhi', state: 'Delhi' } as any;
            if (pincode === '560068') return { circle: 'Karnataka', district: 'Bangalore', state: 'Karnataka' } as any;
            return { circle: 'Unknown', district: 'Unknown', state: 'Unknown' } as any;
        };

        PincodeLookupService.getZoneFromPincodes = (origin: string, dest: string) => {
            return { zone: 'zoneA', isSameCity: false, isSameState: false, distance: 500 };
        };

        const factoryPath = path.resolve(process.cwd(), 'src/core/application/services/courier/courier.factory.ts');
        const { CourierFactory } = await import(factoryPath);

        // MOCK CourierFactory.getProvider to return a mock provider
        const originalGetProvider = CourierFactory.getProvider;
        CourierFactory.getProvider = async (name: string, companyId: any) => {
            console.log(`🔍 [MOCK] CourierFactory.getProvider called for ${name}`);
            if (name === 'velocity') {
                return {
                    checkServiceability: async (pincode: string, type: 'delivery' | 'pickup') => {
                        console.log(`🔍 [MOCK] checkServiceability Called! Pincode: ${pincode}, Type: ${type}`);
                        if (type === 'pickup') {
                            return true;
                        }
                        return false;
                    },
                    createShipment: async () => ({ trackingNumber: 'MOCK_AWB' }),
                    trackShipment: async () => ({ status: 'delivered', timeframe: [] }),
                    getRates: async () => [],
                    cancelShipment: async () => true
                } as any;
            }
            return originalGetProvider(name, companyId);
        };

        const companyId = new mongoose.Types.ObjectId();

        // Seed Data
        console.log('🌱 Seeding Data...');
        await Company.deleteMany({ name: 'Test Co Returns' });
        await RateCard.deleteMany({ name: 'Velocity Return Rates' });
        await Company.create({ _id: companyId, name: 'Test Co Returns', settings: { defaultRateCardId: new mongoose.Types.ObjectId() } });
        const rateCardId = (await Company.findById(companyId))?.settings?.defaultRateCardId;

        await Courier.findOneAndUpdate({ name: 'velocity' }, {
            name: 'velocity', displayName: 'Velocity', isActive: true, serviceTypes: ['standard']
        }, { upsert: true });

        await Courier.deleteMany({ name: { $ne: 'velocity' } });

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
                username: encryptData('mock_user'),
                password: encryptData('mock_pass')
            }
        });

        await RateCard.create({
            _id: rateCardId,
            companyId,
            name: 'Velocity Return Rates',
            status: 'active',
            baseRates: [
                { minWeight: 0, maxWeight: 5, basePrice: 100, carrier: 'velocity', serviceType: 'standard' }
            ],
            weightRules: [{ pricePerKg: 20, minWeight: 5, maxWeight: 50, carrier: 'velocity', serviceType: 'standard' }],
            zoneMultipliers: { 'zoneA': 1 }
        });

        // EXECUTE RETURN ROUTE CALCULATION
        console.log(`\n🔄 Testing Smart Routing (Returns)...`);
        const recs = await SmartRateCalculator.calculateSmartRates({
            companyId: companyId.toString(),
            originPincode: '110001', // Pickup Address (Return Origin)
            destinationPincode: '560068', // Warehouse (Return Dest)
            weight: 0.5,
            orderValue: 1000,
            paymentMode: 'prepaid',
            shipmentType: 'return'
        });

        console.log(`   Found ${recs.totalOptions} options.`);
        if (recs.totalOptions > 0) {
            console.log(`   Top Rec: ${recs.rates[0].courierName} - ₹${recs.rates[0].totalAmount}`);
            console.log(`   Tags: ${recs.rates[0].tags.join(', ')}`);
        } else {
            console.error('❌ [FAILURE] No options found! Serviceability check might have failed.');
            process.exit(1);
        }

        console.log('\n✅ Verification Complete');

        // Cleanup
        await Company.deleteMany({ _id: companyId });
        await RateCard.deleteMany({ _id: rateCardId });

    } catch (error) {
        console.error('❌ Fatal Error:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

verifySmartRoutingReturns();
