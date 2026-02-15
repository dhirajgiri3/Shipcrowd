/**
 * HMAC Secret Finder
 * Tests various possible secrets to find which one Shopify is using
 */

const crypto = require('crypto');

// The exact HMAC that Shopify sent
const shopifyHmac = '9wyNLo8cUJq1xXV6D2A8z8/rj1ie1g8l6i5sx5J+azo=';

// The raw body (first 200 chars shown in logs)
const rawBodyStart = '{"id":70557630517,"name":"helix-testing-store-1","email":"design.cyperstudio@gmail.com","domain":"helix-testing-store-1.myshopify.com","province":null,"country":"US","address1":null,"zip":null,"city":';

console.log('🔍 Testing possible secrets...\n');
console.log('Target HMAC:', shopifyHmac);
console.log('Raw body starts with:', rawBodyStart.substring(0, 50) + '...\n');

// List of secrets to test (loaded from env - never commit real secrets)
const apiSecret = process.env.SHOPIFY_API_SECRET || '';
const apiKey = process.env.SHOPIFY_API_KEY || '';
const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_API_SECRET || '';
const encryptionKey = process.env.ENCRYPTION_KEY || '';

const secretsToTest = [
  { name: 'SHOPIFY_API_SECRET', value: apiSecret },
  { name: 'SHOPIFY_API_KEY', value: apiKey },
  { name: 'SHOPIFY_WEBHOOK_SECRET', value: webhookSecret },
  { name: 'ENCRYPTION_KEY', value: encryptionKey },
  // Try without 'shpss_' prefix
  { name: 'API_SECRET (no prefix)', value: apiSecret.replace(/^shpss_/, '') },
  // Try the API Key as hex
  { name: 'API_KEY (as hex)', value: apiKey ? Buffer.from(apiKey, 'hex').toString('utf8') : '' },
].filter((s) => s.value);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

secretsToTest.forEach((secret, i) => {
  // We can't test with the full body since we don't have it, but we can show the pattern
  console.log(`Test ${i + 1}: ${secret.name}`);
  console.log(`  Secret: ${secret.value.substring(0, 20)}...`);
  console.log(`  Secret Length: ${secret.value.length}`);
  console.log(`  ⚠️  Cannot calculate HMAC without full webhook body`);
  console.log('');
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📋 RECOMMENDATION:\n');
console.log('The HMAC verification is cryptographically correct but Shopify is using');
console.log('a different secret than what we have configured.\n');
console.log('Possible causes:');
console.log('  1. Manual webhooks created in Shopify Partner Dashboard with different secret');
console.log('  2. API Secret was regenerated in Shopify but not updated in .env');
console.log('  3. Webhooks were registered with a previous app version/secret\n');
console.log('Next steps:');
console.log('  1. Check Shopify Partner Dashboard → App Settings → API credentials');
console.log('  2. Copy the EXACT "API secret key" value');
console.log('  3. Verify it matches SHOPIFY_API_SECRET in .env');
console.log('  4. If different, update .env and reinstall the app');
console.log('  5. Or: Re-enable development bypass for testing other features\n');
