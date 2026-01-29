
import * as dotenv from 'dotenv';
import path from 'path';

// 1. Load Environment Variables Critical Step
const res = dotenv.config({ path: path.join(process.cwd(), '.env') });
if (res.error) console.error('dotenv load failed:', res.error);

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd_test';

async function verifyWeightDispute() {
    console.log('🚀 Starting Weight Dispute Verification...');
    console.log('ENCRYPTION_KEY present:', !!process.env.ENCRYPTION_KEY);

    try {
        // 2. Dynamic Imports AFTER env load
        const { VelocityWebhookService } = await import('../../src/core/application/services/webhooks/velocity-webhook.service');
        const { default: WeightDisputeResolutionService } = await import('../../src/core/application/services/disputes/weight-dispute-resolution.service');
        const { Shipment, Company, WalletTransaction } = await import('../../src/infrastructure/database/mongoose/models');
        const { default: WeightDispute } = await import('../../src/infrastructure/database/mongoose/models/logistics/shipping/exceptions/weight-dispute.model');
        const { default: WalletService } = await import('../../src/core/application/services/wallet/wallet.service');

        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 3. Setup Data
        const companyId = new mongoose.Types.ObjectId();
        await Company.create({
            _id: companyId,
            name: `Test Company ${Date.now()}`,
            email: `test${Date.now()}@company.com`,
            phone: '9876543210',
            password: 'password123',
            type: 'seller',
            wallet: {
                balance: 0,
                currency: 'INR',
                status: 'active'
            },
            isEmailVerified: true,
            isPhoneVerified: true,
            kycStatus: 'verified'
        });
        console.log('Use Company ID:', companyId.toString());
        console.log('Mongo URI:', MONGODB_URI);

        // Setup Wallet Balance
        const creditResult = await WalletService.credit(
            companyId.toString(),
            1000,
            'recharge',
            'Initial Balance',
            { type: 'manual', id: new mongoose.Types.ObjectId().toString(), externalId: 'init' },
            'system'
        );
        console.log('Credit Result:', JSON.stringify(creditResult, null, 2));

        if (creditResult.success && creditResult.transactionId) {
            const txCheck = await WalletTransaction.findById(creditResult.transactionId);
            console.log('Direct TX Check (Credit):', txCheck ? 'FOUND' : 'NOT FOUND', txCheck ? txCheck._id : '');
        }

        // Create Shipment (Declared 0.5kg)
        const awb = `TEST-WEIGHT-${Date.now()}`;
        const orderId = new mongoose.Types.ObjectId();

        const shipment = await Shipment.create({
            companyId,
            trackingNumber: awb,
            orderId,
            paymentDetails: { codAmount: 0, shippingCost: 50, type: 'prepaid' }, // Cost 50 for 0.5kg
            status: 'in_transit',
            currentStatus: 'in_transit',
            carrier: 'Velocity',
            carrierDetails: { carrierTrackingNumber: awb },
            serviceType: 'surface',
            packageDetails: {
                weight: 0.5,
                dimensions: { length: 10, width: 10, height: 10 },
                packageType: 'box',
                declaredValue: 1000
            },
            deliveryDetails: {
                recipientName: 'Test Recipient',
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
            },
            isDeleted: false
        });

        console.log('✅ Shipment Created:', awb);

        // 4. Simulate Webhook: Weight Scanned = 2.0kg (Huge Discrepancy!)
        const webhookService = new VelocityWebhookService();
        const payload: any = {
            event_type: 'SHIPMENT_WEIGHT_SCANNED',
            shipment_data: {
                awb: awb,
                order_id: orderId.toString(),
                courier_name: 'Velocity'
            },
            weight_data: {
                scanned_weight: 2.0, // 4x declared weight
                unit: 'kg',
                scan_timestamp: new Date().toISOString(),
                scan_location: 'Delhi Hub'
            },
            timestamp: new Date().toISOString()
        };

        console.log('🔄 Triggering Webhook...');
        await webhookService.processWebhook(payload);

        // 5. Verify Dispute Created
        const dispute = await WeightDispute.findOne({ shipmentId: shipment._id });
        if (!dispute) throw new Error('Dispute NOT created!');

        console.log('✅ Dispute Created:', dispute.disputeId);
        console.log('   Discrepancy:', dispute.discrepancy.percentage + '%');
        console.log('   Financial Impact:', dispute.financialImpact.difference);

        if (dispute.status !== 'pending') throw new Error(`Expected pending, got ${dispute.status}`);

        // 6. Verify Shipment Updates
        const updatedShipment = await Shipment.findById(shipment._id);
        if (!updatedShipment?.weightDispute?.exists) throw new Error('Shipment not flagged with dispute');

        // 7. Resolve Dispute (Shipcrowd Favor -> Debit Wallet)
        console.log('⏳ Waiting for transactions to settle...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('⚖️ Resolving Dispute...');
        await WeightDisputeResolutionService.resolveDispute(
            (dispute._id as mongoose.Types.ObjectId).toString(),
            'system',
            {
                outcome: 'Shipcrowd_favor',
                deductionAmount: dispute.financialImpact.difference,
                reasonCode: 'VERIFIED_SCAN',
                notes: 'Verification Script Resolution'
            }
        );

        // 8. Verify Wallet Debit
        const finalDispute = await WeightDispute.findById(dispute._id);
        console.log('✅ Dispute Resolved Status:', finalDispute?.status);

        const allCompanyTx = await WalletTransaction.find({ company: companyId });

        const transactions = allCompanyTx.filter(t => {
            const ref = t.reference as any;
            return ref && ref.externalId === finalDispute?.disputeId;
        });

        if (transactions.length === 0) throw new Error('No wallet transaction found for deduction');

        const debitTx = transactions.find(t => t.type === 'debit');
        if (!debitTx) throw new Error('Debit transaction not found');

        console.log('✅ Wallet Debited:', debitTx.amount);

        // Cleanup
        await Shipment.deleteMany({ companyId });
        await WeightDispute.deleteMany({ companyId });
        await WalletTransaction.deleteMany({ companyId });
        await Company.deleteMany({ _id: companyId });

        console.log('✅ VERIFICATION SUCCESSFUL: Weight Dispute System Functional!');

    } catch (error: any) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

verifyWeightDispute();
