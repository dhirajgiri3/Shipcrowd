import dotenv from 'dotenv';
import path from 'path';

// Initialize environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { RazorpayPayoutProvider } from '../infrastructure/payment/razorpay/razorpay-payout.provider';
import logger from '../shared/logger/winston.logger';

async function comprehensiveRazorpayTest() {
    console.log('========================================');
    console.log('COMPREHENSIVE RAZORPAY TESTING');
    console.log('========================================\n');

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const accountNumber = process.env.RAZORPAY_ACCOUNT_NUMBER;

    let testsPassed = 0;
    let testsFailed = 0;

    // TEST 1: Environment Variables Check
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 1: Environment Variables');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (keyId && keySecret) {
        console.log(`✅ PASS: Razorpay credentials present`);
        console.log(`   - RAZORPAY_KEY_ID: ${keyId ? '✓' : '✗'}`);
        console.log(`   - RAZORPAY_KEY_SECRET: ${keySecret ? '✓' : '✗'}`);
        console.log(`   - RAZORPAY_ACCOUNT_NUMBER: ${accountNumber ? '✓' : '✗'}`);
        testsPassed++;
    } else {
        console.error(`❌ FAIL: Missing Razorpay credentials`);
        testsFailed++;
        process.exit(1);
    }
    console.log('');

    try {
        const razorpayProvider = new RazorpayPayoutProvider();

        // TEST 2: Bank Account Validation - Valid IFSC
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 2: Bank Account Validation - Valid IFSC');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            const validationResult = await razorpayProvider.validateBankAccount({
                accountNumber: '1234567890',
                ifscCode: 'SBIN0001234'
            });

            if (validationResult.valid) {
                console.log('✅ PASS: Valid IFSC accepted');
                testsPassed++;
            } else {
                console.error('❌ FAIL: Valid IFSC rejected');
                testsFailed++;
            }
        } catch (error: any) {
            console.error(`❌ FAIL: ${error.message}`);
            testsFailed++;
        }
        console.log('');

        // TEST 3: Bank Account Validation - Invalid IFSC Format
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 3: Bank Account Validation - Invalid IFSC');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            const validationResult = await razorpayProvider.validateBankAccount({
                accountNumber: '1234567890',
                ifscCode: 'INVALID123' // Invalid format
            });

            if (!validationResult.valid) {
                console.log('✅ PASS: Invalid IFSC rejected');
                testsPassed++;
            } else {
                console.error('❌ FAIL: Invalid IFSC should be rejected');
                testsFailed++;
            }
        } catch (error: any) {
            console.error(`❌ FAIL: ${error.message}`);
            testsFailed++;
        }
        console.log('');

        // TEST 4: Bank Account Validation - Invalid Account Number
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 4: Bank Account Validation - Invalid Account');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            const validationResult = await razorpayProvider.validateBankAccount({
                accountNumber: '123', // Too short
                ifscCode: 'SBIN0001234'
            });

            if (!validationResult.valid) {
                console.log('✅ PASS: Invalid account number rejected');
                testsPassed++;
            } else {
                console.error('❌ FAIL: Invalid account number should be rejected');
                testsFailed++;
            }
        } catch (error: any) {
            console.error(`❌ FAIL: ${error.message}`);
            testsFailed++;
        }
        console.log('');

        // TEST 5: Create Contact - Success
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 5: Create Contact - API Call');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            const contact = await razorpayProvider.createContact(
                'Comprehensive Test Contact',
                `test_comprehensive_${Date.now()}`
            );

            if (contact && contact.id && contact.entity === 'contact') {
                console.log('✅ PASS: Contact created successfully');
                console.log(`   - Contact ID: ${contact.id}`);
                console.log(`   - Name: ${contact.name}`);
                testsPassed++;
            } else {
                console.error('❌ FAIL: Contact creation returned invalid response');
                testsFailed++;
            }
        } catch (error: any) {
            console.error(`❌ FAIL: ${error.message}`);
            testsFailed++;
        }
        console.log('');

        // TEST 6: Webhook Signature Validation - Valid
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 6: Webhook Signature Validation - Valid');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            const crypto = await import('crypto');
            const testPayload = { test: 'data' };
            const testSecret = 'test_webhook_secret';

            const validSignature = crypto.default
                .createHmac('sha256', testSecret)
                .update(JSON.stringify(testPayload))
                .digest('hex');

            try {
                const result = await razorpayProvider.handleWebhook(
                    testPayload,
                    validSignature,
                    testSecret
                );

                if (result) {
                    console.log('✅ PASS: Valid webhook signature accepted');
                    testsPassed++;
                } else {
                    console.error('❌ FAIL: Valid signature should be accepted');
                    testsFailed++;
                }
            } catch (error: any) {
                console.error(`❌ FAIL: ${error.message}`);
                testsFailed++;
            }
        } catch (error: any) {
            console.error(`❌ FAIL: ${error.message}`);
            testsFailed++;
        }
        console.log('');

        // TEST 7: Webhook Signature Validation - Invalid
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 7: Webhook Signature Validation - Invalid');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            const testPayload = { test: 'data' };
            const testSecret = 'test_webhook_secret';
            const invalidSignature = 'invalid_signature_here';

            try {
                await razorpayProvider.handleWebhook(
                    testPayload,
                    invalidSignature,
                    testSecret
                );

                console.error('❌ FAIL: Invalid signature should be rejected');
                testsFailed++;
            } catch (error: any) {
                if (error.message.includes('Invalid webhook signature')) {
                    console.log('✅ PASS: Invalid webhook signature rejected');
                    testsPassed++;
                } else {
                    console.error(`❌ FAIL: Wrong error - ${error.message}`);
                    testsFailed++;
                }
            }
        } catch (error: any) {
            console.error(`❌ FAIL: ${error.message}`);
            testsFailed++;
        }
        console.log('');

        // TEST 8: Contact Idempotency (Strict)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 8: Contact Idempotency (Strict)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            // Need a unique ref for this run
            const uniqueRef = `strict_idempotency_${Date.now()}`;

            console.log('1. Creating initial contact...');
            const contact1 = await razorpayProvider.createContact(
                'Idempotency Test User',
                uniqueRef
            );

            console.log('2. Attempting to create duplicate with same reference_id...');
            const contact2 = await razorpayProvider.createContact(
                'Idempotency Test User',
                uniqueRef
            );

            if (contact1.id === contact2.id) {
                console.log(`✅ PASS: Idempotency maintained. Returned same Contact ID: ${contact1.id}`);
                testsPassed++;
            } else {
                console.error(`❌ FAIL: Idempotency broken. Got different IDs: ${contact1.id} vs ${contact2.id}`);
                testsFailed++;
            }
        } catch (error: any) {
            console.error(`❌ FAIL: ${error.message}`);
            testsFailed++;
        }
        console.log('');

        // TEST 9: Fund Account Creation (Strict Integration)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 9: Fund Account Creation');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            // We need a valid contact first
            const ref = `fund_account_test_${Date.now()}`;
            const contact = await razorpayProvider.createContact('Fund Account Test', ref);

            if (!contact || !contact.id) throw new Error('Failed to create prerequisite contact');

            console.log(`Using Contact ID: ${contact.id}`);

            // Create Fund Account (Bank Account)
            // Signature: createFundAccount(bankDetails, salesRepId, contactId)
            const fa = await razorpayProvider.createFundAccount(
                {
                    accountNumber: '112143112143',
                    ifscCode: 'SBIN0001234',
                    accountHolderName: 'Fund Account Test User'
                },
                'system_test_rep', // salesRepId
                contact.id // contactId
            );

            if (fa && fa.id && fa.id.startsWith('fa_')) {
                console.log(`✅ PASS: Fund Account created successfully`);
                console.log(`   - Fund Account ID: ${fa.id}`);
                console.log(`   - Active: ${fa.active}`);
                testsPassed++;
            } else {
                console.error(`❌ FAIL: Invalid Fund Account response`);
                testsFailed++;
            }

        } catch (error: any) {
            console.error(`❌ FAIL: ${error.message}`);
            testsFailed++;
        }
        console.log('');

        // Final Summary
        console.log('========================================');
        console.log('TEST SUMMARY');
        console.log('========================================');
        console.log(`✅ Tests Passed: ${testsPassed}`);
        console.log(`❌ Tests Failed: ${testsFailed}`);
        console.log(`📊 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
        console.log('========================================\n');

        if (testsFailed > 0) {
            process.exit(1);
        }

    } catch (error: any) {
        console.error('\n❌ COMPREHENSIVE RAZORPAY TEST FAILED:');
        console.error(error.message);
        console.error(error);
        process.exit(1);
    }
}

// Execute immediately
comprehensiveRazorpayTest().catch(err => console.error(err));

export default comprehensiveRazorpayTest;
