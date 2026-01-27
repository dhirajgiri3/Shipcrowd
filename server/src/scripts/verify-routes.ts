
import axios from 'axios';

const API_URL = 'http://127.0.0.1:5005/api/v1';

// Routes to verify
const routes = [
    // Phase 1: Aliases
    { method: 'GET', path: '/admin/ndr/events', name: 'NDR Events (Alias)' },
    { method: 'GET', path: '/weight-discrepancies', name: 'Weight Disputes (Alias)' },
    { method: 'GET', path: '/admin/profit/orders', name: 'Profit Analytics (Alias)' },
    { method: 'GET', path: '/admin/intelligence/insights', name: 'Intelligence (Alias)' },

    // Phase 2: Adapters
    { method: 'POST', path: '/orders/ORDER_123/ship', name: 'Ship Order Adapter' },
    { method: 'GET', path: '/orders/courier-rates', name: 'Courier Rates Adapter' },
    { method: 'POST', path: '/courier/recommendations', name: 'Courier Recommendations' },

    // Phase 3: Wrappers
    { method: 'GET', path: '/finance/financials/overview', name: 'Financial Overview' },
    { method: 'GET', path: '/finance/financials/transactions', name: 'Financial Transactions' },
    { method: 'GET', path: '/finance/billing/overview', name: 'Billing Overview' },
    { method: 'GET', path: '/finance/billing/recharges/pending', name: 'Pending Recharges' },

    // Phase 4: New Features
    { method: 'GET', path: '/admin/seller-health', name: 'Seller Health' },
    { method: 'GET', path: '/seller/bank-accounts', name: 'Bank Accounts' },
];

async function verifyRoutes() {
    console.log('\n🚀 Starting API Route Verification...\n');

    let passed = 0;
    let failed = 0;

    for (const route of routes) {
        try {
            await axios({
                method: route.method,
                url: `${API_URL}${route.path}`,
                validateStatus: () => true // Accept all status codes to avoid throwing
            });
        } catch (err: any) {
            // We expect 401 Unauthorized because we aren't sending a token
            // We ONLY want to check that it is NOT 404 Not Found
            // If the server is down, we might get connection refused
            if (err.code === 'ECONNREFUSED') {
                console.log('❌ Server is not running! Please start the server first.');
                process.exit(1);
            }
        }
    }

    // Now actually perform the checks with a fresh request since try/catch block above was just to catch network errors
    // We want to inspect the response status

    for (const route of routes) {
        try {
            const res = await axios({
                method: route.method,
                url: `${API_URL}${route.path}`,
                validateStatus: () => true
            });

            const is404 = res.status === 404;
            // 401 is GOOD (means route exists but needs auth)
            // 200 is GOOD (means route exists and works without auth - unlikely but ok)
            // 400 is GOOD (means route exists but bad request)
            // 500 is GOOD (means route exists but crashed)

            // Only 404 is BAD (means route doesn't exist)

            if (!is404) {
                console.log(`✅ [${res.status}] ${route.name} (${route.path}) - Route Exists`);
                passed++;
            } else {
                console.log(`❌ [404] ${route.name} (${route.path}) - Route NOT Found`);
                failed++;
            }

        } catch (error: any) {
            console.log(`❌ ERROR ${route.name}: ${error.message}`);
            failed++;
        }
    }

    console.log('\n=============================================');
    if (failed === 0) {
        console.log(`🎉 SUCCESS: All ${passed} routes verified! 100% Coverage.`);
        process.exit(0);
    } else {
        console.log(`⚠️ FAILURE: ${failed} routes missing.`);
        process.exit(1);
    }
}

verifyRoutes();
