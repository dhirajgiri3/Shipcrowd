/**
 * Local Webhook Testing Script with ngrok
 *
 * Tests webhook functionality locally using ngrok tunnel
 * Usage: npm run test:webhook:local
 */

import crypto from 'crypto';
import axios from 'axios';
import logger from '../shared/logger/winston.logger';

const WEBHOOK_SECRET = process.env.VELOCITY_WEBHOOK_SECRET || 'default-webhook-secret-change-me';

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
 * Generate webhook signature
 */
function generateSignature(payload: string, timestamp: string): string {
  const signaturePayload = `${timestamp}.${payload}`;
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(signaturePayload)
    .digest('hex');
}

/**
 * Send test webhook
 */
async function sendTestWebhook(
  url: string,
  payload: any,
  testName: string
): Promise<{ success: boolean; response?: any; error?: string }> {
  try {
    const timestamp = Date.now().toString();
    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString, timestamp);

    const startTime = Date.now();
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-velocity-signature': signature,
        'x-velocity-timestamp': timestamp,
        'x-velocity-event-type': payload.event_type
      }
    });
    const duration = Date.now() - startTime;

    console.log(`${colors.green}✓${colors.reset} ${testName}`);
    console.log(`  Status: ${response.status}`);
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Response:`, JSON.stringify(response.data, null, 2));

    return { success: true, response: response.data };
  } catch (error: any) {
    console.error(`${colors.red}✗${colors.reset} ${testName}`);
    console.error(`  Error: ${error.message}`);
    if (error.response) {
      console.error(`  Response:`, error.response.data);
    }
    return { success: false, error: error.message };
  }
}

/**
 * Test webhooks
 */
async function runWebhookTests(): Promise<void> {
  console.log(`\n${colors.blue}╔════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║  Velocity Webhook Local Testing           ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════╝${colors.reset}\n`);

  // Get webhook URL from environment or use default
  const baseUrl = process.env.WEBHOOK_TEST_URL || 'http://localhost:5000';
  const webhookUrl = `${baseUrl}/api/v1/webhooks/velocity`;

  console.log(`Webhook URL: ${webhookUrl}`);
  console.log(`Webhook Secret: ${WEBHOOK_SECRET.substring(0, 10)}...\n`);

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  // Test 1: Health Check
  console.log(`\n${colors.cyan}━━━ Test 1: Health Check ━━━${colors.reset}`);
  try {
    const response = await axios.get(`${baseUrl}/api/v1/webhooks/velocity/health`);
    console.log(`${colors.green}✓${colors.reset} Health check passed`);
    console.log(`  Response:`, response.data);
    results.total++;
    results.passed++;
  } catch (error: any) {
    console.error(`${colors.red}✗${colors.reset} Health check failed:`, error.message);
    results.total++;
    results.failed++;
  }

  // Test 2: Status Update - Picked Up
  console.log(`\n${colors.cyan}━━━ Test 2: Status Update (Picked Up) ━━━${colors.reset}`);
  results.total++;
  const test2 = await sendTestWebhook(
    webhookUrl,
    {
      event_type: 'SHIPMENT_STATUS_UPDATE',
      timestamp: new Date().toISOString(),
      shipment_data: {
        awb: 'VEL123456789',
        order_id: 'TEST-ORDER-001',
        status: 'Picked Up',
        status_code: 'PKP',
        courier_name: 'Velocity Express',
        current_location: 'Mumbai Hub',
        updated_at: new Date().toISOString(),
        description: 'Package picked up from warehouse'
      },
      tracking_event: {
        status: 'PKP',
        location: 'Mumbai Hub',
        timestamp: new Date().toISOString(),
        description: 'Package picked up from warehouse'
      }
    },
    'Status Update - Picked Up'
  );
  test2.success ? results.passed++ : results.failed++;

  // Test 3: Status Update - In Transit
  console.log(`\n${colors.cyan}━━━ Test 3: Status Update (In Transit) ━━━${colors.reset}`);
  results.total++;
  const test3 = await sendTestWebhook(
    webhookUrl,
    {
      event_type: 'SHIPMENT_STATUS_UPDATE',
      timestamp: new Date().toISOString(),
      shipment_data: {
        awb: 'VEL123456789',
        order_id: 'TEST-ORDER-001',
        status: 'In Transit',
        status_code: 'IT',
        courier_name: 'Velocity Express',
        current_location: 'Delhi Hub',
        updated_at: new Date().toISOString(),
        description: 'Package in transit to destination'
      }
    },
    'Status Update - In Transit'
  );
  test3.success ? results.passed++ : results.failed++;

  // Test 4: Status Update - Delivered
  console.log(`\n${colors.cyan}━━━ Test 4: Status Update (Delivered) ━━━${colors.reset}`);
  results.total++;
  const test4 = await sendTestWebhook(
    webhookUrl,
    {
      event_type: 'SHIPMENT_STATUS_UPDATE',
      timestamp: new Date().toISOString(),
      shipment_data: {
        awb: 'VEL123456789',
        order_id: 'TEST-ORDER-001',
        status: 'Delivered',
        status_code: 'DEL',
        courier_name: 'Velocity Express',
        current_location: 'Customer Location',
        updated_at: new Date().toISOString(),
        description: 'Package delivered successfully'
      }
    },
    'Status Update - Delivered'
  );
  test4.success ? results.passed++ : results.failed++;

  // Test 5: Status Update - NDR
  console.log(`\n${colors.cyan}━━━ Test 5: Status Update (NDR) ━━━${colors.reset}`);
  results.total++;
  const test5 = await sendTestWebhook(
    webhookUrl,
    {
      event_type: 'SHIPMENT_STATUS_UPDATE',
      timestamp: new Date().toISOString(),
      shipment_data: {
        awb: 'VEL987654321',
        order_id: 'TEST-ORDER-002',
        status: 'Non Delivery Report',
        status_code: 'NDR',
        courier_name: 'Velocity Express',
        current_location: 'Mumbai Hub',
        updated_at: new Date().toISOString(),
        description: 'Customer not available'
      }
    },
    'Status Update - NDR'
  );
  test5.success ? results.passed++ : results.failed++;

  // Test 6: Invalid Signature
  console.log(`\n${colors.cyan}━━━ Test 6: Invalid Signature (Should Fail) ━━━${colors.reset}`);
  results.total++;
  try {
    const timestamp = Date.now().toString();
    const payload = {
      event_type: 'SHIPMENT_STATUS_UPDATE',
      timestamp: new Date().toISOString(),
      shipment_data: {
        awb: 'VEL123456789',
        order_id: 'TEST-ORDER-001',
        status: 'In Transit',
        status_code: 'IT',
        courier_name: 'Velocity Express',
        updated_at: new Date().toISOString()
      }
    };

    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-velocity-signature': 'invalid-signature',
        'x-velocity-timestamp': timestamp,
        'x-velocity-event-type': 'SHIPMENT_STATUS_UPDATE'
      },
      validateStatus: () => true // Don't throw on any status
    });

    if (response.status === 401) {
      console.log(`${colors.green}✓${colors.reset} Invalid signature correctly rejected (401)`);
      results.passed++;
    } else {
      console.error(`${colors.red}✗${colors.reset} Invalid signature not rejected (got ${response.status})`);
      results.failed++;
    }
  } catch (error: any) {
    console.error(`${colors.red}✗${colors.reset} Test failed:`, error.message);
    results.failed++;
  }

  // Test 7: Old Timestamp (Replay Attack)
  console.log(`\n${colors.cyan}━━━ Test 7: Old Timestamp (Should Fail) ━━━${colors.reset}`);
  results.total++;
  try {
    const oldTimestamp = (Date.now() - 10 * 60 * 1000).toString(); // 10 minutes ago
    const payload = {
      event_type: 'SHIPMENT_STATUS_UPDATE',
      timestamp: new Date().toISOString(),
      shipment_data: {
        awb: 'VEL123456789',
        order_id: 'TEST-ORDER-001',
        status: 'In Transit',
        status_code: 'IT',
        courier_name: 'Velocity Express',
        updated_at: new Date().toISOString()
      }
    };

    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString, oldTimestamp);

    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-velocity-signature': signature,
        'x-velocity-timestamp': oldTimestamp,
        'x-velocity-event-type': 'SHIPMENT_STATUS_UPDATE'
      },
      validateStatus: () => true
    });

    if (response.status === 401) {
      console.log(`${colors.green}✓${colors.reset} Old timestamp correctly rejected (401)`);
      results.passed++;
    } else {
      console.error(`${colors.red}✗${colors.reset} Old timestamp not rejected (got ${response.status})`);
      results.failed++;
    }
  } catch (error: any) {
    console.error(`${colors.red}✗${colors.reset} Test failed:`, error.message);
    results.failed++;
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
    console.log(`${colors.green}✓ All webhook tests passed!${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}⚠ Some tests failed. Please review the errors above.${colors.reset}\n`);
  }

  console.log(`${colors.cyan}Next Steps:${colors.reset}`);
  console.log(`1. If using ngrok, ensure it's running: ngrok http 5000`);
  console.log(`2. Configure Velocity webhook URL: ${baseUrl}/api/v1/webhooks/velocity`);
  console.log(`3. Test with real Velocity webhooks\n`);
}

// Run tests if executed directly
if (require.main === module) {
  runWebhookTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runWebhookTests };
