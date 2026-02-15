/**
 * Temporary webhook body capture script
 * This will help us find the correct secret by testing against the actual webhook body
 * Loads secrets from .env - never commit real secrets
 */

require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');

const app = express();

// Capture raw body as Buffer
app.use(express.raw({
  type: '*/*',
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Temporary capture endpoint
app.post('/capture-webhook', (req, res) => {
  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  const topic = req.headers['x-shopify-topic'];
  const shopDomain = req.headers['x-shopify-shop-domain'];

  console.log('\n🎯 WEBHOOK CAPTURED!\n');
  console.log('Topic:', topic);
  console.log('Shop Domain:', shopDomain);
  console.log('HMAC from Shopify:', hmacHeader);
  console.log('Raw Body Length:', req.rawBody.length);

  // Save the raw body to a file
  const captureData = {
    hmac: hmacHeader,
    topic,
    shopDomain,
    rawBodyBase64: req.rawBody.toString('base64'),
    rawBodyUtf8: req.rawBody.toString('utf8'),
  };

  fs.writeFileSync('captured-webhook.json', JSON.stringify(captureData, null, 2));
  console.log('\n✅ Webhook saved to captured-webhook.json\n');

  // Test all possible secrets
  console.log('🔍 Testing secrets...\n');

  const apiSecret = process.env.SHOPIFY_API_SECRET || '';
  const apiKey = process.env.SHOPIFY_API_KEY || '';
  const encryptionKey = process.env.ENCRYPTION_KEY || '';
  const secrets = [
    { name: 'SHOPIFY_API_SECRET', value: apiSecret },
    { name: 'SHOPIFY_API_KEY', value: apiKey },
    { name: 'API_SECRET (no prefix)', value: apiSecret.replace(/^shpss_/, '') },
    { name: 'ENCRYPTION_KEY', value: encryptionKey },
  ].filter((s) => s.value);

  let foundMatch = false;

  secrets.forEach(secret => {
    const calculated = crypto
      .createHmac('sha256', secret.value)
      .update(req.rawBody)
      .digest('base64');

    const matches = calculated === hmacHeader;

    console.log(`${matches ? '✅' : '❌'} ${secret.name}`);
    console.log(`   Calculated: ${calculated.substring(0, 20)}...`);
    if (matches) {
      console.log(`\n🎉 MATCH FOUND! Use this secret: ${secret.value}\n`);
      foundMatch = true;
    }
  });

  if (!foundMatch) {
    console.log('\n❌ No match found with known secrets.');
    console.log('The webhook body has been saved. You can manually test other secrets.\n');
  }

  res.status(200).json({ received: true });
});

app.listen(6006, () => {
  console.log('\n🚀 Webhook capture server running on port 6006');
  console.log('\nInstructions:');
  console.log('1. Update your ngrok to forward to port 6006 instead of 5005');
  console.log('2. Or update webhook URL in Shopify to point to this port');
  console.log('3. Uninstall the Shopify app');
  console.log('4. The webhook will be captured and tested against all secrets\n');
});
