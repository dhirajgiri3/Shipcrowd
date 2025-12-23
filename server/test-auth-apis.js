const axios = require('axios');

const BASE_URL = 'http://localhost:5005/api/v1';

// Configure axios to include Postman user agent for development testing
axios.defaults.headers.common['User-Agent'] = 'PostmanRuntime/7.32.3';

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
};

// Test data storage
const testData = {
    testEmail: `test${Date.now()}@example.com`,
    testPassword: 'TestPassword@123!',
    testName: 'Test User',
    verificationToken: null,
    resetToken: null,
    accessToken: null,
    refreshToken: null,
    userId: null,
    csrfToken: null,
};

// Helper functions
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(60));
    log(title, 'cyan');
    console.log('='.repeat(60));
}

function logTest(testName) {
    log(`\n🧪 Testing: ${testName}`, 'blue');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'magenta');
}

// Extract cookies from response
function extractCookies(response) {
    const cookies = {};
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
        setCookieHeader.forEach((cookie) => {
            const [nameValue] = cookie.split(';');
            const [name, value] = nameValue.split('=');
            cookies[name.trim()] = value;
        });
    }
    return cookies;
}

// Test functions
async function testRegister() {
    logTest('POST /auth/register');
    try {
        const response = await axios.post(`${BASE_URL}/auth/register`, {
            email: testData.testEmail,
            password: testData.testPassword,
            name: testData.testName,
            role: 'seller',
        });

        if (response.status === 201) {
            logSuccess(`Registration successful: ${response.data.message}`);
            logInfo(`Response: ${JSON.stringify(response.data, null, 2)}`);
            return true;
        }
    } catch (error) {
        if (error.response) {
            logError(`Registration failed: ${error.response.data.message || error.message}`);
            logInfo(`Status: ${error.response.status}`);
            logInfo(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
            logError(`Registration failed: ${error.message}`);
        }
        return false;
    }
}

async function testLoginWithUnverifiedEmail() {
    logTest('POST /auth/login (with unverified email - should fail)');
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            email: testData.testEmail,
            password: testData.testPassword,
        });

        logWarning('Login succeeded with unverified email (this should not happen)');
        return false;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            logSuccess('Login correctly rejected for unverified email');
            logInfo(`Message: ${error.response.data.message}`);
            return true;
        } else {
            logError(`Unexpected error: ${error.message}`);
            return false;
        }
    }
}

async function testResendVerification() {
    logTest('POST /auth/resend-verification');
    try {
        const response = await axios.post(`${BASE_URL}/auth/resend-verification`, {
            email: testData.testEmail,
        });

        if (response.status === 200) {
            logSuccess('Verification email resend requested');
            logInfo(`Message: ${response.data.message}`);
            logWarning('NOTE: Check database for verification token to continue testing');
            return true;
        }
    } catch (error) {
        logError(`Resend verification failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testCheckPasswordStrength() {
    logTest('POST /auth/check-password-strength');
    try {
        const response = await axios.post(`${BASE_URL}/auth/check-password-strength`, {
            password: testData.testPassword,
            email: testData.testEmail,
            name: testData.testName,
        });

        if (response.status === 200) {
            logSuccess('Password strength check successful');
            logInfo(`Score: ${response.data.score}`);
            logInfo(`Is Strong: ${response.data.isStrong}`);
            logInfo(`Feedback: ${JSON.stringify(response.data.feedback, null, 2)}`);
            return true;
        }
    } catch (error) {
        logError(`Password strength check failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testRequestPasswordReset() {
    logTest('POST /auth/reset-password');
    try {
        const response = await axios.post(`${BASE_URL}/auth/reset-password`, {
            email: testData.testEmail,
        });

        if (response.status === 200) {
            logSuccess('Password reset requested');
            logInfo(`Message: ${response.data.message}`);
            logWarning('NOTE: Check database for reset token to test password reset');
            return true;
        }
    } catch (error) {
        logError(`Password reset request failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testLoginWithInvalidCredentials() {
    logTest('POST /auth/login (with invalid password)');
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            email: testData.testEmail,
            password: 'WrongPassword123!',
        });

        logWarning('Login succeeded with wrong password (this should not happen)');
        return false;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            logSuccess('Login correctly rejected for invalid credentials');
            logInfo(`Message: ${error.response.data.message}`);
            return true;
        } else {
            logError(`Unexpected error: ${error.message}`);
            return false;
        }
    }
}

async function testRefreshTokenWithoutToken() {
    logTest('POST /auth/refresh (without token - should fail)');
    try {
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {});

        logWarning('Refresh succeeded without token (this should not happen)');
        return false;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            logSuccess('Refresh correctly rejected without token');
            logInfo(`Message: ${error.response.data.message}`);
            return true;
        } else {
            logError(`Unexpected error: ${error.message}`);
            return false;
        }
    }
}

async function testGetMeWithoutAuth() {
    logTest('GET /auth/me (without authentication - should fail)');
    try {
        const response = await axios.get(`${BASE_URL}/auth/me`);

        logWarning('Get me succeeded without auth (this should not happen)');
        return false;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            logSuccess('Get me correctly rejected without authentication');
            logInfo(`Message: ${error.response.data.message}`);
            return true;
        } else {
            logError(`Unexpected error: ${error.message}`);
            return false;
        }
    }
}

async function testInvalidEmailFormat() {
    logTest('POST /auth/register (with invalid email format)');
    try {
        const response = await axios.post(`${BASE_URL}/auth/register`, {
            email: 'invalid-email',
            password: testData.testPassword,
            name: testData.testName,
        });

        logWarning('Registration succeeded with invalid email (this should not happen)');
        return false;
    } catch (error) {
        if (error.response && error.response.status === 400) {
            logSuccess('Registration correctly rejected for invalid email format');
            logInfo(`Message: ${error.response.data.message}`);
            return true;
        } else {
            logError(`Unexpected error: ${error.message}`);
            return false;
        }
    }
}

async function testWeakPassword() {
    logTest('POST /auth/register (with weak password)');
    try {
        const response = await axios.post(`${BASE_URL}/auth/register`, {
            email: `weak${Date.now()}@example.com`,
            password: '123',
            name: testData.testName,
        });

        logWarning('Registration succeeded with weak password (this should not happen)');
        return false;
    } catch (error) {
        if (error.response && error.response.status === 400) {
            logSuccess('Registration correctly rejected for weak password');
            logInfo(`Message: ${error.response.data.message}`);
            return true;
        } else {
            logError(`Unexpected error: ${error.message}`);
            return false;
        }
    }
}

async function testDuplicateRegistration() {
    logTest('POST /auth/register (with duplicate email)');
    try {
        const response = await axios.post(`${BASE_URL}/auth/register`, {
            email: testData.testEmail,
            password: testData.testPassword,
            name: testData.testName,
        });

        logWarning('Duplicate registration succeeded (this should not happen)');
        return false;
    } catch (error) {
        if (error.response && error.response.status === 400) {
            logSuccess('Registration correctly rejected for duplicate email');
            logInfo(`Message: ${error.response.data.message}`);
            return true;
        } else {
            logError(`Unexpected error: ${error.message}`);
            return false;
        }
    }
}

// Main test runner
async function runAllTests() {
    logSection('🚀 Starting Shipcrowd Auth API Tests');
    logInfo(`Base URL: ${BASE_URL}`);
    logInfo(`Test Email: ${testData.testEmail}`);
    logInfo(`Test Password: ${testData.testPassword}`);

    const results = {
        total: 0,
        passed: 0,
        failed: 0,
    };

    const tests = [
        { name: 'Register New User', fn: testRegister },
        { name: 'Login with Unverified Email', fn: testLoginWithUnverifiedEmail },
        { name: 'Resend Verification Email', fn: testResendVerification },
        { name: 'Check Password Strength', fn: testCheckPasswordStrength },
        { name: 'Request Password Reset', fn: testRequestPasswordReset },
        { name: 'Login with Invalid Credentials', fn: testLoginWithInvalidCredentials },
        { name: 'Refresh Token without Token', fn: testRefreshTokenWithoutToken },
        { name: 'Get Me without Authentication', fn: testGetMeWithoutAuth },
        { name: 'Register with Invalid Email', fn: testInvalidEmailFormat },
        { name: 'Register with Weak Password', fn: testWeakPassword },
        { name: 'Duplicate Registration', fn: testDuplicateRegistration },
    ];

    for (const test of tests) {
        results.total++;
        try {
            const passed = await test.fn();
            if (passed) {
                results.passed++;
            } else {
                results.failed++;
            }
        } catch (error) {
            results.failed++;
            logError(`Test "${test.name}" threw an error: ${error.message}`);
        }
        // Add a small delay between tests
        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Summary
    logSection('📊 Test Summary');
    log(`Total Tests: ${results.total}`, 'cyan');
    log(`Passed: ${results.passed}`, 'green');
    log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
    log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(2)}%`, 'cyan');

    logSection('⚠️  Important Notes');
    logWarning('To complete full testing, you need to:');
    logWarning('1. Manually verify the email by checking the database for verification token');
    logWarning('2. Test the verify-email endpoint with the token');
    logWarning('3. Test login with verified account');
    logWarning('4. Test authenticated endpoints (me, logout, change-password, etc.)');
    logWarning('5. Test password reset flow with the reset token from database');
    logWarning('6. Test OAuth flows (Google login)');

    logSection('🔍 Next Steps for Manual Testing');
    logInfo('1. Connect to MongoDB and find the user with email: ' + testData.testEmail);
    logInfo('2. Get the verificationToken from security.verificationToken field');
    logInfo('3. Use the token to test POST /auth/verify-email');
    logInfo('4. After verification, test POST /auth/login with correct credentials');
    logInfo('5. Use the returned tokens to test authenticated endpoints');

    console.log('\n');
}

// Run the tests
runAllTests().catch((error) => {
    console.error('Test runner failed:', error);
    process.exit(1);
});
