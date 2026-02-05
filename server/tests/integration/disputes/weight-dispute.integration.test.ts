/**
 * Weight Dispute Integration Tests
 *
 * End-to-end tests for the generic weight webhook:
 * Shipment -> /disputes/weight/webhook -> detection service -> (dispute | verification)
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../src/app';
import { Shipment } from '../../../src/infrastructure/database/mongoose/models';
import WeightDispute from '../../../src/infrastructure/database/mongoose/models/logistics/shipping/exceptions/weight-dispute.model';

describe('Weight Dispute Webhook Integration', () => {
  const companyId = new mongoose.Types.ObjectId();
  const orderId = new mongoose.Types.ObjectId();
  const trackingNumber = 'WD-TEST-001';

  beforeEach(async () => {
    await Shipment.deleteMany({});
    await (WeightDispute as any).deleteMany({});
  });

  afterAll(async () => {
    await Shipment.deleteMany({});
    await (WeightDispute as any).deleteMany({});
  });

  /**
   * Helper to create a basic shipment used by the webhook
   */
  async function createTestShipment(declaredWeightKg: number): Promise<mongoose.Document> {
    const shipment = await Shipment.create({
      trackingNumber,
      orderId,
      companyId,
      carrier: 'velocity-shipfast',
      serviceType: 'surface',
      packageDetails: {
        weight: declaredWeightKg,
        dimensions: { length: 20, width: 15, height: 10 },
        packageCount: 1,
        packageType: 'box',
        declaredValue: 1000,
      },
      deliveryDetails: {
        recipientName: 'Webhook Test',
        recipientPhone: '+911234567890',
        address: {
          line1: 'Test Address',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          postalCode: '400001',
        },
      },
      paymentDetails: {
        type: 'prepaid',
        shippingCost: 100,
        currency: 'INR',
      },
      statusHistory: [
        {
          status: 'created',
          timestamp: new Date(),
          description: 'Shipment created for weight webhook tests',
        },
      ],
      currentStatus: 'created',
      carrierDetails: {
        carrierTrackingNumber: trackingNumber,
      },
      weights: {
        declared: {
          value: declaredWeightKg,
          unit: 'kg',
        },
        verified: false,
      },
      isDeleted: false,
    });

    return shipment;
  }

  it('creates a weight dispute when discrepancy is above threshold', async () => {
    await createTestShipment(1); // 1kg declared

    const response = await request(app)
      .post('/api/v1/disputes/weight/webhook')
      .send({
        awb: trackingNumber,
        actualWeight: 1.2, // 20% higher -> should trigger dispute
        unit: 'kg',
        scannedAt: new Date().toISOString(),
        location: 'Velocity HUB',
        carrier: 'velocity-shipfast',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.action).toBe('dispute_created');
    expect(response.body.data.disputeId).toBeTruthy();

    const disputes = await (WeightDispute as any).find({});
    expect(disputes.length).toBe(1);
    expect(disputes[0].shipmentId.toString()).toBeDefined();
    expect(disputes[0].discrepancy.thresholdExceeded).toBe(true);
  });

  it('verifies weight without creating dispute when within threshold', async () => {
    const shipment = await createTestShipment(1); // 1kg declared

    const response = await request(app)
      .post('/api/v1/disputes/weight/webhook')
      .send({
        awb: trackingNumber,
        actualWeight: 1.02, // 2% diff -> within 5% threshold
        unit: 'kg',
        scannedAt: new Date().toISOString(),
        location: 'Velocity HUB',
        carrier: 'velocity-shipfast',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.action).toBe('weight_verified');
    expect(response.body.data.disputeId).toBeNull();

    const disputes = await (WeightDispute as any).find({});
    expect(disputes.length).toBe(0);

    const updatedShipment = await Shipment.findById(shipment._id);
    expect(updatedShipment?.weights?.verified).toBe(true);
    expect(updatedShipment?.weights?.actual?.value).toBeCloseTo(1.02);
    expect(updatedShipment?.weights?.actual?.unit).toBe('kg');
  });
});

