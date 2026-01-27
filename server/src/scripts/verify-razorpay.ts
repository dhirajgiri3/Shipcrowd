
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { RazorpayPayoutProvider } from '../infrastructure/payment/razorpay/razorpay-payout.provider';
import logger from '../shared/logger/winston.logger';

async function verifyRazorpay() {
    console.log('----------------------------------------');
    console.log('Starting Razorpay Verification');
    console.log('----------------------------------------');

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const accountNumber = process.env.RAZORPAY_ACCOUNT_NUMBER;

    console.log(`Checking Environment Variables:`);
    console.log(`RAZORPAY_KEY_ID: ${keyId ? '✅ Present' : '❌ Missing'}`);
    console.log(`RAZORPAY_KEY_SECRET: ${keySecret ? '✅ Present' : '❌ Missing'}`);
    console.log(`RAZORPAY_ACCOUNT_NUMBER: ${accountNumber ? '✅ Present' : '❌ Missing'}`);

    if (!keyId || !keySecret) {
        console.error('❌ Critical: Missing Razorpay credentials in .env');
        process.exit(1);
    }

    try {
        console.log('\nInitializing RazorpayPayoutProvider...');
        const razorpayProvider = new RazorpayPayoutProvider();

        console.log('\nPopulating Dummy Data for Validation Check...');
        // We will try to validate a bank account. This doesn't require funds but does check if the API is reachable and credentials are valid enough to perform basic checks.
        // It's a method on the provider: validateBankAccount

        const testBankDetails = {
            accountNumber: '1234567890',
            ifscCode: 'SBIN0001234' // Dummy SBI IFSC
        };

        console.log(`Testing validateBankAccount with: ${JSON.stringify(testBankDetails)}`);

        const validationResult = await razorpayProvider.validateBankAccount(testBankDetails);

        console.log('Validation Result:', validationResult);

        if (validationResult) {
            console.log('✅ Razorpay Provider initialized and method executed successfully (Logic Check).');
            console.log('Note: validateBankAccount in the provider currently is a local regex check. Let\'s try a real API call if possible.');
        }

        // To test real API connectivity without making a payout, we can try to fetch a non-existent payout or contact.
        // Or create a contact (which is a safe operation).

        console.log('\nAttempting Real API Call: Creating a Test Contact...');
        const testContact = {
            name: 'Test Verify Script',
            referenceId: `verify_${Date.now()}`
        };

        const contact = await razorpayProvider.createContact(testContact.name, testContact.referenceId);
        console.log('✅ Contact Created Successfully!');
        console.log('Contact ID:', contact.id);
        console.log('Contact Entity:', contact);

        console.log('\n----------------------------------------');
        console.log('✅ RAZORPAY INTEGRATION VERIFIED');
        console.log('----------------------------------------');

    } catch (error: any) {
        console.error('\n❌ Razorpay Verification Failed:');
        console.error(error.message);
        console.error(error);
        process.exit(1);
    }
}

// Execute immediately
verifyRazorpay().catch(err => console.error(err));

export default verifyRazorpay;
