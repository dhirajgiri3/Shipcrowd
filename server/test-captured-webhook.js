/**
 * Test Captured Webhook - Find the Correct Secret
 *
 * This script tests a captured webhook against various possible secrets
 * to find which one Shopify is actually using to sign the webhooks.
 */

require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const captureFile = path.join(__dirname, 'failed-webhook-capture.json');

// Load secrets from env - never commit real secrets
const apiSecret = process.env.SHOPIFY_API_SECRET || '';
const apiKey = process.env.SHOPIFY_API_KEY || '';
const encryptionKey = process.env.ENCRYPTION_KEY || '';

if (!fs.existsSync(captureFile)) {
  console.error('❌ No captured webhook found!');
  console.error('Please trigger a webhook first (it will be auto-saved on HMAC failure).');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(captureFile, 'utf8'));

console.log('\n🔍 TESTING CAPTURED WEBHOOK\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Timestamp:', data.timestamp);
console.log('Topic:', data.topic);
console.log('Shop Domain:', data.shopDomain);
console.log('Webhook ID:', data.webhookId);
console.log('Raw Body Length:', data.rawBodyLength, 'bytes');
console.log('\nTarget HMAC (from Shopify):', data.hmacReceived);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Decode the raw body from base64
const rawBody = Buffer.from(data.rawBodyBase64, 'base64');

// Comprehensive list of secrets to test (from env)
const secretsToTest = [
  { name: 'SHOPIFY_API_SECRET (current)', value: apiSecret },
  { name: 'SHOPIFY_API_KEY (current)', value: apiKey },
  { name: 'API_SECRET without prefix', value: apiSecret.replace(/^shpss_/, '') },
  { name: 'ENCRYPTION_KEY', value: encryptionKey },
  { name: 'Empty string', value: '' },
].filter((s) => s.name === 'Empty string' || s.value);

let foundMatch = false;
let matchingSecret = null;

console.log('Testing', secretsToTest.length, 'possible secrets...\n');

secretsToTest.forEach((secret, index) => {
  const calculated = crypto
    .createHmac('sha256', secret.value)
    .update(rawBody)
    .digest('base64');

  const matches = calculated === data.hmacReceived;

  console.log(`Test ${index + 1}: ${secret.name}`);
  console.log(`  Secret Value: ${secret.value.substring(0, 30)}${secret.value.length > 30 ? '...' : ''}`);
  console.log(`  Calculated HMAC: ${calculated}`);
  console.log(`  Match: ${matches ? '✅ YES! FOUND IT!' : '❌ NO'}`);
  console.log('');

  if (matches) {
    foundMatch = true;
    matchingSecret = secret;
  }
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (foundMatch) {
  console.log('🎉 SUCCESS! MATCHING SECRET FOUND!\n');
  console.log('Secret Name:', matchingSecret.name);
  console.log('Secret Value:', matchingSecret.value);
  console.log('\nUpdate your .env file:');
  console.log(`SHOPIFY_WEBHOOK_SECRET=${matchingSecret.value}`);
  console.log(`SHOPIFY_API_SECRET=${matchingSecret.value}`);
  console.log('\nThen restart your server and test again!\n');
} else {
  console.log('❌ NO MATCH FOUND\n');
  console.log('None of the tested secrets match what Shopify is using.');
  console.log('\nPossible reasons:');
  console.log('  1. The API Secret in Shopify Partner Dashboard is different');
  console.log('  2. Webhooks were created manually with a custom secret');
  console.log('  3. The API Secret was regenerated and needs to be updated\n');
  console.log('Next steps:');
  console.log('  1. Go to Shopify Partner Dashboard');
  console.log('  2. Navigate to: Apps → Your App → Configuration → API credentials');
  console.log('  3. Copy the exact "API secret key" value');
  console.log('  4. Add it to this script and run again');
  console.log('  5. Or regenerate the API secret and reinstall the app\n');
}

process.exit(foundMatch ? 0 : 1);
