
import * as dotenv from 'dotenv';
import path from 'path';

// 1. Load Environment Variables Critical Step
const res = dotenv.config({ path: path.join(process.cwd(), '.env') });
if (res.error) console.error('dotenv load failed:', res.error);

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd_test';

async function verifyReconciliation() {
    console.log('🚀 Starting Reconciliation Verification...');
    console.log('ENCRYPTION_KEY present:', !!process.env.ENCRYPTION_KEY);

    try {
        // 2. Dynamic Imports AFTER env load
        const { default: RemittanceReconciliationService } = await import('../../src/core/application/services/finance/remittance-reconciliation.service');
        const { Shipment } = await import('../../src/infrastructure/database/mongoose/models');
        const { default: CODRemittance } = await import('../../src/infrastructure/database/mongoose/models/finance/payouts/cod-remittance.model');

        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 3. Setup Data
        const companyId = new mongoose.Types.ObjectId();
        const userId = new mongoose.Types.ObjectId();

        // Cleanup old test data
        await Shipment.deleteMany({ 'paymentDetails.codAmount': 5555 });
        await CODRemittance.deleteMany({ 'financial.totalCODCollected': 5555 });

        // Create 2 Shipments
        const awbMatch = `TEST-MATCH-${Date.now()}`;
        const awbMismatch = `TEST-MISMATCH-${Date.now()}`;

        // Create 2 Shipments
        await Shipment.create([
            {
                companyId,
                trackingNumber: awbMatch,
                paymentDetails: { codAmount: 1000, shippingCost: 50, type: 'cod' },
                status: 'delivered',
                actualDelivery: new Date(),
                isDeleted: false,
                // Required Mock Fields
                orderId: new mongoose.Types.ObjectId(),
                carrier: 'Velocity',
                serviceType: 'surface',
                packageDetails: {
                    weight: 0.5,
                    dimensions: { length: 10, width: 10, height: 10 },
                    packageType: 'box',
                    declaredValue: 1000
                },
                deliveryDetails: {
                    recipientName: 'Test Match',
                    recipientPhone: '9876543210',
                    address: {
                        line1: '123 Test St',
                        city: 'Delhi',
                        state: 'DL',
                        postalCode: '110001',
                        country: 'India'
                    }
                },
                weights: {
                    declared: { value: 0.5, unit: 'kg' },
                    charged: { value: 0.5, unit: 'kg' }
                }
            },
            {
                companyId,
                trackingNumber: awbMismatch,
                paymentDetails: { codAmount: 2000, shippingCost: 50, type: 'cod' }, // DB says 2000
                status: 'delivered',
                actualDelivery: new Date(),
                isDeleted: false,
                // Required Mock Fields
                orderId: new mongoose.Types.ObjectId(),
                carrier: 'Velocity',
                serviceType: 'surface',
                packageDetails: {
                    weight: 0.5,
                    dimensions: { length: 10, width: 10, height: 10 },
                    packageType: 'box',
                    declaredValue: 2000
                },
                deliveryDetails: {
                    recipientName: 'Test Mismatch',
                    recipientPhone: '9876543210',
                    address: {
                        line1: '123 Test St',
                        city: 'Delhi',
                        state: 'DL',
                        postalCode: '110001',
                        country: 'India'
                    }
                },
                weights: {
                    declared: { value: 0.5, unit: 'kg' },
                    charged: { value: 0.5, unit: 'kg' }
                }
            }
        ]);

        console.log('✅ Seeding Complete: 2 Shipments Created');

        // 4. Mock CSV File
        // AWB Match: 1000 (Correct)
        // AWB Mismatch: 1500 (Courier says they only collected 1500)
        const csvContent = `awb,amount
${awbMatch},1000
${awbMismatch},1500`;

        const fileBuffer = Buffer.from(csvContent);

        // 5. Run Service
        console.log('🔄 Running Reconciliation Service...');
        const result = await RemittanceReconciliationService.createBatchFromMIS(
            companyId.toString(),
            fileBuffer,
            'text/csv',
            userId.toString()
        );

        console.log('📊 Result:', result);

        // 6. Assertions
        if (result.totalProcessed !== 2) throw new Error(`Expected 2 processed, got ${result.totalProcessed}`);
        // Should have 1 mismatch (the 2000 vs 1500 one)
        if (result.mismatches !== 1) throw new Error(`Expected 1 mismatch, got ${result.mismatches}`);

        // Double check Batch in DB
        const batch = await CODRemittance.findOne({ remittanceId: result.remittanceId });
        if (!batch) throw new Error('Batch not created in DB');

        const badShipment = batch.shipments.find(s => s.awb === awbMismatch);
        if (badShipment?.reconciliation?.status !== 'mismatch') {
            throw new Error(`Expected mismatch status, got ${badShipment?.reconciliation?.status}`);
        }

        if (badShipment.reconciliation.diffAmount !== 500) { // 2000 - 1500 = 500
            throw new Error(`Expected diff 500, got ${badShipment.reconciliation.diffAmount}`);
        }

        console.log('✅ VERIFICATION SUCCESSFUL: CSV Logic Holds!');

        // Reset Shipments for next test
        await Shipment.updateMany(
            { companyId },
            { $set: { 'remittance.included': false, 'remittance.remittanceId': null } }
        );

        // 7. Verify Velocity MIS (Excel)
        console.log('🔄 Running Velocity Excel Verification...');

        // Dynamic import ExcelJS
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.default.Workbook();
        const sheet = workbook.addWorksheet('Sheet1');

        // Headers matching Velocity parser expectations
        sheet.addRow(['AWB Number', 'Order Ref', 'Status', 'Collected Amount', 'Delivery Date']);
        sheet.addRow([awbMatch, 'ORD001', 'Delivered', 1000, '2025-01-01']); // Match
        sheet.addRow([awbMismatch, 'ORD002', 'Delivered', 1500, '2025-01-01']); // Mismatch (Recalculating status)

        const excelBuffer = await workbook.xlsx.writeBuffer();

        // Run Service with 'velocity' provider
        const velResult = await RemittanceReconciliationService.createBatchFromMIS(
            companyId.toString(),
            excelBuffer,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            userId.toString(),
            'velocity'
        );

        console.log('📊 Velocity Result:', velResult);

        if (velResult.totalProcessed !== 2) throw new Error(`Velocity: Expected 2 processed, got ${velResult.totalProcessed}`);
        if (velResult.mismatches !== 1) throw new Error(`Velocity: Expected 1 mismatch, got ${velResult.mismatches}`);

        console.log('✅ VERIFICATION SUCCESSFUL: Velocity Excel Logic Holds!');

        // Cleanup
        await Shipment.deleteMany({ companyId });
        await CODRemittance.deleteMany({ companyId });

    } catch (error: any) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

verifyReconciliation();
