/**
 * Delhivery B2C Integration Tests (Staging)
 *
 * These tests hit staging endpoints. They are skipped unless:
 * - RUN_DELHIVERY_LIVE=true
 * - DELHIVERY_API_TOKEN is set
 * - DELHIVERY_BASE_URL is set (optional, defaults to staging)
 * - DELHIVERY_TEST_ORIGIN_PIN and DELHIVERY_TEST_DEST_PIN are set
 *
 * Optional for createShipment:
 * - DELHIVERY_TEST_PICKUP_LOCATION
 */

import mongoose from 'mongoose';
import { DelhiveryProvider } from '../../../src/infrastructure/external/couriers/delhivery/delhivery.provider';

const runLive = process.env.RUN_DELHIVERY_LIVE === 'true'
  && !!process.env.DELHIVERY_API_TOKEN
  && !!process.env.DELHIVERY_TEST_ORIGIN_PIN
  && !!process.env.DELHIVERY_TEST_DEST_PIN;

const describeLive = runLive ? describe : describe.skip;

describeLive('Delhivery B2C (Staging)', () => {
  let provider: DelhiveryProvider;

  beforeAll(() => {
    provider = new DelhiveryProvider(new mongoose.Types.ObjectId(), process.env.DELHIVERY_BASE_URL);
  });

  it('checks serviceability', async () => {
    const ok = await provider.checkServiceability(process.env.DELHIVERY_TEST_DEST_PIN as string);
    expect(typeof ok).toBe('boolean');
  });

  it('gets rates', async () => {
    const rates = await provider.getRates({
      origin: { pincode: process.env.DELHIVERY_TEST_ORIGIN_PIN as string },
      destination: { pincode: process.env.DELHIVERY_TEST_DEST_PIN as string },
      package: { weight: 1, length: 10, width: 10, height: 10 },
      paymentMode: 'prepaid'
    });

    expect(Array.isArray(rates)).toBe(true);
    expect(rates[0]).toHaveProperty('currency', 'INR');
  });

  it('creates shipment (requires pickup location)', async () => {
    if (!process.env.DELHIVERY_TEST_PICKUP_LOCATION) {
      return;
    }

    const res = await provider.createShipment({
      origin: {
        name: 'Test Warehouse',
        phone: '9999999999',
        address: 'Origin',
        city: 'Delhi',
        state: 'Delhi',
        pincode: process.env.DELHIVERY_TEST_ORIGIN_PIN as string,
        country: 'India'
      },
      destination: {
        name: 'Test User',
        phone: '9999999999',
        address: 'Test Address',
        city: 'Mumbai',
        state: 'MH',
        pincode: process.env.DELHIVERY_TEST_DEST_PIN as string,
        country: 'India'
      },
      package: { weight: 1, length: 10, width: 10, height: 10 },
      orderNumber: `SC-${Date.now()}`,
      paymentMode: 'prepaid',
      carrierOptions: {
        delhivery: {
          pickupLocationName: process.env.DELHIVERY_TEST_PICKUP_LOCATION as string
        }
      }
    } as any);

    expect(res.trackingNumber).toBeTruthy();
  });
});
