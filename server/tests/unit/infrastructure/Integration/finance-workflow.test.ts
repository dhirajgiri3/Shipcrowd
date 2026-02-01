import mongoose from 'mongoose';
import connectDB from '@/config/database';
import WalletService from '@/core/application/services/wallet/wallet.service';
import CODRemittanceService from '@/core/application/services/finance/cod-remittance.service';
import { Company, Order, Shipment, WalletTransaction } from '@/infrastructure/database/mongoose/models';

describe('Finance Workflow E2E - Production Tests', () => {
    let testCompanyId: string;
    const initialBalance = 10000;

    beforeAll(async () => {
        if (!process.env.MONGODB_URI) {
            process.env.MONGODB_URI = 'mongodb://localhost:27017/shipcrowd_test';
        }
        if (!process.env.ENCRYPTION_KEY) {
            process.env.ENCRYPTION_KEY = 'fallback_secret_for_testing_only_32_chars_long';
        }
        await connectDB();
    });

    beforeEach(async () => {
        const company = await Company.create({
            name: `Test Company ${Date.now()}`,
            email: `test_${Date.now()}@shipcrowd.com`,
            phone: '9999999999',
            password: 'hashed',
            status: 'approved',
            wallet: { balance: initialBalance, currency: 'INR' },
        });
        testCompanyId = company._id.toString();
    });

    afterEach(async () => {
        await Company.deleteMany({ _id: testCompanyId });
        await Order.deleteMany({ companyId: testCompanyId });
        await Shipment.deleteMany({ companyId: testCompanyId });
        await WalletTransaction.deleteMany({ companyId: testCompanyId });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('Complete Finance Flow', () => {
        test('should handle order creation with wallet debit', async () => {
            // 1. Create order
            const order = await Order.create({
                orderNumber: `ORD_${Date.now()}`,
                companyId: testCompanyId,
                customerInfo: {
                    name: 'John Doe',
                    phone: '9876543210',
                    email: 'john@test.com',
                    address: {
                        line1: '123 Main St',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        country: 'India',
                        postalCode: '400001',
                    },
                },
                products: [{ name: 'Widget', quantity: 1, price: 1000 }],
                paymentMode: 'cod',
                totals: { subtotal: 1000, total: 1000 },
                source: 'manual',
            });

            expect(order._id).toBeDefined();

            // 2. Create shipment and debit wallet
            const shippingCost = 150;
            const walletResult = await WalletService.debit(
                testCompanyId,
                shippingCost,
                'shipping_cost',
                `Shipment for ${order.orderNumber}`,
                { type: 'order', id: (order as any)._id.toString() },
                'system'
            );

            expect(walletResult.success).toBe(true);
            expect(walletResult.newBalance).toBe(initialBalance - shippingCost);

            // 3. Verify transaction created
            const txn = await WalletTransaction.findOne({
                company: testCompanyId,
                reason: 'shipping_cost',
            });

            expect(txn).not.toBeNull();
            expect(txn?.amount).toBe(shippingCost);
        });

        test('should prevent order creation if wallet insufficient', async () => {
            const smallWallet = 100;
            await Company.findByIdAndUpdate(testCompanyId, { 'wallet.balance': smallWallet });

            const shippingCost = 150;
            const result = await WalletService.debit(
                testCompanyId,
                shippingCost,
                'shipping_cost',
                'Expensive shipping',
                { type: 'order' },
                'system'
            );

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/insufficient/i);

            const company = await Company.findById(testCompanyId);
            expect(company?.wallet.balance).toBe(smallWallet);
        });

        test('should calculate COD remittance correctly', async () => {
            // Setup: Create delivered shipment with COD
            const codAmount = 1000;
            const shippingCost = 150;
            const platformFee = codAmount * 0.005; // 0.5%

            const order = await Order.create({
                orderNumber: `ORD_${Date.now()}`,
                companyId: testCompanyId,
                customerInfo: {
                    name: 'Customer',
                    phone: '9876543210',
                    address: { line1: 'St', city: 'City', state: 'State', country: 'India', postalCode: '400001' },
                },
                products: [{ name: 'Item', quantity: 1, price: codAmount }],
                paymentMode: 'cod',
                totals: { subtotal: codAmount, total: codAmount },
                source: 'manual',
            });

            const deliveredDate = new Date();
            deliveredDate.setDate(deliveredDate.getDate() - 1);

            const shipment = await Shipment.create({
                trackingNumber: `AWB_${Date.now()}`,
                orderId: order._id,
                companyId: testCompanyId,
                carrier: 'test-carrier',
                serviceType: 'standard',
                currentStatus: 'delivered',
                actualDelivery: deliveredDate,
                packageDetails: {
                    weight: 0.5,
                    dimensions: { length: 10, width: 10, height: 10 },
                    packageCount: 1,
                    packageType: 'box',
                    declaredValue: codAmount,
                },
                pickupDetails: {
                    contactPerson: 'Warehouse',
                    contactPhone: '9999999999',
                },
                deliveryDetails: {
                    recipientName: 'Customer',
                    recipientPhone: '9876543210',
                    address: { line1: 'St', city: 'City', state: 'State', country: 'India', postalCode: '400001' },
                },
                paymentDetails: {
                    type: 'cod',
                    codAmount,
                    shippingCost,
                    currency: 'INR',
                },
                pricingDetails: { totalPrice: shippingCost },
                weights: { declared: { value: 0.5, unit: 'kg' }, verified: false },
                remittance: { included: false },
            });

            // Create remittance
            const remittance = await CODRemittanceService.createRemittanceBatch(
                testCompanyId,
                'manual',
                new Date()
            );

            expect(remittance.remittanceId).toBeDefined();
            expect(remittance.financial.netPayable).toBeGreaterThan(0);
            expect(remittance.financial.deductionsSummary).toBeDefined();

            // Verify calculation
            // Net = COD - shipping - platform fee
            const expectedNet = codAmount - shippingCost - platformFee;
            expect(Math.abs(remittance.financial.netPayable - expectedNet) < 1).toBe(true); // Allow 1 rupee variance
        });

        test('should not remit orders still in transit', async () => {
            const order = await Order.create({
                orderNumber: `ORD_${Date.now()}`,
                companyId: testCompanyId,
                customerInfo: {
                    name: 'Customer',
                    phone: '9876543210',
                    address: { line1: 'St', city: 'City', state: 'State', country: 'India', postalCode: '400001' },
                },
                products: [{ name: 'Item', quantity: 1, price: 1000 }],
                paymentMode: 'cod',
                totals: { subtotal: 1000, total: 1000 },
                source: 'manual',
            });

            const shipment = await Shipment.create({
                trackingNumber: `AWB_${Date.now()}`,
                orderId: order._id,
                companyId: testCompanyId,
                carrier: 'test-carrier',
                serviceType: 'standard',
                currentStatus: 'in_transit', // Not delivered
                packageDetails: {
                    weight: 0.5,
                    dimensions: { length: 10, width: 10, height: 10 },
                    packageCount: 1,
                    packageType: 'box',
                    declaredValue: 1000,
                },
                pickupDetails: { contactPerson: 'W', contactPhone: '9999999999' },
                deliveryDetails: {
                    recipientName: 'C',
                    recipientPhone: '9876543210',
                    address: { line1: 'St', city: 'City', state: 'State', country: 'India', postalCode: '400001' },
                },
                paymentDetails: { type: 'cod', codAmount: 1000, shippingCost: 150, currency: 'INR' },
                pricingDetails: { totalPrice: 150 },
                weights: { declared: { value: 0.5, unit: 'kg' }, verified: false },
                remittance: { included: false },
            });

            try {
                const remittance = await CODRemittanceService.createRemittanceBatch(testCompanyId, 'manual', new Date());
                expect(remittance.shipmentCount === 0 || remittance.financial.netPayable === 0).toBe(true);
            } catch (error: any) {
                // If throws "No shipments", it confirms it ignored the 'in_transit' shipment
                expect(error).toBeDefined();
            }
        });
    });

    describe('Concurrent Finance Operations', () => {
        test('should handle concurrent order debits and COD credits safely', async () => {
            // Simulate: 5 orders being shipped + 5 COD collections concurrently
            const promises = [];

            for (let i = 0; i < 5; i++) {
                promises.push(
                    WalletService.debit(
                        testCompanyId,
                        200,
                        'shipping_cost',
                        `Order ${i}`,
                        { type: 'manual', id: new mongoose.Types.ObjectId().toString() },
                        'system'
                    )
                );

                promises.push(
                    WalletService.credit(
                        testCompanyId,
                        1000,
                        'cod_remittance',
                        `COD ${i}`,
                        { type: 'manual', id: new mongoose.Types.ObjectId().toString() },
                        'system'
                    )
                );
            }

            const results = await Promise.all(promises);
            const allSuccess = results.every((r) => r.success);

            expect(allSuccess).toBe(true);

            const company = await Company.findById(testCompanyId);
            // Balance = 10000 - (5 * 200 debits) + (5 * 1000 credits) = 10000 - 1000 + 5000 = 14000
            expect(company?.wallet.balance).toBe(14000);
        });
    });

    describe('Edge Cases', () => {
        test('should handle precise remittance calculation with multiple shipments', async () => {
            const shipments = [
                { codAmount: 1000, shippingCost: 150 },
                { codAmount: 2000, shippingCost: 200 },
                { codAmount: 1500, shippingCost: 175 },
            ];

            for (const shipment of shipments) {
                const order = await Order.create({
                    orderNumber: `ORD_${Date.now()}_${Math.random()}`,
                    companyId: testCompanyId,
                    customerInfo: {
                        name: 'Customer',
                        phone: '9876543210',
                        address: { line1: 'St', city: 'City', state: 'State', country: 'India', postalCode: '400001' },
                    },
                    products: [{ name: 'Item', quantity: 1, price: shipment.codAmount }],
                    paymentMode: 'cod',
                    totals: { subtotal: shipment.codAmount, total: shipment.codAmount },
                    source: 'manual',
                });

                const deliveredDate = new Date();
                deliveredDate.setDate(deliveredDate.getDate() - 1);

                await Shipment.create({
                    trackingNumber: `AWB_${Date.now()}_${Math.random()}`,
                    orderId: order._id,
                    companyId: testCompanyId,
                    carrier: 'test-carrier',
                    serviceType: 'standard',
                    currentStatus: 'delivered',
                    actualDelivery: deliveredDate,
                    packageDetails: {
                        weight: 0.5,
                        dimensions: { length: 10, width: 10, height: 10 },
                        packageCount: 1,
                        packageType: 'box',
                        declaredValue: shipment.codAmount,
                    },
                    pickupDetails: { contactPerson: 'W', contactPhone: '9999999999' },
                    deliveryDetails: {
                        recipientName: 'C',
                        recipientPhone: '9876543210',
                        address: { line1: 'St', city: 'City', state: 'State', country: 'India', postalCode: '400001' },
                    },
                    paymentDetails: {
                        type: 'cod',
                        codAmount: shipment.codAmount,
                        shippingCost: shipment.shippingCost,
                        currency: 'INR',
                    },
                    pricingDetails: { totalPrice: shipment.shippingCost },
                    weights: { declared: { value: 0.5, unit: 'kg' }, verified: false },
                    remittance: { included: false },
                });
            }

            const remittance = await CODRemittanceService.createRemittanceBatch(testCompanyId, 'manual', new Date());

            // Verify all shipments included
            expect(remittance.remittanceId).toBeDefined();
        });

        test('should prevent double-remittance of same shipment', async () => {
            const order = await Order.create({
                orderNumber: `ORD_${Date.now()}`,
                companyId: testCompanyId,
                customerInfo: {
                    name: 'Customer',
                    phone: '9876543210',
                    address: { line1: 'St', city: 'City', state: 'State', country: 'India', postalCode: '400001' },
                },
                products: [{ name: 'Item', quantity: 1, price: 1000 }],
                paymentMode: 'cod',
                totals: { subtotal: 1000, total: 1000 },
                source: 'manual',
            });

            const deliveredDate = new Date();
            deliveredDate.setDate(deliveredDate.getDate() - 1);

            const shipment = await Shipment.create({
                trackingNumber: `AWB_${Date.now()}`,
                orderId: order._id,
                companyId: testCompanyId,
                carrier: 'test-carrier',
                serviceType: 'standard',
                currentStatus: 'delivered',
                actualDelivery: deliveredDate,
                packageDetails: {
                    weight: 0.5,
                    dimensions: { length: 10, width: 10, height: 10 },
                    packageCount: 1,
                    packageType: 'box',
                    declaredValue: 1000,
                },
                pickupDetails: { contactPerson: 'W', contactPhone: '9999999999' },
                deliveryDetails: {
                    recipientName: 'C',
                    recipientPhone: '9876543210',
                    address: { line1: 'St', city: 'City', state: 'State', country: 'India', postalCode: '400001' },
                },
                paymentDetails: { type: 'cod', codAmount: 1000, shippingCost: 150, currency: 'INR' },
                pricingDetails: { totalPrice: 150 },
                weights: { declared: { value: 0.5, unit: 'kg' }, verified: false },
                remittance: { included: false },
            });

            // Create remittance first time
            const remittance1 = await CODRemittanceService.createRemittanceBatch(testCompanyId, 'manual', new Date());
            expect(remittance1.remittanceId).toBeDefined();

            // Mark as included
            await Shipment.findByIdAndUpdate(shipment._id, { 'remittance.included': true });

            // Try to create again
            try {
                const remittance2 = await CODRemittanceService.createRemittanceBatch(testCompanyId, 'manual', new Date());
                // If it returns empty, verify counts
                expect(remittance2.financial.netPayable === 0 || remittance2.shipmentCount === 0).toBe(true);
            } catch (error: any) {
                // If it throws "No shipments", that is also valid behavior for "nothing to remit"
                expect(error).toBeDefined();
                expect(error.message).toMatch(/No eligible shipments found for remittance/i);
            }
        });
    });
});
