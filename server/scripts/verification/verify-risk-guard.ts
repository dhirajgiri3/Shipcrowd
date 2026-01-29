
import * as dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

const res = dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd_test';

async function verifyRiskGuard() {
    console.log('🚀 Starting Risk Guard Verification...');

    try {
        const modelsPath = path.resolve(process.cwd(), 'src/infrastructure/database/mongoose/models/index.ts');
        const servicePath = path.resolve(process.cwd(), 'src/core/application/services/risk/risk-guard.service.ts');

        const { BlacklistItem, Company } = await import(modelsPath);
        const { default: RiskGuardService } = await import(servicePath);

        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const companyId = new mongoose.Types.ObjectId();

        // 1. Setup Company Settings
        console.log('🌱 Seeding Company Risk Settings...');
        await Company.deleteMany({ name: 'Risk Test Co' });
        await Company.create({
            _id: companyId,
            name: 'Risk Test Co',
            settings: {
                risk: {
                    maxCodAmount: 2000,
                    blockBlacklisted: true
                }
            }
        });

        // 2. Seed Blacklist
        console.log('🌱 Seeding Blacklist...');
        await BlacklistItem.deleteMany({ value: '9999999999' });
        await BlacklistItem.create({
            type: 'phone',
            value: '9999999999', // Bad actor
            reason: 'Frequent RTO Scammer',
            isActive: true
        });

        const service = new RiskGuardService();

        // TEST 1: Blacklisted Phone
        console.log('\n🧪 TEST 1: Blacklisted Phone Check');
        const res1 = await service.evaluateOrder({
            companyId: companyId.toString(),
            customerPhone: '9999999999',
            destinationPincode: '110001',
            paymentMode: 'prepaid',
            orderValue: 500
        });

        if (res1.status === 'BLOCKED') {
            console.log('✅ PASS: Blocked Blacklisted Phone');
            console.log(`   Reason: ${res1.reasons[0]}`);
        } else {
            console.error('❌ FAIL: Did not block blacklisted phone!', res1);
        }

        // TEST 2: High COD Check
        console.log('\n🧪 TEST 2: High COD Check (> 2000)');
        const res2 = await service.evaluateOrder({
            companyId: companyId.toString(),
            customerPhone: '9876543210', // Good phone
            destinationPincode: '110001',
            paymentMode: 'cod',
            orderValue: 2500 // > 2000
        });

        if (res2.status === 'BLOCKED') {
            console.log('✅ PASS: Blocked High COD');
            console.log(`   Reason: ${res2.reasons[0]}`);
        } else {
            console.error('❌ FAIL: Did not block High COD!', res2);
        }

        // TEST 3: Allowed Order
        console.log('\n🧪 TEST 3: Clean Good Order');
        const res3 = await service.evaluateOrder({
            companyId: companyId.toString(),
            customerPhone: '9876543210',
            destinationPincode: '110001',
            paymentMode: 'cod',
            orderValue: 1500 // < 2000
        });

        if (res3.status === 'ALLOWED') {
            console.log('✅ PASS: Allowed Clean Order');
        } else {
            console.error('❌ FAIL: Wrongly blocked clean order!', res3);
        }


        // TEST 4: History Check (High RTO)
        console.log('\n🧪 TEST 4: Customer History Check (RTO > 30%)');
        const { Shipment } = await import(modelsPath);
        const badCustomerPhone = '9988776655';

        // Seed 10 orders: 6 Delivered, 4 RTO (40% RTO Rate)
        const historyOrders = [];
        for (let i = 0; i < 6; i++) historyOrders.push({ status: 'delivered' });
        for (let i = 0; i < 4; i++) historyOrders.push({ status: 'rto' }); // 4 RTOs

        await Shipment.deleteMany({ 'deliveryDetails.recipientPhone': badCustomerPhone });

        // Minimal seed
        /* eslint-disable @typescript-eslint/no-unused-vars */
        for (const ord of historyOrders) {
            await Shipment.create({
                companyId,
                orderId: new mongoose.Types.ObjectId(),
                trackingNumber: `HIST-${Math.random().toString(36).substring(7)}`,
                carrier: 'test',
                serviceType: 'standard',
                currentStatus: ord.status,
                deliveryDetails: {
                    recipientPhone: badCustomerPhone,
                    recipientName: 'Risk Test',
                    address: { line1: 'Test', city: 'Test', state: 'Test', postalCode: '110001', country: 'India' }
                },
                packageDetails: { weight: 1, dimensions: { length: 1, width: 1, height: 1 }, packageType: 'box', declaredValue: 500 },
                weights: { declared: { value: 1, unit: 'kg' }, verified: false },
                paymentDetails: { type: 'cod', shippingCost: 100 }
            });
        }
        /* eslint-enable @typescript-eslint/no-unused-vars */

        const res4 = await service.evaluateOrder({
            companyId: companyId.toString(),
            customerPhone: badCustomerPhone,
            destinationPincode: '110001',
            paymentMode: 'cod',
            orderValue: 500
        });

        if (res4.status === 'BLOCKED' && res4.reasons[0].includes('High RTO Risk')) {
            console.log('✅ PASS: Blocked High RTO Customer (40% Rate)');
            console.log(`   Reason: ${res4.reasons[0]}`);
        } else {
            console.error('❌ FAIL: Did not block High RTO Customer!', res4);
        }

        // Cleanup
        await Company.deleteMany({ _id: companyId });
        await BlacklistItem.deleteMany({ value: '9999999999' });

    } catch (error) {
        console.error('❌ Fatal Error:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

verifyRiskGuard();
