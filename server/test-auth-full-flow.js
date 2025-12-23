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
    cookies: {},
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

// Helper to create axios config with cookies
function getConfigWithCookies() {
    const cookieString = Object.entries(testData.cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
    return {
        headers: {
            Cookie: cookieString,
        },
    };
}

// Test functions
async function testRegister() {
    logTest('POST /auth/register - Register New User');
    try {
        const response = await axios.post(`${BASE_URL}/auth/register`, {
            email: testData.testEmail,
            password: testData.testPassword,
            name: testData.testName,
            role: 'seller',
        });

        if (response.status === 201) {
            logSuccess(`Registration successful: ${response.data.message}`);
            return true;
        }
    } catch (error) {
        logError(`Registration failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function getVerificationToken() {
    logTest('Query MongoDB for Verification Token');
    try {
        const { spawn } = require('child_process');

        return new Promise((resolve, reject) => {
            const mongosh = spawn('mongosh', [
                'shipcrowd',
                '--eval',
                `db.users.findOne({email: '${testData.testEmail}'}, {'security.verificationToken': 1})`,
                '--quiet'
            ]);

            let output = '';
            let errorOutput = '';

            mongosh.stdout.on('data', (data) => {
                output += data.toString();
            });

            mongosh.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            mongosh.on('close', (code) => {
                if (code === 0) {
                    try {
                        // Parse the output to extract the token
                        const match = output.match(/verificationToken:\s*'([^']+)'/);
                        if (match && match[1]) {
                            testData.verificationToken = match[1];
                            logSuccess(`Verification token retrieved: ${testData.verificationToken.substring(0, 20)}...`);
                            resolve(true);
                        } else {
                            logError('Could not extract verification token from database');
                            resolve(false);
                        }
                    } catch (e) {
                        logError(`Error parsing database output: ${e.message}`);
                        resolve(false);
                    }
                } else {
                    logError(`MongoDB query failed: ${errorOutput}`);
                    resolve(false);
                }
            });
        });
    } catch (error) {
        logError(`Failed to get verification token: ${error.message}`);
        return false;
    }
}

async function testVerifyEmail() {
    logTest('POST /auth/verify-email - Verify Email with Token');
    if (!testData.verificationToken) {
        logWarning('Skipping: No verification token available');
        return false;
    }

    try {
        const response = await axios.post(`${BASE_URL}/auth/verify-email`, {
            token: testData.verificationToken,
        });

        if (response.status === 200) {
            logSuccess(`Email verified successfully: ${response.data.message}`);
            return true;
        }
    } catch (error) {
        logError(`Email verification failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testLoginAfterVerification() {
    logTest('POST /auth/login - Login After Email Verification');
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            email: testData.testEmail,
            password: testData.testPassword,
            rememberMe: true,
        });

        if (response.status === 200) {
            // Extract cookies
            testData.cookies = extractCookies(response);
            testData.accessToken = testData.cookies.accessToken;
            testData.refreshToken = testData.cookies.refreshToken;
            testData.userId = response.data.user.id;

            logSuccess('Login successful');
            logInfo(`User: ${response.data.user.name} (${response.data.user.email})`);
            logInfo(`Role: ${response.data.user.role}`);
            logInfo(`Tokens received: accessToken=${!!testData.accessToken}, refreshToken=${!!testData.refreshToken}`);
            return true;
        }
    } catch (error) {
        logError(`Login failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testGetMe() {
    logTest('GET /auth/me - Get Current User');
    if (!testData.accessToken) {
        logWarning('Skipping: No access token available');
        return false;
    }

    try {
        const response = await axios.get(`${BASE_URL}/auth/me`, getConfigWithCookies());

        if (response.status === 200) {
            logSuccess('User profile retrieved successfully');
            logInfo(`Name: ${response.data.user.name}`);
            logInfo(`Email: ${response.data.user.email}`);
            logInfo(`Role: ${response.data.user.role}`);
            return true;
        }
    } catch (error) {
        logError(`Get me failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testRefreshToken() {
    logTest('POST /auth/refresh - Refresh Access Token');
    if (!testData.refreshToken) {
        logWarning('Skipping: No refresh token available');
        return false;
    }

    try {
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {}, getConfigWithCookies());

        if (response.status === 200) {
            // Update cookies with new tokens
            const newCookies = extractCookies(response);
            testData.cookies = { ...testData.cookies, ...newCookies };
            testData.accessToken = testData.cookies.accessToken;

            logSuccess('Token refreshed successfully');
            logInfo(`New access token received`);
            return true;
        }
    } catch (error) {
        logError(`Token refresh failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testChangePassword() {
    logTest('POST /auth/change-password - Change Password');
    if (!testData.accessToken) {
        logWarning('Skipping: No access token available');
        return false;
    }

    const newPassword = 'NewTestPassword@123!';

    try {
        const response = await axios.post(
            `${BASE_URL}/auth/change-password`,
            {
                currentPassword: testData.testPassword,
                newPassword: newPassword,
            },
            getConfigWithCookies()
        );

        if (response.status === 200) {
            testData.testPassword = newPassword; // Update password for future tests
            logSuccess('Password changed successfully');
            return true;
        }
    } catch (error) {
        logError(`Password change failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testLoginWithNewPassword() {
    logTest('POST /auth/login - Login with New Password');
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            email: testData.testEmail,
            password: testData.testPassword, // This is now the new password
        });

        if (response.status === 200) {
            // Update cookies
            testData.cookies = extractCookies(response);
            testData.accessToken = testData.cookies.accessToken;
            testData.refreshToken = testData.cookies.refreshToken;

            logSuccess('Login with new password successful');
            return true;
        }
    } catch (error) {
        logError(`Login with new password failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function getResetToken() {
    logTest('Query MongoDB for Password Reset Token');
    try {
        const { spawn } = require('child_process');

        return new Promise((resolve, reject) => {
            const mongosh = spawn('mongosh', [
                'shipcrowd',
                '--eval',
                `db.users.findOne({email: '${testData.testEmail}'}, {'security.resetToken': 1})`,
                '--quiet'
            ]);

            let output = '';
            let errorOutput = '';

            mongosh.stdout.on('data', (data) => {
                output += data.toString();
            });

            mongosh.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            mongosh.on('close', (code) => {
                if (code === 0) {
                    try {
                        const match = output.match(/resetToken:\s*'([^']+)'/);
                        if (match && match[1]) {
                            testData.resetToken = match[1];
                            logSuccess(`Reset token retrieved: ${testData.resetToken.substring(0, 20)}...`);
                            resolve(true);
                        } else {
                            logError('Could not extract reset token from database');
                            resolve(false);
                        }
                    } catch (e) {
                        logError(`Error parsing database output: ${e.message}`);
                        resolve(false);
                    }
                } else {
                    logError(`MongoDB query failed: ${errorOutput}`);
                    resolve(false);
                }
            });
        });
    } catch (error) {
        logError(`Failed to get reset token: ${error.message}`);
        return false;
    }
}

async function testRequestPasswordReset() {
    logTest('POST /auth/reset-password - Request Password Reset');
    try {
        const response = await axios.post(`${BASE_URL}/auth/reset-password`, {
            email: testData.testEmail,
        });

        if (response.status === 200) {
            logSuccess('Password reset requested');
            return true;
        }
    } catch (error) {
        logError(`Password reset request failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testResetPassword() {
    logTest('POST /auth/reset-password/confirm - Reset Password with Token');
    if (!testData.resetToken) {
        logWarning('Skipping: No reset token available');
        return false;
    }

    const resetPassword = 'ResetPassword@123!';

    try {
        const response = await axios.post(`${BASE_URL}/auth/reset-password/confirm`, {
            token: testData.resetToken,
            password: resetPassword,
        });

        if (response.status === 200) {
            testData.testPassword = resetPassword; // Update password
            logSuccess('Password reset successfully');
            return true;
        }
    } catch (error) {
        logError(`Password reset failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testLoginAfterReset() {
    logTest('POST /auth/login - Login After Password Reset');
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            email: testData.testEmail,
            password: testData.testPassword,
        });

        if (response.status === 200) {
            testData.cookies = extractCookies(response);
            testData.accessToken = testData.cookies.accessToken;
            testData.refreshToken = testData.cookies.refreshToken;

            logSuccess('Login after reset successful');
            return true;
        }
    } catch (error) {
        logError(`Login after reset failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testLogout() {
    logTest('POST /auth/logout - Logout User');
    if (!testData.accessToken) {
        logWarning('Skipping: No access token available');
        return false;
    }

    try {
        const response = await axios.post(`${BASE_URL}/auth/logout`, {}, getConfigWithCookies());

        if (response.status === 200) {
            logSuccess('Logout successful');
            // Clear tokens
            testData.accessToken = null;
            testData.refreshToken = null;
            testData.cookies = {};
            return true;
        }
    } catch (error) {
        logError(`Logout failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testGetMeAfterLogout() {
    logTest('GET /auth/me - Verify Logged Out (should fail)');
    try {
        const response = await axios.get(`${BASE_URL}/auth/me`, getConfigWithCookies());
        logWarning('Get me succeeded after logout (this should not happen)');
        return false;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            logSuccess('Get me correctly rejected after logout');
            return true;
        } else {
            logError(`Unexpected error: ${error.message}`);
            return false;
        }
    }
}

// Main test runner
async function runFullAuthFlow() {
    logSection('🚀 Starting Shipcrowd FULL Auth API Tests');
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
        { name: 'Get Verification Token from DB', fn: getVerificationToken },
        { name: 'Verify Email', fn: testVerifyEmail },
        { name: 'Login After Verification', fn: testLoginAfterVerification },
        { name: 'Get Current User', fn: testGetMe },
        { name: 'Refresh Access Token', fn: testRefreshToken },
        { name: 'Get User After Token Refresh', fn: testGetMe },
        { name: 'Change Password', fn: testChangePassword },
        { name: 'Login with New Password', fn: testLoginWithNewPassword },
        { name: 'Request Password Reset', fn: testRequestPasswordReset },
        { name: 'Get Reset Token from DB', fn: getResetToken },
        { name: 'Reset Password with Token', fn: testResetPassword },
        { name: 'Login After Password Reset', fn: testLoginAfterReset },
        { name: 'Logout', fn: testLogout },
        { name: 'Verify Logout (Get Me should fail)', fn: testGetMeAfterLogout },
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

    if (results.failed === 0) {
        logSection('🎉 All Tests Passed!');
        logSuccess('All authentication endpoints are working correctly!');
    } else {
        logSection('⚠️  Some Tests Failed');
        logWarning('Please review the failed tests above');
    }

    console.log('\n');
}

// Run the tests
runFullAuthFlow().catch((error) => {
    console.error('Test runner failed:', error);
    process.exit(1);
});
