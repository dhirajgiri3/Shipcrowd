// Quick test script for Shopify order sync
// Run with: node test-shopify-sync.js

const storeId = '6990ed99a31caad464cfd704';
const baseUrl = 'http://localhost:5005';

console.log('🧪 Testing Shopify Integration...\n');
console.log(`Store ID: ${storeId}`);
console.log(`Shop: helix-testing-store-1.myshopify.com\n`);

// Test 1: Diagnose endpoint
console.log('📊 Step 1: Running diagnostics...');
console.log('➡️  Open your browser at http://localhost:3000');
console.log('➡️  Open Console (F12)');
console.log('➡️  Paste this:\n');

console.log(`fetch('${baseUrl}/api/v1/integrations/shopify/stores/${storeId}/diagnose', {
  method: 'GET',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
})
.then(res => res.json())
.then(data => {
  console.log('=== DIAGNOSTICS ===');
  if (data.success) {
    const d = data.data;
    console.log(\`✅ Shop: \${d.shopInfo.name}\`);
    console.log(\`\${d.hasRequiredScopes ? '✅' : '❌'} All scopes: \${d.hasRequiredScopes}\`);
    console.log(\`\${d.canReadOrders ? '✅' : '❌'} Can read orders: \${d.canReadOrders}\`);
    if (d.missingScopes.length > 0) {
      console.log('⚠️  Missing scopes:', d.missingScopes);
    }
  } else {
    console.log('❌ Error:', data.message);
  }
});
`);

console.log('\n\n📦 Step 2: Test order sync...');
console.log('➡️  After diagnostics pass, run this:\n');

console.log(`fetch('${baseUrl}/api/v1/integrations/shopify/stores/${storeId}/sync/orders', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
})
.then(res => res.json())
.then(data => {
  console.log('=== ORDER SYNC ===');
  if (data.success) {
    console.log(\`✅ Processed: \${data.data.itemsProcessed}\`);
    console.log(\`✅ Synced: \${data.data.itemsSynced}\`);
    console.log(\`⏩ Skipped: \${data.data.itemsSkipped}\`);
    console.log(\`❌ Failed: \${data.data.itemsFailed}\`);
    if (data.data.itemsFailed > 0) {
      console.log('Errors:', data.data.errors);
    }
  } else {
    console.log('❌ Error:', data.message);
  }
});
`);

console.log('\n\n✅ What to expect:');
console.log('  - Diagnostics should show: canReadOrders: true');
console.log('  - Order sync should complete without 403 errors');
console.log('  - Orders should appear in your Orders page\n');

console.log('🔍 Monitor logs in another terminal:');
console.log('  cd server && tail -f logs/combined.log | grep -E "order sync|Shopify"\n');
