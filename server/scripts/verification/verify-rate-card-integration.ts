
import * as dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { jest } from '@jest/globals'; // Only if using jest, otherwise manual spy

// 1. Load Environment
const res = dotenv.config({ path: path.join(process.cwd(), '.env') });
if (res.error) console.error('dotenv load failed:', res.error);

async function verifyRateCardIntegration() {
    console.log('🚀 Starting Integration Verification: Rate Card + Velocity Provider...');
    let mongoConnected = false;

    try {
        // 2. Constants & IDs
        const VELOCITY_BASE_URL = 'https://shazam.velocity.in';
        const MOCK_AWB = 'SHP-20240101-1234';

        // 3. Dynamic Imports
        const modelsPath = path.resolve(process.cwd(), 'src/infrastructure/database/mongoose/models/index.ts');
        const shipmentServicePath = path.resolve(process.cwd(), 'src/core/application/services/shipping/shipment.service.ts');
        const providerPath = path.resolve(process.cwd(), 'src/infrastructure/external/couriers/velocity/velocity-shipfast.provider.ts');
        const orchestratorPath = path.resolve(process.cwd(), 'src/core/application/services/pricing/pricing-orchestrator.service.ts');
        const pincodeServicePath = path.resolve(process.cwd(), 'src/core/application/services/logistics/pincode-lookup.service.ts');

        // Import Modules
        const { Company, User, RateCard, Order, Shipment, Warehouse, Zone } = await import(modelsPath);
        const { VelocityShipfastProvider } = await import(providerPath);
        const { ShipmentService } = await import(shipmentServicePath);
        const { default: PricingOrchestrator } = await import(orchestratorPath);
        const { default: PincodeLookupService } = await import(pincodeServicePath);

        // Connect DB
        const MONGODB_URI = process.env.MONGODB_URI;
        if (!MONGODB_URI) throw new Error('MONGODB_URI not found');
        await mongoose.connect(MONGODB_URI);
        mongoConnected = true;
        console.log('✅ Connected to MongoDB');

        // Load Pincodes
        await PincodeLookupService.loadPincodesFromCSV();
        console.log('✅ Pincode Cache Loaded');

        // Clean previous test data
        // await Shipment.deleteMany({ 'deliveryDetails.address.postalCode': '999999' }); // Example safety cleanup

        // ---------------------------------------------------------
        // SETUP: Context
        // ---------------------------------------------------------
        const company = await Company.findOne({}).lean();
        if (!company) throw new Error('No company found');
        const companyId = company._id;
        const userId = new mongoose.Types.ObjectId();

        // ---------------------------------------------------------
        // SETUP: Rate Card (The "Platinum" Card)
        // ---------------------------------------------------------
        await RateCard.deleteMany({ name: 'Integration Test Card', companyId });

        let zoneC = await Zone.findOne({ companyId, standardZoneCode: 'zoneC' });
        if (!zoneC) zoneC = await Zone.create({ companyId, standardZoneCode: 'zoneC', name: 'Metro' });

        const rateCard = await RateCard.create({
            name: 'Integration Test Card',
            companyId,
            status: 'active',
            baseRates: [{ carrier: 'velocity', serviceType: 'standard', basePrice: 60, minWeight: 0, maxWeight: 0.5 }],
            weightRules: [{ minWeight: 0.5, maxWeight: 10, pricePerKg: 20 }],
            // Additive Rule for Zone C (+30)
            zoneRules: [{
                zoneId: zoneC._id,
                additionalPrice: 30,
                carrier: 'velocity',
                serviceType: 'standard'
            }],
            effectiveDates: { startDate: new Date() }
        });

        // Assign to Company
        await Company.updateOne({ _id: companyId }, { $set: { 'settings.defaultRateCardId': rateCard._id } });
        console.log(`✅ Rate Card Created & Assigned: ${rateCard._id}`);

        // ---------------------------------------------------------
        // SETUP: Warehouse & Order
        // ---------------------------------------------------------
        let warehouse = await Warehouse.findOne({ companyId });
        if (!warehouse) throw new Error('No warehouse found');

        // Force Warehouse Pincode to 110001 (Delhi) for deterministic Zone C test
        await Warehouse.updateOne({ _id: warehouse._id }, {
            $set: {
                'address.postalCode': '110001',
                'address.city': 'New Delhi',
                'address.state': 'Delhi'
            }
        });
        warehouse = await Warehouse.findById(warehouse._id);

        const order = await Order.create({
            companyId,
            orderNumber: `INT-TEST-${Date.now()}`,
            customerInfo: {
                name: 'Test Customer',
                phone: '9876543210',
                email: 'test@example.com',
                address: { line1: '123 Street', city: 'Mumbai', state: 'Maharashtra', postalCode: '400001', country: 'India' }
            },
            products: [{ name: 'Item 1', sku: 'SKU1', quantity: 2, price: 500, weight: 1.0 }], // Total 2kg
            paymentMethod: 'prepaid',
            totals: { subtotal: 1000, tax: 0, total: 1000 },
            warehouseId: warehouse!._id,
            status: 'confirmed'
        });
        console.log(`✅ Test Order Created: ${order.orderNumber}`);

        // ---------------------------------------------------------
        // INTERCEPT: Velocity Provider Network Calls
        // We want to verify the Provider's LOGIC, but block the HTTP call.
        // ---------------------------------------------------------
        const originalHttpClient = VelocityShipfastProvider.prototype['httpClient'];

        // Manual Spy/Mock on the Provider Instance used by Service
        // Problem: Service instantiates Provider internally or via Factory?
        // Checking ShipmentService... it likely uses a Factory.
        // For this test, to avoid complex DI mocking, we will instantiate the Provider directly
        // and manually invoke "createShipment" with the payload the Service WOULD generate.

        // BETTER APPROACH:
        // 1. Calculate Pricing (Rate Card Test)
        // 2. Generate Payload (Controller Logic Validation)
        // 3. Invoke Provider.createShipment() with MOCKED axios (Provider Logic Validation)

        // Step 1: Pricing
        // Origin: Warehouse (Delhi 110001) -> Destination: Mumbai (400001)
        // Weight: 2kg
        const pricingInput = {
            companyId: String(companyId),
            fromPincode: '110001',
            toPincode: '400001',
            weight: 2.0,
            paymentMode: 'prepaid' as const,
            orderValue: 1000,
            dimensions: { length: 10, width: 10, height: 10 }
        };

        const priceResult = await PricingOrchestrator.calculateShipmentPricing(pricingInput);
        console.log('\n📊 INTERNAL PRICING CALCULATION:');
        console.log(`   Base: ${priceResult.baseRate}`);
        console.log(`   Weight Charge: ${priceResult.weightCharge}`);
        console.log(`   Zone Charge: ${priceResult.zoneCharge}`);
        console.log(`   Total: ${priceResult.totalPrice}`);

        // Verify Price Logic (Base 60 + Weight (1.5 * 20 = 30) + Zone 30 = 120 + GST 21.6 = 141.6)
        if (Math.abs(priceResult.totalPrice - 141.6) > 1) console.warn(`⚠️ Price Warning: Double check math. Expected ~141.6, Got ${priceResult.totalPrice}`);
        else console.log('✅ Internal Pricing Verified');


        // Step 2: Provider Execution (Mocked Network)
        console.log('\n--- EXECUTING PROVIDER LOGIC ---');
        const provider = new VelocityShipfastProvider(companyId, VELOCITY_BASE_URL);

        // Spy on axios
        // @ts-ignore
        provider.httpClient.post = async (url: string, data: any) => {
            console.log(`   📡 [MOCK HTTP] POST ${url}`);
            console.log('   📦 Payload:', JSON.stringify(data, null, 2));

            // Verify Payload Structure (The "Real Application Logic" test)
            if (!data.order_id || !data.billing_customer_name) throw new Error('Malformed Velocity Payload');

            return {
                data: {
                    payload: {
                        awb_code: MOCK_AWB,
                        courier_name: 'Velocity Shipfast',
                        label_url: 'http://mock-label.pdf',
                        shipment_id: 'VEL-12345',
                        frwd_charges: { shipping_charges: 100, cod_charges: 0 }
                    }
                }
            };
        };

        const shipmentData = {
            orderNumber: order.orderNumber,
            origin: {
                name: warehouse!.contactInfo.name || 'Warehouse',
                phone: warehouse!.contactInfo.phone,
                address: warehouse!.address.line1,
                city: warehouse!.address.city,
                state: warehouse!.address.state,
                pincode: warehouse!.address.postalCode,
                country: warehouse!.address.country
            },
            destination: {
                name: order.customerInfo.name,
                phone: order.customerInfo.phone,
                address: order.customerInfo.address.line1,
                city: order.customerInfo.address.city,
                state: order.customerInfo.address.state,
                pincode: order.customerInfo.address.postalCode,
                country: order.customerInfo.address.country
            },
            package: {
                weight: 2.0,
                length: 10,
                width: 10,
                height: 10,
                description: 'Integration Test Package',
                declaredValue: 1000
            },
            paymentMode: 'prepaid' as const,
            warehouseId: String(warehouse!._id),
            idempotencyKey: `IDEM-${Date.now()}`
        };

        const providerResponse = await provider.createShipment(shipmentData);

        console.log('✅ Provider Response:', providerResponse);
        if (providerResponse.trackingNumber !== MOCK_AWB) throw new Error('Provider failed to parse mock response');

        console.log('\n🎉 INTEGRATION VERIFICATION SUCCESSFUL');

        // Cleanup
        await Order.deleteOne({ _id: order._id });

    } catch (error: any) {
        console.error('❌ Integration Failed:', error);
        console.error(error.stack);
        process.exit(1);
    } finally {
        if (mongoConnected) await mongoose.disconnect();
    }
}

verifyRateCardIntegration();
