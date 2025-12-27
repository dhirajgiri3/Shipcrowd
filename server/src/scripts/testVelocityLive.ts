/**
 * Velocity Shipfast Live API Testing Script
 *
 * Tests all API endpoints with live credentials
 * Usage: npm run test:velocity:live
 *
 * NOTE: This is a simplified test script for production deployment verification
 */

import mongoose from 'mongoose';
import logger from '../shared/logger/winston.logger';
import Integration from '../infrastructure/database/mongoose/models/Integration';
import { VelocityShipfastProvider } from '../infrastructure/external/couriers/velocity/VelocityShipfastProvider';
import { CourierShipmentData, CourierRateRequest } from '../infrastructure/external/couriers/base/CourierAdapter';

// Test configuration
const TEST_COMPANY_ID = new mongoose.Types.ObjectId();
const TEST_CONFIG = {
  originPincode: '400001',  // Mumbai
  destinationPincode: '110001',  // Delhi
  packageWeight: 1.5,  // kg
};

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Connect to MongoDB
 */
async function connectDB(): Promise<void> {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/shipcrowd-test';
    await mongoose.connect(mongoUri);
    console.log(`${colors.green}✓${colors.reset} Connected to MongoDB`);
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} MongoDB connection failed:`, error);
    process.exit(1);
  }
}

/**
 * Setup test integration
 */
async function setupIntegration(): Promise<void> {
  try {
    let integration = await Integration.findOne({
      companyId: TEST_COMPANY_ID,
      provider: 'velocity-shipfast'
    });

    if (!integration) {
      integration = await Integration.create({
        companyId: TEST_COMPANY_ID,
        provider: 'velocity-shipfast',
        settings: {
          isActive: true,
          testMode: false
        },
        credentials: {
          username: process.env.VELOCITY_USERNAME || '+918860606061',
          password: process.env.VELOCITY_PASSWORD || 'Velocity@123'
        }
      });
      console.log(`${colors.green}✓${colors.reset} Created test integration`);
    } else {
      console.log(`${colors.green}✓${colors.reset} Using existing integration`);
    }
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Integration setup failed:`, error);
    throw error;
  }
}

/**
 * Test 1: Authentication
 */
async function testAuthentication(provider: VelocityShipfastProvider): Promise<boolean> {
  console.log(`\n${colors.cyan}━━━ Test 1: Authentication ━━━${colors.reset}`);

  try {
    const startTime = Date.now();
    const token = await provider['auth'].authenticate();
    const duration = Date.now() - startTime;

    console.log(`${colors.green}✓${colors.reset} Authentication successful`);
    console.log(`  Token: ${token.substring(0, 20)}...`);
    console.log(`  Duration: ${duration}ms`);

    return true;
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Authentication failed:`, error);
    return false;
  }
}

/**
 * Test 2: Check Serviceability
 */
async function testServiceability(provider: VelocityShipfastProvider): Promise<boolean> {
  console.log(`\n${colors.cyan}━━━ Test 2: Serviceability Check ━━━${colors.reset}`);

  try {
    const startTime = Date.now();
    const result = await provider.checkServiceability(TEST_CONFIG.destinationPincode);
    const duration = Date.now() - startTime;

    console.log(`${colors.green}✓${colors.reset} Serviceability check successful`);
    console.log(`  Serviceable: ${result}`);
    console.log(`  Duration: ${duration}ms`);

    return true;
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Serviceability check failed:`, error);
    return false;
  }
}

/**
 * Test 3: Get Rates
 */
async function testGetRates(provider: VelocityShipfastProvider): Promise<boolean> {
  console.log(`\n${colors.cyan}━━━ Test 3: Rate Calculation ━━━${colors.reset}`);

  try {
    const startTime = Date.now();
    const rateRequest: CourierRateRequest = {
      origin: { pincode: TEST_CONFIG.originPincode },
      destination: { pincode: TEST_CONFIG.destinationPincode },
      package: {
        weight: TEST_CONFIG.packageWeight,
        length: 20,
        width: 15,
        height: 10
      },
      paymentMode: 'prepaid'
    };

    const rates = await provider.getRates(rateRequest);
    const duration = Date.now() - startTime;

    console.log(`${colors.green}✓${colors.reset} Rate calculation successful`);
    console.log(`  Available carriers: ${rates.length}`);

    rates.forEach((rate, index) => {
      const days = rate.estimatedDeliveryDays || 'N/A';
      console.log(`  ${index + 1}. ${rate.serviceType || 'Standard'}: ₹${rate.total} (${days} days)`);
    });

    console.log(`  Duration: ${duration}ms`);

    return true;
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Rate calculation failed:`, error);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests(): Promise<void> {
  console.log(`\n${colors.blue}╔════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║  Velocity Shipfast Live API Testing       ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Base URL: https://shazam.velocity.in`);
  console.log(`Username: ${process.env.VELOCITY_USERNAME || '+918860606061'}\n`);

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  try {
    // Connect to database
    await connectDB();

    // Setup integration
    await setupIntegration();

    // Initialize provider
    const provider = new VelocityShipfastProvider(TEST_COMPANY_ID);

    // Run tests
    const tests = [
      { name: 'Authentication', fn: () => testAuthentication(provider) },
      { name: 'Serviceability', fn: () => testServiceability(provider) },
      { name: 'Rate Calculation', fn: () => testGetRates(provider) },
    ];

    for (const test of tests) {
      results.total++;
      if (await test.fn()) {
        results.passed++;
      } else {
        results.failed++;
      }
    }

    // Print summary
    console.log(`\n${colors.blue}╔════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.blue}║  Test Summary                              ║${colors.reset}`);
    console.log(`${colors.blue}╚════════════════════════════════════════════╝${colors.reset}\n`);

    console.log(`Total Tests: ${results.total}`);
    console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);

    const successRate = ((results.passed / results.total) * 100).toFixed(1);
    console.log(`Success Rate: ${successRate}%\n`);

    if (results.failed === 0) {
      console.log(`${colors.green}✓ All tests passed! Velocity integration is working correctly.${colors.reset}\n`);
    } else {
      console.log(`${colors.yellow}⚠ Some tests failed. Please review the errors above.${colors.reset}\n`);
    }

  } catch (error) {
    console.error(`\n${colors.red}✗ Test execution failed:${colors.reset}`, error);
  } finally {
    await mongoose.connection.close();
    console.log(`${colors.green}✓${colors.reset} Disconnected from MongoDB\n`);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runTests };
