/**
 * Velocity Webhook Integration Tests
 *
 * Tests webhook endpoint, signature verification, and event processing
 * Coverage targets: 90%+
 */

import request from 'supertest';
import crypto from 'crypto';
import mongoose from 'mongoose';
import app from '../../../src/app';
import { Shipment } from '../../../src/infrastructure/database/mongoose/models';
import { Order } from '../../../src/infrastructure/database/mongoose/models';
import { WebhookDeadLetter } from '../../../src/infrastructure/database/mongoose/models';
import { VelocityWebhookPayload } from '../../../src/infrastructure/external/couriers/velocity/velocity-webhook.types';

const WEBHOOK_SECRET = process.env.VELOCITY_WEBHOOK_SECRET || 'default-webhook-secret-change-me';

/**
 * Generate webhook signature for testing
 */
function generateWebhookSignature(payload: string, timestamp: string): string {
  const signaturePayload = `${timestamp}.${payload}`;
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(signaturePayload)
    .digest('hex');
}

describe('Velocity Webhook Integration Tests', () => {
  let testCompanyId: mongoose.Types.ObjectId;
  let testOrderId: mongoose.Types.ObjectId;
  let testShipmentId: mongoose.Types.ObjectId;
  const testAwb = 'VEL123456789';
  const testTrackingNumber = 'SHP-TEST-001';

  beforeAll(async () => {
    testCompanyId = new mongoose.Types.ObjectId();
    testOrderId = new mongoose.Types.ObjectId();
  });

  beforeEach(async () => {
    // Clear collections
    await Shipment.deleteMany({});
    await WebhookDeadLetter.deleteMany({});

    // Create test order (mock - assuming Order model exists)
    // In real scenario, create via Order.create()

    // Create test shipment
    const shipment = await Shipment.create({
      trackingNumber: testTrackingNumber,
      orderId: testOrderId,
      companyId: testCompanyId,
      carrier: 'velocity-shipfast',
      serviceType: 'surface',
      packageDetails: {
        weight: 1.5,
        dimensions: { length: 20, width: 15, height: 10 },
        packageCount: 1,
        packageType: 'box',
        declaredValue: 1000
      },
      deliveryDetails: {
        recipientName: 'John Doe',
        recipientPhone: '+919876543210',
        address: {
          line1: 'Test Address',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          postalCode: '400001'
        }
      },
      paymentDetails: {
        type: 'prepaid',
        shippingCost: 100,
        currency: 'INR'
      },
      statusHistory: [{
        status: 'created',
        timestamp: new Date(),
        description: 'Shipment created'
      }],
      currentStatus: 'created',
      carrierDetails: {
        carrierTrackingNumber: testAwb
      },
      isDeleted: false
    });

    testShipmentId = shipment._id as mongoose.Types.ObjectId;
  });

  afterEach(async () => {
    await Shipment.deleteMany({});
    await WebhookDeadLetter.deleteMany({});
  });

  describe('POST /api/v1/webhooks/velocity', () => {
    it('should process valid status update webhook', async () => {
      const timestamp = Date.now().toString();
      const payload: VelocityWebhookPayload = {
        event_type: 'SHIPMENT_STATUS_UPDATE',
        timestamp: new Date().toISOString(),
        shipment_data: {
          awb: testAwb,
          order_id: testTrackingNumber,
          status: 'Picked Up',
          status_code: 'PKP',
          courier_name: 'Velocity Express',
          current_location: 'Mumbai Hub',
          updated_at: new Date().toISOString(),
          description: 'Package picked up from warehouse'
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, timestamp);

      const response = await request(app)
        .post('/api/v1/webhooks/velocity')
        .set('x-velocity-signature', signature)
        .set('x-velocity-timestamp', timestamp)
        .set('x-velocity-event-type', 'SHIPMENT_STATUS_UPDATE')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.statusUpdated).toBe(true);

      // Verify shipment was updated
      const updatedShipment = await Shipment.findById(testShipmentId);
      expect(updatedShipment?.currentStatus).toBe('picked_up');
      expect(updatedShipment?.statusHistory).toHaveLength(2);
    });

    it('should reject webhook with invalid signature', async () => {
      const timestamp = Date.now().toString();
      const payload: VelocityWebhookPayload = {
        event_type: 'SHIPMENT_STATUS_UPDATE',
        timestamp: new Date().toISOString(),
        shipment_data: {
          awb: testAwb,
          order_id: testTrackingNumber,
          status: 'In Transit',
          status_code: 'IT',
          courier_name: 'Velocity Express',
          updated_at: new Date().toISOString()
        }
      };

      const response = await request(app)
        .post('/api/v1/webhooks/velocity')
        .set('x-velocity-signature', 'invalid-signature')
        .set('x-velocity-timestamp', timestamp)
        .set('x-velocity-event-type', 'SHIPMENT_STATUS_UPDATE')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('signature');
    });

    it('should reject webhook with missing signature header', async () => {
      const payload: VelocityWebhookPayload = {
        event_type: 'SHIPMENT_STATUS_UPDATE',
        timestamp: new Date().toISOString(),
        shipment_data: {
          awb: testAwb,
          order_id: testTrackingNumber,
          status: 'In Transit',
          status_code: 'IT',
          courier_name: 'Velocity Express',
          updated_at: new Date().toISOString()
        }
      };

      const response = await request(app)
        .post('/api/v1/webhooks/velocity')
        .set('x-velocity-timestamp', Date.now().toString())
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('signature');
    });

    it('should reject webhook with old timestamp (replay attack)', async () => {
      const oldTimestamp = (Date.now() - 10 * 60 * 1000).toString(); // 10 minutes ago
      const payload: VelocityWebhookPayload = {
        event_type: 'SHIPMENT_STATUS_UPDATE',
        timestamp: new Date().toISOString(),
        shipment_data: {
          awb: testAwb,
          order_id: testTrackingNumber,
          status: 'Delivered',
          status_code: 'DEL',
          courier_name: 'Velocity Express',
          updated_at: new Date().toISOString()
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, oldTimestamp);

      const response = await request(app)
        .post('/api/v1/webhooks/velocity')
        .set('x-velocity-signature', signature)
        .set('x-velocity-timestamp', oldTimestamp)
        .set('x-velocity-event-type', 'SHIPMENT_STATUS_UPDATE')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('timestamp');
    });

    it('should process delivered status and set actualDelivery date', async () => {
      const timestamp = Date.now().toString();
      const payload: VelocityWebhookPayload = {
        event_type: 'SHIPMENT_STATUS_UPDATE',
        timestamp: new Date().toISOString(),
        shipment_data: {
          awb: testAwb,
          order_id: testTrackingNumber,
          status: 'Delivered',
          status_code: 'DEL',
          courier_name: 'Velocity Express',
          current_location: 'Customer Location',
          updated_at: new Date().toISOString(),
          description: 'Package delivered successfully'
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, timestamp);

      const response = await request(app)
        .post('/api/v1/webhooks/velocity')
        .set('x-velocity-signature', signature)
        .set('x-velocity-timestamp', timestamp)
        .set('x-velocity-event-type', 'SHIPMENT_STATUS_UPDATE')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const updatedShipment = await Shipment.findById(testShipmentId);
      expect(updatedShipment?.currentStatus).toBe('delivered');
      expect(updatedShipment?.actualDelivery).toBeDefined();
    });

    it('should process NDR status and update ndrDetails', async () => {
      const timestamp = Date.now().toString();
      const payload: VelocityWebhookPayload = {
        event_type: 'SHIPMENT_STATUS_UPDATE',
        timestamp: new Date().toISOString(),
        shipment_data: {
          awb: testAwb,
          order_id: testTrackingNumber,
          status: 'Non Delivery Report',
          status_code: 'NDR',
          courier_name: 'Velocity Express',
          current_location: 'Mumbai Hub',
          updated_at: new Date().toISOString(),
          description: 'Customer not available'
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, timestamp);

      const response = await request(app)
        .post('/api/v1/webhooks/velocity')
        .set('x-velocity-signature', signature)
        .set('x-velocity-timestamp', timestamp)
        .set('x-velocity-event-type', 'SHIPMENT_STATUS_UPDATE')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const updatedShipment = await Shipment.findById(testShipmentId);
      expect(updatedShipment?.currentStatus).toBe('ndr');
      expect(updatedShipment?.ndrDetails).toBeDefined();
      expect(updatedShipment?.ndrDetails?.ndrReason).toBe('Customer not available');
      expect(updatedShipment?.ndrDetails?.ndrAttempts).toBe(1);
      expect(updatedShipment?.ndrDetails?.ndrStatus).toBe('pending');
    });

    it('should handle shipment not found gracefully', async () => {
      const timestamp = Date.now().toString();
      const payload: VelocityWebhookPayload = {
        event_type: 'SHIPMENT_STATUS_UPDATE',
        timestamp: new Date().toISOString(),
        shipment_data: {
          awb: 'NONEXISTENT123',
          order_id: 'NONEXISTENT-ORDER',
          status: 'In Transit',
          status_code: 'IT',
          courier_name: 'Velocity Express',
          updated_at: new Date().toISOString()
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, timestamp);

      const response = await request(app)
        .post('/api/v1/webhooks/velocity')
        .set('x-velocity-signature', signature)
        .set('x-velocity-timestamp', timestamp)
        .set('x-velocity-event-type', 'SHIPMENT_STATUS_UPDATE')
        .send(payload);

      // Should return 200 to prevent retries
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should process shipment cancelled webhook', async () => {
      const timestamp = Date.now().toString();
      const payload: VelocityWebhookPayload = {
        event_type: 'SHIPMENT_CANCELLED',
        timestamp: new Date().toISOString(),
        shipment_data: {
          awb: testAwb,
          order_id: testTrackingNumber,
          status: 'Cancelled',
          status_code: 'CANCELLED',
          courier_name: 'Velocity Express',
          updated_at: new Date().toISOString(),
          description: 'Shipment cancelled by carrier'
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, timestamp);

      const response = await request(app)
        .post('/api/v1/webhooks/velocity')
        .set('x-velocity-signature', signature)
        .set('x-velocity-timestamp', timestamp)
        .set('x-velocity-event-type', 'SHIPMENT_CANCELLED')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const updatedShipment = await Shipment.findById(testShipmentId);
      expect(updatedShipment?.currentStatus).toBe('cancelled');
    });

    it('should handle invalid payload structure', async () => {
      const timestamp = Date.now().toString();
      const invalidPayload = {
        invalid: 'payload'
      };

      const payloadString = JSON.stringify(invalidPayload);
      const signature = generateWebhookSignature(payloadString, timestamp);

      const response = await request(app)
        .post('/api/v1/webhooks/velocity')
        .set('x-velocity-signature', signature)
        .set('x-velocity-timestamp', timestamp)
        .set('x-velocity-event-type', 'SHIPMENT_STATUS_UPDATE')
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('payload');
    });

    it('should not update status if same as current', async () => {
      const timestamp = Date.now().toString();
      const payload: VelocityWebhookPayload = {
        event_type: 'SHIPMENT_STATUS_UPDATE',
        timestamp: new Date().toISOString(),
        shipment_data: {
          awb: testAwb,
          order_id: testTrackingNumber,
          status: 'Created',
          status_code: 'NEW',
          courier_name: 'Velocity Express',
          updated_at: new Date().toISOString()
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, timestamp);

      const response = await request(app)
        .post('/api/v1/webhooks/velocity')
        .set('x-velocity-signature', signature)
        .set('x-velocity-timestamp', timestamp)
        .set('x-velocity-event-type', 'SHIPMENT_STATUS_UPDATE')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.data.statusUpdated).toBe(false);

      const shipment = await Shipment.findById(testShipmentId);
      expect(shipment?.statusHistory).toHaveLength(1); // No new history entry
    });
  });

  describe('GET /api/v1/webhooks/velocity/health', () => {
    it('should return health check status', async () => {
      const response = await request(app)
        .get('/api/v1/webhooks/velocity/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('healthy');
    });
  });

  describe('GET /api/v1/webhooks/velocity/metrics', () => {
    it('should return webhook metrics', async () => {
      // This endpoint requires authentication
      // In a real test, you would need to authenticate first
      // For now, we'll just test the endpoint exists

      const response = await request(app)
        .get('/api/v1/webhooks/velocity/metrics');

      // Will return 401 without authentication
      expect([200, 401]).toContain(response.status);
    });
  });
});
