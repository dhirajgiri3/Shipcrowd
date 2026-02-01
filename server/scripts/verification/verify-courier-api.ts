
import axios from 'axios';
import 'dotenv/config';

// Configuration
const BASE_URL = 'http://localhost:5005/api/v1';
const TEST_EMAIL = 'admin1@Shipcrowd.com';
const TEST_PASSWORD = 'Admin@123456';

/**
 * Get Authentication Cookies
 */
async function getAuthCookies() {
    try {
        console.log('Logging in...');
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });

        console.log('Login successful');
        // Extract cookies from response headers
        const setCookieHeaders = response.headers['set-cookie'];
        if (!setCookieHeaders) {
            console.warn('WARNING: No Set-Cookie header received. This might be due to CORS or secure cookie settings.');
            // Proceeding might fail if auth depends on cookies, but let's return what we have
            return [];
        }
        return setCookieHeaders;
    } catch (error: any) {
        console.error('Login failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

/**
 * Verify Courier API
 */
async function verifyCourierApi() {
    try {
        const cookies = await getAuthCookies();
        const headers: any = {};

        if (cookies && cookies.length > 0) {
            headers.Cookie = cookies;
        }

        console.log('\n--- Verifying GET /courier ---');
        const listResponse = await axios.get(`${BASE_URL}/courier`, { headers });
        console.log(`Status: ${listResponse.status}`);
        console.log(`Couriers found: ${listResponse.data.data.length}`);

        if (listResponse.data.data.length > 0) {
            console.log('Sample Courier:', listResponse.data.data[0].name);
        } else {
            console.warn('WARNING: No couriers found. Did you run the seeder?');
        }

        console.log('\n--- Verifying GET /courier/velocity ---');
        try {
            const detailResponse = await axios.get(`${BASE_URL}/courier/velocity`, { headers });
            console.log(`Status: ${detailResponse.status}`);
            console.log(`Courier Name: ${detailResponse.data.data.name}`);
            console.log(`Integrated: ${detailResponse.data.data.apiIntegrated}`);
        } catch (error: any) {
            console.error('GET /courier/velocity failed:', error.response?.data || error.message);
        }

    } catch (error: any) {
        console.error('Verification failed:', error.response?.data || error.message);
    }
}

verifyCourierApi();
