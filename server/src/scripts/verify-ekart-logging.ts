
import dotenv from 'dotenv';
// Load env vars BEFORE any other imports
dotenv.config();

// Define process.env.ENCRYPTION_KEY if missing (fallback for test)
if (!process.env.ENCRYPTION_KEY) {
    process.env.ENCRYPTION_KEY = '750024d17d1bda2728a23b4b309fbf0571d43722a17c5820123456789EFGH';
}
if (!process.env.JWT_ACCESS_SECRET) {
    process.env.JWT_ACCESS_SECRET = 'test-secret';
}

async function testLogging() {
    console.log('--- Starting Ekart Logging Verification ---');

    try {
        const mongoose = (await import('mongoose')).default;
        const { EkartProvider } = await import('../infrastructure/external/couriers/ekart/ekart.provider');

        // Mock credentials to force a request (or fail auth, which works for testing logs)
        const provider = new EkartProvider(new mongoose.Types.ObjectId(), {
            baseUrl: 'https://httpbin.org', // Use echo server to guarantee success/fail control
            clientId: 'test-client',
            username: 'test-user',
            password: 'test-pass'
        });

        console.log('1. Testing Successful API Call (Serviceability)...');
        try {
            // We mocked baseUrl to httpbin, so this will 404 on the specific ekart path,
            // BUT the interceptor should capture the request and the 404 response.
            // Wait, checkServiceability calls `${baseUrl}${EKART_ENDPOINTS.SERVICEABILITY}/${pincode}`
            await provider.checkServiceability('110001');
        } catch (e) {
            console.log('Caught expected error (404/Auth) - Check logs above for "Ekart API Failure"');
        }

        console.log('\n2. Testing Circuit Breaker Alert...');
        // Force multiple failures to trigger circuit breaker
        // We need 5 failures (default threshold)
        for (let i = 0; i < 6; i++) {
            try {
                await provider.checkServiceability('110001');
            } catch (e) {
                // Ignore
            }
        }
        console.log('Check logs above for "ALERT: Ekart Circuit Breaker OPENING"');

    } catch (error) {
        console.error('Script Error:', error);
    }
}

testLogging().catch(console.error);
