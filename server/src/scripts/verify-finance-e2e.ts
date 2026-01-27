import dotenv from 'dotenv';
import path from 'path';

// Initialize environment variables
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

console.log('========================================');
console.log('FINANCE SYSTEM E2E TEST (STRICT RE-RUN)');
console.log('========================================\n');

if (!process.env.ENCRYPTION_KEY) {
    console.warn('⚠️ ENCRYPTION_KEY missing, using fallback');
    process.env.ENCRYPTION_KEY = 'fallback_secret_for_testing_only_32_chars_long';
}

async function endToEndFinanceTest() {
    let testsPassed = 0;
    let testsFailed = 0;

    try {
        // Dynamic imports for services and models
        const mongoose = (await import('mongoose')).default;
        const connectDB = (await import('../config/database')).default;
        const WalletService = (await import('../core/application/services/wallet/wallet.service')).default;
        const CODRemittanceService = (await import('../core/application/services/finance/cod-remittance.service')).default;
        const { Company, Shipment, Order } = await import('../infrastructure/database/mongoose/models');

        console.log('Connecting to Database...');
        await connectDB();
        console.log('✅ Connected to MongoDB\n');

        // ============================================================
        // SETUP: Create Test Company
        // ============================================================
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(' SETUP: Test Company & Initial Wallet');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const testEmail = `e2e_strict_${Date.now()}@shipcrowd.com`;
        const testName = `E2E Strict Test Company ${Date.now()}`;

        const company = await Company.create({
            name: testName,
            email: testEmail,
            phone: '9876543210',
            password: 'hashed_password',
            status: 'approved',
            wallet: {
                balance: 5000,
                currency: 'INR',
                lowBalanceThreshold: 500
            }
        });

        const companyId = company._id.toString();
        console.log(`✅ Company Created: ${companyId}`);
        console.log(`Initial Wallet Balance: ₹${company.wallet.balance}\n`);

        // ============================================================
        // TEST 1: Wallet Operations
        // ============================================================
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 1: Wallet Operations');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Credit
        const recharge = await WalletService.credit(
            companyId,
            2000,
            'recharge',
            'E2E Test Recharge',
            { type: 'manual', id: new mongoose.Types.ObjectId().toString() },
            'system'
        );
        if (recharge.success && recharge.newBalance === 7000) {
            console.log(`✅ PASS: Wallet Recharge (₹7000)`);
            testsPassed++;
        } else {
            console.error(`❌ FAIL: Recharge failed`);
            testsFailed++;
        }

        // Debit
        const debit = await WalletService.debit(
            companyId,
            150,
            'shipping_cost',
            'E2E Test Shipping',
            { type: 'manual', id: new mongoose.Types.ObjectId().toString() },
            'system'
        );
        if (debit.success && debit.newBalance === 6850) {
            console.log(`✅ PASS: Shipping Cost Deduction (₹6850)`);
            testsPassed++;
        } else {
            console.error(`❌ FAIL: Debit failed`);
            testsFailed++;
        }

        console.log('');

        // ============================================================
        // TEST 2: COD Order & Shipment Creation (STRICT SCHEMA)
        // ============================================================
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 2: COD Order & Shipment Creation');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        try {
            // 1. Create Valid Order
            const orderData = {
                orderNumber: `ORD_${Date.now()}`,
                companyId: companyId,
                customerInfo: {
                    name: 'Strict Test Customer',
                    phone: '9988776655',
                    email: 'strict@test.com',
                    address: {
                        line1: '123 Test Lane',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        country: 'India',
                        postalCode: '400001'
                    }
                },
                products: [{
                    name: 'Test Widget',
                    sku: 'WIDGET-001',
                    quantity: 1,
                    price: 1000,
                    subtotal: 1000
                }],
                paymentMode: 'cod',
                totals: {
                    subtotal: 1000,
                    total: 1000
                },
                source: 'manual'
            };

            const order = await Order.create(orderData);
            console.log(`✅ PASS: valid Order created (${order.orderNumber})`);

            // 2. Create Valid Shipment (Linked to Order)
            // Note: Delivered date must be in the past to be eligible for remittance
            // Eligibility logic: current status delivered + deliveredAt <= cutoff date
            const deliveredDate = new Date();
            deliveredDate.setDate(deliveredDate.getDate() - 1); // Yesterday

            const shipmentData = {
                trackingNumber: `AWB_${Date.now()}`,
                orderId: order._id,
                companyId: companyId,
                carrier: 'dummy-carrier',
                serviceType: 'standard',
                currentStatus: 'delivered', // Crucial for remittance eligibility
                actualDelivery: deliveredDate, // Crucial for remittance eligibility
                packageDetails: {
                    weight: 0.5,
                    dimensions: { length: 10, width: 10, height: 10 },
                    packageCount: 1,
                    packageType: 'box',
                    declaredValue: 1000
                },
                pickupDetails: {
                    contactPerson: 'Warehouse Guy',
                    contactPhone: '9999999999'
                },
                deliveryDetails: {
                    recipientName: orderData.customerInfo.name,
                    recipientPhone: orderData.customerInfo.phone,
                    recipientEmail: orderData.customerInfo.email,
                    address: orderData.customerInfo.address
                },
                paymentDetails: {
                    type: 'cod',
                    codAmount: 1000,
                    shippingCost: 150,
                    currency: 'INR'
                },
                pricingDetails: { // Required for remittance calculation sometimes
                    totalPrice: 150
                },
                weights: {
                    declared: { value: 0.5, unit: 'kg' },
                    verified: false
                },
                remittance: {
                    included: false // Not yet remitted
                }
            };

            const shipment = await Shipment.create(shipmentData);
            console.log(`✅ PASS: valid Shipment created (${shipment.trackingNumber})`);
            console.log(`   Status: ${shipment.currentStatus}`);
            console.log(`   COD Amount: ${shipment.paymentDetails.codAmount}`);
            testsPassed++;

        } catch (error: any) {
            console.error(`❌ FAIL: Order/Shipment creation failed: ${error.message}`);
            // console.error(error); // Debug if needed
            testsFailed++;
        }
        console.log('');

        // ============================================================
        // TEST 3: COD Remittance Flow
        // ============================================================
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 3: COD Remittance Batch Creation');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        try {
            // Check eligibility first (Debug step)
            // Cutoff date = Now (should include our shipment delivered yesterday)
            const cutoffDate = new Date();
            const eligible = await CODRemittanceService.getEligibleShipments(companyId, cutoffDate);
            console.log(`Eligible Shipments Found: ${eligible.shipments.length}`);

            if (eligible.shipments.length > 0) {
                // Create Batch
                const systemUserId = new mongoose.Types.ObjectId().toString(); // Valid ObjectId
                const batch = await CODRemittanceService.createRemittanceBatch(
                    companyId,
                    'manual',
                    cutoffDate,
                    systemUserId
                );

                if (batch && batch.remittanceId) {
                    console.log(`✅ PASS: Remittance Batch Created: ${batch.remittanceId}`);
                    console.log(`   Net Payable: ₹${batch.financial.netPayable}`);
                    testsPassed++;
                } else {
                    console.error(`❌ FAIL: Batch creation returned null/invalid`);
                    testsFailed++;
                }
            } else {
                console.error(`❌ FAIL: No eligible shipments found (Date logic issue?)`);
                testsFailed++;
            }

        } catch (error: any) {
            console.error(`❌ FAIL: Remittance Logic - ${error.message}`);
            testsFailed++;
        }
        console.log('');

        // ============================================================
        // TEST 4: Transaction History
        // ============================================================
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 4: Audit Trail');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const history = await WalletService.getTransactionHistory(companyId);
        if (history.transactions.length >= 2) {
            console.log(`✅ PASS: Transaction History confirmed (${history.transactions.length} items)`);
            testsPassed++;
        } else {
            console.error(`❌ FAIL: Missing transactions`);
            testsFailed++;
        }
        console.log('');


        // SUMMARY
        console.log('========================================');
        console.log('STRICT TEST SUMMARY');
        console.log('========================================');
        console.log(`✅ Tests Passed: ${testsPassed}`);
        console.log(`❌ Tests Failed: ${testsFailed}`);
        console.log('========================================\n');

        await mongoose.disconnect();
        if (testsFailed > 0) process.exit(1);

    } catch (error: any) {
        console.error('CRITICAL ERROR:', error);
        process.exit(1);
    }
}

endToEndFinanceTest();
