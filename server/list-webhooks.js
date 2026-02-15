/**
 * Script to list all registered Shopify webhooks
 * Run: node list-webhooks.js
 */

require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');

async function listWebhooks() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get ShopifyStore model
    const ShopifyStore = require('./src/infrastructure/database/mongoose/models/marketplaces/shopify/shopify-store.model').default;

    // Find the store
    const store = await ShopifyStore.findOne({ shopDomain: 'helix-testing-store-1.myshopify.com' }).select('+accessToken');

    if (!store) {
      console.log('❌ Store not found');
      process.exit(1);
    }

    console.log('📋 Store:', store.shopDomain);
    console.log('🔑 Store ID:', store._id);
    console.log('\n🔍 Fetching webhooks from Shopify API...\n');

    // Decrypt access token
    const accessToken = store.decryptAccessToken();

    // Fetch webhooks from Shopify
    const response = await axios.get(
      `https://${store.shopDomain}/admin/api/2024-01/webhooks.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    const webhooks = response.data.webhooks;

    console.log(`📊 Total webhooks registered: ${webhooks.length}\n`);

    webhooks.forEach((webhook, i) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Webhook ${i + 1}:`);
      console.log(`  ID: ${webhook.id}`);
      console.log(`  Topic: ${webhook.topic}`);
      console.log(`  Address: ${webhook.address}`);
      console.log(`  Format: ${webhook.format}`);
      console.log(`  Created: ${webhook.created_at}`);
      console.log(`  Updated: ${webhook.updated_at}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

listWebhooks();
