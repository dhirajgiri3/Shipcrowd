import dotenv from 'dotenv';
import path from 'path';

// Load env vars BEFORE importing models
const envPath = path.join(__dirname, '../../.env');
console.log(`Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.warn('⚠️ Could not load .env file:', result.error.message);
}

// Fallback for verification script only (if user hasn't set it yet)
if (!process.env.ENCRYPTION_KEY) {
    console.warn('⚠️ ENCRYPTION_KEY not found in .env. Using temporary key for VERIFICATION ONLY.');
    process.env.ENCRYPTION_KEY = '750024d17d1bda2728a23b8cd71beef49f0256e4b309fbf0571d43722a17c582';
}

console.log('ENCRYPTION_KEY present:', !!process.env.ENCRYPTION_KEY);

import mongoose from 'mongoose';
// Don't import models here statically
// import { Company, Order } from '../infrastructure/database/mongoose/models';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd';

async function runVerification() {
    console.log('🔍 Starting Verification of Week 1 Fixes...\n');

    // Dynamically import models AFTER env vars are loaded
    const { Company, Order } = await import('../infrastructure/database/mongoose/models');

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Verify Encryption (Company Model)
        console.log('\n--- Verifying Credential Encryption ---');
        if (!process.env.ENCRYPTION_KEY) {
            console.warn('⚠️ ENCRYPTION_KEY not found in .env. Skipping encryption test.');
        } else {
            const sensitivePan = 'ABCDE1234F';

            // Clean up previous test
            await Company.deleteOne({ name: 'Encryption Test Co' });

            // Create Company using new + save to ensure middleware triggers
            const company = new Company({
                name: 'Encryption Test Co',
                address: {
                    line1: 'Test St',
                    city: 'Test City',
                    state: 'Test State',
                    postalCode: '110001',
                    country: 'India'
                },
                billingInfo: {
                    pan: sensitivePan // Should be encrypted
                }
            });
            await company.save();
            console.log('✅ Created test company with sensitive PAN');

            // Check Raw DB (Should be encrypted)
            const rawDoc = await mongoose.connection.db?.collection('companies').findOne({ _id: company._id });

            // Check for encryption markers (mongoose-field-encryption stores encrypted data with __enc_ prefix)
            const hasBillingEncryption = rawDoc?.__enc_billingInfo === true && rawDoc?.__enc_billingInfo_d;
            const hasIntegrationsEncryption = rawDoc?.__enc_integrations === true && rawDoc?.__enc_integrations_d;

            if (hasBillingEncryption && hasIntegrationsEncryption) {
                console.log('✅ SUCCESS: Data is encrypted in database layer');
                console.log(`   billingInfo encrypted: ${!!hasBillingEncryption}`);
                console.log(`   integrations encrypted: ${!!hasIntegrationsEncryption}`);
            } else {
                console.error('❌ FAILURE: Data is NOT encrypted in database layer');
                console.log('   Full Raw Doc:', JSON.stringify(rawDoc, null, 2));
            }

            // Check Mongoose Retrieval (Should be decrypted)
            const fetchedCompany = await Company.findById(company._id);
            if (fetchedCompany?.billingInfo?.pan === sensitivePan) {
                console.log('✅ SUCCESS: Data is decrypted correctly on retrieval');
            } else {
                console.error('❌ FAILURE: Data is NOT decrypted correctly');
                console.log('   Expected PAN:', sensitivePan);
                console.log('   Actual PAN:', fetchedCompany?.billingInfo?.pan);
            }

            // Cleanup
            await Company.deleteOne({ _id: company._id });
        }

        // 2. Verify Optimistic Locking (Order Model)
        console.log('\n--- Verifying Optimistic Locking ---');

        // Clean up
        await Order.deleteOne({ orderNumber: 'LOCK-TEST-001' });

        // Create Order
        const order = await Order.create({
            orderNumber: 'LOCK-TEST-001',
            companyId: new mongoose.Types.ObjectId(), // Dummy ID
            customerInfo: {
                name: 'Test Customer',
                phone: '9999999999',
                address: { line1: 'Test', city: 'Test', state: 'Test', postalCode: '110001' }
            },
            products: [{ name: 'Test Product', quantity: 1, price: 100 }],
            totals: { subtotal: 100, tax: 0, shipping: 0, discount: 0, total: 100 },
            currentStatus: 'pending'
        });
        console.log('✅ Created test order for locking test');

        // Fetch two instances of the same document
        const doc1 = await Order.findById(order._id);
        const doc2 = await Order.findById(order._id);

        if (doc1 && doc2) {
            // Update doc1
            doc1.currentStatus = 'processing';
            await doc1.save();
            console.log('✅ Updated doc1 (v0 -> v1)');

            // Try to update doc2 (which is still v0)
            try {
                doc2.currentStatus = 'shipped';
                await doc2.save();
                console.error('❌ FAILURE: Optimistic locking failed (should have thrown VersionError)');
            } catch (error: any) {
                if (error.name === 'VersionError') {
                    console.log('✅ SUCCESS: Optimistic locking caught concurrency conflict (VersionError)');
                } else {
                    console.error(`❌ FAILURE: Caught unexpected error: ${error.name}`);
                }
            }
        }

        // Cleanup
        await Order.deleteOne({ _id: order._id });

        // 3. Isolated Plugin Test (Debug Step)
        console.log('\n--- Verifying Isolated Encryption Plugin ---');
        const { fieldEncryption } = await import('mongoose-field-encryption');
        const crypto = await import('crypto');

        const TestSchema = new mongoose.Schema({
            secret: String,
            nested: {
                inner: {
                    secret: String
                }
            }
        });

        TestSchema.plugin(fieldEncryption, {
            fields: ['nested.inner'], // Encrypt sub-object
            secret: '750024d17d1bda2728a23b8cd71beef49f0256e4b309fbf0571d43722a17c582',
            saltGenerator: () => crypto.randomBytes(8).toString('hex'),
            encryptOnSave: true,
            decryptOnFind: true,
        });

        const TestModel = mongoose.model('EncryptionTest', TestSchema);

        await TestModel.deleteMany({});

        const testDoc = await TestModel.create({
            secret: 'PLAIN_TEXT',
            nested: { secret: 'NESTED_PLAIN' }
        });

        const rawTestDoc = await mongoose.connection.db?.collection('encryptiontests').findOne({ _id: testDoc._id });
        console.log('Raw Test Doc:', rawTestDoc);

        if (rawTestDoc?.secret !== 'PLAIN_TEXT' && rawTestDoc?.nested?.secret !== 'NESTED_PLAIN') {
            console.log('✅ Isolated test: Encryption WORKED');
        } else {
            console.log('❌ Isolated test: Encryption FAILED');
        }
        await TestModel.deleteMany({});

    } catch (error) {
        console.error('An error occurred during verification:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDone.');
    }
}

runVerification();
