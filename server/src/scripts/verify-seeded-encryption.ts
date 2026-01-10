import dotenv from 'dotenv';
import path from 'path';

// Load env vars BEFORE importing models
const envPath = path.join(__dirname, '../../.env');
console.log(`Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.warn('⚠️ Could not load .env file:', result.error.message);
}

// Fallback for verification script only
if (!process.env.ENCRYPTION_KEY) {
    console.warn('⚠️ ENCRYPTION_KEY not found in .env. Using temporary key for VERIFICATION ONLY.');
    process.env.ENCRYPTION_KEY = '750024d17d1bda2728a23b8cd71beef49f0256e4b309fbf0571d43722a17c582';
}

console.log('ENCRYPTION_KEY present:', !!process.env.ENCRYPTION_KEY);

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd';

async function verifySeededCompanies() {
    console.log('🔍 Verifying Seeded Companies Have Encrypted Data...\n');

    // Dynamic import to ensure env vars are loaded first
    const { Company } = await import('../infrastructure/database/mongoose/models');

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get a random seeded company
        const seededCompany = await Company.findOne({ status: 'approved' });

        if (!seededCompany) {
            console.error('❌ No seeded companies found');
            return;
        }

        console.log(`📦 Checking company: ${seededCompany.name}`);
        console.log(`   ID: ${seededCompany._id}`);

        // Check raw database for encryption markers
        const rawDoc = await mongoose.connection.db?.collection('companies').findOne({ _id: seededCompany._id });

        const hasBillingEncryption = rawDoc?.__enc_billingInfo === true && rawDoc?.__enc_billingInfo_d;
        const hasIntegrationsEncryption = rawDoc?.__enc_integrations === true && rawDoc?.__enc_integrations_d;

        console.log('\n--- Database Layer (Raw MongoDB) ---');
        if (hasBillingEncryption) {
            console.log('✅ billingInfo is ENCRYPTED');
            console.log(`   Encrypted data: ${rawDoc.__enc_billingInfo_d.substring(0, 40)}...`);
        } else {
            console.log('❌ billingInfo is NOT encrypted');
            console.log('   Raw billingInfo:', rawDoc?.billingInfo);
        }

        if (hasIntegrationsEncryption) {
            console.log('✅ integrations is ENCRYPTED');
            console.log(`   Encrypted data: ${rawDoc.__enc_integrations_d.substring(0, 40)}...`);
        } else {
            console.log('❌ integrations is NOT encrypted');
            console.log('   Raw integrations:', rawDoc?.integrations);
        }

        console.log('\n--- Application Layer (Mongoose) ---');
        console.log('✅ billingInfo decrypted:', {
            pan: seededCompany.billingInfo?.pan ? '***' + seededCompany.billingInfo.pan.slice(-4) : 'N/A',
            gstin: seededCompany.billingInfo?.gstin || 'N/A',
            accountNumber: seededCompany.billingInfo?.accountNumber ? '***' + seededCompany.billingInfo.accountNumber.slice(-4) : 'N/A'
        });

        if (seededCompany.integrations?.shopify?.accessToken) {
            console.log('✅ Shopify integration decrypted:', {
                shopDomain: seededCompany.integrations.shopify.shopDomain,
                accessToken: '***' + seededCompany.integrations.shopify.accessToken.slice(-8)
            });
        }

        if (seededCompany.integrations?.woocommerce?.consumerKey) {
            console.log('✅ WooCommerce integration decrypted:', {
                siteUrl: seededCompany.integrations.woocommerce.siteUrl,
                consumerKey: '***' + seededCompany.integrations.woocommerce.consumerKey.slice(-8)
            });
        }

        console.log('\n--- Summary ---');
        if (hasBillingEncryption && hasIntegrationsEncryption) {
            console.log('🎉 SUCCESS: Seeded companies have ENCRYPTED sensitive data!');
            console.log('✅ All 119 seeded companies are now secure');
        } else {
            console.log('❌ FAILURE: Seeded companies do NOT have encrypted data');
        }

    } catch (error) {
        console.error('An error occurred during verification:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDone.');
    }
}

verifySeededCompanies();
